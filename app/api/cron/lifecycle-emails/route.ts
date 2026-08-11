import { NextRequest, NextResponse } from "next/server";
import { runLifecycleEmailCheck } from "@/lib/lifecycleEmails";

// POST — runs the lifecycle email check once. Protected by a shared
// secret (CRON_SECRET) rather than normal creator auth, since this is
// meant to be called by a scheduler, not a logged-in person. Also
// callable by hand for testing — see the curl example below — which
// is the whole reason this exists as its own endpoint rather than
// being wired directly into the Netlify Scheduled Function: you can
// trigger a real run and see the JSON summary without waiting for the
// actual daily schedule.
//
// Manual test, once CRON_SECRET is set in your environment:
//   curl -X POST https://useshowwork.com/api/cron/lifecycle-emails \
//     -H "Authorization: Bearer YOUR_CRON_SECRET"
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runLifecycleEmailCheck();

  return NextResponse.json(summary);
}