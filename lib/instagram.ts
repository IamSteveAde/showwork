// ─────────────────────────────────────────────
// INSTAGRAM GRAPH API — connection (OAuth via Facebook Login for
// Business) and publishing helpers. Every Instagram Business account
// must be linked to a Facebook Page — that Page is the
// authentication anchor Meta requires, even though nothing here ever
// posts to Facebook itself.
//
// INSTAGRAM_APP_ID is public by design (it appears directly in the
// OAuth redirect URL a browser is sent to) and can be referenced
// freely. INSTAGRAM_APP_SECRET must never appear in any response,
// log, or client-facing code — it's used only in the two
// server-to-server token-exchange calls below.
// ─────────────────────────────────────────────

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

function requireAppCredentials() {
  if (!APP_ID || !APP_SECRET) {
    throw new Error("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set — Instagram publishing isn't configured yet.");
  }
  return { APP_ID, APP_SECRET };
}

// Matches Meta's own official Facebook Login for Business
// documentation for this exact flow. Note: the app dashboard's own
// "Permissions and features" bullet list displays this specific
// permission as "instagram_content_publishing" — that's a display
// label, not the real scope string. The actual OAuth scope Meta's
// API reference confirms is "instagram_content_publish" (no "ing")
// — using the dashboard's displayed text directly caused an "Invalid
// Scope" rejection. pages_read_engagement and business_management
// are kept since the dashboard specifically listed both as required
// for this app's "Manage content on Instagram" permission group.
export const INSTAGRAM_OAUTH_SCOPES =
  "instagram_basic,instagram_content_publish,pages_read_engagement,business_management,pages_show_list";

/** Builds the Facebook OAuth dialog URL the manager is redirected to. */
export function buildInstagramAuthUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const { APP_ID } = requireAppCredentials();
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_OAUTH_SCOPES,
    state,
    response_type: "code",
    // Intentionally NOT using display=page + extras=IG_API_ONBOARDING
    // here. That combination triggers Meta's guided "Business Login
    // for Instagram" onboarding wizard, meant for accounts that
    // haven't yet connected Instagram to a Facebook Page — in
    // practice it got stuck looping back to this same dialog
    // indefinitely rather than completing. This plain dialog assumes
    // the manager's Instagram-to-Page connection is already set up
    // manually, which just shows the standard permission-grant screen
    // instead of walking through that setup itself.
  });
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH_BASE}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Instagram Graph API request failed (${res.status})`);
  }
  return data as T;
}

/** Step 1 of token exchange — the OAuth `code` for a short-lived user token. */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ access_token: string }> {
  const { APP_ID, APP_SECRET } = requireAppCredentials();
  return graphGet("/oauth/access_token", {
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });
}

/** Step 2 — exchanges a short-lived token for a long-lived one (~60 days). */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
  const { APP_ID, APP_SECRET } = requireAppCredentials();
  return graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

/** Every Facebook Page this user manages, each with its own page access token. */
export async function listManagedPages(userAccessToken: string): Promise<FacebookPage[]> {
  const result = await graphGet<{ data: FacebookPage[] }>("/me/accounts", {
    access_token: userAccessToken,
    fields: "id,name,access_token,instagram_business_account",
  });
  return result.data;
}

/** The @username for a connected Instagram Business account. */
export async function getInstagramUsername(igUserId: string, pageAccessToken: string): Promise<string> {
  const result = await graphGet<{ username: string }>(`/${igUserId}`, {
    fields: "username",
    access_token: pageAccessToken,
  });
  return result.username;
}

interface MediaContainerResponse {
  id: string;
}

/**
 * Creates a media container for a single image or video — step 1 of
 * the two-step publish sequence. `isCarouselItem` marks this as one
 * piece of a multi-item carousel rather than a standalone post; the
 * caption only ever goes on the parent carousel container, never on
 * individual items, per Instagram's own rule.
 */
export async function createMediaContainer({
  igUserId,
  pageAccessToken,
  imageUrl,
  videoUrl,
  caption,
  isCarouselItem,
}: {
  igUserId: string;
  pageAccessToken: string;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  isCarouselItem?: boolean;
}): Promise<string> {
  const params: Record<string, string> = { access_token: pageAccessToken };
  if (imageUrl) params.image_url = imageUrl;
  if (videoUrl) {
    params.video_url = videoUrl;
    params.media_type = "REELS";
  }
  if (caption && !isCarouselItem) params.caption = caption;
  if (isCarouselItem) params.is_carousel_item = "true";

  const url = `${GRAPH_BASE}/${igUserId}/media?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: "POST" });
  const data = (await res.json()) as MediaContainerResponse & { error?: { message: string } };
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message ?? "Failed to create Instagram media container");
  }
  return data.id;
}

/** Creates the parent container that groups several item containers into one carousel post. */
export async function createCarouselContainer({
  igUserId,
  pageAccessToken,
  childContainerIds,
  caption,
}: {
  igUserId: string;
  pageAccessToken: string;
  childContainerIds: string[];
  caption?: string;
}): Promise<string> {
  const params: Record<string, string> = {
    access_token: pageAccessToken,
    media_type: "CAROUSEL",
    children: childContainerIds.join(","),
  };
  if (caption) params.caption = caption;

  const url = `${GRAPH_BASE}/${igUserId}/media?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: "POST" });
  const data = (await res.json()) as MediaContainerResponse & { error?: { message: string } };
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message ?? "Failed to create Instagram carousel container");
  }
  return data.id;
}

/**
 * Video containers process asynchronously on Meta's side — this
 * polls status_code until it reports FINISHED (or ERROR) before the
 * container can actually be published. Not needed for plain images,
 * which are ready immediately.
 */
export async function waitForContainerReady(containerId: string, pageAccessToken: string, maxAttempts = 20): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await graphGet<{ status_code: string }>(`/${containerId}`, {
      fields: "status_code",
      access_token: pageAccessToken,
    });
    if (result.status_code === "FINISHED") return;
    if (result.status_code === "ERROR") throw new Error("Instagram failed to process the uploaded media");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Timed out waiting for Instagram to process the uploaded media");
}

/** Step 2 of publishing — actually makes the container go live. Returns the real Instagram media id. */
export async function publishContainer(igUserId: string, containerId: string, pageAccessToken: string): Promise<string> {
  const params = { creation_id: containerId, access_token: pageAccessToken };
  const url = `${GRAPH_BASE}/${igUserId}/media_publish?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: "POST" });
  const data = (await res.json()) as { id: string; error?: { message: string } };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? "Failed to publish to Instagram");
  }
  return data.id;
}

/** The permalink (public URL) for an already-published post, fetched once right after publishing. */
export async function getMediaPermalink(mediaId: string, pageAccessToken: string): Promise<string | null> {
  try {
    const result = await graphGet<{ permalink: string }>(`/${mediaId}`, {
      fields: "permalink",
      access_token: pageAccessToken,
    });
    return result.permalink;
  } catch {
    return null;
  }
}