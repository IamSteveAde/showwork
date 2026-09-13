import { db } from "@/lib/db";
import {
  canAccessContentWorkspace,
  type ContentWorkspaceAccount,
} from "@/lib/contentWorkspaceUsage";

export type CalendarRole = "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";

// The manager (owner) always has full EDIT_CALENDAR-level access,
// regardless of anything in the collaborator table — they're not a
// collaborator on their own calendar, they own it outright.
export async function getCalendarRole(
  creatorId: string,
  calendarId: string
): Promise<CalendarRole | null> {
  const calendar = await db.socialCalendar.findUnique({
    where: { id: calendarId },
    select: { managerId: true },
  });

  if (!calendar) return null;

  if (calendar.managerId === creatorId) return "EDIT_CALENDAR";

  const collab = await db.calendarCollaborator.findUnique({
    where: {
      calendarId_creatorId: {
        calendarId,
        creatorId,
      },
    },
  });

  return collab?.role ?? null;
}

// Each role includes everything the role below it can do.
const ROLE_RANK: Record<CalendarRole, number> = {
  VIEW_ONLY: 0,
  ADD_CONTENT: 1,
  EDIT_CALENDAR: 2,
};

export async function hasCalendarPermission(
  creatorId: string,
  calendarId: string,
  required: CalendarRole
): Promise<boolean> {
  const role = await getCalendarRole(creatorId, calendarId);

  if (!role) return false;

  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * Single source of truth for whether the Content Workspace / Calendar
 * product is currently accessible.
 *
 * Billing is account-level: one Content Workspace subscription covers
 * all workspaces owned by the creator.
 *
 * This now uses the new Content Workspace billing fields rather than
 * the legacy calendar billing fields.
 */
export function canAccessCalendar(
  manager: ContentWorkspaceAccount
): boolean {
  return canAccessContentWorkspace(manager);
}

/**
 * Convenience wrapper for cases where only a calendarId is available.
 *
 * The calendar's manager owns the Content Workspace subscription, so
 * access is determined from the manager's Content Workspace billing
 * state.
 */
export async function canAccessCalendarById(
  calendarId: string
): Promise<boolean> {
  const calendar = await db.socialCalendar.findUnique({
    where: { id: calendarId },
    select: {
      manager: {
        select: {
          id: true,
          contentWorkspacePlan: true,
          contentWorkspaceBillingStatus: true,
          contentWorkspaceBillingCycle: true,
          contentWorkspaceTrialEndsAt: true,
          isComped: true,
        },
      },
    },
  });

  if (!calendar) return false;

  return canAccessCalendar(calendar.manager);
}
