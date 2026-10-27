import { randomUUID } from "node:crypto";
import { deliverySession, verifyDeliveryObject, matchesDeliveryType } from "@/lib/deliveryUploads";
import { validTaskKey } from "@/lib/deliveryUploads";
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
  const { fileKey, filename, type, folderId } = await req.json();
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

  const session = await deliverySession(task.managedProjectId, creator.id, fileKey, undefined, {purpose:"TASK",targetId:taskId});
  if (!session) return NextResponse.json({error:"Upload session expired. Restart this transfer.",code:"UPLOAD_SESSION_EXPIRED"},{status:409});
  if (!matchesDeliveryType(session.contentType, type || "PHOTO")) return NextResponse.json({error:"File type mismatch"},{status:400});
  const existing = await db.taskAsset.findUnique({where:{uploadSessionId:session.id}});
  if (existing) return NextResponse.json({asset:existing});
  // Confirm the folder actually belongs to this task before attaching
  // — otherwise a file could get silently tied to a folder from a
  // completely different task.
  if (folderId) {
    const folder = await db.taskFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.taskId !== taskId) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }
  }

  if (!validTaskKey(fileKey, task.managedProjectId, taskId)) return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
  try {
    await verifyDeliveryObject(session);
  } catch { return NextResponse.json({error:"Uploaded file could not be verified",code:"UPLOAD_NOT_VERIFIED"},{status:409}); }
  const assetId = randomUUID();
  const asset = await db.$transaction(async tx => {
    const saved = await tx.taskAsset.upsert({where:{uploadSessionId:session.id},update:{},create:{id:assetId,taskId,fileKey,filename:typeof filename === "string" ? filename : null,type:type || "PHOTO",folderId:folderId ?? null,uploadedByCreatorId:creator.id,uploadSessionId:session.id,sizeBytes:Number(session.expectedBytes)}});
    await tx.deliveryUploadSession.update({where:{id:session.id},data:{state:"COMPLETE",mediaId:saved.id}});
    return saved;
  });
  if (!isOwner && asset.id === assetId) {
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