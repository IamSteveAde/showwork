import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// 3 total "add more files" sessions per project, ever. Each call to this
// route represents one batch (could contain several files) — checked
// and incremented before any upload in that batch is allowed to start.
const MAX_ADDITIONAL_UPLOAD_BATCHES = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Includes the owner's own subscription fields — the quota below is
  // based on whoever OWNS the project, not whoever happens to be
  // uploading. A collaborator's personal plan (or lack of one) is
  // irrelevant here; they're working under the owner's allowance.
  const project = await db.project.findUnique({
    where: { id },
    include: { creator: { select: { id: true, subscriptionActive: true, isComped: true } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = project.creatorId === creator.id;
  const isCollaborator =
    !isOwner &&
    (await db.projectCollaborator.findFirst({
      where: { projectId: id, creatorId: creator.id },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.creator.subscriptionActive || project.creator.isComped) {
    // Unlimited for active subscribers *and* comped (admin-granted
    // free) accounts — the cap only exists to stop the old
    // one-time-payment model being stretched into free ongoing use,
    // which doesn't apply to either of those cases. Checked against
    // the project's owner, not the uploader.
    return NextResponse.json({ remaining: Infinity });
  }

  if (project.additionalUploadCount >= MAX_ADDITIONAL_UPLOAD_BATCHES) {
    return NextResponse.json(
      { error: "You've used all 3 add-more-files sessions for this project." },
      { status: 403 }
    );
  }

  const updated = await db.project.update({
    where: { id },
    data: { additionalUploadCount: { increment: 1 } },
  });

  return NextResponse.json({
    remaining: MAX_ADDITIONAL_UPLOAD_BATCHES - updated.additionalUploadCount,
  });
}