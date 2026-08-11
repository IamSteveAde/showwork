import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// POST: actually accept an invite. Requires the person to already be
// logged in as the exact email the invite was sent to — the accept
// page handles getting them there first (via login or signup), this
// route just does the final step of creating the ProjectCollaborator
// row once that's true.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invite = await db.projectInvite.findUnique({ where: { tokenHash } });
  if (!invite) {
    return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  }
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 400 });
  }
  if (invite.expiresAt < new Date()) {
    await db.projectInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "This invite has expired. Ask the project owner to send a new one." }, { status: 400 });
  }
  if (invite.email.toLowerCase() !== creator.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}, but you're logged in as ${creator.email}.` },
      { status: 403 }
    );
  }

  // Idempotent — if they're somehow already a collaborator (e.g. a
  // double-click), just mark this invite accepted rather than error.
  await db.projectCollaborator.upsert({
    where: { projectId_creatorId: { projectId: invite.projectId, creatorId: creator.id } },
    update: {},
    create: { projectId: invite.projectId, creatorId: creator.id },
  });

  await db.projectInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  return NextResponse.json({ projectId: invite.projectId });
}