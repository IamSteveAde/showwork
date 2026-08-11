import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { deleteObject } from "@/lib/r2";

// Owner can manage any file on their project. A collaborator can only
// manage files they themselves uploaded — never someone else's, same
// "don't let people touch each other's work" boundary used everywhere
// else in the collaboration system. Unlike sections, this is safe to
// scope precisely because Media actually tracks who uploaded it
// (uploadedByCreatorId), so there's no ambiguity to guess around.
function canManage(media: { project: { creatorId: string }; uploadedByCreatorId: string | null }, creatorId: string): boolean {
  return media.project.creatorId === creatorId || media.uploadedByCreatorId === creatorId;
}

// DELETE a single file — owner, or whoever uploaded it.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { project: true },
  });
  if (!media || !canManage(media, creator.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If this file was the project's hero, clear that reference so nothing
  // points at a deleted file — the delivery page falls back to
  // auto-picking a new hero automatically.
  if (media.project.heroMediaId === mediaId) {
    await db.project.update({ where: { id: media.projectId }, data: { heroMediaId: null } });
  }

  await db.media.delete({ where: { id: mediaId } });

  deleteObject(media.fileKey).catch((err) => console.error("Failed to delete file from R2:", err));

  return NextResponse.json({ ok: true });
}

// PATCH — edit a file's caption/label. Owner, or whoever uploaded it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const { caption } = await req.json();

  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { project: true },
  });
  if (!media || !canManage(media, creator.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.media.update({
    where: { id: mediaId },
    data: { caption: caption?.trim() || null },
  });

  return NextResponse.json({ media: updated });
}