import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import {
  createMediaContainer,
  createCarouselContainer,
  waitForContainerReady,
  publishContainer,
  getMediaPermalink,
} from "@/lib/instagram";

/**
 * Builds one combined caption string from the post's separate
 * fields — Instagram's API only accepts a single `caption`, so
 * cta and hashtags get folded in below it. taggedAccounts is free
 * text (not coordinate-based tagging data), so rather than claim to
 * support Instagram's real photo-tagging feature, it's written into
 * the caption itself as plain @-mentions, which Instagram auto-links
 * from caption text on its own.
 */
function buildCaption(post: {
  caption: string | null;
  cta: string | null;
  hashtags: string | null;
  taggedAccounts: string | null;
}): string {
  const parts: string[] = [];
  if (post.caption) parts.push(post.caption.trim());
  if (post.taggedAccounts) {
    const mentions = post.taggedAccounts
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((h) => (h.startsWith("@") ? h : `@${h}`))
      .join(" ");
    if (mentions) parts.push(mentions);
  }
  if (post.cta) parts.push(post.cta.trim());
  if (post.hashtags) parts.push(post.hashtags.trim());
  return parts.join("\n\n");
}

/**
 * Publishes one CalendarPost to Instagram — single image, single
 * video, or a carousel of several assets, decided purely by how many
 * assets the post actually has. Always updates the post's own
 * instagramPublishStatus/instagramPublishedAt/instagramMediaId/
 * instagramPermalink/instagramPublishError fields as its very last
 * step, success or failure, so nothing calling this ever needs its
 * own separate error-handling — the post record itself is always the
 * source of truth for what happened.
 */
export async function publishPostToInstagram(postId: string): Promise<void> {
  const post = await db.calendarPost.findUnique({
    where: { id: postId },
    include: {
      assets: { orderBy: { displayOrder: "asc" } },
      calendar: {
        select: {
          instagramAccountId: true,
          instagramAccessToken: true,
          instagramTokenExpiresAt: true,
        },
      },
    },
  });

  if (!post) throw new Error("Post not found");

  const fail = async (message: string) => {
    await db.calendarPost.update({
      where: { id: postId },
      data: { instagramPublishStatus: "FAILED", instagramPublishError: message },
    });
  };

  const { instagramAccountId, instagramAccessToken, instagramTokenExpiresAt } = post.calendar;

  if (!instagramAccountId || !instagramAccessToken) {
    return fail("This calendar's Instagram connection was removed before this post could publish.");
  }
  if (instagramTokenExpiresAt && instagramTokenExpiresAt.getTime() <= Date.now()) {
    return fail("Instagram connection has expired — reconnect Instagram on this calendar to keep publishing.");
  }
  if (post.assets.length === 0) {
    return fail("This post has no uploaded content to publish.");
  }

  const caption = buildCaption(post);

  try {
    let mediaId: string;

    if (post.assets.length === 1) {
      // Single image or video.
      const asset = post.assets[0];
      const isVideo = asset.mediaType === "VIDEO";
      const containerId = await createMediaContainer({
        igUserId: instagramAccountId,
        pageAccessToken: instagramAccessToken,
        imageUrl: isVideo ? undefined : publicUrlFor(asset.fileKey),
        videoUrl: isVideo ? publicUrlFor(asset.fileKey) : undefined,
        caption,
      });
      if (isVideo) await waitForContainerReady(containerId, instagramAccessToken);
      mediaId = await publishContainer(instagramAccountId, containerId, instagramAccessToken);
    } else {
      // Carousel — one child container per asset (no caption on any
      // of them), then a parent container that groups them together
      // and carries the actual caption.
      const childContainerIds: string[] = [];
      for (const asset of post.assets) {
        const isVideo = asset.mediaType === "VIDEO";
        const childId = await createMediaContainer({
          igUserId: instagramAccountId,
          pageAccessToken: instagramAccessToken,
          imageUrl: isVideo ? undefined : publicUrlFor(asset.fileKey),
          videoUrl: isVideo ? publicUrlFor(asset.fileKey) : undefined,
          isCarouselItem: true,
        });
        if (isVideo) await waitForContainerReady(childId, instagramAccessToken);
        childContainerIds.push(childId);
      }
      const carouselContainerId = await createCarouselContainer({
        igUserId: instagramAccountId,
        pageAccessToken: instagramAccessToken,
        childContainerIds,
        caption,
      });
      mediaId = await publishContainer(instagramAccountId, carouselContainerId, instagramAccessToken);
    }

    const permalink = await getMediaPermalink(mediaId, instagramAccessToken);

    await db.calendarPost.update({
      where: { id: postId },
      data: {
        instagramPublishStatus: "PUBLISHED",
        instagramPublishedAt: new Date(),
        instagramMediaId: mediaId,
        instagramPermalink: permalink,
        instagramPublishError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to publish to Instagram";
    console.error(`Instagram publish failed for post ${postId}:`, err);
    await fail(message);
  }
}