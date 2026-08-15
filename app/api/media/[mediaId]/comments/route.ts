import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendVideoCommentNotificationEmail } from "@/lib/resend";
import { appUrl } from "@/lib/url";

// PUBLIC route — same reasoning as the review routes: the person
// calling this already passed the project's password and the
// mandatory name+email gate to see the media at all, and the media
// id itself is a UUID, not guessable. No creator auth check here.
//
// Unlike a review, there's no limit on how many of these one person
// can leave — each comment is independent, pinned to its own moment
// in the video, not a single verdict that gets overwritten.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const { note, videoTimestampSeconds, reviewerName, viewerEmail } = await req.json();

  if (!note || !note.trim()) {
    return NextResponse.json({ error: "A comment needs some text" }, { status: 400 });
  }
  if (typeof videoTimestampSeconds !== "number" || videoTimestampSeconds < 0) {
    return NextResponse.json({ error: "videoTimestampSeconds is required" }, { status: 400 });
  }
  if (!viewerEmail) {
    return NextResponse.json({ error: "viewerEmail is required" }, { status: 400 });
  }

  // Same reasoning as the review route: fetch both the project owner
  // and whoever specifically uploaded this file, since that may be a
  // collaborator who should hear about this directly, not only the
  // owner.
  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: {
      project: { include: { creator: true } },
      uploadedByCreator: true,
    },
  });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comment = await db.videoComment.create({
    data: {
      mediaId,
      note: note.trim(),
      videoTimestampSeconds,
      reviewerName: reviewerName?.trim() || null,
      reviewerEmail: viewerEmail,
    },
  });

  // Notify — best-effort, never let an email failure block the
  // comment itself from saving.
  const dashboardUrl = `${appUrl()}/dashboard/${media.projectId}`;
  const fileLabel = media.caption || media.fileKey.split("/").pop() || "a video";

  if (media.project.creator.email) {
    try {
      await sendVideoCommentNotificationEmail({
        to: media.project.creator.email,
        creatorName: media.project.creator.name,
        clientName: media.project.clientName,
        fileLabel,
        note: comment.note,
        videoTimestampSeconds: comment.videoTimestampSeconds,
        dashboardUrl,
      });
    } catch (err) {
      console.error("Failed to send video comment notification email to owner:", err);
    }
  }

  const uploader = media.uploadedByCreator;
  const uploaderIsDifferentFromOwner = uploader && uploader.id !== media.project.creator.id;

  if (uploaderIsDifferentFromOwner && uploader.email) {
    try {
      await sendVideoCommentNotificationEmail({
        to: uploader.email,
        creatorName: uploader.name,
        clientName: media.project.clientName,
        fileLabel,
        note: comment.note,
        videoTimestampSeconds: comment.videoTimestampSeconds,
        dashboardUrl,
      });
    } catch (err) {
      console.error("Failed to send video comment notification email to uploader:", err);
    }
  }

  return NextResponse.json({ comment });
}

// PUBLIC — every comment on this video, oldest first, matching how
// reviews are always returned for consistency across the app.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  const comments = await db.videoComment.findMany({
    where: { mediaId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}