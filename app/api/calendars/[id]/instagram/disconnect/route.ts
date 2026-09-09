import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// POST — disconnects Instagram from one calendar. Manager-only, same
// trust boundary as connecting in the first place. Doesn't touch any
// already-published post's record (instagramPublishedAt,
// instagramMediaId, etc. all stay exactly as they are) — this only
// clears the live connection, not history.
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
      instagramAccountId: null,
      instagramUsername: null,
      instagramPageId: null,
      instagramAccessToken: null,
      instagramTokenExpiresAt: null,
      instagramConnectedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}