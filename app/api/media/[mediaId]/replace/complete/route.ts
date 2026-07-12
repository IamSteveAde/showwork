import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { deleteObject } from "@/lib/r2";
import { sendRevisionReadyEmail } from "@/lib/resend";

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

  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { project: true },
  });
  if (!media || media.project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (media.approvalStatus !== "NEEDS_REVISION") {
    return NextResponse.json(
      { error: "Only files flagged for revision can be replaced" },
      { status: 403 }
    );
  }
  if (media.project.replaceCount >= MAX_REPLACEMENTS_PER_PROJECT) {
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
        publicUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${media.project.slug}`,
      });
    } catch (err) {
      console.error("Failed to send revision-ready email:", err);
    }
  }

  return NextResponse.json({ media: updated });
}