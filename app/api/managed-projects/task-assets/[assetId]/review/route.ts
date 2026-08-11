import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { sendTaskNeedsChangesEmail, sendTaskApprovedEmail } from "@/lib/resend";

// PATCH — the project owner's internal approve/request-changes on a
// specific uploaded file. Owner-only, always — this is the gate that
// sits before anything ever reaches a client, so nobody else
// (including whoever uploaded it) can approve their own work. Now
// notifies whoever actually uploaded the file either way — without
// this, a "needs changes" request just sat silently until someone
// happened to check back.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assetId } = await params;
  const asset = await db.taskAsset.findUnique({
    where: { id: assetId },
    include: {
      task: { include: { managedProject: true } },
      uploadedBy: { select: { id: true, email: true } },
    },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (asset.task.managedProject.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { status, note } = await req.json();
  if (!["APPROVED", "NEEDS_CHANGES"].includes(status)) {
    return NextResponse.json({ error: "Status must be APPROVED or NEEDS_CHANGES" }, { status: 400 });
  }

  const updated = await db.taskAsset.update({
    where: { id: assetId },
    data: {
      internalReviewStatus: status,
      internalReviewNote: status === "NEEDS_CHANGES" ? (note?.trim() || null) : null,
      internalReviewedAt: new Date(),
    },
  });

  // Notify the uploader — unless the owner is also the uploader
  // (reviewing their own upload), in which case there's nothing to
  // tell them.
  if (asset.uploadedBy.id !== creator.id) {
    const projectUrl = `${appUrl()}/dashboard/managed/${asset.task.managedProjectId}`;
    try {
      if (status === "NEEDS_CHANGES") {
        await sendTaskNeedsChangesEmail({
          to: asset.uploadedBy.email,
          reviewerName: creator.name || creator.email,
          taskTitle: asset.task.title,
          projectName: asset.task.managedProject.name,
          note: note?.trim() || null,
          projectUrl,
        });
      } else {
        await sendTaskApprovedEmail({
          to: asset.uploadedBy.email,
          reviewerName: creator.name || creator.email,
          taskTitle: asset.task.title,
          projectName: asset.task.managedProject.name,
          projectUrl,
        });
      }
    } catch (err) {
      console.error("Failed to send task review notification email:", err);
    }
  }

  return NextResponse.json({ asset: updated });
}