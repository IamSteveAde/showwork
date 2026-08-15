import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUBLIC — a viewer can only remove their own comment, identified by
// email the same way every other public review action in this app
// works. Not the media owner's job to delete someone else's comment
// through this route — that's a separate, creator-side concern if it
// ever needs one.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string; commentId: string }> }
) {
  const { mediaId, commentId } = await params;
  const { viewerEmail } = await req.json();

  if (!viewerEmail) {
    return NextResponse.json({ error: "viewerEmail is required" }, { status: 400 });
  }

  const comment = await db.videoComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.mediaId !== mediaId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (comment.reviewerEmail.toLowerCase() !== viewerEmail.toLowerCase()) {
    return NextResponse.json({ error: "You can only remove your own comments" }, { status: 403 });
  }

  await db.videoComment.delete({ where: { id: commentId } });

  return NextResponse.json({ ok: true });
}