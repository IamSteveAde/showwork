import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { abortMultipartUpload } from "@/lib/r2";

// POST — cancels an in-progress multipart upload and tells R2 to
// discard whatever chunks were already sent. Without this ever being
// called on a genuinely abandoned upload, those chunks sit in the
// bucket as billed, invisible storage forever — completeMultipartUpload
// is the only thing that ever turns them into a real, trackable Media
// row, so an aborted one would otherwise never show up anywhere your
// normal delete logic could find it.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, fileKey, uploadId } = await req.json();

  if (!projectId || !fileKey || !uploadId) {
    return NextResponse.json({ error: "projectId, fileKey, and uploadId are required" }, { status: 400 });
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

  await abortMultipartUpload(fileKey, uploadId);

  return NextResponse.json({ ok: true });
}