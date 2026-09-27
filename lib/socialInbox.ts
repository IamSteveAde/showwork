import type { SocialLeadStatus, SocialPlatform } from "@prisma/client";
import { db } from "@/lib/db";

export const SOCIAL_LEAD_STATUSES: SocialLeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CUSTOMER", "NOT_A_LEAD"];
export const SOCIAL_INBOX_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "FACEBOOK", "X", "TIKTOK", "LINKEDIN", "YOUTUBE"];

export async function getSocialInbox(calendarId: string, params: URLSearchParams) {
  const platform = params.get("platform")?.toUpperCase();
  const status = params.get("status")?.toUpperCase();
  const query = params.get("q")?.trim();
  const unread = params.get("unread") === "true";
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  if (platform && !SOCIAL_INBOX_PLATFORMS.includes(platform as SocialPlatform)) throw new Error("Choose a supported platform.");
  if (status && !SOCIAL_LEAD_STATUSES.includes(status as SocialLeadStatus)) throw new Error("Choose a valid lead status.");

  const where = {
    calendarId,
    ...(platform ? { platform: platform as SocialPlatform } : {}),
    ...(status ? { leadStatus: status as SocialLeadStatus } : {}),
    ...(unread ? { unreadCount: { gt: 0 } } : {}),
    ...(query ? { OR: [
      { participantName: { contains: query, mode: "insensitive" as const } },
      { participantUsername: { contains: query, mode: "insensitive" as const } },
      { lastMessagePreview: { contains: query, mode: "insensitive" as const } },
    ] } : {}),
  };
  const [conversations, totalLeads, totalMessages, unreadResult, newMessages, settings, accounts] = await Promise.all([
    db.socialLeadConversation.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        messages: { orderBy: { platformCreatedAt: "desc" }, take: 50 },
        connection: { select: { accountName: true, username: true, status: true } },
      },
    }),
    db.socialLeadConversation.count({ where: { calendarId, leadStatus: { not: "NOT_A_LEAD" } } }),
    db.socialLeadMessage.count({ where: { conversation: { calendarId } } }),
    db.socialLeadConversation.aggregate({ where: { calendarId }, _sum: { unreadCount: true } }),
    db.socialLeadMessage.count({ where: { conversation: { calendarId }, direction: "INBOUND", platformCreatedAt: { gte: monthStart } } }),
    db.socialInboxSettings.findUnique({ where: { calendarId }, select: { clientAccessEnabled: true, aiAutoReplyEnabled: true, aiAutoReplyInstructions: true } }),
    db.socialConnection.findMany({
      where: { calendarId, status: { not: "DISCONNECTED" } },
      select: { id: true, platform: true, accountName: true, username: true, status: true, tokenScopes: true, messagingWebhookSubscribedAt: true, messagingWebhookError: true },
      orderBy: { platform: "asc" },
    }),
  ]);
  return {
    summary: { leads: totalLeads, newMessages: unreadResult._sum.unreadCount ?? 0, messagesThisMonth: newMessages, allMessages: totalMessages },
    accounts: accounts.map(({ tokenScopes, ...account }) => ({
      ...account,
      messagingAvailable: account.platform === "FACEBOOK"
        ? Boolean(account.status === "CONNECTED" && tokenScopes?.split(/[ ,]+/).includes("pages_messaging") && account.messagingWebhookSubscribedAt && !account.messagingWebhookError)
        : account.platform === "INSTAGRAM"
          ? Boolean(account.status === "CONNECTED" && tokenScopes?.split(/[ ,]+/).includes("instagram_manage_messages") && account.messagingWebhookSubscribedAt && !account.messagingWebhookError)
          : false,
      messagingNote: account.platform === "FACEBOOK" || account.platform === "INSTAGRAM"
        ? account.messagingWebhookError
          ? account.messagingWebhookError
          : !(account.platform === "FACEBOOK" ? tokenScopes?.includes("pages_messaging") : tokenScopes?.includes("instagram_manage_messages"))
            ? "Reconnect and authorize messaging"
            : !account.messagingWebhookSubscribedAt
              ? "Reconnect this account to subscribe its messaging webhook"
              : "Messaging enabled"
        : account.platform === "TIKTOK" || account.platform === "LINKEDIN"
          ? "Messaging is not available through this standard API connection"
          : account.platform === "X"
            ? "X DM API access is not enabled for this connection"
            : "Messaging is not supported for this channel",
    })),
    settings: settings ?? { clientAccessEnabled: true, aiAutoReplyEnabled: false, aiAutoReplyInstructions: null },
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      platform: conversation.platform,
      providerConversationId: conversation.providerConversationId,
      participantPlatformId: conversation.participantPlatformId,
      participantName: conversation.participantName,
      participantUsername: conversation.participantUsername,
      leadStatus: conversation.leadStatus,
      unreadCount: conversation.unreadCount,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      connection: conversation.connection,
      messages: [...conversation.messages].reverse().map((message) => ({
        id: message.id,
        direction: message.direction,
        status: message.status,
        text: message.text,
        platformCreatedAt: message.platformCreatedAt.toISOString(),
        sentByCreatorId: message.sentByCreatorId,
        isAiGenerated: message.isAiGenerated,
        autoReplyHandoffReason: message.autoReplyHandoffReason,
        sendError: message.sendError,
      })),
    })),
  };
}
