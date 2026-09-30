import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyViewerToken } from "@/lib/auth";
import { sendCalendarPostReviewedEmail } from "@/lib/resend";
import { buildCaption, PUBLISHING_PLATFORMS, publishingStatus, statusUpdate, statusWhere, validatePublishContent } from "@/lib/publishing/state";
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
    include: {
      collaborators: {
        include: {
          creator: {
            select: {
              email: true,
            },
          },
        },
      },
      manager: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!calendar) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const token = req.cookies.get(
    cookieNameFor(calendar.id)
  )?.value;

  const viewer = token
    ? verifyViewerToken(token, calendar.id)
    : null;

  if (!viewer) {
    return NextResponse.json(
      {
        error: "Please unlock this calendar first",
      },
      { status: 401 }
    );
  }

  const post = await db.calendarPost.findUnique({
    where: { id: postId },
    include: {
      assets: true,
    },
  });

  if (!post || post.calendarId !== calendar.id || post.isAiDraft) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 }
    );
  }

  if (post.assets.length === 0 && (!post.caption?.trim() || ["INSTAGRAM", "TIKTOK"].includes(post.platform))) {
    return NextResponse.json(
      {
        error:
          "Nothing has been uploaded to this post yet",
      },
      { status: 400 }
    );
  }

  const { action, note } = await req.json();

  const approved = action === "approve";

  if (
    !approved &&
    action !== "request_revision"
  ) {
    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  }

  if (["PUBLISHING", "PUBLISHED"].includes(publishingStatus(post))) {
    return NextResponse.json({ error: "This post is already publishing or published and cannot be reviewed again." }, { status: 409 });
  }
  const connection = await db.socialConnection.findFirst({ where: { calendarId: calendar.id, platform: post.platform, status: "CONNECTED" } });
  const canSchedule = approved && !post.isAiDraft && !!connection && PUBLISHING_PLATFORMS.includes(post.platform);
  if (canSchedule) {
    try {
      validatePublishContent(post.platform, post.assets, buildCaption(post), post.postType);
      if (post.platform === "TIKTOK" && !post.tikTokPrivacyLevel) throw new Error("Choose TikTok privacy before approving this post.");
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid content" }, { status: 400 }); }
  }
  const updatedCount = await db.calendarPost.updateMany({
    where: { id: postId, updatedAt: post.updatedAt, ...statusWhere(post.platform, publishingStatus(post)) },
    data: {
      approvalStatus: approved ? "APPROVED" : "NEEDS_REVISION",
      approvalNote: approved ? null : typeof note === "string" ? note.trim() || null : null,
      reviewedAt: new Date(),
      ...(!approved && publishingStatus(post) === "SCHEDULED" ? statusUpdate(post.platform, "NOT_SCHEDULED") : {}),
      ...(canSchedule && publishingStatus(post) === "NOT_SCHEDULED" ? { ...statusUpdate(post.platform, "SCHEDULED"), publishWorkerStartedAt: null } : {}),
    },
  });
  if (!updatedCount.count) return NextResponse.json({ error: "The publishing status changed. Refresh before reviewing." }, { status: 409 });
  const updated = await db.calendarPost.findUniqueOrThrow({
    where: { id: postId },
    include: {
      assets: {
        orderBy: {
          displayOrder: "asc",
        },
      },
      videoComments: {
        orderBy: {
          videoTimestampSeconds: "asc",
        },
      },
      customFields: true,
    },
  });

  // Everyone with a hand in this calendar — the manager, plus every
  // accepted collaborator — gets the same notification, regardless of
  // who actually did the upload being reviewed.
  const recipients = [
    calendar.manager.email,
    ...calendar.collaborators.map(
      (c) => c.creator.email
    ),
  ];

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
      console.error(
        `Failed to send post-reviewed email to ${email}:`,
        err
      );
    }
  }

  // Prisma returns BigInt for sizeBytes, and JSON.stringify()
  // cannot serialize BigInt values. Convert it to a number
  // before returning the post to the client.
  const serializedPost = {
    ...updated,
    assets: updated.assets.map((asset) => ({
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
      contentUrl: publicUrlFor(asset.fileKey),
    })),
  };

  return NextResponse.json({
    post: serializedPost,
  });
}
