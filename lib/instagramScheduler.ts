import { db } from "@/lib/db";

const MAX_JOBS_PER_TICK = 20;
const STALE_AFTER_MS = 16 * 60 * 1000;

/** Claim due Instagram posts atomically, then hand each one to a
 * Netlify background function so slow media processing cannot hold up
 * this minute-level scheduler or the other posts in the batch. */
export async function runScheduledInstagramPublishing() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_AFTER_MS);

  const stale = await db.calendarPost.updateMany({
    where: {
      platform: "INSTAGRAM",
      instagramPublishStatus: "PUBLISHING",
      updatedAt: { lte: staleBefore },
    },
    data: {
      instagramPublishStatus: "FAILED",
      instagramPublishError: "The publishing worker stopped before confirming the result. Check Instagram before retrying to avoid a duplicate post.",
    },
  });

  const duePosts = await db.calendarPost.findMany({
    where: {
      platform: "INSTAGRAM",
      instagramPublishStatus: "SCHEDULED",
      postDate: { lte: now },
    },
    orderBy: { postDate: "asc" },
    take: MAX_JOBS_PER_TICK,
    select: { id: true },
  });

  const siteUrl = (process.env.URL || process.env.DEPLOY_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const outcomes = await Promise.all(duePosts.map(async ({ id }) => {
    const claimed = await db.calendarPost.updateMany({
      where: { id, platform: "INSTAGRAM", instagramPublishStatus: "SCHEDULED" },
      data: {
        instagramPublishStatus: "PUBLISHING",
        instagramPublishError: null,
        publishWorkerStartedAt: null,
      },
    });
    if (claimed.count !== 1) return "skipped" as const;

    try {
      if (!siteUrl || !process.env.CRON_SECRET) throw new Error("Publishing worker configuration is missing.");
      const response = await fetch(`${siteUrl}/.netlify/functions/publish-post-background`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId: id, platform: "INSTAGRAM" }),
      });
      if (!response.ok) throw new Error(`Background worker dispatch failed (${response.status}).`);
      return "dispatched" as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start the publishing worker.";
      await db.calendarPost.updateMany({
        where: { id, instagramPublishStatus: "PUBLISHING" },
        data: {
          instagramPublishStatus: "SCHEDULED",
          instagramPublishError: message,
          publishWorkerStartedAt: null,
        },
      });
      return "failed" as const;
    }
  }));

  return {
    checked: duePosts.length,
    dispatched: outcomes.filter((result) => result === "dispatched").length,
    failed: outcomes.filter((result) => result === "failed").length + stale.count,
  };
}
