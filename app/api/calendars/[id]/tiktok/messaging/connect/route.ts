import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessCalendarById } from "@/lib/calendarPermissions";
import { appUrl } from "@/lib/url";
import { createChannelOAuthState, channelOAuthCookieOptions } from "@/lib/channelOAuthState";
import { buildTikTokMessagingAuthUrl } from "@/lib/tiktokMessaging";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.redirect(`${appUrl()}/login`);
  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id }, select: { managerId: true, tikTokOpenId: true } });
  if (!calendar || calendar.managerId !== creator.id || !(await canAccessCalendarById(id))) return NextResponse.json({ error: "Only the active workspace owner can connect TikTok messaging." }, { status: 403 });
  const connection = calendar.tikTokOpenId ? await db.socialConnection.findFirst({ where: { calendarId: id, platform: "TIKTOK", platformAccountId: calendar.tikTokOpenId, status: "CONNECTED" } }) : null;
  if (!connection) return NextResponse.redirect(`${appUrl()}/dashboard/calendars/${id}?tiktokError=publishing_required`);
  try {
    // Bind authorization to the exact connection as well as the owner's cookie.
    const state = createChannelOAuthState("tiktok-messaging", connection.id);
    const response = NextResponse.redirect(buildTikTokMessagingAuthUrl(state.state, `${appUrl()}/api/calendars/channels/tiktok-messaging/callback`));
    response.cookies.set(state.cookieName, state.nonce, channelOAuthCookieOptions("tiktok-messaging", state.maxAge));
    return response;
  } catch {
    return NextResponse.redirect(`${appUrl()}/dashboard/calendars/${id}?tiktokError=messaging_not_configured`);
  }
}
