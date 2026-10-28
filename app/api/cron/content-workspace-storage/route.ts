import { cleanupWorkspaceVideoUploads } from "@/lib/workspaceVideoUploads";
import {
  processWorkspaceStorageCleanup,
  discoverReleasedWorkspaceUploads,
} from "@/lib/workspaceStorageCleanup";
import { cleanupTikTokPreparedFiles } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredContentWorkspaceStorageReservations } from "@/lib/contentWorkspaceUsage";

export const maxDuration = 60;

// Releases expired reservations and processes durable file cleanup.
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

  const workspaceFiles = await processWorkspaceStorageCleanup(10);
  const videoUploads = await cleanupWorkspaceVideoUploads(5);
  const summary = await cleanupExpiredContentWorkspaceStorageReservations();

  const preparedMedia = await cleanupTikTokPreparedFiles();
  const abandonedUploads = await discoverReleasedWorkspaceUploads();
  return NextResponse.json({
    ...summary,
    preparedMedia,
    abandonedUploads,
    workspaceFiles,
    videoUploads,
  });
}
// Hosted schedulers may use GET; the same secret is required.
export async function GET(req: NextRequest) {
  return POST(req);
}
