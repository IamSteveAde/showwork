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

export function metaWebhookPlatform(object: string): SocialPlatform | null {
  if (object === "page") return "FACEBOOK";
  if (object === "instagram") return "INSTAGRAM";
  return null;
}

export async function subscribeMetaMessagingAccount(accountId: string, accessToken: string, platform: "FACEBOOK" | "INSTAGRAM") {
  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  const fields = platform === "FACEBOOK" ? "messages,messaging_postbacks" : "messages,messaging_postbacks,messaging_optins";
  const response = await fetch(`https://graph.facebook.com/${version}/${accountId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ subscribed_fields: fields, access_token: accessToken }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as { success?: boolean; error?: { message?: string } };
  if (!response.ok || data.error || data.success === false) throw new Error(data.error?.message || `Meta webhook subscription failed (${response.status}).`);
}
