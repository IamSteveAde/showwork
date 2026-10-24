import { after, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission, canAccessCalendarById } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { syncCalendarSocialReporting } from "@/lib/reporting/sync";

export const maxDuration = 300;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: calendarId } = await params;
  if (!(await hasCalendarPermission(creator.id, calendarId, "analytics.manage")) || !(await canAccessCalendarById(calendarId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const value = new URL(req.url).searchParams.get("since");
  const since = value ? new Date(value) : null;
  if (!since || !Number.isFinite(since.getTime())) return NextResponse.json({ error: "A valid sync start time is required." }, { status: 400 });
  const connections = await db.socialConnection.findMany({
    where: { calendarId, platform: { in: ["INSTAGRAM", "TIKTOK", "FACEBOOK"] }, status: { in: ["CONNECTED", "NEEDS_REAUTH"] } },
    select: { status: true, lastSyncAt: true, lastSyncAttemptAt: true, lastSyncError: true },
  });
  const finished = connections.map(connection => {
    const synced = !!connection.lastSyncAt && connection.lastSyncAt >= since;
    const failed = !synced && (connection.status === "NEEDS_REAUTH" || (!!connection.lastSyncAttemptAt && connection.lastSyncAttemptAt >= since && !!connection.lastSyncError));
    return { finished: synced || failed, failed };
  });
  return NextResponse.json({ completed: finished.length > 0 && finished.every(connection => connection.finished), failed: finished.filter(connection => connection.failed).length }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: calendarId } = await params;
  if (!(await hasCalendarPermission(creator.id, calendarId, "analytics.manage"))) {
    return NextResponse.json({ error: "You don’t have permission to sync this workspace." }, { status: 403 });
  }
  if (!(await canAccessCalendarById(calendarId))) {
    return NextResponse.json({ error: "This workspace isn’t active." }, { status: 403 });
  }

  const connectedCount = await db.socialConnection.count({
    where: { calendarId, status: "CONNECTED", platform: { in: ["INSTAGRAM", "TIKTOK", "FACEBOOK"] } },
  });
  if (!connectedCount) {
    return NextResponse.json({ error: "Connect an Instagram, TikTok, or Facebook account before syncing reporting." }, { status: 409 });
  }

  const queuedAt = new Date().toISOString();
  after(async () => {
    try { await syncCalendarSocialReporting(calendarId); }
    catch (error) { console.error("Reporting sync failed:", error); }
  });
  return NextResponse.json({ queued: true, queuedAt }, { status: 202 });
}
