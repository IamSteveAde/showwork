import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

// GET — every webinar, soonest/most-recent first, for the admin's
// own management table. Upcoming vs. past isn't stored or returned
// here as a flag — the admin table just shows the real date, and the
// public page is what computes upcoming/past at render time.
export async function GET() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webinars = await db.creativoWebinar.findMany({ orderBy: { startsAt: "desc" } });
  return NextResponse.json({ webinars });
}

// POST — creates one webinar. Recommended flyer dimensions are
// enforced client-side in the admin form (see the upload UI), not
// here — this route just stores whatever URL results.
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { flyerImageUrl, topic, guests, startsAt, venue, applyUrl, replayUrl } = await req.json();

  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }
  if (!startsAt) {
    return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
  }

  const webinar = await db.creativoWebinar.create({
    data: {
      flyerImageUrl: flyerImageUrl?.trim() || null,
      topic: topic.trim(),
      guests: guests?.trim() || null,
      startsAt: new Date(startsAt),
      venue: venue?.trim() || null,
      applyUrl: applyUrl?.trim() || null,
      replayUrl: replayUrl?.trim() || null,
    },
  });

  return NextResponse.json({ webinar });
}