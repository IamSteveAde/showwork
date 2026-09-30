import type { SocialConnection } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessCalendarById } from "@/lib/calendarPermissions";
import { freshConnection, requireScopes } from "@/lib/socialTokens";
import { providerJson } from "@/lib/publishing/http";
import { ingestSocialMessage } from "./ingest";

type Event = { id: string; text?: string; created_at: string; sender_id: string; participant_ids?: string[]; dm_conversation_id: string; event_type: string };
export async function syncXInbox(stored: SocialConnection) {
  const connection = await freshConnection(stored);
  requireScopes(connection, ["dm.read"]);
  if (!(await canAccessCalendarById(connection.calendarId))) return;
  const settings = await db.socialInboxSettings.findUnique({ where: { calendarId: connection.calendarId } });
  const startedAt = new Date();
  let next: string | undefined;
  let complete = false;
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ max_results: "100", "dm_event.fields": "created_at,sender_id,participant_ids,dm_conversation_id", event_types: "MessageCreate", expansions: "sender_id,participant_ids", "user.fields": "name,username", ...(next ? { pagination_token: next } : {}) });
    const result = await providerJson<{ data?: Event[]; includes?: { users?: { id: string; name?: string; username?: string }[] }; meta?: { next_token?: string } }>(`https://api.x.com/2/dm_events?${query}`, { headers: { Authorization: `Bearer ${connection.accessToken}` } });
    for (const event of [...(result.data ?? [])].reverse()) {
      const createdAt = new Date(event.created_at);
      if (!event.dm_conversation_id || !event.id || !Number.isFinite(createdAt.getTime())) continue;
      const participants = event.participant_ids ?? event.dm_conversation_id.split("-");
      // Group conversations are intentionally excluded from one-person CRM leads.
      if (participants.length !== 2 || !participants.includes(connection.platformAccountId)) continue;
      const outbound = event.sender_id === connection.platformAccountId;
      const participantId = participants.find(id => id !== connection.platformAccountId)!;
      const profile = result.includes?.users?.find(user => user.id === participantId);
      await ingestSocialMessage(connection, { conversationId: event.dm_conversation_id, messageId: event.id, participantId, name: profile?.name, username: profile?.username, text: event.text || "[Media attachment]", createdAt, outbound,
        // Initial historical imports must not send surprise replies. Only
        // newly received text after an established sync is eligible.
        autoReplyEligible: !!settings?.aiAutoReplyEnabled && !!stored.messagingLastSyncAt && createdAt > stored.messagingLastSyncAt && startedAt.getTime() - createdAt.getTime() < 10 * 60_000 && !!event.text,
      });
    }
    next = result.meta?.next_token;
    const passedWatermark = stored.messagingLastSyncAt && result.data?.some(event => new Date(event.created_at) < stored.messagingLastSyncAt!);
    if (!next || passedWatermark) { complete = true; break; }
  }
  await db.socialConnection.updateMany({ where: { id: connection.id, status: "CONNECTED" }, data: { messagingLastSyncAt: startedAt, messagingSyncError: complete ? null : "Only the most recent 1,000 DM events were imported. Older history may be incomplete." } });
}
export async function syncSocialInboxes(calendarId?: string) {
  const connections = await db.socialConnection.findMany({ where: { platform: "X", status: "CONNECTED", ...(calendarId ? { calendarId } : {}), tokenScopes: { contains: "dm.read" } }, orderBy: { updatedAt: "asc" }, take: 20 });
  let synced = 0;
  for (const connection of connections) {
    try { await syncXInbox(connection); synced++; }
    catch (error) { await db.socialConnection.update({ where: { id: connection.id }, data: { messagingSyncError: error instanceof Error ? error.message : "Inbox sync failed." } }); }
  }
  return { checked: connections.length, synced };
}
