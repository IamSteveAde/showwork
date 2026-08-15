import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedUploadUrl, isAllowedContentType, publicUrlFor } from "@/lib/r2";

const MAX_FILE_SIZE_MB = 5000;

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, fileSizeMb } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }
  if (!isAllowedContentType(contentType)) {
    return NextResponse.json({ error: `Unsupported file type: ${contentType}` }, { status: 400 });
  }
  if (typeof fileSizeMb === "number" && fileSizeMb > MAX_FILE_SIZE_MB) {
    return NextResponse.json({ error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` }, { status: 400 });
  }

  const portfolio = await db.portfolio.findUnique({ where: { creatorId: creator.id } });
  if (!portfolio) return NextResponse.json({ error: "No portfolio found" }, { status: 404 });

  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileKey = `portfolios/${portfolio.id}/${Date.now()}-${safeName}`;
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  // Included so callers that only need a direct, standalone file (like
  // a bio photo) can save this straight to their own field without a
  // separate step — unlike a portfolio gallery piece, a bio photo has
  // no PortfolioMedia row to create, so /upload/complete doesn't apply
  // here at all.
  return NextResponse.json({ uploadUrl, fileKey, publicUrl: publicUrlFor(fileKey) });
}