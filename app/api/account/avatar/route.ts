import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedUploadUrl, publicUrlFor, isAllowedContentType } from "@/lib/r2";

const MAX_AVATAR_SIZE_MB = 10;

// POST — starts an avatar upload: returns a presigned URL to PUT the
// file to directly, plus the final public URL to save once it's done.
// Not tied to a project, unlike the main media upload flow.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, fileSizeMb } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }
  if (!isAllowedContentType(contentType) || !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Avatar must be an image" }, { status: 400 });
  }
  if (typeof fileSizeMb === "number" && fileSizeMb > MAX_AVATAR_SIZE_MB) {
    return NextResponse.json({ error: `Avatar must be under ${MAX_AVATAR_SIZE_MB}MB` }, { status: 400 });
  }

  const fileKey = `avatars/${creator.id}/${randomUUID()}-${filename}`;
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, publicUrl: publicUrlFor(fileKey) });
}

// PATCH — call once the actual file PUT to R2 has succeeded, to save
// the resulting URL onto the creator's profile.
export async function PATCH(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { avatarUrl } = await req.json();
  if (!avatarUrl) {
    return NextResponse.json({ error: "avatarUrl is required" }, { status: 400 });
  }

  const updated = await db.creator.update({ where: { id: creator.id }, data: { avatarUrl } });
  return NextResponse.json({ creator: updated });
}