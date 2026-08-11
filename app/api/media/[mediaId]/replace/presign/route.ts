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

  // Includes the owner's subscription fields — same reasoning as the
  // replace-complete route: the quota is based on whoever OWNS the
  // project, not whoever happens to be uploading the replacement.
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

  // A collaborator getting a presigned URL to fix their own flagged
  // file needs this to work too, not just the project owner.
  const isOwner = media.project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId: media.projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
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

  // Unlimited for active subscribers *and* comped (admin-granted free)
  // accounts — the cap only exists to stop the old one-time-payment
  // model being stretched into free ongoing use, which doesn't apply
  // to either of those cases. Checked against the project's owner,
  // not whoever is currently requesting the replacement.
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

  const fileKey = buildMediaKey(media.projectId, filename);
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey });
}