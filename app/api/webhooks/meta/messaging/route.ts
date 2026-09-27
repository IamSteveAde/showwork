import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFacebookMessengerProfile, metaWebhookPlatform } from "@/lib/socialMessaging/meta";
import { socialStatusToPipeline } from "@/lib/calendarLeads";

export const runtime = "nodejs";

function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && process.env.META_WEBHOOK_VERIFY_TOKEN && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!validSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }
  let body: {
    object?: string;
    entry?: Array<{
      id?: string;
      messaging?: Array<{
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: Array<{ type?: string }> };
      }>;
    }>;
  };
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 }); }
  const platform = body.object ? metaWebhookPlatform(body.object) : null;
  if (!platform || !Array.isArray(body.entry)) return NextResponse.json({ received: true });

  for (const entry of body.entry) {
    if (!entry.id || !Array.isArray(entry.messaging)) continue;
    const connection = await db.socialConnection.findFirst({
      where: { platform, platformAccountId: entry.id, status: "CONNECTED" },
    });
    if (!connection) continue;
    const settings = await db.socialInboxSettings.upsert({
      where: { calendarId: connection.calendarId },
      create: { calendarId: connection.calendarId },
      update: {},
    });
    for (const event of entry.messaging) {
      const isEcho = Boolean(event.message?.is_echo);
      const senderId = isEcho ? event.recipient?.id : event.sender?.id;
      const providerMessageId = event.message?.mid;
      const text = event.message?.text?.trim() || event.message?.attachments?.map((attachment) => `[${attachment.type || "Media"} attachment]`).join(" ") || "";
      if (!senderId || !providerMessageId || !text) continue;
      if (!isEcho && senderId === connection.platformAccountId) continue;
      const messageAt = new Date(Number.isFinite(event.timestamp) ? Number(event.timestamp) : Date.now());
      const conversationKey = {
        socialConnectionId_providerConversationId: {
          socialConnectionId: connection.id,
          providerConversationId: senderId,
        },
      };
      const existingConversation = await db.socialLeadConversation.findUnique({
        where: conversationKey,
        select: { id: true, participantName: true, participantUsername: true, leadStatus: true },
      });
      const savedName = existingConversation?.participantName?.trim();
      const hasUsableSavedName = Boolean(savedName && !["social contact", "facebook contact", "facebook user", senderId.toLowerCase()].includes(savedName.toLowerCase()));
      const profile = platform === "FACEBOOK" && !isEcho && !hasUsableSavedName && connection.accessToken
        ? await getFacebookMessengerProfile({ pageScopedUserId: senderId, pageAccessToken: connection.accessToken })
        : null;
      const participantName = profile?.name || existingConversation?.participantName || null;
      const conversation = await db.socialLeadConversation.upsert({
        where: conversationKey,
        create: {
          calendarId: connection.calendarId,
          socialConnectionId: connection.id,
          platform,
          providerConversationId: senderId,
          participantPlatformId: senderId,
          participantName,
          unreadCount: isEcho ? 0 : 1,
          lastMessagePreview: text.slice(0, 500),
          lastMessageAt: messageAt,
        },
        update: {
          ...(isEcho ? {} : { unreadCount: { increment: 1 } }),
          ...(profile?.name ? { participantName: profile.name } : {}),
          lastMessagePreview: text.slice(0, 500),
          lastMessageAt: messageAt,
        },
      });
      await db.calendarLead.upsert({
        where: { socialConversationId: conversation.id },
        create: {
          calendarId: connection.calendarId,
          socialConversationId: conversation.id,
          name: conversation.participantName || conversation.participantUsername || "Social contact",
          username: conversation.participantUsername,
          status: socialStatusToPipeline(conversation.leadStatus),
          source: "SOCIAL",
        },
        update: profile?.name ? { name: profile.name } : {},
      });
      const inserted = await db.socialLeadMessage.createMany({
        data: [{
          conversationId: conversation.id,
          providerMessageId,
          direction: isEcho ? "OUTBOUND" : "INBOUND",
          status: isEcho ? "SENT" : "RECEIVED",
          text,
          platformCreatedAt: messageAt,
          autoReplyEligible: !isEcho && settings.aiAutoReplyEnabled,
        }],
        skipDuplicates: true,
      });
      if (inserted.count === 0 && !isEcho) {
        await db.socialLeadConversation.update({ where: { id: conversation.id }, data: { unreadCount: { decrement: 1 } } });
      }
    }
  }
  return NextResponse.json({ received: true });
}
