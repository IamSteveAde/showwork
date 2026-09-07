import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createViewerToken } from "@/lib/auth";

// This cookie name is deliberately different from a delivery
// project's own viewer cookie, even though both use the same
// underlying signed-token mechanism — keeping the names distinct
// avoids any ambiguity about which kind of access a given cookie
// actually grants.
function cookieNameFor(calendarId: string) {
  return `calendar_viewer_${calendarId}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { password, email, name } = await req.json();

  const calendar = await db.socialCalendar.findUnique({ where: { slug } });
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!password || !(await verifyPassword(password, calendar.passwordHash))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Best-effort — a viewer entering their email at all is optional
  // context for the manager, not a requirement to get in.
  if (email) {
    try {
      await db.calendarViewerEmail.create({
        data: { calendarId: calendar.id, email, name: name || null },
      });
    } catch {
      // ignore — never block access over this
    }
  }

  const token = createViewerToken(calendar.id, email || "", name || null);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieNameFor(calendar.id), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}