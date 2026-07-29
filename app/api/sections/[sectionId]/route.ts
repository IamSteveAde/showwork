import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/r2";

// PATCH — rename an existing section. The whole point of letting
// creators name these themselves is that they should be able to
// change their mind afterward too.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const section = await db.mediaSection.findUnique({
    where: { id: sectionId },
    include: { project: { select: { creatorId: true } } },
  });
  if (!section || section.project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  }

  const updated = await db.mediaSection.update({
    where: { id: sectionId },
    data: { name: name.trim() },
  });

  return NextResponse.json({ section: updated });
}

// DELETE — permanently deletes the section AND every file inside it —
// both the database rows (via cascade, now that Media.section uses
// onDelete: Cascade) and the actual stored files in R2. This is
// genuinely destructive: once confirmed, there's no "ungroup instead"
// middle ground and no way to recover the files afterward.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const section = await db.mediaSection.findUnique({
    where: { id: sectionId },
    include: {
      project: { select: { creatorId: true } },
      media: { select: { fileKey: true } },
    },
  });
  if (!section || section.project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  // Grab every file's storage key before the section (and its media
  // rows, via cascade) are deleted from the database.
  const fileKeys = section.media.map((m) => m.fileKey);

  await db.mediaSection.delete({ where: { id: sectionId } });

  // Best-effort — the database records are already gone regardless of
  // whether these R2 deletions succeed; a stray orphaned file in
  // storage is a much smaller problem than blocking the delete itself
  // on a storage hiccup.
  await Promise.allSettled(fileKeys.map((key) => deleteObject(key)));

  return NextResponse.json({ ok: true });
}