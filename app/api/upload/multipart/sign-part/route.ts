import { deliverySession } from "@/lib/deliveryUploads";
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

  const { projectId, fileKey, uploadId, partNumber, partNumbers } = await req.json();

  const numbers: number[] = Array.isArray(partNumbers) ? partNumbers : [partNumber];
  if (typeof projectId !== "string" || typeof fileKey !== "string" || typeof uploadId !== "string" || numbers.length < 1 || numbers.length > 3 || numbers.some(number => !Number.isInteger(number) || number < 1 || number > 10000)) return NextResponse.json({ error: "Provide one to three valid upload part numbers" }, { status: 400 });

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
  if (!session || session.state !== "OPEN") return NextResponse.json({ error: "This upload session has expired. Start a new upload.", code: "UPLOAD_SESSION_EXPIRED" }, { status: 409 });
  const entries = await Promise.all(numbers.map(async number => [number, await getPresignedPartUploadUrl(fileKey, uploadId, number)] as const));
  return NextResponse.json(Array.isArray(partNumbers) ? {uploadUrls:Object.fromEntries(entries)} : {uploadUrl:entries[0][1]});
}
