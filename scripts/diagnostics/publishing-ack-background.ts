// Standalone diagnostic only. No database, media, tokens, or provider calls.
import type { Handler } from "@netlify/functions";
export const handler: Handler = async event => {
  if (!process.env.DIAGNOSTIC_TOKEN || event.headers.authorization !== `Bearer ${process.env.DIAGNOSTIC_TOKEN}`) return { statusCode: 401, body: "Unauthorized" };
  const expiresAt = Date.parse(process.env.DIAGNOSTIC_EXPIRES_AT || "");
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return { statusCode: 403, body: "Diagnostic expired or disabled" };
  return { statusCode: 200, body: "Diagnostic acknowledgement only" };
};
