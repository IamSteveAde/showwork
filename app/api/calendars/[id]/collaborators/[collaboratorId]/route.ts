import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE — removes an already-accepted collaborator from the
// calendar. Manager-only. The person keeps their account and any
// other calendars they're on; this only revokes access to this one.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, collaboratorId } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const collaborator = await db.calendarCollaborator.findUnique({ where: { id: collaboratorId } });
  if (!collaborator || collaborator.calendarId !== id) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  }

  await db.calendarCollaborator.delete({ where: { id: collaboratorId } });
  return NextResponse.json({ ok: true });
}