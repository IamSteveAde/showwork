import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { receiveWhatsAppNotification, verifyWhatsAppSignature, whatsappConfigured } from "@/lib/socialMessaging/whatsapp";

export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const supplied = req.nextUrl.searchParams.get("hub.verify_token") || "";
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (!expected || req.nextUrl.searchParams.get("hub.mode") !== "subscribe" || !challenge
    || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    return NextResponse.json({ error: "Invalid webhook verification." }, { status: 403 });
  }
  return new NextResponse(challenge, { headers: { "Content-Type": "text/plain" } });
}
export async function POST(req: NextRequest) {
  if (!whatsappConfigured()) return NextResponse.json({ error: "WhatsApp is not configured." }, { status: 503 });
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 1_000_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyWhatsAppSignature(raw, req.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  try {
    return NextResponse.json(await receiveWhatsAppNotification(payload));
  } catch {
    // A failed DB transaction must be retried by Meta rather than acknowledged.
    return NextResponse.json({ error: "WhatsApp notification could not be processed." }, { status: 503 });
  }
}
