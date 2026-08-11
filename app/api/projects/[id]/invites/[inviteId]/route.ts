import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// DELETE: cancel a pending invite — owner only. Doesn't delete the
// row (kept as a record that an invite was sent and cancelled),
// just marks it DECLINED so the link stops working.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, inviteId } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.creatorId !== creator.id || project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invite = await db.projectInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.projectId !== id) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await db.projectInvite.update({
    where: { id: inviteId },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}