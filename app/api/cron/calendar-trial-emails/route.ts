import { NextRequest, NextResponse } from "next/server";
import { runCalendarTrialEmailCheck } from "@/lib/calendarTrialEmails";

// POST — runs the calendar trial email check once. Protected by the
// same shared secret (CRON_SECRET) as the lifecycle email cron,
// rather than normal creator auth, since this is meant to be called
// by a scheduler, not a logged-in person.
//
// Manual test, once CRON_SECRET is set in your environment:
//   curl -X POST https://useshowwork.com/api/cron/calendar-trial-emails \
//     -H "Authorization: Bearer YOUR_CRON_SECRET"
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runCalendarTrialEmailCheck();

  return NextResponse.json(summary);
}