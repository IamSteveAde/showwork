import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/url";
import { upsertSocialConnection } from "@/lib/socialReporting";
import { subscribeMetaMessagingAccount } from "@/lib/socialMessaging/meta";
import {
  exchangeChannelCode,
  exchangeForLongLivedFacebookToken,
  getFacebookGrantedPermissions,
  getFacebookPages,
  getLinkedInMember,
  getXMember,
} from "@/lib/channelOAuth";
import {
  channelOAuthCookieOptions,
  verifyChannelOAuthState,
  xPkceCookieName,
  type PublishingChannel,
} from "@/lib/channelOAuthState";

const CHANNELS: PublishingChannel[] = ["facebook", "linkedin", "x"];

function withExpiry(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(Date.now() + seconds * 1000);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel: rawChannel } = await params;
  if (!CHANNELS.includes(rawChannel as PublishingChannel)) {
    return NextResponse.json({ error: "Unknown publishing channel." }, { status: 404 });
  }
  const channel = rawChannel as PublishingChannel;
  const stateCookieName = `showwork_${channel}_oauth_state`;
  const cookieNonce = req.cookies.get(stateCookieName)?.value;
  const calendarId = verifyChannelOAuthState(
    channel,
    req.nextUrl.searchParams.get("state"),
    cookieNonce,
  );

  const fallback = `/dashboard/calendars?view=channels&${channel}Error=missing_state`;
  if (!calendarId) return NextResponse.redirect(`${appUrl()}${fallback}`);

  const callbackPath = `/api/calendars/channels/${channel}/callback`;
  const settingsPath = `/dashboard/calendars/${calendarId}?view=channels`;
  const makeRedirect = (url: string) => {
    const response = NextResponse.redirect(`${appUrl()}${url}`);
    response.cookies.set(stateCookieName, "", {
      ...channelOAuthCookieOptions(channel, 0),
      maxAge: 0,
    });
    if (channel === "x") {
      response.cookies.set(xPkceCookieName(), "", {
        ...channelOAuthCookieOptions(channel, 0),
        path: callbackPath,
        maxAge: 0,
      });
    }
    return response;
  };

  const oauthError = req.nextUrl.searchParams.get("error");
  const code = req.nextUrl.searchParams.get("code");
  if (oauthError || !code) return makeRedirect(`${settingsPath}&${channel}Error=denied`);

  const creator = await getCurrentCreator();
  if (!creator) return makeRedirect("/login");
  const calendar = await db.socialCalendar.findUnique({
    where: { id: calendarId },
    select: { managerId: true },
  });
  if (!calendar || calendar.managerId !== creator.id) {
    return makeRedirect(`${settingsPath}&${channel}Error=not_found`);
  }

  const redirectUri = `${appUrl()}${callbackPath}`;
  try {
    const tokens = await exchangeChannelCode({
      channel,
      code,
      redirectUri,
      codeVerifier: channel === "x" ? req.cookies.get(xPkceCookieName())?.value : undefined,
    });
    if (!tokens.access_token) throw new Error(`${channel} did not return an access token.`);

    if (channel === "facebook") {
      const longLived = await exchangeForLongLivedFacebookToken(tokens.access_token);
      const grantedPermissions = await getFacebookGrantedPermissions(longLived.access_token);
      const pages = await getFacebookPages(longLived.access_token);
      const page = pages[0];
      if (!page) return makeRedirect(`${settingsPath}&facebookError=no_page`);

      await db.socialCalendar.update({
        where: { id: calendarId },
        data: {
          facebookPageId: page.id,
          facebookPageName: page.name,
          facebookAccessToken: page.access_token,
          facebookTokenExpiresAt: withExpiry(longLived.expires_in),
          facebookConnectedAt: new Date(),
        },
      });
      const socialConnection = await upsertSocialConnection({
        calendarId,
        platform: "FACEBOOK",
        platformAccountId: page.id,
        accountName: page.name,
        accessToken: page.access_token,
        accessTokenExpiresAt: withExpiry(longLived.expires_in),
        tokenScopes: grantedPermissions.join(","),
      });
      try {
        await subscribeMetaMessagingAccount(page.id, page.access_token, "FACEBOOK");
        await db.socialConnection.update({ where: { id: socialConnection.id }, data: { messagingWebhookSubscribedAt: new Date(), messagingWebhookError: null } });
      } catch (error) {
        await db.socialConnection.update({ where: { id: socialConnection.id }, data: { messagingWebhookError: error instanceof Error ? error.message.slice(0, 1500) : "Meta webhook subscription failed." } });
        console.warn("Facebook publishing is connected, but messaging webhooks could not be enabled:", error);
      }
    } else if (channel === "linkedin") {
      const member = await getLinkedInMember(tokens.access_token);
      const name = member.name || [member.given_name, member.family_name].filter(Boolean).join(" ") || "LinkedIn member";
      await db.socialCalendar.update({
        where: { id: calendarId },
        data: {
          linkedinMemberId: member.sub,
          linkedinName: name,
          linkedinAccessToken: tokens.access_token,
          linkedinAccessTokenExpiresAt: withExpiry(tokens.expires_in),
          linkedinRefreshToken: tokens.refresh_token ?? null,
          linkedinRefreshTokenExpiresAt: withExpiry(tokens.refresh_token_expires_in),
          linkedinConnectedAt: new Date(),
        },
      });
      await upsertSocialConnection({
        calendarId,
        platform: "LINKEDIN",
        platformAccountId: member.sub,
        accountName: name,
        username: name,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: withExpiry(tokens.expires_in),
        refreshToken: tokens.refresh_token ?? null,
        refreshTokenExpiresAt: withExpiry(tokens.refresh_token_expires_in),
        tokenScopes: tokens.scope ?? null,
      });
    } else {
      const member = await getXMember(tokens.access_token);
      await db.socialCalendar.update({
        where: { id: calendarId },
        data: {
          xUserId: member.id,
          xUsername: member.username,
          xAccessToken: tokens.access_token,
          xAccessTokenExpiresAt: withExpiry(tokens.expires_in),
          xRefreshToken: tokens.refresh_token ?? null,
          xConnectedAt: new Date(),
        },
      });
      await upsertSocialConnection({
        calendarId,
        platform: "X",
        platformAccountId: member.id,
        accountName: member.name,
        username: member.username,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: withExpiry(tokens.expires_in),
        refreshToken: tokens.refresh_token ?? null,
        tokenScopes: tokens.scope ?? null,
      });
    }

    return makeRedirect(`${settingsPath}&${channel}Connected=true`);
  } catch (error) {
    console.error(`${channel} OAuth callback failed:`, error);
    return makeRedirect(`${settingsPath}&${channel}Error=connection_failed`);
  }
}
