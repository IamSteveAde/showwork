import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeCodeForTikTokTokens, getTikTokDisplayName } from "@/lib/tiktok";
import { appUrl } from "@/lib/url";

// GET — TikTok redirects here after the manager approves (or denies)
// access on its authorization page. `state` carries the calendar id
// the connection should attach to; the real identity check is the
// session cookie, not the state value — state only ever says which
// calendar, never who's allowed.
export async function GET(req: NextRequest) {
  const calendarId = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");

  const redirectTo = (path: string) => NextResponse.redirect(`${appUrl()}${path}`);

  if (!calendarId) return redirectTo("/dashboard/calendars?tiktokError=missing_state");

  const settingsPath = `/dashboard/calendars/${calendarId}`;

  if (oauthError || !code) {
    return redirectTo(`${settingsPath}?tiktokError=denied`);
  }

  const creator = await getCurrentCreator();
  if (!creator) return redirectTo("/login");

  const calendar = await db.socialCalendar.findUnique({ where: { id: calendarId }, select: { managerId: true } });
  if (!calendar || calendar.managerId !== creator.id) {
    return redirectTo("/dashboard/calendars?tiktokError=not_found");
  }

  const redirectUri = `${appUrl()}/api/calendars/tiktok/callback`;

  try {
    const tokens = await exchangeCodeForTikTokTokens(code, redirectUri);
    const displayName = await getTikTokDisplayName(tokens.access_token);

    const accessTokenExpiresAt = new Date();
    accessTokenExpiresAt.setSeconds(accessTokenExpiresAt.getSeconds() + tokens.expires_in);

    await db.socialCalendar.update({
      where: { id: calendarId },
      data: {
        tikTokOpenId: tokens.open_id,
        tikTokUsername: displayName,
        tikTokAccessToken: tokens.access_token,
        tikTokAccessTokenExpiresAt: accessTokenExpiresAt,
        tikTokRefreshToken: tokens.refresh_token,
        tikTokConnectedAt: new Date(),
      },
    });

    return redirectTo(`${settingsPath}?tiktokConnected=true`);
  } catch (err) {
    console.error("TikTok OAuth callback failed:", err);
    return redirectTo(`${settingsPath}?tiktokError=connection_failed`);
  }
}