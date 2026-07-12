import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedUploadUrl, buildMediaKey, isAllowedContentType } from "@/lib/r2";

// 2GB comfortably covers a 5-minute video at high bitrate (a 5-min clip at
// ~50Mbps runs ~1.9GB). R2's hard ceiling for a single PUT (no multipart)
// is 5GB — staying well under that with room to spare.
const MAX_FILE_SIZE_MB = 2000;

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

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const fileKey = buildMediaKey(projectId, filename);
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey });
}