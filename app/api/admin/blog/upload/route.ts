import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getPresignedUploadUrl, isAllowedContentType, publicUrlFor } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { filename, contentType } = await req.json();

  if (!contentType || !isAllowedContentType(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const extension = filename?.split(".").pop() || "jpg";
  const fileKey = `blog/${randomUUID()}.${extension}`;

  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey, publicUrl: publicUrlFor(fileKey) });
}