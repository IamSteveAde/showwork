import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileKey, type, caption, sectionId, displayOrder } = await req.json();
  if (!fileKey || !type) {
    return NextResponse.json({ error: "fileKey and type are required" }, { status: 400 });
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json({ error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" }, { status: 400 });
  }

  const portfolio = await db.portfolio.findUnique({ where: { creatorId: creator.id } });
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
      caption: caption ?? null,
      sectionId: sectionId ?? null,
      displayOrder: displayOrder ?? 0,
    },
  });

  return NextResponse.json({ media });
}