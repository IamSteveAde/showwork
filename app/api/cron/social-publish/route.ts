import { NextRequest, NextResponse } from "next/server";
import { runScheduledPublishing } from "@/lib/publishing/scheduler";
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runScheduledPublishing(["FACEBOOK", "LINKEDIN", "X"]));
}
