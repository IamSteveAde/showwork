import { getTikTokCreator, TikTokRequestBusyError } from "@/lib/tiktokConnection";
import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { connection, info } = await getTikTokCreator(id);
    return NextResponse.json({ ...info, accountId: connection.platformAccountId,
      privacyOptions: info.privacy_level_options, accountName: info.creator_nickname || info.creator_username,
      maxVideoDuration: info.max_video_post_duration_sec }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const busy = error instanceof TikTokRequestBusyError;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load TikTok settings." }, {
      status: busy ? 429 : 502,
      headers: { "Cache-Control": "no-store", ...(busy ? { "Retry-After": String(error.retryAfter) } : {}) },
    });
  }
}
