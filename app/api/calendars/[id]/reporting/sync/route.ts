import { after, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission, canAccessCalendarById } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { syncCalendarSocialReporting } from "@/lib/reporting/sync";

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

  after(async () => {
    try { await syncCalendarSocialReporting(calendarId); }
    catch (error) { console.error("Reporting sync failed:", error); }
  });
  return NextResponse.json({ queued: true }, { status: 202 });
}
