import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { queryTikTokCreatorInfo } from "@/lib/tiktok";
import { tiktokReportingAdapter } from "@/lib/reporting/adapters/tiktok";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let connection = await db.socialConnection.findFirst({ where: { calendarId: id, platform: "TIKTOK", status: "CONNECTED" } });
  if (!connection?.accessToken) return NextResponse.json({ error: "Connect TikTok to choose publishing privacy." }, { status: 409 });
  try {
    if (connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() <= Date.now() + 60_000) connection = await tiktokReportingAdapter.refreshConnection!(connection);
    const info = await queryTikTokCreatorInfo(connection.accessToken!);
    return NextResponse.json({ privacyOptions: info.privacy_level_options, accountName: info.creator_nickname || info.creator_username, maxVideoDuration: info.max_video_post_duration_sec });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load TikTok settings." }, { status: 502 }); }
}
