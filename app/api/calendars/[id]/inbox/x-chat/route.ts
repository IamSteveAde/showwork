import { canUseCalendarFeature } from "@/lib/calendarPermissions";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessCalendarById } from "@/lib/calendarPermissions";
import { chatConnection, chatConversations, hasRecentXInbound, chatRequest, encryptedSendBody, participantForConversation, publicKeys, XChatError } from "@/lib/xChat/provider";

import { syncXChatLeads } from "@/lib/xChat/leads";

export const maxDuration = 60;
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store, private", "Pragma": "no-cache" } });
type Context = { params: Promise<{ id: string }> };
async function authorized(req: NextRequest, context: Context, write = false) {
  const creator = await getCurrentCreator();
  if (!creator) throw new XChatError("Sign in to open X Chat.", 401);
  const { id } = await context.params;
  // Only the workspace owner can unlock the connected identity's root keys.
  const calendar = await db.socialCalendar.findFirst({ where: { id, managerId: creator.id }, select: { id: true } });
  if (!calendar || !(await canAccessCalendarById(id))) throw new XChatError("Only the owner of an active workspace can open X Chat.", 403);
  if (!(await canUseCalendarFeature(id, "socialInbox"))) throw new XChatError("Upgrade to Studio to use Social Inbox. Your existing data is preserved.", 403);
  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) throw new XChatError("Choose a connected X account.");
  const stored = await db.socialConnection.findFirst({ where: { id: connectionId, calendarId: id, platform: "X", status: "CONNECTED" } });
  if (!stored) throw new XChatError("This X account is not connected to this workspace.", 404);
  return chatConnection(stored, write);
}
function failure(error: unknown) {
  return json({ retrySamePayload: error instanceof XChatError ? error.retrySamePayload : true, error: error instanceof XChatError ? error.message : "Could not access X Chat. Check the connection and granted permissions in Channels." }, error instanceof XChatError ? error.status : 502);
}
export async function GET(req: NextRequest, context: Context) {
  try {
    const connection = await authorized(req, context);
    const query = req.nextUrl.searchParams;
    const action = query.get("action") || "setup";
    if (action === "session") return json({ active: true });
    if (action === "setup") {
      const identity = await chatRequest<{ data?: { id: string; username: string } }>(connection, "users/me");
      if (identity.data?.id !== connection.platformAccountId) throw new XChatError("The token belongs to another X account. Reconnect in Channels.");
      const keys = await publicKeys(connection, connection.platformAccountId, true);
      const records = (keys.data || []).filter(key => key.juicebox_config && /^\d+$/.test(key.public_key_version));
      records.sort((a, b) => BigInt(a.public_key_version) > BigInt(b.public_key_version) ? -1 : 1);
      if (!records.length) throw new XChatError("X did not return an existing Chat key backup. Set up Chat in X first. Showwork will not replace your encryption keys.");
      return json({ account: identity.data, record: records[0], connectedAt: connection.connectedAt.toISOString() });
    }
    if (action === "resolve") {
      const username = query.get("username")?.trim().replace(/^@/, "") || "";
      if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) throw new XChatError("Enter the other person's X username.");
      const user = await chatRequest<{ data?: { id: string; username: string; name: string } }>(connection, `users/by/username/${username}`);
      if (!user.data?.id || user.data.id === connection.platformAccountId) throw new XChatError("Choose the other person's account.");
      if (!(await hasRecentXInbound(connection, user.data.id))) throw new XChatError("This user has not messaged you since this X channel was connected.");
      return json({ participant: user.data });
    }
    const cursor = query.get("cursor");
    if (cursor && cursor.length > 2048) throw new XChatError("Invalid pagination cursor.");
    if (action === "conversations") {
      return json(await chatConversations(connection, cursor));
    }
    if (action === "events") {
      const participantId = participantForConversation(query.get("conversationId") || "", connection.platformAccountId);
      const params = new URLSearchParams({ max_results: "100", "chat_message_event.fields": "id,conversation_id,sender_id,created_at,encoded_event" });
      if (cursor) params.set("pagination_token", cursor);
      const [events, own, other] = await Promise.all([
        chatRequest<Record<string, unknown>>(connection, `chat/conversations/${participantId}/events?${params}`),
        publicKeys(connection, connection.platformAccountId), publicKeys(connection, participantId),
      ]);
      const signingKeys = [{ id: connection.platformAccountId, keys: own.data || [] }, { id: participantId, keys: other.data || [] }].flatMap(({ id, keys }) => keys.map(key => ({ userId: id, publicKeyVersion: key.public_key_version, publicKey: key.signing_public_key, identityPublicKey: key.public_key, identityPublicKeySignature: key.identity_public_key_signature })));
      return json({ ...events, signingKeys });
    }
    throw new XChatError("Unknown X Chat action.");
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest, context: Context) {
  try {
    // This endpoint never accepts PINs, private keys or plaintext message fields.
    if (req.headers.get("origin") !== req.nextUrl.origin) throw new XChatError("Invalid request origin.", 403);
    const syncingLeads = req.nextUrl.searchParams.get("action") === "sync-leads";
    const connection = await authorized(req, context, !syncingLeads);
    if (syncingLeads) {
      const cursor = req.nextUrl.searchParams.get("cursor");
      if (cursor && cursor.length > 2048) throw new XChatError("Invalid pagination cursor.");
      const page = await chatConversations(connection, cursor);
      return json({ ...page, data: await syncXChatLeads(connection, page.data) });
    }
    const participantId = participantForConversation(req.nextUrl.searchParams.get("conversationId") || "", connection.platformAccountId);
    const raw = await req.text();
    if (raw.length > 210_000) throw new XChatError("Encrypted message is too large.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new XChatError("Invalid encrypted message."); }
    const body = encryptedSendBody(parsed);
    return json(await chatRequest(connection, `chat/conversations/${participantId}/messages`, body));
  } catch (error) { return failure(error); }
}
