import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import {
  refreshTikTokAccessToken,
  queryTikTokCreatorInfo,
  initTikTokVideoPublish,
  initTikTokPhotoPublish,
  waitForTikTokPublishResult,
} from "@/lib/tiktok";

/**
 * Same caption-combining approach as Instagram's — cta and hashtags
 * folded into the same title field TikTok's post_info.title expects,
 * with taggedAccounts written as plain @-mentions in the text itself
 * rather than claiming to support anything more structured.
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
 * Publishes one CalendarPost to TikTok — video or photo(s), decided
 * by the assets' own mediaType. Always updates the post's own
 * tikTokPublishStatus/tikTokPublishedAt/tikTokPublishId/
 * tikTokPublishError fields as its very last step, success or
 * failure, exactly the same contract publishPostToInstagram follows,
 * so nothing calling this needs its own separate error handling.
 *
 * Reminder for anyone reading this later: even a fully successful
 * run here only ever produces a SELF_ONLY (private) post until this
 * app clears TikTok's separate Content Audit — that's a platform
 * restriction TikTok enforces on its end, not something this
 * function controls or can work around.
 */
export async function publishPostToTikTok(postId: string): Promise<void> {
  const post = await db.calendarPost.findUnique({
    where: { id: postId },
    include: {
      assets: { orderBy: { displayOrder: "asc" } },
      calendar: {
        select: {
          id: true,
          tikTokOpenId: true,
          tikTokAccessToken: true,
          tikTokAccessTokenExpiresAt: true,
          tikTokRefreshToken: true,
        },
      },
    },
  });

  if (!post) throw new Error("Post not found");

  const fail = async (message: string) => {
    await db.calendarPost.update({
      where: { id: postId },
      data: { tikTokPublishStatus: "FAILED", tikTokPublishError: message },
    });
  };

  const { calendar } = post;

  if (!calendar.tikTokOpenId || !calendar.tikTokAccessToken || !calendar.tikTokRefreshToken) {
    return fail("This calendar's TikTok connection was removed before this post could publish.");
  }
  if (post.assets.length === 0) {
    return fail("This post has no uploaded content to publish.");
  }
  if (!post.tikTokPrivacyLevel) {
    return fail("No privacy level was chosen for this post — edit it and pick one before it can publish.");
  }

  // TikTok's access tokens last only 24 hours — refreshing proactively
  // here (rather than waiting for a publish call to fail first) keeps
  // this working silently for as long as the refresh token itself
  // stays valid, with no manager action ever needed for routine renewal.
  let accessToken = calendar.tikTokAccessToken;
  const tokenExpired = !calendar.tikTokAccessTokenExpiresAt || calendar.tikTokAccessTokenExpiresAt.getTime() <= Date.now() + 60_000;

  if (tokenExpired) {
    try {
      const refreshed = await refreshTikTokAccessToken(calendar.tikTokRefreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshed.expires_in);
      await db.socialCalendar.update({
        where: { id: calendar.id },
        data: {
          tikTokAccessToken: refreshed.access_token,
          tikTokAccessTokenExpiresAt: newExpiresAt,
          tikTokRefreshToken: refreshed.refresh_token,
        },
      });
    } catch (err) {
      return fail("TikTok's connection has expired and couldn't be automatically renewed — reconnect TikTok on this calendar to keep publishing.");
    }
  }

  try {
    // Required immediately before every publish, never cached —
    // TikTok's own review criteria reject any app that assumes
    // yesterday's available options still apply today.
    const creatorInfo = await queryTikTokCreatorInfo(accessToken);

    if (!creatorInfo.privacy_level_options.includes(post.tikTokPrivacyLevel)) {
      return fail(
        `This TikTok account no longer allows the "${post.tikTokPrivacyLevel}" privacy level — edit the post and choose one of: ${creatorInfo.privacy_level_options.join(", ")}.`
      );
    }

    const caption = buildCaption(post);
    const isVideo = post.assets.some((a) => a.mediaType === "VIDEO");

    let publishId: string;

    if (isVideo) {
      // TikTok's Direct Post video flow is one video per post — the
      // first video asset is used; a post mixing photos and a video
      // isn't a real TikTok content type, same reasoning as
      // Instagram not mixing media types within one carousel item.
      const videoAsset = post.assets.find((a) => a.mediaType === "VIDEO")!;
      const result = await initTikTokVideoPublish({
        accessToken,
        videoUrl: publicUrlFor(videoAsset.fileKey),
        caption,
        privacyLevel: post.tikTokPrivacyLevel,
        disableComment: creatorInfo.comment_disabled,
      });
      publishId = result.publish_id;
    } else {
      const photoUrls = post.assets.map((a) => publicUrlFor(a.fileKey));
      const result = await initTikTokPhotoPublish({
        accessToken,
        photoUrls,
        caption,
        privacyLevel: post.tikTokPrivacyLevel,
      });
      publishId = result.publish_id;
    }

    await waitForTikTokPublishResult(accessToken, publishId);

    await db.calendarPost.update({
      where: { id: postId },
      data: {
        tikTokPublishStatus: "PUBLISHED",
        tikTokPublishedAt: new Date(),
        tikTokPublishId: publishId,
        tikTokPublishError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to publish to TikTok";
    console.error(`TikTok publish failed for post ${postId}:`, err);
    await fail(message);
  }
}