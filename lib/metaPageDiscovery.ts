import { publishingFetch as fetch } from "@/lib/publishing/executionContext";

/** Safe to return to a manager. Never include provider messages, URLs or tokens. */
export class MetaDiscoveryError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
  instagram_business_account?: { id: string; username?: string };
}
type TokenInfo = {
  is_valid?: boolean; app_id?: string; type?: string; user_id?: string;
  expires_at?: number; data_access_expires_at?: number; scopes?: string[];
  granular_scopes?: { scope: string; target_ids?: string[] }[];
};

async function get<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  const url = new URL(`https://graph.facebook.com/${version}${path}`);
  url.search = new URLSearchParams(params).toString();
  let response: Response, body: any;
  try {
    response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    body = await response.json();
  } catch {
    throw new MetaDiscoveryError("META_DISCOVERY_UNAVAILABLE", "Meta account discovery could not be reached. Try again shortly.");
  }
  if (!response.ok || body.error) {
    if (body.error?.code === 190) throw new MetaDiscoveryError("META_TOKEN_INVALID", "Your Meta authorization expired or is invalid. Reconnect with Facebook.");
    throw new MetaDiscoveryError("META_PAGE_ACCESS_FAILED", "Meta could not verify Page access or its Instagram relationship. Reconnect and grant access to the Page and linked Instagram account; check your Facebook Page assignment if this continues.");
  }
  return body as T;
}

export async function validateMetaUserToken(userToken: string, appId: string, appSecret: string): Promise<TokenInfo> {
  if (!userToken || !appId || !appSecret) throw new MetaDiscoveryError("META_APP_NOT_CONFIGURED", "The server's Meta app credentials are not configured.");
  const { data } = await get<{ data?: TokenInfo }>("/debug_token", `${appId}|${appSecret}`, { input_token: userToken });
  const now = Math.floor(Date.now() / 1000);
  if (!data?.is_valid || !data.user_id ||
    (data.expires_at && data.expires_at <= now) || (data.data_access_expires_at && data.data_access_expires_at <= now)) {
    throw new MetaDiscoveryError("META_TOKEN_INVALID", "Your Meta authorization expired or is invalid. Reconnect with Facebook.");
  }
  if (data.app_id !== appId || data.type !== "USER") {
    throw new MetaDiscoveryError("META_TOKEN_MISMATCH", "Meta returned authorization for a different app or token type. Restart the connection; the administrator should check the Meta app credentials.");
  }
  return data;
}

/** /me/accounts remains primary. Only Meta-issued Page grants supply fallback IDs;
 * a successful direct Page token retrieval is still required (public Page reads
 * alone are not authorization). Never accept caller-supplied Page IDs here.
 */
export async function discoverMetaPages(userToken: string, config: { appId: string; appSecret: string; instagram?: boolean }): Promise<MetaPage[]> {
  const token = await validateMetaUserToken(userToken, config.appId, config.appSecret);
  const required = ["pages_show_list", ...(config.instagram ? ["pages_read_engagement", "instagram_basic"] : [])];
  if (required.some(scope => !token.scopes?.includes(scope))) {
    throw new MetaDiscoveryError("META_DISCOVERY_PERMISSION_MISSING", "Meta did not grant the permissions needed to discover accounts. Reconnect and allow Page list access and the requested Instagram account access.");
  }
  const pageGrants = token.granular_scopes ?? [];
  const listGrant = pageGrants.find(grant => grant.scope === "pages_show_list");
  const allowed = listGrant?.target_ids ? new Set(listGrant.target_ids) : null;
  const pages = new Map<string, MetaPage>();
  let after: string | undefined;
  const cursors = new Set<string>();
  do {
    const result = await get<{ data?: MetaPage[]; paging?: { next?: string; cursors?: { after?: string } } }>("/me/accounts", userToken, {
      fields: "id,name,access_token,tasks", limit: "100", ...(after ? { after } : {}),
    });
    if (!Array.isArray(result.data)) throw new MetaDiscoveryError("META_DISCOVERY_INVALID_RESPONSE", "Meta returned an incomplete Page list. Please retry.");
    for (const page of result.data) if (!allowed || allowed.has(page.id)) pages.set(page.id, page);
    after = result.paging?.next ? result.paging.cursors?.after : undefined;
    if (result.paging?.next && (!after || cursors.has(after))) throw new MetaDiscoveryError("META_DISCOVERY_PAGINATION_FAILED", "Meta could not return the complete Page list. Please retry.");
    if (after) cursors.add(after);
  } while (after);

  // These scopes target Facebook Pages. Instagram-scope IDs are NOT Page IDs.
  const pageScopes = new Set(["pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_posts", "pages_messaging"]);
  const grantedIds = new Set(pageGrants.filter(grant => pageScopes.has(grant.scope) && token.scopes?.includes(grant.scope))
    .flatMap(grant => grant.target_ids ?? []).filter(id => /^\d+$/.test(id) && (!allowed || allowed.has(id))));
  for (const id of grantedIds) {
    if (pages.has(id)) continue;
    const page = await get<MetaPage>(`/${id}`, userToken, { fields: "id,name,access_token" });
    if (page.id !== id || !page.access_token) throw new MetaDiscoveryError("META_PAGE_TOKEN_MISSING", "Meta selected a Page but did not grant its Page access token. Check the Facebook user's Page access and Business Portfolio assignment, then reconnect.");
    pages.set(id, page);
  }
  for (const page of pages.values()) {
    if (!page.id || !page.name || !page.access_token) throw new MetaDiscoveryError("META_PAGE_TOKEN_MISSING", "Meta did not return a usable Page access token. Check your Page assignment and reconnect.");
    if (config.instagram) {
      // A failed read is an error, never evidence that no account is linked.
      const relationship = await get<Pick<MetaPage, "instagram_business_account">>(`/${page.id}`, page.access_token, {
        fields: "instagram_business_account{id,username}",
      });
      page.instagram_business_account = relationship.instagram_business_account;
    }
  }
  return [...pages.values()];
}
