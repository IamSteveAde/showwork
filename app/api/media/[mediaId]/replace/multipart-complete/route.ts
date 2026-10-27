import { parseDeliveryParts } from "@/lib/deliveryUploads";
import { validDeliveryKey, deliverySession, verifyDeliveryObject, registerDeliveryReplacement, matchesDeliveryType } from "@/lib/deliveryUploads";
import { publishingIntegrationInstalled, invokePublishingEntrypoint, assertLegacyPublishingAllowed, nativePolicyExecutionAllowed } from "@/lib/publishing/applicationBoundary";
import { complimentaryAccessSelect, hasDeliveryPaidAccess } from "@/lib/complimentaryAccess";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { completeMultipartUpload, deleteObject } from "@/lib/r2";
import { sendRevisionReadyEmail } from "@/lib/resend";
import { appUrl } from "@/lib/url";

const MAX_REPLACEMENTS_PER_PROJECT = 5;

// Stitches every uploaded chunk into the real replacement file, then
// does exactly what the existing single-part replace/complete route
// does: update the Media row, bump replaceCount, delete the old file,
// notify whoever flagged it. Same permission and limit checks as the
// other replace routes.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { if (!nativePolicyExecutionAllowed("app/api/media/[mediaId]/replace/multipart-complete/route.ts#POST@16")) { return await invokePublishingEntrypoint<never>("app/api/media/[mediaId]/replace/multipart-complete/route.ts#POST@16",Array.from(arguments)); } } /* end-canonical-integration-boundary */

  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaId } = await params;
  const { fileKey, uploadId, parts } = await req.json();

  if (!fileKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json({ error: "fileKey, uploadId, and parts are required" }, { status: 400 });
  }
  const typedParts = parseDeliveryParts(parts);
  if (!typedParts) return NextResponse.json({error:"Upload parts must be a contiguous, unique list"},{status:400});

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

  const isOwner = media.project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId: media.projectId, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await deliverySession(media.projectId, creator.id, fileKey, uploadId, {purpose:"REPLACE",targetId:mediaId});
  if (!session) return NextResponse.json({error:"Upload session expired. Restart this transfer.",code:"UPLOAD_SESSION_EXPIRED"},{status:409});
  if (media.fileKey === fileKey) return NextResponse.json({media});
  if (!matchesDeliveryType(session.contentType, media.type)) return NextResponse.json({error:"Replacement must have the original media type"},{status:400});
  if (media.approvalStatus !== "NEEDS_REVISION") {
    return NextResponse.json(
      { error: "Only files flagged for revision can be replaced" },
      { status: 403 }
    );
  }

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
  // The call that actually turns however many separately-uploaded
  // chunks into one real, complete file in R2 — nothing before this
  // point is a usable object yet.
  // Completion below first checks for an already completed storage object.

  const oldFileKey = media.fileKey;
  const notifyEmail = media.reviewerEmail; // whoever flagged this specific file

  let sizeBytes: number;
  try {
    try { sizeBytes = await verifyDeliveryObject(session); }
    catch { await completeMultipartUpload(fileKey, uploadId, typedParts); sizeBytes = await verifyDeliveryObject(session); }
  } catch { return NextResponse.json({error:"Replacement file could not be verified",code:"UPLOAD_NOT_VERIFIED"},{status:409}); }
  let updated;
  try { updated = await registerDeliveryReplacement({mediaId,projectId:media.projectId,oldFileKey,fileKey,creatorId:creator.id,sessionId:session.id,sizeBytes,unlimited:hasDeliveryPaidAccess(media.project.creator)}); }
  catch { return NextResponse.json({error:"The file or replacement allowance changed. Reload this project before retrying."},{status:409}); }
  // Promoted task originals/previews are shared with internal review history.
  if (media.posterFileKey && validDeliveryKey(media.posterFileKey, media.projectId)) deleteObject(media.posterFileKey).catch(() => {});
  if (validDeliveryKey(oldFileKey, media.projectId)) deleteObject(oldFileKey).catch((err) => console.error("Failed to delete old file:", err));

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
