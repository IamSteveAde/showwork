import { db } from "@/lib/db";
import { generateSocialInboxAutoReply } from "@/lib/openai";
import { sendSocialInboxMessage, supportsMessaging } from "@/lib/socialMessaging/registry";

const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export async function processSocialInboxAutoReplies(messageIds?: string[]) {
  let targetCalendarIds: string[] | undefined;
  if (messageIds) {
    const pending = await db.socialLeadMessage.findMany({
      where: { id: { in: messageIds }, direction: "INBOUND", autoReplyEligible: true, autoReplyHandledAt: null },
      select: { conversation: { select: { calendarId: true } } },
    });
    targetCalendarIds = [...new Set(pending.map((message) => message.conversation.calendarId))];
    if (!targetCalendarIds.length) return { workspaces: 0, analyzed: 0, sent: 0, handedOff: 0, failed: 0 };
  }
  const settings = await db.socialInboxSettings.findMany({
    where: { aiAutoReplyEnabled: true, ...(targetCalendarIds ? { calendarId: { in: targetCalendarIds } } : {}) },
    select: { calendarId: true },
  });
  const summary = { workspaces: settings.length, analyzed: 0, sent: 0, handedOff: 0, failed: 0 };
  for (const { calendarId } of settings) {
    const queue = await db.socialLeadMessage.findMany({
      where: {
        direction: "INBOUND",
        ...(messageIds ? { id: { in: messageIds } } : {}),
        autoReplyEligible: true,
        autoReplyHandledAt: null,
        autoReplyAttemptCount: { lt: 3 },
        conversation: { calendarId },
      },
      orderBy: { platformCreatedAt: "asc" },
      take: 10,
      include: {
        conversation: {
          include: {
            connection: true,
            calendar: { select: { clientName: true, aiBusinessSummary: true, instagramPageId: true } },
            messages: { orderBy: { platformCreatedAt: "desc" }, take: 12 },
          },
        },
      },
    });
    for (const inbound of queue) {
      const now = new Date();
      const claimed = await db.socialLeadMessage.updateMany({
        where: {
          id: inbound.id,
          autoReplyHandledAt: null,
          autoReplyAttemptCount: { lt: 3 },
          OR: [{ autoReplyClaimedAt: null }, { autoReplyClaimedAt: { lt: new Date(now.getTime() - CLAIM_TIMEOUT_MS) } }],
        },
        data: { autoReplyClaimedAt: now, autoReplyAttemptCount: { increment: 1 }, sendError: null },
      });
      if (!claimed.count) continue;
      summary.analyzed++;
      try {
        const recent = [...inbound.conversation.messages].reverse().map((message) => ({
          direction: message.direction,
          text: message.text.slice(0, 1000),
          createdAt: message.platformCreatedAt.toISOString(),
        }));
        const generated = await generateSocialInboxAutoReply({
          clientName: inbound.conversation.calendar.clientName,
          businessSummary: inbound.conversation.calendar.aiBusinessSummary,
          instructions: (await db.socialInboxSettings.findUnique({ where: { calendarId }, select: { aiAutoReplyInstructions: true } }))?.aiAutoReplyInstructions ?? null,
          conversation: recent,
          latestInbound: inbound.text.slice(0, 3000),
        });
        if (!generated.shouldReply || !generated.replyText || !inbound.conversation.connection || !supportsMessaging(inbound.conversation.platform)) {
          await db.socialLeadMessage.update({ where: { id: inbound.id }, data: { autoReplyHandledAt: new Date(), autoReplyClaimedAt: null, autoReplyHandoffReason: generated.handoffReason || "This message needs a human response." } });
          summary.handedOff++;
          continue;
        }
        const latestSettings = await db.socialInboxSettings.findUnique({ where: { calendarId }, select: { aiAutoReplyEnabled: true } });
        if (!latestSettings?.aiAutoReplyEnabled) {
          await db.socialLeadMessage.update({ where: { id: inbound.id }, data: { autoReplyHandledAt: new Date(), autoReplyClaimedAt: null, autoReplyHandoffReason: "Automatic replies were disabled before the reply was sent." } });
          summary.handedOff++;
          continue;
        }
        const providerMessageId = await sendSocialInboxMessage({
          connection: inbound.conversation.connection,
          instagramPageId: inbound.conversation.calendar.instagramPageId,
          recipientId: inbound.conversation.participantPlatformId,
          text: generated.replyText,
        });
        const sentAt = new Date();
        await db.$transaction(async (tx) => {
          if (providerMessageId) {
            await tx.socialLeadMessage.createMany({
              data: [{ conversationId: inbound.conversationId, providerMessageId, direction: "OUTBOUND", status: "SENT", text: generated.replyText, platformCreatedAt: sentAt, isAiGenerated: true }],
              skipDuplicates: true,
            });
          } else {
            await tx.socialLeadMessage.create({ data: { conversationId: inbound.conversationId, direction: "OUTBOUND", status: "SENT", text: generated.replyText, platformCreatedAt: sentAt, isAiGenerated: true } });
          }
          await tx.socialLeadMessage.update({ where: { id: inbound.id }, data: { autoReplyHandledAt: sentAt, autoReplyClaimedAt: null, autoReplyHandoffReason: null } });
          await tx.socialLeadConversation.update({ where: { id: inbound.conversationId }, data: { lastMessageAt: sentAt, lastMessagePreview: generated.replyText.slice(0, 500) } });
        });
        summary.sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Automatic reply could not be sent.";
        const isLastAttempt = inbound.autoReplyAttemptCount + 1 >= 3;
        await db.socialLeadMessage.update({
          where: { id: inbound.id },
          data: {
            autoReplyClaimedAt: null,
            ...(isLastAttempt ? { autoReplyHandledAt: new Date(), autoReplyHandoffReason: "Automatic reply failed repeatedly; a human needs to take over." } : {}),
            sendError: message.slice(0, 1500),
          },
        });
        summary.failed++;
        console.error(`Social inbox auto-reply failed for message ${inbound.id}:`, error);
      }
    }
  }
  return summary;
}

export async function processSocialInboxAutoReply(messageId: string) {
  return processSocialInboxAutoReplies([messageId]);
}
