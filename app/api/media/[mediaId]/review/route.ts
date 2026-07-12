import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReviewNotificationEmail } from "@/lib/resend";

// PUBLIC route — called from the client-facing delivery page, not the
// creator dashboard. Deliberately no creator auth check here: the
// person calling this already passed the project's password (and the
// now-mandatory email gate) to even see the media in the first place.
// The media id itself is a UUID, not guessable, which is the same
// security model the rest of the public delivery flow already relies on.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const { status, note, viewerEmail, clientName } = await req.json();

  if (!["APPROVED", "NEEDS_REVISION", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { project: { include: { creator: true } } },
  });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.media.update({
    where: { id: mediaId },
    data: {
      approvalStatus: status,
      // Only keep a note when it's actually explaining a revision request.
      approvalNote: status === "NEEDS_REVISION" ? (note?.trim() || null) : null,
      reviewedAt: new Date(),
      reviewerEmail: viewerEmail || null,
    },
  });

  // Notify the creator — best-effort, never let an email failure block
  // the review itself from saving.
  if ((status === "APPROVED" || status === "NEEDS_REVISION") && media.project.creator.email) {
    try {
      await sendReviewNotificationEmail({
        to: media.project.creator.email,
        creatorName: media.project.creator.name,
        clientName: clientName || media.project.clientName,
        fileLabel: media.caption || media.fileKey.split("/").pop() || "a file",
        status,
        note: updated.approvalNote,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${media.projectId}`,
      });
    } catch (err) {
      console.error("Failed to send review notification email:", err);
    }
  }

  return NextResponse.json({ media: updated });
}