import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedUploadUrl, isAllowedContentType } from "@/lib/r2";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "ADD_CONTENT"))) {
    return NextResponse.json({ error: "You don't have permission to add content to this calendar" }, { status: 403 });
  }

  const post = await db.calendarPost.findUnique({ where: { id: postId } });
  if (!post || post.calendarId !== id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }
  if (!isAllowedContentType(contentType)) {
    return NextResponse.json({ error: "That file type isn't supported" }, { status: 400 });
  }

  const fileKey = `calendars/${id}/${postId}/${Date.now()}-${filename}`;
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey });
}