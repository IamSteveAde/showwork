import type { SocialConnection } from "@prisma/client";
import { db } from "@/lib/db";
import { refreshTikTokAccessToken } from "@/lib/tiktok";
import type { NormalizedSocialMetrics, PublishedPostRef, SocialReportingAdapter } from "@/lib/reporting/types";

const API_BASE = "https://open.tiktokapis.com/v2";

async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error?.code !== "ok") {
    const message = data.error?.message || `TikTok reporting request failed (${response.status}).`;
    const code = data.error?.code;
    throw new Error(code === "scope_not_authorized"
      ? "TikTok reporting permission is missing. Reconnect TikTok after enabling video.list and user.info.stats for the app."
      : message);
  }
  return data.data as T;
}

async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error?.code !== "ok") {
    const message = data.error?.message || `TikTok reporting request failed (${response.status}).`;
    const code = data.error?.code;
    throw new Error(code === "scope_not_authorized"
      ? "TikTok reporting permission is missing. Reconnect TikTok after enabling video.list and user.info.stats for the app."
      : message);
  }
  return data.data as T;
}

function requireScopes(connection: SocialConnection, required: string[]) {
  const scopes = new Set((connection.tokenScopes ?? "").split(/[\s,]+/).filter(Boolean));
  const missing = required.filter((scope) => !scopes.has(scope));
  if (missing.length) {
    throw new Error(`TikTok reporting permissions are missing (${missing.join(", ")}). Reconnect TikTok after enabling these scopes in the developer app.`);
  }
}

export const tiktokReportingAdapter: SocialReportingAdapter = {
  platform: "TIKTOK",

  async refreshConnection(connection) {
    if (!connection.refreshToken) throw new Error("TikTok connection needs to be renewed.");
    const refreshed = await refreshTikTokAccessToken(connection.refreshToken);
    const accessTokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    const updated = await db.socialConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: refreshed.access_token,
        accessTokenExpiresAt,
        refreshToken: refreshed.refresh_token,
      },
    });
    await db.socialCalendar.update({
      where: { id: connection.calendarId },
      data: {
        tikTokAccessToken: refreshed.access_token,
        tikTokAccessTokenExpiresAt: accessTokenExpiresAt,
        tikTokRefreshToken: refreshed.refresh_token,
      },
    });
    return updated;
  },

  async fetchAccountMetrics(connection): Promise<NormalizedSocialMetrics> {
    requireScopes(connection, ["user.info.stats"]);
    if (!connection.accessToken) throw new Error("TikTok connection needs to be renewed.");
    const result = await apiGet<{
      user?: { follower_count?: number; following_count?: number; likes_count?: number; video_count?: number };
    }>("/user/info/?fields=follower_count,following_count,likes_count,video_count", connection.accessToken);
    const user = result.user ?? {};
    return {
      followers: typeof user.follower_count === "number" ? user.follower_count : null,
      additionalMetrics: {
        ...(typeof user.following_count === "number" ? { followingCount: user.following_count } : {}),
        ...(typeof user.likes_count === "number" ? { totalLikes: user.likes_count } : {}),
        ...(typeof user.video_count === "number" ? { videoCount: user.video_count } : {}),
      },
    };
  },

  async fetchPostMetrics(connection: SocialConnection, posts: PublishedPostRef[]) {
    requireScopes(connection, ["video.list"]);
    if (!connection.accessToken) throw new Error("TikTok connection needs to be renewed.");
    const postsWithIds = posts.filter((post) => !!post.platformPostId);
    const results = new Map<string, NormalizedSocialMetrics>();
    for (let offset = 0; offset < postsWithIds.length; offset += 20) {
      const batch = postsWithIds.slice(offset, offset + 20);
      const result = await apiPost<{ videos?: {
        id: string;
        create_time?: number;
        view_count?: number;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
        title?: string;
        video_description?: string;
      }[] }>(
        "/video/query/?fields=id,create_time,view_count,like_count,comment_count,share_count,title,video_description",
        connection.accessToken,
        { filters: { video_ids: batch.map((post) => post.platformPostId) } },
      );
      const byPlatformId = new Map((result.videos ?? []).map((video) => [video.id, video]));
      for (const post of batch) {
        const video = byPlatformId.get(post.platformPostId!);
        if (!video) continue;
        const views = typeof video.view_count === "number" ? video.view_count : null;
        const likes = typeof video.like_count === "number" ? video.like_count : null;
        const comments = typeof video.comment_count === "number" ? video.comment_count : null;
        const shares = typeof video.share_count === "number" ? video.share_count : null;
        const engagement = likes !== null && comments !== null && shares !== null
          ? likes + comments + shares
          : null;
        results.set(post.id, {
          views,
          likes,
          comments,
          shares,
          engagement,
          engagementRate: engagement !== null && views ? engagement / views : null,
          engagementRateBasis: engagement !== null && views ? "views" : null,
          additionalMetrics: {
            ...(video.title ? { title: video.title } : {}),
            ...(video.video_description ? { description: video.video_description } : {}),
          },
          sourceUpdatedAt: typeof video.create_time === "number" ? new Date(video.create_time * 1000) : null,
        });
      }
    }
    return results;
  },
};
