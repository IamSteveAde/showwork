import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getPresignedUploadUrl, isAllowedContentType, publicUrlFor } from "@/lib/r2";

// Admin-only — used for leaderboard profile photos and webinar
// flyers. Deliberately separate from the portfolio/delivery upload
// routes, which are scoped to a specific creator's own project or
// portfolio; this one has no such owner, since it's platform-level
// Creativo content.
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }
  if (!isAllowedContentType(contentType)) {
    return NextResponse.json({ error: `Unsupported file type: ${contentType}` }, { status: 400 });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileKey = `creativo/${Date.now()}-${safeName}`;
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey, publicUrl: publicUrlFor(fileKey) });
}