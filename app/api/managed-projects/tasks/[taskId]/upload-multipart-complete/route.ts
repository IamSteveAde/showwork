import { parseDeliveryParts } from "@/lib/deliveryUploads";
import { randomUUID } from "node:crypto";
import { deliverySession, verifyDeliveryObject, matchesDeliveryType } from "@/lib/deliveryUploads";
import { validTaskKey } from "@/lib/deliveryUploads";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { completeMultipartUpload } from "@/lib/r2";
import { appUrl } from "@/lib/url";
import { sendNewUploadReadyForReviewEmail } from "@/lib/resend";

// Stitches every uploaded chunk into one real file, then creates the
// actual TaskAsset row — mirrors the existing single-part task
// upload-complete route exactly (same review-status default, same
// notification-email logic), just fed by multipart chunks instead of
// one whole-file PUT.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { fileKey, uploadId, parts, filename, type, folderId } = await req.json();

  if (!fileKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json({ error: "fileKey, uploadId, and parts are required" }, { status: 400 });
  }
  if (type && !["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json({ error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" }, { status: 400 });
  }
  const typedParts = parseDeliveryParts(parts);
  if (!typedParts) return NextResponse.json({error:"Upload parts must be a contiguous, unique list"},{status:400});

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { managedProject: { include: { creator: { select: { id: true, name: true, email: true } } } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = task.managedProject.creatorId === creator.id;
  const isAssignee = task.assignedToCreatorId === creator.id;
  if (!isOwner && !isAssignee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await deliverySession(task.managedProjectId, creator.id, fileKey, uploadId, {purpose:"TASK",targetId:taskId});
  if (!session) return NextResponse.json({error:"Upload session expired. Restart this transfer.",code:"UPLOAD_SESSION_EXPIRED"},{status:409});
  if (!matchesDeliveryType(session.contentType, type || "PHOTO")) return NextResponse.json({error:"File type mismatch"},{status:400});
  const existing = await db.taskAsset.findUnique({where:{uploadSessionId:session.id}});
  if (existing) return NextResponse.json({asset:existing});
  if (folderId) {
    const folder = await db.taskFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.taskId !== taskId) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }
  }

  // The call that actually turns however many separately-uploaded
  // chunks into one real, complete file in R2 — nothing before this
  // point is a usable object yet.
  if (!validTaskKey(fileKey, task.managedProjectId, taskId)) return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
  try {
    try { await verifyDeliveryObject(session); } catch { await completeMultipartUpload(fileKey, uploadId, typedParts); await verifyDeliveryObject(session); }
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