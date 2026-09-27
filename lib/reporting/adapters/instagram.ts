import type { SocialConnection } from "@prisma/client";
import type { NormalizedSocialMetrics, PublishedPostRef, SocialReportingAdapter } from "@/lib/reporting/types";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type GraphError = { error?: { message?: string; code?: number } };

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.search = new URLSearchParams({ ...params, access_token: token }).toString();
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({})) as T & GraphError;
  if (!response.ok || data.error) {
    const detail = data.error?.message || `Instagram reporting request failed (${response.status}).`;
    throw new Error(data.error?.code === 190 ? `Instagram connection needs renewal: ${detail}` : detail);
  }
  return data;
}

function valueFromInsights(data: { name: string; values?: { value?: number }[] }[], name: string) {
  const value = data.find((entry) => entry.name === name)?.values?.[0]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function readMediaInsights(mediaId: string, token: string) {
  try {
    const result = await graphGet<{ data?: { name: string; values?: { value?: number }[] }[] }>(
      `/${mediaId}/insights`,
      token,
      { metric: "reach,views,saved,shares,total_interactions" },
    );
    return result.data ?? [];
  } catch {
    // Some metric names vary by media type and API version. Retry each
    // metric separately so a single unsupported metric does not hide the
    // metrics this account can provide.
  const values: { name: string; values?: { value?: number }[] }[] = [];
    for (const metric of ["reach", "views", "saved", "shares", "total_interactions"]) {
      try {
        const result = await graphGet<{ data?: { name: string; values?: { value?: number }[] }[] }>(
          `/${mediaId}/insights`, token, { metric },
        );
        values.push(...(result.data ?? []));
      } catch {
        // Unsupported for this media/account: leave it unavailable.
      }
    }
    return values;
  }
}

export const instagramReportingAdapter: SocialReportingAdapter = {
  platform: "INSTAGRAM",

  async fetchAccountMetrics(connection: SocialConnection): Promise<NormalizedSocialMetrics> {
    const scopes = new Set((connection.tokenScopes ?? "").split(/[\s,]+/).filter(Boolean));
    if (!scopes.has("instagram_manage_insights")) {
      throw new Error("Instagram insights permission is missing. Enable instagram_manage_insights for the Meta app, then reconnect this account.");
    }
    if (!connection.accessToken) throw new Error("Instagram connection needs to be renewed.");
    const profile = await graphGet<{ followers_count?: number; media_count?: number }>(
      `/${connection.platformAccountId}`,
      connection.accessToken,
      { fields: "followers_count,media_count" },
    );
    return {
      followers: typeof profile.followers_count === "number" ? profile.followers_count : null,
      additionalMetrics: typeof profile.media_count === "number" ? { mediaCount: profile.media_count } : {},
    };
  },

  async fetchPostMetrics(connection: SocialConnection, posts: PublishedPostRef[]) {
    if (!connection.accessToken) throw new Error("Instagram connection needs to be renewed.");
    const results = new Map<string, NormalizedSocialMetrics>();
    for (const post of posts) {
      if (!post.platformPostId) continue;
      const media = await graphGet<{
        media_type?: string;
        like_count?: number;
        comments_count?: number;
        permalink?: string;
        timestamp?: string;
      }>(`/${post.platformPostId}`, connection.accessToken, {
        fields: "media_type,like_count,comments_count,permalink,timestamp",
      });
      const insights = await readMediaInsights(post.platformPostId, connection.accessToken);
      const reach = valueFromInsights(insights, "reach");
      const views = valueFromInsights(insights, "views");
      const likes = typeof media.like_count === "number" ? media.like_count : null;
      const comments = typeof media.comments_count === "number" ? media.comments_count : null;
      const shares = valueFromInsights(insights, "shares");
      const saves = valueFromInsights(insights, "saved");
      const engagement = valueFromInsights(insights, "total_interactions");
      const metrics: NormalizedSocialMetrics = {
        reach,
        views,
        likes,
        comments,
        shares,
        saves,
        engagement,
        engagementRate: engagement !== null && reach ? engagement / reach : null,
        engagementRateBasis: engagement !== null && reach ? "reach" : null,
        additionalMetrics: {
          ...(media.media_type ? { mediaType: media.media_type } : {}),
          ...(media.permalink ? { permalink: media.permalink } : {}),
        },
        sourceUpdatedAt: media.timestamp ? new Date(media.timestamp) : null,
      };
      results.set(post.id, metrics);
    }
    return results;
  },
};
