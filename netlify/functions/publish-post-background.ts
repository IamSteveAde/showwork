import type { Handler } from "@netlify/functions";
import { db } from "../../lib/db";
import { publishPostToInstagram } from "../../lib/instagramPublishing";
import { publishPostToTikTok } from "../../lib/tiktokPublishing";

type Platform = "INSTAGRAM" | "TIKTOK";

export const handler: Handler = async (event) => {
  if (
    !process.env.CRON_SECRET ||
    event.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  let postId = "";
  let platform: Platform | null = null;
  try {
    const body = JSON.parse(event.body || "{}") as { postId?: unknown; platform?: unknown };
    postId = typeof body.postId === "string" ? body.postId : "";
    platform = body.platform === "INSTAGRAM" || body.platform === "TIKTOK" ? body.platform : null;
  } catch {
    return { statusCode: 400, body: "Invalid request" };
  }

  if (!postId || !platform) return { statusCode: 400, body: "Invalid publish job" };

  const claimed = await db.calendarPost.updateMany({
    where: platform === "INSTAGRAM"
      ? { id: postId, platform, instagramPublishStatus: "PUBLISHING", publishWorkerStartedAt: null }
      : { id: postId, platform, tikTokPublishStatus: "PUBLISHING", publishWorkerStartedAt: null },
    data: { publishWorkerStartedAt: new Date() },
  });
  if (claimed.count !== 1) return { statusCode: 200, body: "Job already handled" };

  try {
    if (platform === "INSTAGRAM") await publishPostToInstagram(postId);
    else await publishPostToTikTok(postId);

    const finalPost = await db.calendarPost.findUnique({
      where: { id: postId },
      select: { instagramPublishStatus: true, tikTokPublishStatus: true },
    });
    const finalStatus = platform === "INSTAGRAM"
      ? finalPost?.instagramPublishStatus
      : finalPost?.tikTokPublishStatus;

    if (finalStatus === "PUBLISHING") {
      const error = "Publishing ended without a final platform status.";
      await db.calendarPost.update({
        where: { id: postId },
        data: platform === "INSTAGRAM"
          ? { instagramPublishStatus: "FAILED", instagramPublishError: error }
          : { tikTokPublishStatus: "FAILED", tikTokPublishError: error },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected publishing worker error.";
    console.error(`Background publish failed for ${platform} post ${postId}:`, error);
    await db.calendarPost.updateMany({
      where: platform === "INSTAGRAM"
        ? { id: postId, instagramPublishStatus: "PUBLISHING" }
        : { id: postId, tikTokPublishStatus: "PUBLISHING" },
      data: platform === "INSTAGRAM"
        ? { instagramPublishStatus: "FAILED", instagramPublishError: message }
        : { tikTokPublishStatus: "FAILED", tikTokPublishError: message },
    });
  }

  return { statusCode: 200, body: "Publish job finished" };
};
