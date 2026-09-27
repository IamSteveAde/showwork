import type { SocialConnection, SocialPlatform } from "@prisma/client";

export async function sendMetaInboxMessage({
  connection,
  recipientId,
  text,
}: {
  connection: SocialConnection;
  recipientId: string;
  text: string;
}) {
  if (connection.platform !== "FACEBOOK" && connection.platform !== "INSTAGRAM") {
    throw new Error("This platform’s inbox is not enabled yet.");
  }
  if (!connection.accessToken) throw new Error("Reconnect this account to enable replies.");
  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  const endpointId = connection.platformAccountId;
  const response = await fetch(`https://graph.facebook.com/${version}/${endpointId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: connection.accessToken,
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as {
    message_id?: string;
    error?: { message?: string; code?: number };
  };
  if (!response.ok || result.error) {
    throw new Error(result.error?.message || `Meta could not send the message (${response.status}).`);
  }
  return result.message_id ?? null;
}

/** Best-effort Messenger profile lookup for a Page-scoped user ID (PSID). */
export async function getFacebookMessengerProfile({
  pageScopedUserId,
  pageAccessToken,
}: {
  pageScopedUserId: string;
  pageAccessToken: string;
}): Promise<{ name: string | null } | null> {
  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(pageScopedUserId)}`);
  url.searchParams.set("fields", "first_name,last_name");
  url.searchParams.set("access_token", pageAccessToken);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const profile = await response.json().catch(() => null) as { first_name?: unknown; last_name?: unknown } | null;
    if (!profile) return null;
    const name = [profile.first_name, profile.last_name]
      .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
      .map((part) => part.trim())
      .join(" ");
    return name ? { name } : null;
  } catch {
    // Profile access can be unavailable because of Meta permissions or API
    // restrictions. Receiving the message must still succeed in that case.
    return null;
  }
}

export function metaWebhookPlatform(object: string): SocialPlatform | null {
  if (object === "page") return "FACEBOOK";
  if (object === "instagram") return "INSTAGRAM";
  return null;
}

export async function subscribeMetaMessagingAccount(accountId: string, accessToken: string, platform: "FACEBOOK" | "INSTAGRAM") {
  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  // Instagram DMs only need the `messages` event. Keep Facebook's
  // established subscription fields unchanged.
  const fields = platform === "FACEBOOK" ? "messages,messaging_postbacks" : "messages";
  const response = await fetch(`https://graph.facebook.com/${version}/${accountId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ subscribed_fields: fields, access_token: accessToken }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as { success?: boolean; error?: { message?: string } };
  if (!response.ok || data.error || data.success === false) throw new Error(data.error?.message || `Meta webhook subscription failed (${response.status}).`);
}
