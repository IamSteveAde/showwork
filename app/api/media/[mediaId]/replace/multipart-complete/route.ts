import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { completeMultipartUpload, deleteObject } from "@/lib/r2";
import { sendRevisionReadyEmail } from "@/lib/resend";
import { appUrl } from "@/lib/url";

const MAX_REPLACEMENTS_PER_PROJECT = 5;

// Stitches every uploaded chunk into the real replacement file, then
// does exactly what the existing single-part replace/complete route
// does: update the Media row, bump replaceCount, delete the old file,
// notify whoever flagged it. Same permission and limit checks as the
// other replace routes.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const { fileKey, uploadId, parts } = await req.json();

  if (!fileKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json({ error: "fileKey, uploadId, and parts are required" }, { status: 400 });
  }
  const typedParts: { partNumber: number; etag: string }[] = parts.map(
    (p: { partNumber: unknown; etag: unknown }) => ({
      partNumber: Number(p.partNumber),
      etag: String(p.etag),
    })
  );

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

  // The call that actually turns however many separately-uploaded
  // chunks into one real, complete file in R2 — nothing before this
  // point is a usable object yet.
  await completeMultipartUpload(fileKey, uploadId, typedParts);

  const oldFileKey = media.fileKey;
  const notifyEmail = media.reviewerEmail; // whoever flagged this specific file

  const updated = await db.media.update({
    where: { id: mediaId },
    data: {
      fileKey,
      approvalStatus: "PENDING",
      approvalNote: null,
      reviewedAt: null,
      reviewerEmail: null,
      uploadedByCreatorId: creator.id,
    },
  });

  await db.project.update({
    where: { id: media.projectId },
    data: { replaceCount: { increment: 1 } },
  });

  deleteObject(oldFileKey).catch((err) => console.error("Failed to delete old file:", err));

  if (notifyEmail) {
    try {
      await sendRevisionReadyEmail({
        to: notifyEmail,
        clientName: media.project.clientName,
        publicUrl: `${appUrl()}/${media.project.slug}`,
      });
    } catch (err) {
      console.error("Failed to send revision-ready email:", err);
    }
  }

  return NextResponse.json({ media: updated });
}