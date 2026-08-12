import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedPartUploadUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileKey, uploadId, partNumber } = await req.json();
  if (!fileKey || !uploadId || typeof partNumber !== "number") {
    return NextResponse.json({ error: "fileKey, uploadId, and partNumber are required" }, { status: 400 });
  }
  if (partNumber < 1) {
    return NextResponse.json({ error: "partNumber must be 1 or greater" }, { status: 400 });
  }

  const portfolio = await db.portfolio.findUnique({ where: { creatorId: creator.id } });
  if (!portfolio) return NextResponse.json({ error: "No portfolio found" }, { status: 404 });

  const uploadUrl = await getPresignedPartUploadUrl(fileKey, uploadId, partNumber);

  return NextResponse.json({ uploadUrl });
}