import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { canAccessCalendarById, hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { sendMetaInboxMessage } from "@/lib/socialMessaging/meta";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: calendarId, conversationId } = await params;
  if (!(await hasCalendarPermission(creator.id, calendarId, "EDIT_CALENDAR"))) return NextResponse.json({ error: "You don’t have permission to reply." }, { status: 403 });
  if (!(await canAccessCalendarById(calendarId))) return NextResponse.json({ error: "This workspace isn’t active." }, { status: 403 });
  const body = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2000) return NextResponse.json({ error: "Enter a reply of 1–2,000 characters." }, { status: 400 });
  const conversation = await db.socialLeadConversation.findFirst({
    where: { id: conversationId, calendarId },
    include: { connection: true },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  if (!conversation.connection || !["FACEBOOK", "INSTAGRAM"].includes(conversation.platform)) {
    return NextResponse.json({ error: "Replies are not available for this platform connection yet." }, { status: 409 });
  }
  const now = new Date();
  try {
    const providerMessageId = await sendMetaInboxMessage({ connection: conversation.connection, recipientId: conversation.participantPlatformId, text });
    if (providerMessageId) {
      await db.socialLeadMessage.createMany({
        data: [{ conversationId, providerMessageId, direction: "OUTBOUND", status: "SENT", text, platformCreatedAt: now, sentByCreatorId: creator.id }],
        skipDuplicates: true,
      });
    } else {
      await db.socialLeadMessage.create({ data: { conversationId, direction: "OUTBOUND", status: "SENT", text, platformCreatedAt: now, sentByCreatorId: creator.id } });
    }
    await db.socialLeadConversation.update({ where: { id: conversationId }, data: { lastMessagePreview: text.slice(0, 500), lastMessageAt: now, unreadCount: 0, leadStatus: conversation.leadStatus === "NEW" ? "CONTACTED" : conversation.leadStatus } });
    const message = providerMessageId
      ? await db.socialLeadMessage.findFirstOrThrow({ where: { conversationId, providerMessageId } })
      : await db.socialLeadMessage.findFirstOrThrow({ where: { conversationId, text, platformCreatedAt: now, sentByCreatorId: creator.id } });
    return NextResponse.json({ message: { id: message.id, direction: message.direction, status: message.status, text: message.text, platformCreatedAt: message.platformCreatedAt.toISOString(), isAiGenerated: false } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not send this reply.";
    await db.socialLeadMessage.create({ data: { conversationId, direction: "OUTBOUND", status: "FAILED", text, platformCreatedAt: now, sentByCreatorId: creator.id, sendError: reason.slice(0, 1500) } }).catch(() => undefined);
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
