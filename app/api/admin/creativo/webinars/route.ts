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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Appends -2, -3, etc. only if the base slug is already taken — most
// webinars never collide, so this keeps ordinary URLs clean.
async function uniqueSlugFor(base: string): Promise<string> {
  let candidate = base || "webinar";
  let suffix = 2;
  while (await db.creativoWebinar.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

// POST — creates one webinar. Recommended flyer dimensions are
// enforced client-side in the admin form (see the upload UI), not
// here — this route just stores whatever URL results. The slug is
// generated once here, from the topic at this exact moment — it's
// deliberately never exposed as an editable field afterward, so it
// can't end up holding raw, un-slugified text the way an earlier
// directly-editable slug field once did on blog posts.
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { flyerImageUrl, topic, description, whatToExpect, guests, startsAt, venue, applyUrl, replayUrl } = await req.json();

  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }
  if (!startsAt) {
    return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
  }

  const slug = await uniqueSlugFor(slugify(topic.trim()));

  const webinar = await db.creativoWebinar.create({
    data: {
      slug,
      flyerImageUrl: flyerImageUrl?.trim() || null,
      topic: topic.trim(),
      description: description?.trim() || null,
      whatToExpect: whatToExpect?.trim() || null,
      guests: guests?.trim() || null,
      startsAt: new Date(startsAt),
      venue: venue?.trim() || null,
      applyUrl: applyUrl?.trim() || null,
      replayUrl: replayUrl?.trim() || null,
    },
  });

  return NextResponse.json({ webinar });
}