import { db } from "@/lib/db";
import { publishPostToInstagram } from "@/lib/instagramPublishing";

/**
 * Runs frequently (every 15 minutes — see the matching cron route
 * and Netlify scheduled function) and publishes every Instagram post
 * whose scheduled date has actually arrived. This is the mechanism
 * that fakes "schedule for later," since Instagram's own API only
 * ever publishes immediately — the post sits as SCHEDULED from the
 * moment it's approved, and this job is what actually fires the real
 * publish call once postDate has passed.
 */
export async function runScheduledInstagramPublishing() {
  const duePosts = await db.calendarPost.findMany({
    where: {
      platform: "INSTAGRAM",
      instagramPublishStatus: "SCHEDULED",
      postDate: { lte: new Date() },
    },
    select: { id: true },
  });

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    try {
      await publishPostToInstagram(post.id);
      // publishPostToInstagram itself sets the final status either
      // way — re-read it here only to know which counter to bump.
      const result = await db.calendarPost.findUnique({ where: { id: post.id }, select: { instagramPublishStatus: true } });
      if (result?.instagramPublishStatus === "PUBLISHED") published++;
      else failed++;
    } catch (err) {
      console.error(`Unexpected error publishing calendar post ${post.id}:`, err);
      failed++;
    }
  }

  return { checked: duePosts.length, published, failed };
}