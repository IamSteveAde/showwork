import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  listManagedPages,
  getInstagramUsername,
} from "@/lib/instagram";
import { appUrl } from "@/lib/url";

// GET — Facebook redirects here after the manager approves (or
// denies) access on the OAuth dialog. `state` carries the calendar id
// the connection should attach to; the actual identity check is the
// real session cookie, not the state value itself — state only says
// which calendar, never who's allowed.
//
// NOTE: if a manager's Facebook account manages more than one Page
// with a linked Instagram Business account, this currently connects
// whichever one Facebook lists first. A proper "choose which account"
// picker step is a reasonable follow-up but isn't built yet — most
// managers only have one Page, so this covers the common case.
export async function GET(req: NextRequest) {
  const calendarId = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");

  const redirectTo = (path: string) => NextResponse.redirect(`${appUrl()}${path}`);

  if (!calendarId) return redirectTo("/dashboard/calendars?instagramError=missing_state");

  const settingsPath = `/dashboard/calendars/${calendarId}`;

  if (oauthError || !code) {
    // The manager denied access, or Facebook sent back an error —
    // either way, nothing to connect, just return them to where they
    // started without touching anything in the database.
    return redirectTo(`${settingsPath}?instagramError=denied`);
  }

  const creator = await getCurrentCreator();
  if (!creator) return redirectTo("/login");

  const calendar = await db.socialCalendar.findUnique({ where: { id: calendarId }, select: { managerId: true } });
  if (!calendar || calendar.managerId !== creator.id) {
    return redirectTo("/dashboard/calendars?instagramError=not_found");
  }

  const redirectUri = `${appUrl()}/api/calendars/instagram/callback`;

  try {
    const shortLived = await exchangeCodeForToken(code, redirectUri);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const pages = await listManagedPages(longLived.access_token);
    const pageWithInstagram = pages.find((p) => !!p.instagram_business_account);

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      return redirectTo(`${settingsPath}?instagramError=no_linked_account`);
    }

    const igUserId = pageWithInstagram.instagram_business_account.id;
    const username = await getInstagramUsername(igUserId, pageWithInstagram.access_token);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (longLived.expires_in ?? 60 * 24 * 60 * 60));

    await db.socialCalendar.update({
      where: { id: calendarId },
      data: {
        instagramAccountId: igUserId,
        instagramUsername: username,
        instagramPageId: pageWithInstagram.id,
        // The Page access token, not the user token — this is what
        // every subsequent publish call actually authenticates with.
        instagramAccessToken: pageWithInstagram.access_token,
        instagramTokenExpiresAt: expiresAt,
        instagramConnectedAt: new Date(),
      },
    });

    return redirectTo(`${settingsPath}?instagramConnected=true`);
  } catch (err) {
    console.error("Instagram OAuth callback failed:", err);
    return redirectTo(`${settingsPath}?instagramError=connection_failed`);
  }
}