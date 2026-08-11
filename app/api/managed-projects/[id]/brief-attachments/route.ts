import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { publicUrlFor } from "@/lib/r2";

// GET — owner or any collaborator can view the brief's attachments,
// matching how the brief text itself is readable by anyone on the
// project even though only the owner can edit it.
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

  const attachments = await db.briefAttachment.findMany({
    where: { managedProjectId: id },
    orderBy: { createdAt: "asc" },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
  });

  const withUrls = attachments.map((a) => ({ ...a, url: publicUrlFor(a.fileKey) }));

  return NextResponse.json({ attachments: withUrls });
}