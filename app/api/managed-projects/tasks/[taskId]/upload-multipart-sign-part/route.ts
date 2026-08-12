import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedPartUploadUrl } from "@/lib/r2";

// Signs exactly one chunk of an in-progress task-upload multipart
// session. Re-checks task access on every call, same reasoning as the
// delivery-side sign-part route: never trust the first check alone
// for the life of a long-running upload.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { fileKey, uploadId, partNumber } = await req.json();

  if (!fileKey || !uploadId || typeof partNumber !== "number") {
    return NextResponse.json({ error: "fileKey, uploadId, and partNumber are required" }, { status: 400 });
  }
  if (partNumber < 1) {
    return NextResponse.json({ error: "partNumber must be 1 or greater" }, { status: 400 });
  }

  const task = await db.task.findUnique({ where: { id: taskId }, include: { managedProject: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uploadUrl = await getPresignedPartUploadUrl(fileKey, uploadId, partNumber);

  return NextResponse.json({ uploadUrl });
}