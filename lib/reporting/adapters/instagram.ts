import type { SocialConnection } from "@prisma/client";
import type { NormalizedSocialMetrics, PublishedPostRef, SocialAccountPostRecord, SocialReportingAdapter } from "@/lib/reporting/types";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v26.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number } };

type InstagramGraphRequestError = Error & {
  metaCode?: number;
  metaSubcode?: number;
};

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.search = new URLSearchParams({ ...params, access_token: token }).toString();
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({})) as T & GraphError;
  if (!response.ok || data.error) {
    const detail = data.error?.message || `Instagram reporting request failed (${response.status}).`;
    const code = typeof data.error?.code === "number" ? ` (Meta code ${data.error.code})` : "";
    const request = path.replace(/^\/+/, "");
    const error = new Error(data.error?.code === 190
      ? `Instagram connection needs renewal: ${detail}${code}`
      : `Instagram reporting request for ${request} failed${code}: ${detail}`) as InstagramGraphRequestError;
    error.metaCode = data.error?.code;
    error.metaSubcode = data.error?.error_subcode;
    throw error;
  }
  return data;
}

function valueFromInsights(data: { name: string; values?: { value?: number }[] }[], name: string) {
  const value = data.find((entry) => entry.name === name)?.values?.[0]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type UserInsight = {
  name: string;
  values?: { value?: number; end_time?: string }[];
  total_value?: { value?: number };
};

async function readAccountPosts(accountId: string, token: string): Promise<SocialAccountPostRecord[]> {
  const until = new Date();
  const since = new Date(until.getTime() - 366 * 24 * 60 * 60 * 1000);
  const posts: SocialAccountPostRecord[] = [];
  let after: string | undefined;
  for (let page = 0; page < 5; page++) {
    const result = await graphGet<{
      data?: Array<{
        id: string; caption?: string; media_type?: string; timestamp?: string;
        permalink?: string; like_count?: number; comments_count?: number;
      }>;
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`/${accountId}/media`, token, {
      fields: "id,caption,media_type,timestamp,permalink,like_count,comments_count",
      limit: "100",
      since: String(Math.floor(since.getTime() / 1000)),
      until: String(Math.floor(until.getTime() / 1000)),
      ...(after ? { after } : {}),
    });
    for (const media of result.data ?? []) {
      const publishedAt = media.timestamp ? new Date(media.timestamp) : null;
      if (!publishedAt || !Number.isFinite(publishedAt.getTime())) continue;
      const likes = typeof media.like_count === "number" ? media.like_count : null;
      const comments = typeof media.comments_count === "number" ? media.comments_count : null;
      posts.push({
        platformPostId: media.id,
        caption: media.caption ?? null,
        postType: media.media_type ?? null,
        publishedAt,
        permalink: media.permalink ?? null,
        likes,
        comments,
        engagement: likes !== null && comments !== null ? likes + comments : null,
      });
    }
    after = result.paging?.cursors?.after;
    if (!result.paging?.next || !after) break;
  }
  return posts;
}

async function readAccountInsights(accountId: string, token: string) {
  const until = new Date();
  const since = new Date(until.getTime() - 29 * 24 * 60 * 60 * 1000);
  const params = {
    metric: "reach,views,total_interactions,likes",
    metric_type: "time_series",
    period: "day",
    since: Math.floor(since.getTime() / 1000).toString(),
    until: Math.floor(until.getTime() / 1000).toString(),
  };

  let data: UserInsight[] = [];
  try {
    const result = await graphGet<{ data?: UserInsight[] }>(`/${accountId}/insights`, token, params);
    data = result.data ?? [];
  } catch (batchError) {
    // Fall back per metric because Meta may remove or restrict one metric
    // without making the other account-level insights unavailable.
    const withoutMetricType = (({ metric_type: _metricType, ...rest }) => rest)(params);
    for (const metric of ["reach", "views", "total_interactions", "likes"]) {
      for (const includeMetricType of [true, false]) {
        try {
          const result = await graphGet<{ data?: UserInsight[] }>(
            `/${accountId}/insights`,
            token,
            { ...(includeMetricType ? params : withoutMetricType), metric },
          );
          data.push(...(result.data ?? []));
          break;
        } catch {
          // Leave unsupported metrics unavailable; still use any others.
        }
      }
    }
    if (!data.length) {
      console.warn("Instagram account insights could not be read:", {
        accountId,
        error: batchError instanceof Error ? batchError.message : "Unknown insights error",
      });
    }
  }

  const byDate = new Map<string, Record<string, number | null>>();
  for (const insight of data) {
    const field = insight.name === "total_interactions" ? "engagement" : insight.name;
    if (!["reach", "views", "engagement", "likes"].includes(field)) continue;
    for (const value of insight.values ?? []) {
      if (typeof value.value !== "number" || !Number.isFinite(value.value) || !value.end_time) continue;
      const date = new Date(value.end_time);
      if (!Number.isFinite(date.getTime())) continue;
      const key = date.toISOString().slice(0, 10);
      const metrics = byDate.get(key) ?? {};
      metrics[field] = value.value;
      byDate.set(key, metrics);
    }
    if (!insight.values?.length && typeof insight.total_value?.value === "number") {
      const key = until.toISOString().slice(0, 10);
      const metrics = byDate.get(key) ?? {};
      metrics[field] = insight.total_value.value;
      byDate.set(key, metrics);
    }
  }

  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, metrics]) => ({
    snapshotDate: new Date(`${date}T00:00:00.000Z`),
    reach: metrics.reach ?? null,
    views: metrics.views ?? null,
    engagement: metrics.engagement ?? null,
    additionalMetrics: typeof metrics.likes === "number" ? { likes: metrics.likes } : {},
  }));
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
    if (!connection.accessToken) throw new Error("Instagram connection needs to be renewed.");
    const [profile, dailySnapshots, accountPosts] = await Promise.all([
      graphGet<{ followers_count?: number; media_count?: number }>(
        `/${connection.platformAccountId}`,
        connection.accessToken,
        { fields: "followers_count,media_count" },
      ),
      scopes.has("instagram_manage_insights")
        ? readAccountInsights(connection.platformAccountId, connection.accessToken)
        : Promise.resolve([]),
      readAccountPosts(connection.platformAccountId, connection.accessToken).catch((error) => {
        console.warn("Instagram account post list could not be read:", error);
        return [];
      }),
    ]);
    const latest = dailySnapshots.at(-1);
    return {
      followers: typeof profile.followers_count === "number" ? profile.followers_count : null,
      reach: latest?.reach ?? null,
      views: latest?.views ?? null,
      engagement: latest?.engagement ?? null,
      dailySnapshots,
      accountPosts,
      additionalMetrics: {
        ...(typeof profile.media_count === "number" ? { mediaCount: profile.media_count } : {}),
        ...(typeof latest?.additionalMetrics?.likes === "number" ? { likes: latest.additionalMetrics.likes } : {}),
      },
    };
  },

  async fetchPostMetrics(connection: SocialConnection, posts: PublishedPostRef[]) {
    if (!connection.accessToken) throw new Error("Instagram connection needs to be renewed.");
    const results = new Map<string, NormalizedSocialMetrics>();
    for (const post of posts) {
      if (!post.platformPostId) continue;
      try {
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
      } catch (error) {
        const graphError = error as InstagramGraphRequestError;
        if (graphError.metaCode === 100 && graphError.metaSubcode === 33) {
          // A stale or inaccessible media object must not block account
          // metrics or reporting for other posts on this Instagram account.
          console.warn("Skipping an Instagram post unavailable to the reporting token:", {
            publishedSocialPostId: post.id,
            platformPostId: post.platformPostId,
          });
          continue;
        }
        throw error;
      }
    }
    return results;
  },
};
