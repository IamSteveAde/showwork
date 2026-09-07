import { db } from "@/lib/db";

export type CalendarRole = "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";

// The manager (owner) always has full EDIT_CALENDAR-level access,
// regardless of anything in the collaborator table — they're not a
// collaborator on their own calendar, they own it outright.
export async function getCalendarRole(creatorId: string, calendarId: string): Promise<CalendarRole | null> {
  const calendar = await db.socialCalendar.findUnique({ where: { id: calendarId }, select: { managerId: true } });
  if (!calendar) return null;
  if (calendar.managerId === creatorId) return "EDIT_CALENDAR";

  const collab = await db.calendarCollaborator.findUnique({
    where: { calendarId_creatorId: { calendarId, creatorId } },
  });
  return collab?.role ?? null;
}

// Each tier includes everything the tier below it can do — the same
// shape as Google Docs' Viewer/Commenter/Editor or Figma's
// Viewer/Editor, so it reads as familiar rather than inventing a new
// mental model for this one feature.
const ROLE_RANK: Record<CalendarRole, number> = { VIEW_ONLY: 0, ADD_CONTENT: 1, EDIT_CALENDAR: 2 };

export async function hasCalendarPermission(
  creatorId: string,
  calendarId: string,
  required: CalendarRole
): Promise<boolean> {
  const role = await getCalendarRole(creatorId, calendarId);
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}