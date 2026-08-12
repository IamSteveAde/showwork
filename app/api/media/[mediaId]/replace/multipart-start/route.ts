import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { createMultipartUpload, isAllowedContentType } from "@/lib/r2";

const MAX_FILE_SIZE_MB = 20000;
const MAX_REPLACEMENTS_PER_PROJECT = 5;

// Starts a multipart replacement upload for a large file — same
// permission and limit checks as the existing single-part replace
// presign route: owner or collaborator, the file must actually be
// flagged NEEDS_REVISION, and the project's owner mustn't have hit
// the replacement cap.
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
    include: {
      project: {
        include: {
          creator: { select: { id: true, subscriptionActive: true, isComped: true } },
        },
      },
    },
  });
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

  if (media.approvalStatus !== "NEEDS_REVISION") {
    return NextResponse.json(
      { error: "Only files flagged for revision can be replaced" },
      { status: 403 }
    );
  }

  if (
    media.project.replaceCount >= MAX_REPLACEMENTS_PER_PROJECT &&
    !media.project.creator.subscriptionActive &&
    !media.project.creator.isComped
  ) {
    return NextResponse.json(
      { error: "This project has reached its revision limit. Please create a new project for further work." },
      { status: 403 }
    );
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `projects/${media.projectId}/${Date.now()}-${safeName}`;
  const uploadId = await createMultipartUpload(fileKey, contentType);

  return NextResponse.json({ uploadId, fileKey });
}