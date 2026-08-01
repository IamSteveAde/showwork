import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/r2";

// PATCH — rename a portfolio section, and/or set which of its own
// files should stand in as its cover/banner.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const section = await db.portfolioSection.findUnique({
    where: { id: sectionId },
    include: { portfolio: { select: { creatorId: true } }, media: { select: { id: true } } },
  });
  if (!section || section.portfolio.creatorId !== creator.id) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const { name, coverMediaId } = await req.json();
  const data: { name?: string; coverMediaId?: string | null } = {};

  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (coverMediaId !== undefined) {
    if (coverMediaId !== null && !section.media.some((m) => m.id === coverMediaId)) {
      return NextResponse.json({ error: "That file isn't part of this section" }, { status: 400 });
    }
    data.coverMediaId = coverMediaId;
  }

  const updated = await db.portfolioSection.update({
    where: { id: sectionId },
    data,
  });

  return NextResponse.json({ section: updated });
}

// DELETE — permanently deletes the section and every file inside it,
// including the actual stored files in R2 — matching how project
// sections behave.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const section = await db.portfolioSection.findUnique({
    where: { id: sectionId },
    include: {
      portfolio: { select: { creatorId: true } },
      media: { select: { fileKey: true } },
    },
  });
  if (!section || section.portfolio.creatorId !== creator.id) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const fileKeys = section.media.map((m) => m.fileKey);
  await db.portfolioSection.delete({ where: { id: sectionId } });
  await Promise.allSettled(fileKeys.map((key) => deleteObject(key)));

  return NextResponse.json({ ok: true });
}