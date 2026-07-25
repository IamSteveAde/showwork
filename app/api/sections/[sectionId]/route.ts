import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

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

// DELETE — removes the section itself. Files inside it aren't deleted
// (onDelete: SetNull on Media.sectionId) — they just become ungrouped
// rather than disappearing.
export async function DELETE(
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

  await db.mediaSection.delete({ where: { id: sectionId } });
  return NextResponse.json({ ok: true });
}