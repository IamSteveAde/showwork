import { createDeliverySession, expectedUploadBytes, deliverySession } from "@/lib/deliveryUploads";
import { resolveFileContentType } from "@/lib/mediaFileTypes";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedUploadUrl, buildMediaKey, isAllowedContentType } from "@/lib/r2";

// 2GB comfortably covers a 5-minute video at high bitrate (a 5-min clip at
// ~50Mbps runs ~1.9GB). R2's hard ceiling for a single PUT (no multipart)
// is 5GB — staying well under that with room to spare.
// 5GB stays safely under R2's hard ceiling for a single-part PUT (5GiB,
// ≈5.37GB). If this ever needs to go higher, R2 requires switching to
// multipart upload — a bigger change than just raising this number.
const MAX_FILE_SIZE_MB = 5000;

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, filename, contentType: suppliedContentType, fileSizeMb, resumeFileKey } = await req.json();
  const contentType = resolveFileContentType(
    typeof filename === "string" ? filename : "",
    typeof suppliedContentType === "string" ? suppliedContentType : ""
  );

  if (typeof projectId !== "string" || typeof filename !== "string" || !filename || !contentType) {
    return NextResponse.json(
      { error: "projectId, filename, and contentType are required" },
      { status: 400 }
    );
  }

  if (!isAllowedContentType(contentType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${contentType}` },
      { status: 400 }
    );
  }

  if (typeof fileSizeMb === "number" && fileSizeMb > MAX_FILE_SIZE_MB) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` },
      { status: 400 }
    );
  }

  try { expectedUploadBytes(fileSizeMb, 5000); } catch { return NextResponse.json({ error: "A valid positive file size is required" }, { status: 400 }); }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Same fix as the other project routes — a collaborator uploading
  // their own work isn't the project owner, so the old owner-only
  // check blocked every single one of their uploads at this exact step.
  const isOwner = project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (resumeFileKey) {
    const session = await deliverySession(projectId, creator.id, resumeFileKey);
    if (!session || session.expectedBytes !== expectedUploadBytes(fileSizeMb, MAX_FILE_SIZE_MB) || session.uploadId) return NextResponse.json({ error: "Upload session expired. Retry to start a new transfer.", code: "UPLOAD_SESSION_EXPIRED" }, { status: 409 });
    return NextResponse.json({ uploadUrl: await getPresignedUploadUrl(session.fileKey, session.contentType), fileKey: session.fileKey });
  }
  const fileKey = buildMediaKey(projectId, filename);
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  await createDeliverySession({ projectId, creatorId: creator.id, fileKey, fileSizeMb, contentType, maxMb: 5000 });
  return NextResponse.json({ uploadUrl, fileKey });
}