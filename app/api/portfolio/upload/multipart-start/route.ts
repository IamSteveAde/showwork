import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { createMultipartUpload, isAllowedContentType } from "@/lib/r2";

const MAX_FILE_SIZE_MB = 20000;

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
  const uploadId = await createMultipartUpload(fileKey, contentType);

  return NextResponse.json({ uploadId, fileKey });
}