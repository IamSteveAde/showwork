import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { abortMultipartUpload } from "@/lib/r2";

// Cancels an in-progress task-upload multipart session and tells R2
// to discard whatever chunks were already sent.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { fileKey, uploadId } = await req.json();

  if (!fileKey || !uploadId) {
    return NextResponse.json({ error: "fileKey and uploadId are required" }, { status: 400 });
  }

  const task = await db.task.findUnique({ where: { id: taskId }, include: { managedProject: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await abortMultipartUpload(fileKey, uploadId);

  return NextResponse.json({ ok: true });
}