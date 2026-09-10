// ─────────────────────────────────────────────
// TIKTOK CONTENT POSTING API — connection (standard OAuth 2.0) and
// Direct Post publishing helpers.
//
// IMPORTANT PLATFORM LIMITATION, not a bug in this code: until this
// app passes TikTok's separate Content Audit (submitted only after
// the integration is proven working, taking 2-6 weeks on top of the
// initial product-access approval), every single post published
// through this API lands as SELF_ONLY — visible only to the account
// that posted it — regardless of which privacy level was actually
// requested. There is no parameter that changes this before the
// audit clears. The integration itself works and reports success;
// nothing is broken.
//
// TIKTOK_CLIENT_KEY is safe to reference in a redirect URL (it's
// meant to be public, TikTok's equivalent of an App ID).
// TIKTOK_CLIENT_SECRET must only ever be used in the two
// server-to-server token calls below — never sent to the browser.
// ─────────────────────────────────────────────

const API_BASE = "https://open.tiktokapis.com/v2";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

function requireAppCredentials() {
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are not set — TikTok publishing isn't configured yet.");
  }
  return { CLIENT_KEY, CLIENT_SECRET };
}

// user.info.basic — for the account's display name/username.
// video.publish — the actual Direct Post permission.
export const TIKTOK_OAUTH_SCOPES = "user.info.basic,video.publish";

/** Builds the TikTok authorization page URL the manager is redirected to. */
export function buildTikTokAuthUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const { CLIENT_KEY } = requireAppCredentials();
  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    scope: TIKTOK_OAUTH_SCOPES,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

interface TikTokTokenResponse {
  open_id: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TikTokTokenResponse> {
  const { CLIENT_KEY, CLIENT_SECRET } = requireAppCredentials();
  const res = await fetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: CLIENT_KEY, client_secret: CLIENT_SECRET, ...body }).toString(),
  });
  const data = (await res.json()) as TikTokTokenResponse;
  if (!res.ok || data.error) {
    throw new Error(data.error_description ?? data.error ?? `TikTok token request failed (${res.status})`);
  }
  return data;
}

/** Exchanges the OAuth `code` for the account's access + refresh tokens. */
export function exchangeCodeForTikTokTokens(code: string, redirectUri: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
}

/** Mints a fresh access token from a still-valid refresh token — no user interaction needed. */
export function refreshTikTokAccessToken(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

async function apiPost<T>(path: string, accessToken: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(data.error?.message ?? `TikTok API request failed (${res.status})`);
  }
  return data.data as T;
}

/** The account's display name — TikTok's closest equivalent to a username for display purposes. */
export async function getTikTokDisplayName(accessToken: string): Promise<string> {
  const res = await fetch(`${API_BASE}/user/info/?fields=display_name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(data.error?.message ?? "Failed to fetch TikTok account info");
  }
  return data.data.user.display_name;
}

interface CreatorInfo {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

/**
 * Must be called immediately before every single publish — required
 * by TikTok's own review criteria, since which privacy levels and
 * which comment/duet/stitch toggles are even available differs per
 * account and can change at any time. Never cache this between
 * publishes.
 */
export function queryTikTokCreatorInfo(accessToken: string): Promise<CreatorInfo> {
  return apiPost<CreatorInfo>("/post/publish/creator_info/query/", accessToken, {});
}

interface PublishInitResponse {
  publish_id: string;
}

/**
 * Starts a Direct Post video publish, pulling the video from a
 * public URL (PULL_FROM_URL) rather than uploading bytes directly —
 * this is the simpler transfer method and matches how the video is
 * already hosted publicly on R2 for Instagram, but requires that R2
 * domain to be verified with TikTok first (a one-time manual setup
 * step, separate from anything this code does).
 *
 * privacyLevel must be one of the exact strings creatorInfo just
 * returned as available for this specific account — never assumed
 * or hardcoded, since TikTok rejects apps that pre-select a privacy
 * level the account doesn't actually offer.
 */
export function initTikTokVideoPublish({
  accessToken,
  videoUrl,
  caption,
  privacyLevel,
  disableComment,
}: {
  accessToken: string;
  videoUrl: string;
  caption: string;
  privacyLevel: string;
  disableComment: boolean;
}): Promise<PublishInitResponse> {
  return apiPost<PublishInitResponse>("/post/publish/video/init/", accessToken, {
    post_info: {
      title: caption,
      privacy_level: privacyLevel,
      disable_comment: disableComment,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  });
}

/**
 * Starts a Direct Post photo publish — TikTok's newer photo-mode
 * endpoint, separate from the video one above. Supports multiple
 * photo URLs for a carousel-style post, same idea as Instagram's
 * carousel but a completely different underlying endpoint.
 */
export function initTikTokPhotoPublish({
  accessToken,
  photoUrls,
  caption,
  privacyLevel,
}: {
  accessToken: string;
  photoUrls: string[];
  caption: string;
  privacyLevel: string;
}): Promise<PublishInitResponse> {
  return apiPost<PublishInitResponse>("/post/publish/content/init/", accessToken, {
    media_type: "PHOTO",
    post_mode: "DIRECT_POST",
    post_info: {
      title: caption,
      privacy_level: privacyLevel,
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_images: photoUrls,
      photo_cover_index: 0,
    },
  });
}

interface PublishStatus {
  status: "PROCESSING_DOWNLOAD" | "PROCESSING_UPLOAD" | "PUBLISH_COMPLETE" | "FAILED" | "SEND_TO_USER_INBOX";
  fail_reason?: string;
}

function checkTikTokPublishStatus(accessToken: string, publishId: string): Promise<PublishStatus> {
  return apiPost<PublishStatus>("/post/publish/status/fetch/", accessToken, { publish_id: publishId });
}

/**
 * TikTok processes a publish asynchronously — init returns
 * immediately with a publish_id, and the actual result (success or
 * failure) only becomes known moments later. This polls status
 * until it settles, the same role waitForContainerReady plays for
 * Instagram videos, just with an extra terminal state to watch for.
 */
export async function waitForTikTokPublishResult(accessToken: string, publishId: string, maxAttempts = 20): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await checkTikTokPublishStatus(accessToken, publishId);
    if (result.status === "PUBLISH_COMPLETE") return;
    if (result.status === "FAILED") throw new Error(result.fail_reason ?? "TikTok reported the publish failed");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Timed out waiting for TikTok to finish publishing");
}