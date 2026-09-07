import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { publicUrlFor } from "@/lib/r2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "ADD_CONTENT"))) {
    return NextResponse.json({ error: "You don't have permission to add content to this calendar" }, { status: 403 });
  }

  const post = await db.calendarPost.findUnique({ where: { id: postId } });
  if (!post || post.calendarId !== id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { fileKey, mediaType } = await req.json();
  if (!fileKey || !mediaType) {
    return NextResponse.json({ error: "fileKey and mediaType are required" }, { status: 400 });
  }

  const existingCount = await db.calendarPostAsset.count({ where: { postId } });

  await db.calendarPostAsset.create({
    data: { postId, fileKey, mediaType, displayOrder: existingCount },
  });

  // A fresh upload always needs a fresh look from the client, even if
  // this post was already approved before — the content itself has
  // genuinely changed by adding another item.
  const updated = await db.calendarPost.update({
    where: { id: postId },
    data: { approvalStatus: "PENDING", approvalNote: null, reviewedAt: null },
    include: {
      assets: { orderBy: { displayOrder: "asc" } },
      videoComments: { orderBy: { videoTimestampSeconds: "asc" } },
      customFields: true,
    },
  });

  return NextResponse.json({
    post: {
      ...updated,
      assets: updated.assets.map((a) => ({ ...a, contentUrl: publicUrlFor(a.fileKey) })),
    },
  });
}