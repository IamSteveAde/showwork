import { NextRequest, NextResponse } from "next/server";
import { runScheduledTikTokPublishing } from "@/lib/tiktokScheduler";

// POST — runs the scheduled TikTok publish check once. Protected by
// the same shared secret (CRON_SECRET) as every other scheduled job
// in this app.
//
// Manual test, once CRON_SECRET is set in your environment:
//   curl -X POST https://useshowwork.com/api/cron/tiktok-publish \
//     -H "Authorization: Bearer YOUR_CRON_SECRET"
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runScheduledTikTokPublishing();

  return NextResponse.json(summary);
}