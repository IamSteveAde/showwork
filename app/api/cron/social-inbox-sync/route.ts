import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const site = process.env.URL || process.env.DEPLOY_URL;
  if (!site) return NextResponse.json({ error: "Worker is not configured." }, { status: 503 });
  const response = await fetch(`${site}/.netlify/functions/social-inbox-sync-background`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(5000) });
  return NextResponse.json({ queued: response.ok }, { status: response.ok ? 202 : 502 });
}
