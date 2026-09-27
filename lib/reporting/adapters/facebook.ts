import type { SocialConnection } from "@prisma/client";
import type {
  FacebookPageActivity,
  FacebookPagePost,
  NormalizedSocialMetrics,
  PublishedPostRef,
  SocialReportingAdapter,
} from "@/lib/reporting/types";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v26.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const PAGE_POST_LIMIT = 5;

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number } };
type GraphCount = { summary?: { total_count?: number }; count?: number };

function scopesFor(connection: SocialConnection) {
  return new Set((connection.tokenScopes ?? "").split(/[\s,]+/).filter(Boolean));
}

function requireConnection(connection: SocialConnection) {
  if (!connection.accessToken) {
    throw new Error("Facebook Page connection needs to be renewed. Reconnect the selected Page to continue reporting.");
  }
  if (!scopesFor(connection).has("pages_read_engagement")) {
    throw new Error("Facebook reporting permission is missing. Reconnect this Page after granting pages_read_engagement.");
  }
  return connection.accessToken;
}

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.search = new URLSearchParams({ ...params, access_token: token }).toString();
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({})) as T & GraphError;
  const apiError = data.error;
  if (!response.ok || apiError) {
    const detail = apiError?.message || `Facebook Graph API request failed (${response.status}).`;
    if (apiError?.code === 190) throw new Error(`Facebook Page connection needs renewal: ${detail}`);
    if (apiError?.code === 4 || apiError?.code === 17 || apiError?.code === 32 || apiError?.code === 613 || response.status === 429) {
      throw new Error("Facebook temporarily rate-limited reporting. Wait a few minutes, then refresh.");
    }
    if (apiError?.code === 10 || apiError?.code === 200) {
      throw new Error("Facebook reporting permission is missing. Reconnect this Page after granting the required Meta permissions.");
    }
    throw new Error(detail);
  }
  return data;
}

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

async function optionalCount(path: string, token: string, params?: Record<string, string>): Promise<number | null> {
  try {
    const result = await graphGet<GraphCount>(path, token, params);
    return asCount(result.summary?.total_count ?? result.count);
  } catch {
    // Some Page/post metrics depend on Page role, post type, or Meta access.
    // Keep the post visible even when one optional count is unavailable.
    return null;
  }
}

async function optionalInsight(pageId: string, token: string, metric: string): Promise<number | null> {
  try {
    const result = await graphGet<{
      data?: Array<{ name?: string; values?: Array<{ value?: unknown }> }>;
    }>(`/${encodeURIComponent(pageId)}/insights`, token, { metric, period: "day" });
    const values = result.data?.find((entry) => entry.name === metric)?.values;
    const last = values?.at(-1)?.value;
    return asCount(last);
  } catch {
    // Insights are optional and can be unavailable for a Page or metric.
    return null;
  }
}

type PagePostRecord = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
};

async function fetchPostMetricValues(postId: string, token: string, includeInsights: boolean) {
  const encodedId = encodeURIComponent(postId);
  const [likes, comments, shares] = await Promise.all([
    optionalCount(`/${encodedId}/likes`, token, { summary: "true", limit: "0" }),
    optionalCount(`/${encodedId}/comments`, token, { summary: "true", limit: "0" }),
    optionalCount(`/${encodedId}`, token, { fields: "shares" }),
  ]);
  const [reach, impressions] = includeInsights
    ? await Promise.all([
        optionalInsight(postId, token, "post_impressions_unique"),
        optionalInsight(postId, token, "post_impressions"),
      ])
    : [null, null];
  return { likes, comments, shares, reach, impressions };
}

