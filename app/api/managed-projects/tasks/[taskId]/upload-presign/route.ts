import { randomUUID } from "node:crypto";
import { createDeliverySession, expectedUploadBytes, deliverySession } from "@/lib/deliveryUploads";
import { resolveFileContentType } from "@/lib/mediaFileTypes";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedUploadUrl, isAllowedContentType } from "@/lib/r2";

const MAX_FILE_SIZE_MB = 5000;

// Only the task's assignee or the project owner can upload to it —
// same "your own work" boundary used for delivery projects.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { filename, contentType: suppliedContentType, fileSizeMb, resumeFileKey } = await req.json();
  const contentType = resolveFileContentType(
    typeof filename === "string" ? filename : "",
    typeof suppliedContentType === "string" ? suppliedContentType : ""
  );

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

  try { expectedUploadBytes(fileSizeMb, MAX_FILE_SIZE_MB); } catch { return NextResponse.json({ error: "A valid file size is required" }, { status: 400 }); }
  if (resumeFileKey) {
    const session = await deliverySession(task.managedProjectId, creator.id, resumeFileKey, undefined, {purpose:"TASK",targetId:taskId});
    if (!session || session.uploadId || session.expectedBytes !== expectedUploadBytes(fileSizeMb, MAX_FILE_SIZE_MB)) return NextResponse.json({error:"Upload session expired. Retry to start again.",code:"UPLOAD_SESSION_EXPIRED"},{status:409});
    return NextResponse.json({uploadUrl:await getPresignedUploadUrl(session.fileKey, session.contentType),fileKey:session.fileKey});
  }
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `managed-projects/${task.managedProjectId}/tasks/${taskId}/${randomUUID()}-${safeName}`;
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  await createDeliverySession({projectId: task.managedProjectId, targetId: taskId, creatorId: creator.id, fileKey, fileSizeMb, contentType, maxMb: MAX_FILE_SIZE_MB, purpose: "TASK"});
  return NextResponse.json({ uploadUrl, fileKey });
}