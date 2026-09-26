import { schedule } from "@netlify/functions";

// Check each minute; due posts are atomically claimed and dispatched
// to independent background workers by the protected API route.
export const handler = schedule("* * * * *", async () => {
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
