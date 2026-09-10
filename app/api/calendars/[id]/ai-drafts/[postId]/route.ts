import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

// PATCH — confirms one draft, turning it into a completely normal
// CalendarPost. From this point on it's indistinguishable from a
// manually created post — it goes through the exact same
// client-approval and auto-publish flow as anything else.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to review drafts on this calendar" }, { status: 403 });
  }

  const post = await db.calendarPost.findUnique({ where: { id: postId } });
  if (!post || post.calendarId !== id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  if (!post.isAiDraft) {
    return NextResponse.json({ error: "This post has already been confirmed" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // The manager can edit any field while confirming, not just accept
  // it as-is — the AI's output is a starting point, not something
  // that has to be published verbatim.
  const updated = await db.calendarPost.update({
    where: { id: postId },
    data: {
      isAiDraft: false,
      caption: body.caption !== undefined ? body.caption?.trim() || null : undefined,
      contentIdea: body.contentIdea !== undefined ? body.contentIdea?.trim() || null : undefined,
      cta: body.cta !== undefined ? body.cta?.trim() || null : undefined,
      hashtags: body.hashtags !== undefined ? body.hashtags?.trim() || null : undefined,
      postDate: body.postDate !== undefined ? new Date(body.postDate) : undefined,
    },
  });

  return NextResponse.json({ post: updated });
}

// DELETE — discards one draft entirely, no confirmation needed on
// the client's part since a draft was never visible to them in the
// first place — there's nothing for them to lose by this happening.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to review drafts on this calendar" }, { status: 403 });
  }

  const post = await db.calendarPost.findUnique({ where: { id: postId } });
  if (!post || post.calendarId !== id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  if (!post.isAiDraft) {
    return NextResponse.json({ error: "This post has already been confirmed — delete it from the calendar instead" }, { status: 400 });
  }

  await db.calendarPost.delete({ where: { id: postId } });

  return NextResponse.json({ ok: true });
}