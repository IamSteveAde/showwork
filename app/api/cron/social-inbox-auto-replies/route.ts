import { NextRequest, NextResponse } from "next/server";
import { processSocialInboxAutoReplies } from "@/lib/socialMessaging/autoReply";

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try { return NextResponse.json(await processSocialInboxAutoReplies()); }
  catch (error) {
    console.error("Social inbox auto-reply processor failed:", error);
    return NextResponse.json({ error: "Auto-replies could not be processed." }, { status: 500 });
  }
}
