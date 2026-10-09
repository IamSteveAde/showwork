import { canUseCalendarFeature } from "@/lib/calendarPermissions";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessCalendarById, hasCalendarPermission } from "@/lib/calendarPermissions";
import { tikTokMessagingAccess, syncTikTokInbox } from "@/lib/socialMessaging/tiktok";

export const maxDuration = 60;
async function context(id: string) {
  const creator = await getCurrentCreator();
  if (!creator) return { error: "Unauthorized", status: 401 } as const;
  if (!(await hasCalendarPermission(creator.id, id, "inbox.reply")) || !(await canAccessCalendarById(id))) return { error: "You don't have access to this inbox.", status: 403 } as const;
  if (!(await canUseCalendarFeature(id, "socialInbox"))) return { error: "Upgrade to Studio to use Social Inbox. Your existing data is preserved.", status: 403 } as const;
  const calendar = await db.socialCalendar.findUnique({ where: { id }, select: { tikTokOpenId: true } });
  const connection = calendar?.tikTokOpenId ? await db.socialConnection.findFirst({ where: { calendarId: id, platform: "TIKTOK", platformAccountId: calendar.tikTokOpenId, status: "CONNECTED" } }) : null;
  return { connection };
}
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await context(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.connection ? { ...tikTokMessagingAccess(result.connection), businessId: result.connection.tikTokMessagingBusinessId, lastSyncAt: result.connection.messagingLastSyncAt, syncError: result.connection.messagingSyncError } : { available: false, reason: "Connect TikTok publishing before connecting Business Messaging." });
}
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await context(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.connection) return NextResponse.json({ error: "Connect TikTok first." }, { status: 409 });
  try { return NextResponse.json(await syncTikTokInbox(result.connection)); }
  catch (error) {
    const reason = error instanceof Error ? error.message : "TikTok history could not be synced.";
    await db.socialConnection.updateMany({ where: { id: result.connection.id, status: "CONNECTED" }, data: { messagingSyncError: reason.slice(0, 1500) } });
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
