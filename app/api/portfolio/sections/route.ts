import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// POST — creates a new named section on the creator's portfolio,
// mirroring how project sections work: type + name, files added
// afterward via the upload flow.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolio = await db.portfolio.findFirst({ where: { creatorId: creator.id } });
  if (!portfolio) return NextResponse.json({ error: "No portfolio found" }, { status: 404 });

  const { name, mediaType } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Give this section a name" }, { status: 400 });
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(mediaType)) {
    return NextResponse.json({ error: "mediaType must be PHOTO, VIDEO, DOCUMENT, or PDF" }, { status: 400 });
  }

  const existingCount = await db.portfolioSection.count({ where: { portfolioId: portfolio.id } });

  const section = await db.portfolioSection.create({
    data: {
      portfolioId: portfolio.id,
      name: name.trim(),
      mediaType,
      displayOrder: existingCount,
    },
  });

  return NextResponse.json({ section });
}