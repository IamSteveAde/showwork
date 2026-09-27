import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { recordPublishedSocialPost } from "@/lib/socialReporting";
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
          socialConnections: {
            where: { platform: "TIKTOK", status: "CONNECTED" },
            take: 1,
            select: {
              id: true,
              platformAccountId: true,
              accessToken: true,
              accessTokenExpiresAt: true,
              refreshToken: true,
              refreshTokenExpiresAt: true,
            },
          },
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
  const normalizedConnection = calendar.socialConnections[0];
  const tikTokOpenId = normalizedConnection?.platformAccountId ?? calendar.tikTokOpenId;
  const storedAccessToken = normalizedConnection?.accessToken ?? calendar.tikTokAccessToken;
  const storedAccessTokenExpiresAt = normalizedConnection?.accessTokenExpiresAt ?? calendar.tikTokAccessTokenExpiresAt;
  const storedRefreshToken = normalizedConnection?.refreshToken ?? calendar.tikTokRefreshToken;

  if (!tikTokOpenId || !storedAccessToken || !storedRefreshToken) {
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
  let accessToken = storedAccessToken;
  const tokenExpired = !storedAccessTokenExpiresAt || storedAccessTokenExpiresAt.getTime() <= Date.now() + 60_000;

  if (tokenExpired) {
    try {
      const refreshed = await refreshTikTokAccessToken(storedRefreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshed.expires_in);
      const newRefreshExpiresAt = new Date(Date.now() + refreshed.refresh_expires_in * 1000);
      await db.socialCalendar.update({
        where: { id: calendar.id },
        data: {
          tikTokAccessToken: refreshed.access_token,
          tikTokAccessTokenExpiresAt: newExpiresAt,
          tikTokRefreshToken: refreshed.refresh_token,
        },
      });
      if (normalizedConnection) {
        await db.socialConnection.update({
          where: { id: normalizedConnection.id },
          data: {
            accessToken: refreshed.access_token,
            accessTokenExpiresAt: newExpiresAt,
            refreshToken: refreshed.refresh_token,
            refreshTokenExpiresAt: newRefreshExpiresAt,
          },
        });
      } else {
        await db.socialConnection.updateMany({
          where: { calendarId: calendar.id, platform: "TIKTOK" },
          data: {
            accessToken: refreshed.access_token,
            accessTokenExpiresAt: newExpiresAt,
            refreshToken: refreshed.refresh_token,
            refreshTokenExpiresAt: newRefreshExpiresAt,
          },
        });
      }
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

    const publishResult = await waitForTikTokPublishResult(accessToken, publishId);
    const platformPostId = publishResult.publicaly_available_post_id?.[0] != null
      ? String(publishResult.publicaly_available_post_id[0])
      : null;
    const publishedAt = new Date();

    await db.calendarPost.update({
      where: { id: postId },
      data: {
        tikTokPublishStatus: "PUBLISHED",
        tikTokPublishedAt: publishedAt,
        tikTokPublishId: publishId,
        tikTokPublishError: null,
      },
    });
    try {
      await recordPublishedSocialPost({
        calendarId: calendar.id,
        calendarPostId: post.id,
        platform: "TIKTOK",
        platformAccountId: tikTokOpenId,
        platformPostId,
        providerReference: publishId,
        publishedAt,
        platformPostType: post.postType ?? (isVideo ? "VIDEO" : "PHOTO"),
      });
    } catch (reportingError) {
      console.error(`Could not link TikTok post ${postId} to reporting:`, reportingError);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to publish to TikTok";
    console.error(`TikTok publish failed for post ${postId}:`, err);
    await fail(message);
  }
}
