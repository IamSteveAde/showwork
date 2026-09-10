import { db } from "@/lib/db";
import { publishPostToTikTok } from "@/lib/tiktokPublishing";

/**
 * Runs frequently (every 15 minutes — see the matching cron route
 * and Netlify scheduled function) and publishes every TikTok post
 * whose scheduled date has actually arrived. Mirrors
 * runScheduledInstagramPublishing exactly, kept as a separate
 * function/job rather than merged with it, since the two platforms'
 * publish logic, token lifetimes, and failure modes are different
 * enough to stay independent.
 */
export async function runScheduledTikTokPublishing() {
  const duePosts = await db.calendarPost.findMany({
    where: {
      platform: "TIKTOK",
      tikTokPublishStatus: "SCHEDULED",
      postDate: { lte: new Date() },
    },
    select: { id: true },
  });

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    try {
      await publishPostToTikTok(post.id);
      const result = await db.calendarPost.findUnique({ where: { id: post.id }, select: { tikTokPublishStatus: true } });
      if (result?.tikTokPublishStatus === "PUBLISHED") published++;
      else failed++;
    } catch (err) {
      console.error(`Unexpected error publishing calendar post ${post.id} to TikTok:`, err);
      failed++;
    }
  }

  return { checked: duePosts.length, published, failed };
}