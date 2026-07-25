import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReviewNotificationEmail } from "@/lib/resend";

// PUBLIC route — called from the client-facing delivery page, not the
// creator dashboard. Deliberately no creator auth check here: the
// person calling this already passed the project's password (and the
// now-mandatory name+email gate) to even see the media in the first
// place. The media id itself is a UUID, not guessable, which is the
// same security model the rest of the public delivery flow relies on.
//
// Every review is logged permanently — a second reviewer's input adds
// to the record instead of silently overwriting the first person's.
// The file's overall status is then recomputed from every review on
// file: if *anyone* has flagged it for revision, it reads as
// NEEDS_REVISION overall, even if someone else separately approved it —
// a real open note shouldn't get quietly buried by a later approval.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const { status, note, reviewerName, viewerEmail, clientName } = await req.json();

  if (!["APPROVED", "NEEDS_REVISION"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!viewerEmail) {
    return NextResponse.json({ error: "viewerEmail is required" }, { status: 400 });
  }

  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { project: { include: { creator: true } } },
  });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Log this specific person's review — permanently, not overwriting
  // anyone else's.
  await db.mediaReview.create({
    data: {
      mediaId,
      reviewerName: reviewerName?.trim() || null,
      reviewerEmail: viewerEmail,
      status,
      note: status === "NEEDS_REVISION" ? note?.trim() || null : null,
    },
  });

  // Recompute the aggregate from every review on file.
  const allReviews = await db.mediaReview.findMany({
    where: { mediaId },
    orderBy: { createdAt: "desc" },
  });
  const anyNeedsRevision = allReviews.some((r) => r.status === "NEEDS_REVISION");
  const overallStatus = anyNeedsRevision ? "NEEDS_REVISION" : "APPROVED";
  // The most recent revision note specifically (not just the most
  // recent review of any kind) — that's the actionable one to surface.
  const mostRecentRevision = allReviews.find((r) => r.status === "NEEDS_REVISION");

  const updated = await db.media.update({
    where: { id: mediaId },
    data: {
      approvalStatus: overallStatus,
      approvalNote: overallStatus === "NEEDS_REVISION" ? mostRecentRevision?.note ?? null : null,
      reviewedAt: new Date(),
      reviewerEmail: viewerEmail,
    },
  });

  // Notify the creator — best-effort, never let an email failure block
  // the review itself from saving.
  if (media.project.creator.email) {
    try {
      await sendReviewNotificationEmail({
        to: media.project.creator.email,
        creatorName: media.project.creator.name,
        clientName: clientName || media.project.clientName,
        fileLabel: media.caption || media.fileKey.split("/").pop() || "a file",
        status,
        note: status === "NEEDS_REVISION" ? note?.trim() || null : null,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${media.projectId}`,
      });
    } catch (err) {
      console.error("Failed to send review notification email:", err);
    }
  }

  return NextResponse.json({ media: updated, reviews: allReviews });
}