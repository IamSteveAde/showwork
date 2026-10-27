import { deliverySession, verifyDeliveryObject, matchesDeliveryType } from "@/lib/deliveryUploads";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, fileKey, type, caption, displayOrder, sectionId, folderId, aspectRatio } = await req.json();

  if (typeof projectId !== "string" || typeof fileKey !== "string" || typeof type !== "string") {
    return NextResponse.json(
      { error: "projectId, fileKey, and type are required" },
      { status: 400 }
    );
  }
  if (!["PHOTO", "VIDEO", "DOCUMENT", "PDF"].includes(type)) {
    return NextResponse.json(
      { error: "type must be PHOTO, VIDEO, DOCUMENT, or PDF" },
      { status: 400 }
    );
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Same fix as every other route in this chain — a collaborator
  // completing their own upload isn't the project owner.
  const isOwner = project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const session = await deliverySession(projectId, creator.id, fileKey);
  if (!session) return NextResponse.json({ error: "This upload session has expired. Start a new upload.", code: "UPLOAD_SESSION_EXPIRED" }, { status: 409 });
  if (!matchesDeliveryType(session.contentType, type)) return NextResponse.json({ error: "The file type does not match this upload" }, { status: 400 });
  const existing = await db.media.findUnique({ where: { uploadSessionId: session.id } });
  if (existing) return NextResponse.json({ media: existing });
  // If a sectionId was passed, confirm it actually belongs to this
  // project before attaching — otherwise a file could get silently
  // tied to a section from a completely different project.
  if (sectionId) {
    const section = await db.mediaSection.findUnique({ where: { id: sectionId } });
    if (!section || section.projectId !== projectId) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  }

  // Same check for folderId — must genuinely belong to the section
  // being uploaded into, not just any folder that happens to exist
  // somewhere else in the project.
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
  try { sizeBytes = await verifyDeliveryObject(session); }
  catch { return NextResponse.json({ error: "The uploaded file could not be verified. Retry the transfer.", code: "UPLOAD_NOT_VERIFIED" }, { status: 409 }); }

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
