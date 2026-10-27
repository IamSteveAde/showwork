import { parseDeliveryParts } from "@/lib/deliveryUploads";
import { deliverySession, verifyDeliveryObject, matchesDeliveryType } from "@/lib/deliveryUploads";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { completeMultipartUpload } from "@/lib/r2";

// POST — the final step: stitches every uploaded chunk into one real
// object in R2, then creates the actual Media row — mirrors the
// single-part /api/upload/complete route exactly, just fed by
// multipart chunks instead of one whole-file PUT.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, fileKey, uploadId, parts, type, caption, displayOrder, sectionId, folderId, aspectRatio } = await req.json();

  if (!projectId || !fileKey || !uploadId || !Array.isArray(parts) || parts.length === 0 || !type) {
    return NextResponse.json(
      { error: "projectId, fileKey, uploadId, parts, and type are required" },
      { status: 400 }
    );
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json(
      { error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" },
      { status: 400 }
    );
  }
  // Validating shape at runtime (the .every() check) doesn't narrow
  // the actual TypeScript type of `parts` — it's still effectively
  // unknown[] as far as the compiler's concerned, since .every() here
  // isn't a type guard function. Explicitly mapping into a real typed
  // array (with runtime coercion) is what actually satisfies
  // completeMultipartUpload's signature below, rather than just
  // checking shape and passing the original loose value through.
  const validParts = parts.every(
    (p: unknown) =>
      typeof p === "object" && p !== null && "partNumber" in p && "etag" in p
  );
  if (!validParts) {
    return NextResponse.json({ error: "Each part needs a partNumber and etag" }, { status: 400 });
  }
  const typedParts = parseDeliveryParts(parts);
  if (!typedParts) return NextResponse.json({error:"Upload parts must be a contiguous, unique list"},{status:400});

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isOwner = project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId, creatorId: creator.id },
    })) !== null;
  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const session = await deliverySession(projectId, creator.id, fileKey, uploadId);
  if (!session) return NextResponse.json({ error: "This upload session has expired. Start a new upload.", code: "UPLOAD_SESSION_EXPIRED" }, { status: 409 });
  if (!matchesDeliveryType(session.contentType, type)) return NextResponse.json({ error: "The file type does not match this upload" }, { status: 400 });
  const existing = await db.media.findUnique({ where: { uploadSessionId: session.id } });
  if (existing) return NextResponse.json({ media: existing });
  if (sectionId) {
    const section = await db.mediaSection.findUnique({ where: { id: sectionId } });
    if (!section || section.projectId !== projectId) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  }

  if (folderId) {
    if (!sectionId) {
      return NextResponse.json({ error: "A folder requires a section" }, { status: 400 });
    }
    const folder = await db.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.sectionId !== sectionId) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }
  }

  let sizeBytes: number;
  try {
    // A previous attempt may have completed R2 before DB registration failed.
    try { sizeBytes = await verifyDeliveryObject(session); }
    catch {
      await completeMultipartUpload(fileKey, uploadId, typedParts);
      sizeBytes = await verifyDeliveryObject(session);
    }
  } catch { return NextResponse.json({ error: "The video upload is incomplete or its size does not match. Retry the missing parts.", code: "UPLOAD_NOT_VERIFIED" }, { status: 409 }); }

  const data = {
    projectId, fileKey, type: type as "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF", caption: typeof caption === "string" ? caption : null,
    displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
    sectionId: sectionId ?? null, folderId: folderId ?? null,
    uploadedByCreatorId: creator.id, uploadSessionId: session.id, sizeBytes,
    aspectRatio: typeof aspectRatio === "number" && Number.isFinite(aspectRatio) && aspectRatio > 0 && aspectRatio < 100 ? aspectRatio : null,
  };
  const media = await db.$transaction(async tx => {
    const saved = await tx.media.upsert({ where: { uploadSessionId: session.id }, create: data, update: {} });
    await tx.deliveryUploadSession.update({ where: { id: session.id }, data: { state: "COMPLETE", mediaId: saved.id } });
    return saved;
  });
  return NextResponse.json({ media });
}
