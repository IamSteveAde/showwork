import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedPartUploadUrl } from "@/lib/r2";

// Signs exactly one chunk of an in-progress replacement upload.
// Re-checks access on every call — never trust the first check alone
// for the life of a long-running upload.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const { fileKey, uploadId, partNumber } = await req.json();

  if (!fileKey || !uploadId || typeof partNumber !== "number") {
    return NextResponse.json({ error: "fileKey, uploadId, and partNumber are required" }, { status: 400 });
  }
  if (partNumber < 1) {
    return NextResponse.json({ error: "partNumber must be 1 or greater" }, { status: 400 });
  }

  const media = await db.media.findUnique({ where: { id: mediaId }, include: { project: true } });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = media.project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId: media.projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uploadUrl = await getPresignedPartUploadUrl(fileKey, uploadId, partNumber);

  return NextResponse.json({ uploadUrl });
}