import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

const MAX_BIO_LENGTH = 185;

interface SpeakerInput {
  name: string;
  title: string;
  bio?: string;
  profileImageUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  xUrl?: string;
  linkedinUrl?: string;
}

function validateSpeakers(speakers: SpeakerInput[]): string | null {
  for (const s of speakers) {
    if (!s.name?.trim()) return "Every speaker needs a name";
    if (!s.title?.trim()) return "Every speaker needs a title (e.g. Host, Guest Speaker)";
    if (s.bio && s.bio.length > MAX_BIO_LENGTH) return `Bio for ${s.name} exceeds ${MAX_BIO_LENGTH} characters`;
  }
  return null;
}

function speakerCreateData(speakers: SpeakerInput[]) {
  return speakers.map((s, i) => ({
    name: s.name.trim(),
    title: s.title.trim(),
    bio: s.bio?.trim() || null,
    profileImageUrl: s.profileImageUrl?.trim() || null,
    instagramUrl: s.instagramUrl?.trim() || null,
    youtubeUrl: s.youtubeUrl?.trim() || null,
    xUrl: s.xUrl?.trim() || null,
    linkedinUrl: s.linkedinUrl?.trim() || null,
    displayOrder: i,
  }));
}

// GET — every webinar, soonest/most-recent first, for the admin's
// own management table. Upcoming vs. past isn't stored or returned
// here as a flag — the admin table just shows the real date, and the
// public page is what computes upcoming/past at render time.
export async function GET() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webinars = await db.creativoWebinar.findMany({
    orderBy: { startsAt: "desc" },
    include: { speakers: { orderBy: { displayOrder: "asc" } } },
  });
  return NextResponse.json({ webinars });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlugFor(base: string): Promise<string> {
  let candidate = base || "webinar";
  let suffix = 2;
  while (await db.creativoWebinar.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

// POST — creates one webinar, plus any speakers submitted alongside
// it. Speakers are created as nested rows in the same operation
// rather than a separate request, matching the admin form managing
// them inline as part of the same "create a webinar" flow.
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { flyerImageUrl, topic, description, whatToExpect, guests, startsAt, venue, applyUrl, replayUrl, speakers } = await req.json();

  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }
  if (!startsAt) {
    return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
  }

  const speakerList: SpeakerInput[] = Array.isArray(speakers) ? speakers : [];
  const speakerError = validateSpeakers(speakerList);
  if (speakerError) {
    return NextResponse.json({ error: speakerError }, { status: 400 });
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
      speakers: { create: speakerCreateData(speakerList) },
    },
    include: { speakers: { orderBy: { displayOrder: "asc" } } },
  });

  return NextResponse.json({ webinar });
}