import { schedule } from "@netlify/functions";

// Runs every 15 minutes — much more frequent than the daily jobs
// elsewhere in this app, since this is what actually makes scheduled
// Instagram posts go live close to their intended time rather than
// once a day. Calls the protected API route above rather than
// duplicating its logic here, same pattern as every other scheduled
// job in this codebase.
export const handler = schedule("*/15 * * * *", async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL;

  try {
    const res = await fetch(`${siteUrl}/api/cron/instagram-publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const summary = await res.json();
    console.log("Instagram publish cron run completed:", summary);
  } catch (err) {
    console.error("Instagram publish cron run failed:", err);
  }

  return { statusCode: 200 };
});