import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedPartUploadUrl } from "@/lib/r2";

// POST — signs exactly one chunk of an in-progress multipart upload.
// Called once per part (a 10GB file at ~200MB chunks means ~50 calls
// to this route over the life of one upload) — re-checks project
// access every time rather than trusting the first check from the
// start route, matching the same security posture every other upload
// route in this app already uses.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, fileKey, uploadId, partNumber } = await req.json();

  if (!projectId || !fileKey || !uploadId || typeof partNumber !== "number") {
    return NextResponse.json(
      { error: "projectId, fileKey, uploadId, and partNumber are required" },
      { status: 400 }
    );
  }
  if (partNumber < 1) {
    return NextResponse.json({ error: "partNumber must be 1 or greater" }, { status: 400 });
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

  const uploadUrl = await getPresignedPartUploadUrl(fileKey, uploadId, partNumber);

  return NextResponse.json({ uploadUrl });
}