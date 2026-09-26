import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { publicUrlFor } from "@/lib/r2";
import { sendCalendarPostResubmittedEmail } from "@/lib/resend";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to edit this calendar" }, { status: 403 });
  }

  const post = await db.calendarPost.findUnique({
    where: { id: postId },
    include: { assets: { orderBy: { displayOrder: "asc" } } },
  });
  if (!post || post.calendarId !== id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.approvalStatus !== "NEEDS_REVISION") {
    return NextResponse.json({ error: "Only posts with requested changes can be resubmitted" }, { status: 409 });
  }
  if (post.assets.length === 0) {
    return NextResponse.json({ error: "Add content to this post before resubmitting it" }, { status: 400 });
  }

  const changed = await db.calendarPost.updateMany({
    where: { id: postId, calendarId: id, approvalStatus: "NEEDS_REVISION" },
    data: { approvalStatus: "PENDING" },
  });
  if (changed.count !== 1) {
    return NextResponse.json({ error: "This post has already been resubmitted" }, { status: 409 });
  }

  const [updated, calendar, viewers] = await Promise.all([
    db.calendarPost.findUniqueOrThrow({
      where: { id: postId },
      include: {
        assets: { orderBy: { displayOrder: "asc" } },
        videoComments: { orderBy: { videoTimestampSeconds: "asc" } },
        customFields: true,
      },
    }),
    db.socialCalendar.findUnique({ where: { id }, select: { slug: true, clientName: true } }),
    db.calendarViewerEmail.findMany({ where: { calendarId: id }, select: { email: true } }),
  ]);

  if (calendar) {
    const clientUrl = `${process.env.NEXT_PUBLIC_APP_URL}/social-calendar/${calendar.slug}`;
    for (const email of [...new Set(viewers.map((viewer) => viewer.email).filter(Boolean))]) {
      try {
        await sendCalendarPostResubmittedEmail({ to: email, clientName: calendar.clientName, clientUrl });
      } catch (err) {
        console.error(`Failed to notify calendar viewer ${email} about resubmitted post:`, err);
      }
    }
  }

  return NextResponse.json({
    post: {
      ...updated,
      assets: updated.assets.map((asset) => ({
        ...asset,
        sizeBytes: Number(asset.sizeBytes),
        contentUrl: publicUrlFor(asset.fileKey),
      })),
    },
  });
}
