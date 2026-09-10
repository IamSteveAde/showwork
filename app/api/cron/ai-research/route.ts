import { NextRequest, NextResponse } from "next/server";
import { runScheduledAiBusinessResearch } from "@/lib/aiResearchScheduler";

// POST — runs the weekly AI business research check once. Protected
// by the same shared secret (CRON_SECRET) as every other scheduled
// job in this app.
//
// Manual test, once CRON_SECRET is set in your environment:
//   curl -X POST https://useshowwork.com/api/cron/ai-research \
//     -H "Authorization: Bearer YOUR_CRON_SECRET"
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runScheduledAiBusinessResearch();

  return NextResponse.json(summary);
}