import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReviewNotificationEmail } from "@/lib/resend";

// PUBLIC route — called from the client-facing delivery page, not the
// creator dashboard. Deliberately no creator auth check here: the
// person calling this already passed the project's password (and the
// mandatory name+email gate) to even see the media in the first place.
// The media id itself is a UUID, not guessable, matching the same
// security model the rest of the public delivery flow relies on.
//
// One reviewer can only ever have a single current verdict on a file —
// submitting the exact same verdict again is rejected as a duplicate;
// submitting a *different* one (changing their mind) updates their
// existing review in place. Never a second row for the same person.
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

  const existingReview = await db.mediaReview.findUnique({
    where: { mediaId_reviewerEmail: { mediaId, reviewerEmail: viewerEmail } },
  });

  // Genuine duplicate — same person, same verdict as what's already on
  // file. Rejected clearly rather than silently creating a second row.
  if (existingReview && existingReview.status === status) {
    return NextResponse.json(
      {
        error:
          status === "APPROVED"
            ? "You've already approved this file."
            : "You've already flagged this file for revision.",
        alreadyReviewed: true,
      },
      { status: 409 }
    );
  }

  // Either their first review, or they're changing their mind — update
  // in place if a row exists, otherwise create it.
  await db.mediaReview.upsert({
    where: { mediaId_reviewerEmail: { mediaId, reviewerEmail: viewerEmail } },
    update: {
      status,
      reviewerName: reviewerName?.trim() || null,
      note: status === "NEEDS_REVISION" ? note?.trim() || null : null,
    },
    create: {
      mediaId,
      reviewerName: reviewerName?.trim() || null,
      reviewerEmail: viewerEmail,
      status,
      note: status === "NEEDS_REVISION" ? note?.trim() || null : null,
    },
  });

  // Recompute the aggregate from every (deduplicated) review on file.
  const allReviews = await db.mediaReview.findMany({
    where: { mediaId },
    orderBy: { updatedAt: "asc" },
  });
  const anyNeedsRevision = allReviews.some((r) => r.status === "NEEDS_REVISION");
  const overallStatus = anyNeedsRevision ? "NEEDS_REVISION" : "APPROVED";
  const mostRecentRevision = [...allReviews].reverse().find((r) => r.status === "NEEDS_REVISION");

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

// PUBLIC route — lets a viewer remove their own review entirely, not
// just change it. Identified the same way every other review action
// here is: by mediaId + their own email, matching the security model
// already used throughout the public delivery flow.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const { viewerEmail } = await req.json();

  if (!viewerEmail) {
    return NextResponse.json({ error: "viewerEmail is required" }, { status: 400 });
  }

  const existing = await db.mediaReview.findUnique({
    where: { mediaId_reviewerEmail: { mediaId, reviewerEmail: viewerEmail } },
  });
  if (!existing) {
    return NextResponse.json({ error: "No review found to remove" }, { status: 404 });
  }

  await db.mediaReview.delete({
    where: { mediaId_reviewerEmail: { mediaId, reviewerEmail: viewerEmail } },
  });

  // Recompute the aggregate from whatever reviews are left. If nobody
  // has reviewed this file at all anymore, it genuinely goes back to
  // PENDING — there's no reason to keep showing a verdict nobody holds.
  const remainingReviews = await db.mediaReview.findMany({
    where: { mediaId },
    orderBy: { updatedAt: "asc" },
  });
  const anyNeedsRevision = remainingReviews.some((r) => r.status === "NEEDS_REVISION");
  const overallStatus = remainingReviews.length === 0 ? "PENDING" : anyNeedsRevision ? "NEEDS_REVISION" : "APPROVED";
  const mostRecentRevision = [...remainingReviews].reverse().find((r) => r.status === "NEEDS_REVISION");

  const updated = await db.media.update({
    where: { id: mediaId },
    data: {
      approvalStatus: overallStatus,
      approvalNote: overallStatus === "NEEDS_REVISION" ? mostRecentRevision?.note ?? null : null,
      reviewedAt: remainingReviews.length > 0 ? new Date() : null,
      reviewerEmail: remainingReviews.length > 0 ? remainingReviews[remainingReviews.length - 1].reviewerEmail : null,
    },
  });

  return NextResponse.json({ media: updated, reviews: remainingReviews });
}