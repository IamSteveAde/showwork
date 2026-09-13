import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredContentWorkspaceStorageReservations } from "@/lib/contentWorkspaceUsage";

// POST — releases expired Content Workspace storage reservations.
// Protected by the same shared secret (CRON_SECRET) as every other
// scheduled job in this app.
//
// Manual test:
//   curl -X POST https://useshowwork.com/api/cron/content-workspace-storage \
//     -H "Authorization: Bearer YOUR_CRON_SECRET"
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary =
    await cleanupExpiredContentWorkspaceStorageReservations();

  return NextResponse.json(summary);
}