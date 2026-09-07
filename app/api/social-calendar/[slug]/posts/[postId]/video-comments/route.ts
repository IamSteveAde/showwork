import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyViewerToken } from "@/lib/auth";

function cookieNameFor(calendarId: string) {
  return `calendar_viewer_${calendarId}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const { slug, postId } = await params;

  const calendar = await db.socialCalendar.findUnique({ where: { slug } });
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = req.cookies.get(cookieNameFor(calendar.id))?.value;
  const viewer = token ? verifyViewerToken(token, calendar.id) : null;
  if (!viewer) return NextResponse.json({ error: "Please unlock this calendar first" }, { status: 401 });

  const post = await db.calendarPost.findUnique({ where: { id: postId } });
  if (!post || post.calendarId !== calendar.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { note, videoTimestampSeconds } = await req.json();
  if (!note || !note.trim()) {
    return NextResponse.json({ error: "A comment is required" }, { status: 400 });
  }

  const comment = await db.calendarPostVideoComment.create({
    data: {
      postId,
      authorName: viewer.name,
      authorEmail: viewer.email || "Client",
      note: note.trim(),
      videoTimestampSeconds: Number(videoTimestampSeconds) || 0,
    },
  });

  return NextResponse.json({ comment });
}