import { appUrl } from "@/lib/url";

// Exact callback approved for the Live TikTok app. Keep authorization and
// code exchange identical even when the website's preferred host is www.
export const TIKTOK_PRODUCTION_REDIRECT_URI = "https://useshowwork.com/api/calendars/tiktok/callback";

export function tikTokRedirectUri(): string {
  return process.env.NODE_ENV === "production"
    ? TIKTOK_PRODUCTION_REDIRECT_URI
    : `${appUrl()}/api/calendars/tiktok/callback`;
}
