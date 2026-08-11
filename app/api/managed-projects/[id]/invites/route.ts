import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { sendManagedProjectInviteEmail } from "@/lib/resend";

const INVITE_EXPIRY_DAYS = 7;

function generateInviteToken(): { plainToken: string; tokenHash: string } {
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
  return { plainToken, tokenHash };
}

// GET — list every invite ever sent for this project, pending or not.
// Owner only.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invites = await db.managedProjectInvite.findMany({
    where: { managedProjectId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, status: true, createdAt: true },
  });

  return NextResponse.json({ invites });
}

// POST — invite someone by email who doesn't have a Showwork account
// (or might, it works either way) — mirrors the delivery-project
// invite flow exactly. Owner-only.
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

  const { email } = await req.json();
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === creator.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
  }

  // Already an active collaborator.
  const existingCollaborator = await db.managedProjectCollaborator.findFirst({
    where: { managedProjectId: id, creator: { email: normalizedEmail } },
  });
  if (existingCollaborator) {
    return NextResponse.json({ error: "This person is already a collaborator on this project" }, { status: 409 });
  }

  // A pending invite for this exact email + project already exists —
  // resend rather than create a second, orphaned one.
  const existingPendingInvite = await db.managedProjectInvite.findFirst({
    where: { managedProjectId: id, email: normalizedEmail, status: "PENDING" },
  });

  const { plainToken, tokenHash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = existingPendingInvite
    ? await db.managedProjectInvite.update({
        where: { id: existingPendingInvite.id },
        data: { tokenHash, expiresAt },
      })
    : await db.managedProjectInvite.create({
        data: {
          managedProjectId: id,
          invitedByCreatorId: creator.id,
          email: normalizedEmail,
          tokenHash,
          expiresAt,
        },
      });

  const acceptUrl = `${appUrl()}/managed-invites/${plainToken}`;

  try {
    await sendManagedProjectInviteEmail({
      to: normalizedEmail,
      inviterName: creator.name || creator.email,
      projectName: managedProject.name,
      acceptUrl,
    });
  } catch (err) {
    console.error("Failed to send managed-project invite email:", err);
    return NextResponse.json({ error: "Couldn't send the invite email. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ id: invite.id, email: invite.email, status: invite.status });
}