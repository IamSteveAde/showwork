import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { createMultipartUpload, isAllowedContentType, buildMediaKey } from "@/lib/r2";

// Real ceiling for R2 in general (5TB via multipart) isn't the point
// here — this is a sane product-level limit, comfortably within what
// R2 actually supports for a multipart object.
const MAX_FILE_SIZE_MB = 20000;

// POST — starts a multipart upload session for a large file. Same
// access check as the regular single-part presign route: the project
// owner, or a collaborator on it.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, filename, contentType, fileSizeMb } = await req.json();

  if (!projectId || !filename || !contentType) {
    return NextResponse.json(
      { error: "projectId, filename, and contentType are required" },
      { status: 400 }
    );
  }
  if (!isAllowedContentType(contentType)) {
    return NextResponse.json({ error: `Unsupported file type: ${contentType}` }, { status: 400 });
  }
  if (typeof fileSizeMb === "number" && fileSizeMb > MAX_FILE_SIZE_MB) {
    return NextResponse.json({ error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` }, { status: 400 });
  }

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

  const fileKey = buildMediaKey(projectId, filename);
  const uploadId = await createMultipartUpload(fileKey, contentType);

  return NextResponse.json({ uploadId, fileKey });
}