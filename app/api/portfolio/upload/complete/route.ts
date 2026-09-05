import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileKey, type, caption, sectionId, displayOrder, aspectRatio } = await req.json();
  if (!fileKey || !type) {
    return NextResponse.json({ error: "fileKey and type are required" }, { status: 400 });
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json({ error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" }, { status: 400 });
  }

  const portfolio = await db.portfolio.findFirst({ where: { creatorId: creator.id } });
  if (!portfolio) return NextResponse.json({ error: "No portfolio found" }, { status: 404 });

  if (sectionId) {
    const section = await db.portfolioSection.findUnique({ where: { id: sectionId } });
    if (!section || section.portfolioId !== portfolio.id) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  }

   const media = await db.portfolioMedia.create({
    data: {
      portfolioId: portfolio.id,
      fileKey,
      type,
      // Computed client-side from the local file before it was ever
      // uploaded — nearly instant since it reads from disk, not the
      // network. Optional: null just leaves the gallery to detect
      // this specific item's shape itself, without blocking anything
      // else in the section.
      aspectRatio: typeof aspectRatio === "number" ? aspectRatio : null,
      caption: caption ?? null,
      sectionId: sectionId ?? null,
      displayOrder: displayOrder ?? 0,
    },
  });

  return NextResponse.json({ media });
}