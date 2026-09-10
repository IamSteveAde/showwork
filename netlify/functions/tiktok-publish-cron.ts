import { schedule } from "@netlify/functions";

// Runs every 15 minutes, same interval as the Instagram publish job
// — calls the protected API route above rather than duplicating its
// logic here, same pattern as every other scheduled job in this
// codebase.
export const handler = schedule("*/15 * * * *", async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL;

  try {
    const res = await fetch(`${siteUrl}/api/cron/tiktok-publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const summary = await res.json();
    console.log("TikTok publish cron run completed:", summary);
  } catch (err) {
    console.error("TikTok publish cron run failed:", err);
  }

  return { statusCode: 200 };
});