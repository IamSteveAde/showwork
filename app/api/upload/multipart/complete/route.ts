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

  const { projectId, fileKey, uploadId, parts, type, caption, displayOrder, sectionId } = await req.json();

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
  const typedParts: { partNumber: number; etag: string }[] = parts.map(
    (p: { partNumber: unknown; etag: unknown }) => ({
      partNumber: Number(p.partNumber),
      etag: String(p.etag),
    })
  );

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
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

  if (sectionId) {
    const section = await db.mediaSection.findUnique({ where: { id: sectionId } });
    if (!section || section.projectId !== projectId) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  }

  // This is the call that actually turns however many separately-
  // uploaded chunks into one real, complete, readable file in R2 —
  // nothing before this point is a usable object yet.
  await completeMultipartUpload(fileKey, uploadId, typedParts);

  const media = await db.media.create({
    data: {
      projectId,
      fileKey,
      type,
      caption: caption ?? null,
      displayOrder: displayOrder ?? 0,
      sectionId: sectionId ?? null,
      uploadedByCreatorId: creator.id,
    },
  });

  return NextResponse.json({ media });
}