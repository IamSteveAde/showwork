import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { deleteObject } from "@/lib/r2";
import { sendRevisionReadyEmail } from "@/lib/resend";
import { appUrl } from "@/lib/url";

const MAX_REPLACEMENTS_PER_PROJECT = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const { fileKey } = await req.json();
  if (!fileKey) return NextResponse.json({ error: "fileKey is required" }, { status: 400 });

  // Includes the owner's subscription fields — the replacement quota
  // below is based on whoever OWNS the project, not whoever happens
  // to be uploading the fix. Same reasoning as the upload-batch quota.
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

  // A collaborator replacing a file they were the one flagged on
  // needs this to work too, not just the project owner.
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

  // Unlimited for active subscribers *and* comped (admin-granted free)
  // accounts — the cap only exists to stop the old one-time-payment
  // model being stretched into free ongoing use, which doesn't apply
  // to either of those cases. Checked against the project's owner,
  // not whoever is currently replacing the file.
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

  const oldFileKey = media.fileKey;
  const notifyEmail = media.reviewerEmail; // whoever flagged this specific file

  const updated = await db.media.update({
    where: { id: mediaId },
    data: {
      fileKey,
      approvalStatus: "PENDING",
      approvalNote: null,
      reviewedAt: null,
      reviewerEmail: null, // cleared until the next review comes in
      // Attribution follows whoever actually fixed the file — if a
      // different collaborator (or the owner) is the one replacing
      // it, future feedback on this file should reach them, not
      // whoever originally uploaded the now-replaced version.
      uploadedByCreatorId: creator.id,
    },
  });

  await db.project.update({
    where: { id: media.projectId },
    data: { replaceCount: { increment: 1 } },
  });

  deleteObject(oldFileKey).catch((err) => console.error("Failed to delete old file:", err));

  // Notify whoever flagged this file that a fix has been uploaded.
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