async function fetchPageIdentity(connection: SocialConnection, token: string) {
  const id = encodeURIComponent(connection.platformAccountId);
  try {
    return await graphGet<{ id?: string; name?: string }>(`/${id}`, token, { fields: "id,name" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Facebook Page is no longer accessible.";
    throw new Error(message.includes("permission") ? message : `Could not read the selected Facebook Page. Confirm it is still accessible, then reconnect it. ${message}`);
  }
}

export const facebookReportingAdapter: SocialReportingAdapter = {
  platform: "FACEBOOK",

  async fetchAccountMetrics(connection: SocialConnection): Promise<NormalizedSocialMetrics> {
    const token = requireConnection(connection);
    const page = await fetchPageIdentity(connection, token);

    // Facebook exposes both fields across Page types/API access levels. Query
    // them separately so an unsupported optional field cannot break sync.
    const [followersCount, fanCount] = await Promise.all([
      graphGet<{ followers_count?: number }>(`/${encodeURIComponent(connection.platformAccountId)}`, token, { fields: "followers_count" })
        .then((result) => asCount(result.followers_count)).catch(() => null),
      graphGet<{ fan_count?: number }>(`/${encodeURIComponent(connection.platformAccountId)}`, token, { fields: "fan_count" })
        .then((result) => asCount(result.fan_count)).catch(() => null),
    ]);

    const metrics: NormalizedSocialMetrics = {
      followers: followersCount ?? fanCount,
      additionalMetrics: {
        pageId: page.id ?? connection.platformAccountId,
        pageName: page.name ?? connection.accountName ?? "Facebook Page",
      },
    };

    // Fetch the Page's own recent posts independently of Showwork's
    // PublishedSocialPost table. Keep this to one bounded edge request.
    try {
      const until = new Date();
      const since = new Date(until.getTime() - 366 * 24 * 60 * 60 * 1000);
      const nativePosts = await graphGet<{ data?: PagePostRecord[] }>(`/${encodeURIComponent(page.id ?? connection.platformAccountId)}/posts`, token, {
        fields: "id,message,created_time,permalink_url",
        limit: "100",
        since: String(Math.floor(since.getTime() / 1000)),
        until: String(Math.floor(until.getTime() / 1000)),
      });
      metrics.accountPosts = (nativePosts.data ?? []).flatMap((post) => {
        if (!post.created_time) return [];
        const publishedAt = new Date(post.created_time);
        if (!Number.isFinite(publishedAt.getTime())) return [];
        return [{
          platformPostId: post.id,
          caption: post.message ?? null,
          postType: "POST",
          publishedAt,
          permalink: post.permalink_url ?? null,
        }];
      });
    } catch (error) {
      // Page insights remain useful if reading the optional native feed fails.
      console.warn("Facebook Page post list could not be read:", error);
    }

    if (scopesFor(connection).has("read_insights")) {
      const [reach, impressions, engagement] = await Promise.all([
        optionalInsight(connection.platformAccountId, token, "page_impressions_unique"),
        optionalInsight(connection.platformAccountId, token, "page_impressions"),
        optionalInsight(connection.platformAccountId, token, "page_post_engagements"),
      ]);
      metrics.reach = reach;
      metrics.impressions = impressions;
      metrics.engagement = engagement;
      metrics.engagementRate = engagement !== null && reach ? engagement / reach : null;
      metrics.engagementRateBasis = metrics.engagementRate !== null ? "reach" : null;
    }
    return metrics;
  },

  async fetchPostMetrics(connection: SocialConnection, posts: PublishedPostRef[]) {
    const token = requireConnection(connection);
    const results = new Map<string, NormalizedSocialMetrics>();
    const includeInsights = scopesFor(connection).has("read_insights");
    for (const post of posts) {
      const postId = post.platformPostId || post.providerReference;
      if (!postId) continue;
      const [counts, engagement] = await Promise.all([
        fetchPostMetricValues(postId, token, includeInsights),
        includeInsights ? optionalInsight(postId, token, "post_engaged_users") : Promise.resolve(null),
      ]);
      results.set(post.id, {
        ...counts,
        engagement,
        engagementRate: engagement !== null && counts.reach ? engagement / counts.reach : null,
        engagementRateBasis: engagement !== null && counts.reach ? "reach" : null,
      });
    }
    return results;
  },

  async fetchPageActivity(connection: SocialConnection, period): Promise<FacebookPageActivity> {
    const token = requireConnection(connection);
    const page = await fetchPageIdentity(connection, token);
    const pageId = page.id || connection.platformAccountId;

    const followers = await graphGet<{ followers_count?: number }>(`/${encodeURIComponent(pageId)}`, token, { fields: "followers_count" })
      .then((result) => asCount(result.followers_count))
      .catch(async () => graphGet<{ fan_count?: number }>(`/${encodeURIComponent(pageId)}`, token, { fields: "fan_count" })
        .then((result) => asCount(result.fan_count)).catch(() => null));

    const result = await graphGet<{ data?: PagePostRecord[] }>(`/${encodeURIComponent(pageId)}/posts`, token, {
      fields: "id,message,created_time,permalink_url,full_picture",
      limit: String(PAGE_POST_LIMIT),
      since: String(Math.floor(period.start.getTime() / 1000)),
      until: String(Math.floor(period.end.getTime() / 1000)),
    });

    const includeInsights = scopesFor(connection).has("read_insights");
    const pagePosts: FacebookPagePost[] = [];
    const records = result.data ?? [];
    // Keep per-post optional metrics below Meta's burst thresholds while
    // still making the Page's real recent content available immediately.
    for (let offset = 0; offset < records.length; offset += 2) {
      const batch = await Promise.all(records.slice(offset, offset + 2).map(async (post): Promise<FacebookPagePost> => {
        const metrics = await fetchPostMetricValues(post.id, token, includeInsights);
        return {
          id: post.id,
          message: post.message ?? null,
          createdAt: post.created_time ?? null,
          permalink: post.permalink_url ?? null,
          imageUrl: post.full_picture ?? null,
          ...metrics,
        };
      }));
      pagePosts.push(...batch);
    }

    return {
      pageId,
      pageName: page.name || connection.accountName || "Facebook Page",
      followers,
      posts: pagePosts,
      notices: includeInsights
        ? []
        : ["Reach and impression metrics require the read_insights permission; Meta did not grant it to this Page connection."],
    };
  },
};
