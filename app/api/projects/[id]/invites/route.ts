import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { sendProjectInviteEmail } from "@/lib/resend";

const INVITE_EXPIRY_DAYS = 7;

// A random, high-entropy token — hashed with plain SHA-256 before
// storage (not bcrypt, unlike passwords) since this is already a
// 32-byte random value rather than something a human chose; it
// doesn't need bcrypt's slow, salted properties to resist guessing.
// Same principle as PasswordResetToken: only the hash is ever stored,
// the plain token exists only in the emailed link itself.
function generateInviteToken(): { plainToken: string; tokenHash: string } {
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
  return { plainToken, tokenHash };
}

// GET: list every invite ever sent for this project (pending or not)
// — owner only.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.creatorId !== creator.id || project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invites = await db.projectInvite.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, status: true, createdAt: true, respondedAt: true },
  });

  const collaborators = await db.projectCollaborator.findMany({
    where: { projectId: id },
    include: { creator: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  return NextResponse.json({ invites, collaborators });
}

// POST: invite someone to collaborate on this project, by email —
// works identically whether that email already has a Showwork
// account or not. Only the project owner can invite (collaborators
// can't invite further collaborators, at least for now).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.creatorId !== creator.id || project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { email } = await req.json();
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === creator.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
  }

  // Already an active collaborator on this exact project.
  const existingCollaborator = await db.projectCollaborator.findFirst({
    where: { projectId: id, creator: { email: normalizedEmail } },
  });
  if (existingCollaborator) {
    return NextResponse.json({ error: "This person is already a collaborator on this project" }, { status: 409 });
  }

  // A pending invite for this exact email + project already exists —
  // resend rather than create a second, orphaned one.
  const existingPendingInvite = await db.projectInvite.findFirst({
    where: { projectId: id, email: normalizedEmail, status: "PENDING" },
  });

  const { plainToken, tokenHash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = existingPendingInvite
    ? await db.projectInvite.update({
        where: { id: existingPendingInvite.id },
        data: { tokenHash, expiresAt },
      })
    : await db.projectInvite.create({
        data: {
          projectId: id,
          invitedByCreatorId: creator.id,
          email: normalizedEmail,
          tokenHash,
          expiresAt,
        },
      });

  const acceptUrl = `${appUrl()}/invites/${plainToken}`;

  try {
    await sendProjectInviteEmail({
      to: normalizedEmail,
      inviterName: creator.name || creator.email,
      projectName: project.clientName,
      acceptUrl,
    });
  } catch (err) {
    console.error("Failed to send project invite email:", err);
    return NextResponse.json({ error: "Couldn't send the invite email. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ id: invite.id, email: invite.email, status: invite.status });
}