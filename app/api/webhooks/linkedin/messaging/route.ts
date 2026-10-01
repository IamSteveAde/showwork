import { NextRequest, NextResponse } from "next/server";
import { linkedInChallenge, verifyLinkedInSignature } from "@/lib/linkedin/webhook";
import { linkedInMessagingConfigured } from "@/lib/linkedin/messagingAccess";
import { receiveLinkedInMessages } from "@/lib/socialMessaging/linkedin";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: NextRequest) {
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (process.env.LINKEDIN_MESSAGING_ENABLED !== "true" || !secret) return json({ error: "LinkedIn webhook is not enabled." }, 503);
  const challenge = req.nextUrl.searchParams.get("challengeCode");
  if (!challenge || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challenge)) return json({ error: "Invalid challenge." }, 400);
  return json(linkedInChallenge(challenge, secret));
}
export async function POST(req: NextRequest) {
  if (!linkedInMessagingConfigured()) return json({ error: "LinkedIn messaging adapter is not enabled." }, 503);
  // Bound streamed input even when Content-Length is absent.
  const reader = req.body?.getReader();
  if (!reader) return json({ error: "Missing body." }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1_000_000) { await reader.cancel(); return json({ error: "Payload too large." }, 413); }
      chunks.push(chunk.value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!verifyLinkedInSignature(raw, req.headers.get("x-li-signature"), process.env.LINKEDIN_CLIENT_SECRET)) return json({ error: "Invalid signature." }, 401);
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON." }, 400); }
    await receiveLinkedInMessages(payload);
    return json({ received: true });
  } catch {
    // No payload logging; fail rather than acknowledge messages not persisted.
    return json({ error: "Message processing failed. Retry delivery." }, 503);
  }
}
