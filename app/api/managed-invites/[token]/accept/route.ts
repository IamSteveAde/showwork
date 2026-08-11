import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// POST — accept a managed-project invite. Mirrors the delivery-project
// accept route exactly: requires the person to already be logged in
// as the exact email the invite was sent to.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invite = await db.managedProjectInvite.findUnique({ where: { tokenHash } });
  if (!invite) {
    return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  }
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 400 });
  }
  if (invite.expiresAt < new Date()) {
    await db.managedProjectInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "This invite has expired. Ask the project owner to send a new one." }, { status: 400 });
  }
  if (invite.email.toLowerCase() !== creator.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}, but you're logged in as ${creator.email}.` },
      { status: 403 }
    );
  }

  await db.managedProjectCollaborator.upsert({
    where: { managedProjectId_creatorId: { managedProjectId: invite.managedProjectId, creatorId: creator.id } },
    update: {},
    create: { managedProjectId: invite.managedProjectId, creatorId: creator.id },
  });

  await db.managedProjectInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  return NextResponse.json({ managedProjectId: invite.managedProjectId });
}