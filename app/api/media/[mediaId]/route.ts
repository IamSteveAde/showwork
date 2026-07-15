import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { deleteObject } from "@/lib/r2";

// DELETE a single file — creator-only, ownership checked.
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
  if (!media || media.project.creatorId !== creator.id) {
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

// PATCH — edit a file's caption/label.
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
  if (!media || media.project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.media.update({
    where: { id: mediaId },
    data: { caption: caption?.trim() || null },
  });

  return NextResponse.json({ media: updated });
}