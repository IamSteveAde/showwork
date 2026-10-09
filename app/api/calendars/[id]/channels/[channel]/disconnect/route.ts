import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import type { PublishingChannel } from "@/lib/channelOAuthState";
import { markSocialConnectionDisconnected } from "@/lib/socialReporting";

const CHANNELS: PublishingChannel[] = ["facebook", "linkedin", "x"];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; channel: string }> },
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, channel: rawChannel } = await params;
  if (!CHANNELS.includes(rawChannel as PublishingChannel)) {
    return NextResponse.json({ error: "Unknown publishing channel." }, { status: 404 });
  }
  const channel = rawChannel as PublishingChannel;
  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    select: { managerId: true },
  });
  if (!calendar || !(await hasCalendarPermission(creator.id, id, "channels.manage"))) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const data = channel === "facebook"
    ? {
        facebookPageId: null,
        facebookPageName: null,
        facebookAccessToken: null,
        facebookTokenExpiresAt: null,
        facebookConnectedAt: null,
      }
    : channel === "linkedin"
      ? {
          linkedinMemberId: null,
          linkedinName: null,
          linkedinAccessToken: null,
          linkedinAccessTokenExpiresAt: null,
          linkedinRefreshToken: null,
          linkedinRefreshTokenExpiresAt: null,
          linkedinConnectedAt: null,
        }
      : {
          xUserId: null,
          xUsername: null,
          xAccessToken: null,
          xAccessTokenExpiresAt: null,
          xRefreshToken: null,
          xConnectedAt: null,
        };

  await db.socialCalendar.update({ where: { id }, data });
  const platform = channel === "facebook" ? "FACEBOOK" : channel === "linkedin" ? "LINKEDIN" : "X";
  await markSocialConnectionDisconnected(id, platform);
  return NextResponse.json({ ok: true });
}
