import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// DELETE — cancel a pending invite. Owner-only. Marks it DECLINED
// rather than deleting the row, kept as a record.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, inviteId } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invite = await db.managedProjectInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.managedProjectId !== id) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await db.managedProjectInvite.update({
    where: { id: inviteId },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}