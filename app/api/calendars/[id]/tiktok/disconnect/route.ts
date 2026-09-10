import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// POST — disconnects TikTok from one calendar. Manager-only, same
// trust boundary as connecting. Doesn't touch any already-published
// post's own record — only clears the live connection, not history.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id }, select: { managerId: true } });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  await db.socialCalendar.update({
    where: { id },
    data: {
      tikTokOpenId: null,
      tikTokUsername: null,
      tikTokAccessToken: null,
      tikTokAccessTokenExpiresAt: null,
      tikTokRefreshToken: null,
      tikTokConnectedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}