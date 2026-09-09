import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildInstagramAuthUrl } from "@/lib/instagram";
import { appUrl } from "@/lib/url";

// GET — starts the Instagram connection flow for one calendar.
// Manager-only (not collaborators, even ones with EDIT_CALENDAR —
// connecting a real social account on someone's behalf is a bigger
// trust decision than editing posts). Redirects straight to
// Facebook's OAuth dialog; the calendar id travels through as
// `state` so the callback knows which calendar to attach the
// connection to once Facebook redirects back.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.redirect(`${appUrl()}/login`);

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id }, select: { managerId: true } });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.redirect(`${appUrl()}/dashboard/calendars/${id}?instagramError=not_found`);
  }

  const redirectUri = `${appUrl()}/api/calendars/instagram/callback`;

  try {
    const authUrl = buildInstagramAuthUrl({ redirectUri, state: id });
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("Failed to build Instagram auth URL:", err);
    return NextResponse.redirect(`${appUrl()}/dashboard/calendars/${id}?instagramError=not_configured`);
  }
}