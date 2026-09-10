import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyViewerToken } from "@/lib/auth";
import { sendCalendarPostReviewedEmail } from "@/lib/resend";
import { publicUrlFor } from "@/lib/r2";

function cookieNameFor(calendarId: string) {
  return `calendar_viewer_${calendarId}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const { slug, postId } = await params;

  const calendar = await db.socialCalendar.findUnique({
    where: { slug },
    include: { collaborators: { include: { creator: { select: { email: true } } } }, manager: { select: { email: true } } },
  });
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = req.cookies.get(cookieNameFor(calendar.id))?.value;
  const viewer = token ? verifyViewerToken(token, calendar.id) : null;
  if (!viewer) return NextResponse.json({ error: "Please unlock this calendar first" }, { status: 401 });

  const post = await db.calendarPost.findUnique({ where: { id: postId }, include: { assets: true } });
  if (!post || post.calendarId !== calendar.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.assets.length === 0) {
    return NextResponse.json({ error: "Nothing has been uploaded to this post yet" }, { status: 400 });
  }

  const { action, note } = await req.json();
  const approved = action === "approve";
  if (!approved && action !== "request_revision") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Approving an Instagram post on a calendar with Instagram
  // connected schedules it for auto-publish — it doesn't post
  // immediately, since the scheduled job is what actually fires the
  // real publish once postDate arrives. Guarded to only ever happen
  // once per post: if it's already SCHEDULED, PUBLISHED, or FAILED,
  // approving it again (say, after a needs-revision round trip) never
  // re-schedules it, so a post can't end up posted to Instagram twice.
  const shouldScheduleInstagram =
    approved &&
    post.platform === "INSTAGRAM" &&
    !!calendar.instagramAccountId &&
    post.instagramPublishStatus === "NOT_SCHEDULED";

  // Same reasoning, same guard, for TikTok — a separate connection
  // and a separate publish status, so a calendar can have either or
  // both connected without one affecting the other.
  const shouldScheduleTikTok =
    approved &&
    post.platform === "TIKTOK" &&
    !!calendar.tikTokOpenId &&
    post.tikTokPublishStatus === "NOT_SCHEDULED";

  const updated = await db.calendarPost.update({
    where: { id: postId },
    data: {
      approvalStatus: approved ? "APPROVED" : "NEEDS_REVISION",
      approvalNote: approved ? null : note?.trim() || null,
      reviewedAt: new Date(),
      ...(shouldScheduleInstagram ? { instagramPublishStatus: "SCHEDULED" } : {}),
      ...(shouldScheduleTikTok ? { tikTokPublishStatus: "SCHEDULED" } : {}),
    },
    include: {
      assets: { orderBy: { displayOrder: "asc" } },
      videoComments: { orderBy: { videoTimestampSeconds: "asc" } },
      customFields: true,
    },
  });

  // Everyone with a hand in this calendar — the manager, plus every
  // accepted collaborator — gets the same notification, regardless of
  // who actually did the upload being reviewed.
  const recipients = [calendar.manager.email, ...calendar.collaborators.map((c) => c.creator.email)];
  const calendarUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendars/${calendar.id}`;

  for (const email of [...new Set(recipients)]) {
    try {
      await sendCalendarPostReviewedEmail({
        to: email,
        clientName: calendar.clientName,
        approved,
        note: updated.approvalNote,
        calendarUrl,
      });
    } catch (err) {
      console.error(`Failed to send post-reviewed email to ${email}:`, err);
    }
  }

  return NextResponse.json({
    post: {
      ...updated,
      assets: updated.assets.map((a) => ({ ...a, contentUrl: publicUrlFor(a.fileKey) })),
    },
  });
}