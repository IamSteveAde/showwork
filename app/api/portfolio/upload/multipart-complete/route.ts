import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { completeMultipartUpload } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileKey, uploadId, parts, type, caption, sectionId, displayOrder, aspectRatio } = await req.json();
  if (!fileKey || !uploadId || !Array.isArray(parts) || parts.length === 0 || !type) {
    return NextResponse.json({ error: "fileKey, uploadId, parts, and type are required" }, { status: 400 });
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json({ error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" }, { status: 400 });
  }
  const typedParts: { partNumber: number; etag: string }[] = parts.map(
    (p: { partNumber: unknown; etag: unknown }) => ({
      partNumber: Number(p.partNumber),
      etag: String(p.etag),
    })
  );

  const portfolio = await db.portfolio.findFirst({ where: { creatorId: creator.id } });
  if (!portfolio) return NextResponse.json({ error: "No portfolio found" }, { status: 404 });

  if (sectionId) {
    const section = await db.portfolioSection.findUnique({ where: { id: sectionId } });
    if (!section || section.portfolioId !== portfolio.id) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  }

  // The call that actually turns however many separately-uploaded
  // chunks into one real, complete file in R2 — nothing before this
  // point is a usable object yet.
  await completeMultipartUpload(fileKey, uploadId, typedParts);

  const media = await db.portfolioMedia.create({
    data: {
      portfolioId: portfolio.id,
      fileKey,
      type,
      aspectRatio: typeof aspectRatio === "number" ? aspectRatio : null,
      caption: caption ?? null,
      sectionId: sectionId ?? null,
      displayOrder: displayOrder ?? 0,
    },
  });

  return NextResponse.json({ media });
}