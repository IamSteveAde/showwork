import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE — revokes a pending invite before it's ever accepted.
// Manager-only. Does nothing to any existing collaborator relationship
// since an unaccepted invite never created one.
//
// The folder here is named [token] rather than [inviteId] purely
// because Next.js requires every dynamic segment that follows an
// "invites" folder anywhere in the app to share one parameter name —
// app/api/calendars/invites/[token]/accept already claimed that name
// elsewhere in the tree. The value passed in the URL is still just
// this invite's database id; only the internal param key had to
// match, not the row it identifies.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, token: inviteId } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const invite = await db.calendarInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.calendarId !== id) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await db.calendarInvite.delete({ where: { id: inviteId } });
  return NextResponse.json({ ok: true });
}