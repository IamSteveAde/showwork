import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildTikTokAuthUrl } from "@/lib/tiktok";
import { appUrl } from "@/lib/url";

// GET — starts the TikTok connection flow for one calendar.
// Manager-only, same trust boundary as the Instagram connect route —
// connecting a real social account on someone's behalf is a bigger
// decision than editing posts. Redirects to TikTok's own
// authorization page; the calendar id travels through as `state` so
// the callback knows which calendar to attach the connection to.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.redirect(`${appUrl()}/login`);

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id }, select: { managerId: true } });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.redirect(`${appUrl()}/dashboard/calendars/${id}?tiktokError=not_found`);
  }

  const redirectUri = `${appUrl()}/api/calendars/tiktok/callback`;

  try {
    const authUrl = buildTikTokAuthUrl({ redirectUri, state: id });
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("Failed to build TikTok auth URL:", err);
    return NextResponse.redirect(`${appUrl()}/dashboard/calendars/${id}?tiktokError=not_configured`);
  }
}