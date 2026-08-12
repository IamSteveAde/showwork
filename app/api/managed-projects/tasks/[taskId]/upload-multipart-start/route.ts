import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { createMultipartUpload, isAllowedContentType } from "@/lib/r2";

const MAX_FILE_SIZE_MB = 20000;

// Starts a multipart upload session for a large task file — same
// access check as the existing single-part task presign route (the
// task's assignee, or the project owner), not the delivery-project
// checks the other multipart/start route uses. A task upload has
// nothing to do with delivery-project ownership or collaborators.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
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

  const task = await db.task.findUnique({ where: { id: taskId }, include: { managedProject: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `managed-projects/${task.managedProjectId}/tasks/${taskId}/${Date.now()}-${safeName}`;
  const uploadId = await createMultipartUpload(fileKey, contentType);

  return NextResponse.json({ uploadId, fileKey });
}