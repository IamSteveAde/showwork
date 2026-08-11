import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { sendNewUploadReadyForReviewEmail } from "@/lib/resend";

// Creates the actual TaskAsset row once a file finishes uploading to
// R2 — internalReviewStatus starts PENDING, since nothing skips the
// owner's review gate, not even a file the owner uploaded themself.
// Notifies the owner that something's ready for review, unless the
// owner is the one who just uploaded it — without this, a
// collaborator's finished work sat invisible until the owner happened
// to check back on their own.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { fileKey, filename, type } = await req.json();
  if (!fileKey) return NextResponse.json({ error: "fileKey is required" }, { status: 400 });
  if (type && !["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json({ error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" }, { status: 400 });
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { managedProject: { include: { creator: { select: { id: true, name: true, email: true } } } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const asset = await db.taskAsset.create({
    data: {
      taskId,
      fileKey,
      filename: typeof filename === "string" ? filename : null,
      type: type || "PHOTO",
      uploadedByCreatorId: creator.id,
    },
  });

  // Notify the owner — unless they're the one who just uploaded it.
  if (!isOwner) {
    try {
      await sendNewUploadReadyForReviewEmail({
        to: task.managedProject.creator.email,
        uploaderName: creator.name || creator.email,
        taskTitle: task.title,
        projectName: task.managedProject.name,
        projectUrl: `${appUrl()}/dashboard/managed/${task.managedProjectId}`,
      });
    } catch (err) {
      console.error("Failed to send new-upload notification email:", err);
    }
  }

  return NextResponse.json({ asset });
}