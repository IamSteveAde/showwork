import { db } from "@/lib/db";
import {
  canAccessContentWorkspace,
  canUseContentWorkspaceFeature,
  getContentWorkspacePlan,
  type ContentWorkspaceAccount,
} from "@/lib/contentWorkspaceUsage";
import { CONTENT_WORKSPACE_PLANS, CONTENT_WORKSPACE_FEATURES, workspaceFeatureUpgradeMessage, type ContentWorkspaceFeature } from "@/lib/contentWorkspaceEntitlements";
import { NextResponse } from "next/server";

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

  if (required !== "VIEW_ONLY" && !(await canAccessCalendarById(calendarId))) return false;
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
      managerId: true,
      manager: { select: {
        id: true, contentWorkspacePlan: true, contentWorkspaceBillingStatus: true,
        contentWorkspaceBillingCycle: true, contentWorkspaceTrialEndsAt: true,
        isComped: true, compedUntil: true,
      } },
    },
  });

  if (!calendar) return false;

  if (!canAccessCalendar(calendar.manager)) return false;
  const plan = getContentWorkspacePlan(calendar.manager);
  if (!plan) return false;
  const limit = CONTENT_WORKSPACE_PLANS[plan].activeWorkspaces;
  if (limit === Number.MAX_SAFE_INTEGER) return true;
  // Keep excess trial workspaces intact and readable; only covered workspaces can mutate.
  const covered = await db.socialCalendar.findMany({
    where: { managerId: calendar.managerId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: limit,
    select: { id: true },
  });
  return covered.some(workspace => workspace.id === calendarId);
}

export async function canUseCalendarFeature(calendarId: string, feature: ContentWorkspaceFeature): Promise<boolean> {
  const calendar = await db.socialCalendar.findUnique({
    where: { id: calendarId },
    select: { manager: { select: {
      id: true, contentWorkspacePlan: true, contentWorkspaceBillingStatus: true,
      contentWorkspaceBillingCycle: true, contentWorkspaceTrialEndsAt: true,
      isComped: true, compedUntil: true,
    } } },
  });
  return !!calendar && canUseContentWorkspaceFeature(calendar.manager, feature) && await canAccessCalendarById(calendarId);
}

/** Call only after authenticating and checking the user's workspace permission. */
export async function calendarFeatureGate(calendarId: string, feature: ContentWorkspaceFeature) {
  if (await canUseCalendarFeature(calendarId, feature)) return null;
  return NextResponse.json({
    error: workspaceFeatureUpgradeMessage(feature), code: "WORKSPACE_FEATURE_LOCKED",
    feature, requiredPlan: CONTENT_WORKSPACE_FEATURES[feature].minimumPlan,
    upgradeUrl: "/dashboard/billing?product=content-workspace#content-workspace-plans",
  }, { status: 403 });
}
