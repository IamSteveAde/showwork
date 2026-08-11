import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { sendCollaboratorAddedEmail } from "@/lib/resend";

// GET — list current collaborators. Owner or any existing collaborator
// can view who else is on the project.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = managedProject.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.managedProjectCollaborator.findFirst({ where: { managedProjectId: id, creatorId: creator.id } })) !== null;
  if (!isOwner && !isCollaborator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const collaborators = await db.managedProjectCollaborator.findMany({
    where: { managedProjectId: id },
    include: { creator: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  return NextResponse.json({ collaborators });
}

// POST — add an existing Showwork account directly as a collaborator.
// Owner-only. No invite/accept step: unlike the delivery system,
// managed-project collaborators are added straight from search since
// they're expected to already have accounts. Sends a notification
// email right away — without this, someone added had no way to know
// they'd been put on a project at all.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { creatorId: targetCreatorId } = await req.json();
  if (typeof targetCreatorId !== "string" || !targetCreatorId) {
    return NextResponse.json({ error: "creatorId is required" }, { status: 400 });
  }
  if (targetCreatorId === creator.id) {
    return NextResponse.json({ error: "You can't add yourself" }, { status: 400 });
  }

  const targetCreator = await db.creator.findUnique({ where: { id: targetCreatorId } });
  if (!targetCreator) return NextResponse.json({ error: "That account doesn't exist" }, { status: 404 });

  const wasAlreadyOn = (await db.managedProjectCollaborator.findUnique({
    where: { managedProjectId_creatorId: { managedProjectId: id, creatorId: targetCreatorId } },
  })) !== null;

  const collaborator = await db.managedProjectCollaborator.upsert({
    where: { managedProjectId_creatorId: { managedProjectId: id, creatorId: targetCreatorId } },
    update: {},
    create: { managedProjectId: id, creatorId: targetCreatorId },
    include: { creator: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  // Only notify on a genuinely new add — not on the harmless upsert
  // no-op if they were already a collaborator (e.g. a double-click).
  if (!wasAlreadyOn) {
    try {
      await sendCollaboratorAddedEmail({
        to: targetCreator.email,
        addedByName: creator.name || creator.email,
        projectName: managedProject.name,
        projectUrl: `${appUrl()}/dashboard/managed/${id}`,
      });
    } catch (err) {
      console.error("Failed to send collaborator-added email:", err);
    }
  }

  return NextResponse.json({ collaborator });
}