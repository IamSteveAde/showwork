import { validDeliveryKey, deliverySession, verifyDeliveryObject, registerDeliveryReplacement, matchesDeliveryType } from "@/lib/deliveryUploads";
import { publishingIntegrationInstalled, invokePublishingEntrypoint, assertLegacyPublishingAllowed, nativePolicyExecutionAllowed } from "@/lib/publishing/applicationBoundary";
import { complimentaryAccessSelect, hasDeliveryPaidAccess } from "@/lib/complimentaryAccess";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { deleteObject } from "@/lib/r2";
import { sendRevisionReadyEmail } from "@/lib/resend";
import { appUrl } from "@/lib/url";

const MAX_REPLACEMENTS_PER_PROJECT = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { if (!nativePolicyExecutionAllowed("app/api/media/[mediaId]/replace/complete/route.ts#POST@11")) { return await invokePublishingEntrypoint<never>("app/api/media/[mediaId]/replace/complete/route.ts#POST@11",Array.from(arguments)); } } /* end-canonical-integration-boundary */

  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const { fileKey } = await req.json();
  if (!fileKey) return NextResponse.json({ error: "fileKey is required" }, { status: 400 });

  // Includes the owner's subscription fields — the replacement quota
  // below is based on whoever OWNS the project, not whoever happens
  // to be uploading the fix. Same reasoning as the upload-batch quota.
  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: {
      project: {
        include: {
          creator: { select: { id: true, subscriptionActive: true, ...complimentaryAccessSelect, isComped: true } },
        },
      },
    },
  });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A collaborator replacing a file they were the one flagged on
  // needs this to work too, not just the project owner.
  const isOwner = media.project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId: media.projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await deliverySession(media.projectId, creator.id, fileKey, undefined, {purpose:"REPLACE",targetId:mediaId});
  if (!session) return NextResponse.json({error:"Upload session expired. Restart this transfer.",code:"UPLOAD_SESSION_EXPIRED"},{status:409});
  if (media.fileKey === fileKey) return NextResponse.json({media});
  if (!matchesDeliveryType(session.contentType, media.type)) return NextResponse.json({error:"Replacement must have the original media type"},{status:400});
  if (media.approvalStatus !== "NEEDS_REVISION") {
    return NextResponse.json(
      { error: "Only files flagged for revision can be replaced" },
      { status: 403 }
    );
  }

  // Unlimited for active subscribers *and* comped (admin-granted free)
  // accounts — the cap only exists to stop the old one-time-payment
  // model being stretched into free ongoing use, which doesn't apply
  // to either of those cases. Checked against the project's owner,
  // not whoever is currently replacing the file.
  if (
    media.project.replaceCount >= MAX_REPLACEMENTS_PER_PROJECT &&
    !hasDeliveryPaidAccess(media.project.creator)
  ) {
    return NextResponse.json(
      { error: "This project has reached its revision limit. Please create a new project for further work." },
      { status: 403 }
    );
  }

  if (!validDeliveryKey(fileKey, media.projectId)) return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
  const oldFileKey = media.fileKey;
  const notifyEmail = media.reviewerEmail; // whoever flagged this specific file

  let sizeBytes: number;
  try {
    sizeBytes = await verifyDeliveryObject(session);
  } catch { return NextResponse.json({error:"Replacement file could not be verified",code:"UPLOAD_NOT_VERIFIED"},{status:409}); }
  let updated;
  try { updated = await registerDeliveryReplacement({mediaId,projectId:media.projectId,oldFileKey,fileKey,creatorId:creator.id,sessionId:session.id,sizeBytes,unlimited:hasDeliveryPaidAccess(media.project.creator)}); }
  catch { return NextResponse.json({error:"The file or replacement allowance changed. Reload this project before retrying."},{status:409}); }
  // Promoted task originals/previews are shared with internal review history.
  if (media.posterFileKey && validDeliveryKey(media.posterFileKey, media.projectId)) deleteObject(media.posterFileKey).catch(() => {});
  if (validDeliveryKey(oldFileKey, media.projectId)) deleteObject(oldFileKey).catch((err) => console.error("Failed to delete old file:", err));

  // Notify whoever flagged this file that a fix has been uploaded.
  if (notifyEmail) {
    try {
      await sendRevisionReadyEmail({
        to: notifyEmail,
        clientName: media.project.clientName,
        publicUrl: `${appUrl()}/${media.project.slug}`,
      });
    } catch (err) {
      console.error("Failed to send revision-ready email:", err);
    }
  }

  return NextResponse.json({ media: updated });
}
