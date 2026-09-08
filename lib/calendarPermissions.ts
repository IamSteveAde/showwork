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

// The single source of truth for "is this calendar actually usable
// right now" — active billing, or a trial that hasn't run out yet.
// PENDING_SETUP (payment never completed) and OFFLINE (payment
// failed) are never accessible. Every page that shows calendar
// content — manager or client — must check this before rendering
// anything real, not just rely on the create flow having redirected
// somewhere.
export function canAccessCalendar(calendar: {
  billingStatus: string;
  trialEndsAt: Date | null;
}): boolean {
  if (calendar.billingStatus === "ACTIVE") return true;
  if (calendar.billingStatus === "TRIAL") {
    return !!calendar.trialEndsAt && calendar.trialEndsAt.getTime() > Date.now();
  }
  return false;
}