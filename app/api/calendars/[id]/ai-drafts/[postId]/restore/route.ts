import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId } = await params;

  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to restore drafts" }, { status: 403 });
  }

  const post = await db.calendarPost.findFirst({
    where: { id: postId, calendarId: id, isAiDraft: true },
  });

  if (!post) return NextResponse.json({ error: "AI draft not found" }, { status: 404 });

  let body: { generationId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.generationId) {
    return NextResponse.json({ error: "A generation is required" }, { status: 400 });
  }

  const generation = await db.calendarPostAiGeneration.findFirst({
    where: {
      id: body.generationId,
      postId,
    },
  });

  if (!generation) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  const updated = await db.calendarPost.update({
    where: { id: postId },
    data: {
      postDate: generation.postDate,
      platform: generation.platform,
      postType: generation.postType,
      category: generation.category,
      caption: generation.caption,
      contentIdea: generation.contentIdea,
      cta: generation.cta,
      hashtags: generation.hashtags,
    },
  });

  return NextResponse.json({ post: updated });
}
