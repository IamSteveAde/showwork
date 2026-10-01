import { NextRequest, NextResponse } from "next/server";
import { verifyTikTokMessagingSignature } from "@/lib/tiktokMessaging";
import { receiveTikTokMessage } from "@/lib/socialMessaging/tiktok";

export const maxDuration = 60;
export async function POST(req: NextRequest) {
  if (!process.env.TIKTOK_BUSINESS_CLIENT_SECRET) return NextResponse.json({ error: "TikTok Business Messaging is not configured." }, { status: 503 });
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 128_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyTikTokMessagingSignature(raw, req.headers.get("tiktok-signature"))) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  try {
    // Eligible messages use background dispatch and the existing AI cron.
    // The transaction deduplicates retries before creating a lead or AI item.
    return NextResponse.json(await receiveTikTokMessage(payload));
  } catch {
    // Do not acknowledge failed ingestion: TikTok can retry the notification.
    return NextResponse.json({ error: "TikTok notification could not be processed." }, { status: 503 });
  }
}
