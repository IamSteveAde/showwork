import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedUploadUrl, buildMediaKey, isAllowedContentType } from "@/lib/r2";

// 5GB — same ceiling as the main upload presign route.
const MAX_FILE_SIZE_MB = 5000;

// Generous, but real — without a cap, a single ₦5,000 payment could be
// stretched into an unlimited free content pipeline by repeatedly
// swapping in unrelated files. 5 covers a real, tight revision cycle
// without leaving much room for it to be used as ongoing free delivery.
const MAX_REPLACEMENTS_PER_PROJECT = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
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

  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { project: true },
  });
  if (!media || media.project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only files the client actually flagged can be replaced — this isn't
  // a general-purpose "swap any file anytime" endpoint.
  if (media.approvalStatus !== "NEEDS_REVISION") {
    return NextResponse.json(
      { error: "Only files flagged for revision can be replaced" },
      { status: 403 }
    );
  }

  if (media.project.replaceCount >= MAX_REPLACEMENTS_PER_PROJECT && !creator.subscriptionActive) {
    return NextResponse.json(
      { error: "This project has reached its revision limit. Please create a new project for further work." },
      { status: 403 }
    );
  }

  const fileKey = buildMediaKey(media.projectId, filename);
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey });
}