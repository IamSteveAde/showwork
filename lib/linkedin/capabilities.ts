import type { SocialConnection } from "@prisma/client";
import { linkedInMessagingAccess } from "./messagingAccess";
export function linkedInCapabilities(connection: SocialConnection | null | undefined) {
  if (!connection) return { connected: false, reconnectRequired: true, accountType: "Not connected", publishing: false, analytics: false, messaging: false, messagingNote: "Connect LinkedIn to check its available features." };
  const expired = !connection.accessToken || !!connection.accessTokenExpiresAt && connection.accessTokenExpiresAt <= new Date();
  const scopes = new Set((connection.tokenScopes || "").split(/[\s,]+/));
  const page = connection.platformAccountId.startsWith("urn:li:organization:");
  const messaging = linkedInMessagingAccess(connection);
  return { connected: true, reconnectRequired: expired, accountType: page ? "Company Page" : "Personal profile",
    publishing: !expired && scopes.has(page ? "w_organization_social" : "w_member_social"),
    analytics: !expired && scopes.has(page ? "rw_organization_admin" : "r_member_postAnalytics"),
    messaging: !expired && messaging.available,
    messagingNote: expired ? "Your LinkedIn authorization expired. Reconnect LinkedIn to restore access." : messaging.reason };
}
