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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("flyerImageUrl" in body) data.flyerImageUrl = body.flyerImageUrl?.trim() || null;
  if ("topic" in body) data.topic = body.topic?.trim();
  if ("description" in body) data.description = body.description?.trim() || null;
  if ("whatToExpect" in body) data.whatToExpect = body.whatToExpect?.trim() || null;
  if ("guests" in body) data.guests = body.guests?.trim() || null;
  if ("startsAt" in body) data.startsAt = new Date(body.startsAt);
  if ("venue" in body) data.venue = body.venue?.trim() || null;
  if ("applyUrl" in body) data.applyUrl = body.applyUrl?.trim() || null;
  if ("replayUrl" in body) data.replayUrl = body.replayUrl?.trim() || null;
  // slug is deliberately never accepted here — it's set once at
  // creation and never editable afterward, so an already-shared
  // webinar link can never silently break.

  let speakerList: SpeakerInput[] | null = null;
  if (Array.isArray(body.speakers)) {
    speakerList = body.speakers;
    const speakerError = validateSpeakers(speakerList!);
    if (speakerError) {
      return NextResponse.json({ error: speakerError }, { status: 400 });
    }
  }

  // Wrapped in a transaction — the delete-then-recreate for speakers
  // needs to succeed or fail as one unit, so a webinar is never left
  // with zero speakers because the recreate half of the operation
  // failed partway through.
  const webinar = await db.$transaction(async (tx) => {
    if (speakerList) {
      await tx.webinarSpeaker.deleteMany({ where: { webinarId: id } });
      await tx.webinarSpeaker.createMany({
        data: speakerList.map((s, i) => ({
          webinarId: id,
          name: s.name.trim(),
          title: s.title.trim(),
          bio: s.bio?.trim() || null,
          profileImageUrl: s.profileImageUrl?.trim() || null,
          instagramUrl: s.instagramUrl?.trim() || null,
          youtubeUrl: s.youtubeUrl?.trim() || null,
          xUrl: s.xUrl?.trim() || null,
          linkedinUrl: s.linkedinUrl?.trim() || null,
          displayOrder: i,
        })),
      });
    }
    return tx.creativoWebinar.update({
      where: { id },
      data,
      include: { speakers: { orderBy: { displayOrder: "asc" } } },
    });
  });

  return NextResponse.json({ webinar });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.creativoWebinar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}