import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { deleteObject, publicUrlFor } from "@/lib/r2";

const VALID_PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, postId } = await params;

  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json(
      { error: "You don't have permission to edit posts on this calendar" },
      { status: 403 }
    );
  }

  const post = await db.calendarPost.findUnique({
    where: { id: postId },
  });

  if (!post || post.calendarId !== id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Client approval is the permanent lock point for normal post editing.
  // NEEDS_REVISION deliberately remains editable.
  if (post.approvalStatus === "APPROVED") {
    return NextResponse.json(
      {
        error:
          "This post has been approved by the client and can no longer be edited. Ask the client to request a revision if something needs to change.",
        code: "POST_APPROVED_LOCKED",
      },
      { status: 409 }
    );
  }

  const {
    postDate,
    platform,
    postType,
    category,
    caption,
    contentIdea,
    cta,
    hashtags,
    taggedAccounts,
    linkUrl,
  } = await req.json();

  if (platform && !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: "Invalid platform" },
      { status: 400 }
    );
  }

  const updated = await db.calendarPost.update({
    where: { id: postId },
    data: {
      ...(postDate ? { postDate: new Date(postDate) } : {}),
      ...(platform ? { platform } : {}),
      postType: postType !== undefined ? postType?.trim() || null : undefined,
      category: category !== undefined ? category?.trim() || null : undefined,
      caption: caption !== undefined ? caption?.trim() || null : undefined,
      contentIdea:
        contentIdea !== undefined ? contentIdea?.trim() || null : undefined,
      cta: cta !== undefined ? cta?.trim() || null : undefined,
      hashtags: hashtags !== undefined ? hashtags?.trim() || null : undefined,
      taggedAccounts:
        taggedAccounts !== undefined
          ? taggedAccounts?.trim() || null
          : undefined,
      linkUrl: linkUrl !== undefined ? linkUrl?.trim() || null : undefined,
    },
    include: {
      assets: { orderBy: { displayOrder: "asc" } },
      videoComments: { orderBy: { videoTimestampSeconds: "asc" } },
      customFields: true,
    },
  });

  return NextResponse.json({
    post: {
      ...updated,
      assets: updated.assets.map((a) => ({
        ...a,
        contentUrl: publicUrlFor(a.fileKey),
      })),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, postId } = await params;

  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json(
      {
        error:
          "You don't have permission to delete posts on this calendar",
      },
      { status: 403 }
    );
  }

  const post = await db.calendarPost.findUnique({
    where: { id: postId },
    include: { assets: true },
  });

  if (!post || post.calendarId !== id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Approved posts are protected from deletion as well as editing.
  if (post.approvalStatus === "APPROVED") {
    return NextResponse.json(
      {
        error:
          "This post has been approved by the client and can no longer be deleted.",
        code: "POST_APPROVED_LOCKED",
      },
      { status: 409 }
    );
  }

  // Best-effort cleanup of the actual files in storage — a failure
  // here shouldn't block the post itself from being deleted.
  for (const asset of post.assets) {
    try {
      await deleteObject(asset.fileKey);
    } catch (err) {
      console.error(`Failed to delete R2 object for asset ${asset.id}:`, err);
    }
  }

  await db.calendarPost.delete({ where: { id: postId } });

  return NextResponse.json({ ok: true });
}
