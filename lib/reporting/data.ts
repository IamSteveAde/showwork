import type { SocialPlatform } from "@prisma/client";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";

export const REPORTING_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X", "YOUTUBE"];

export function reportingPeriod(searchParams: URLSearchParams) {
  const endValue = searchParams.get("to");
  const startValue = searchParams.get("from");
  const end = endValue ? new Date(`${endValue}T23:59:59.999Z`) : new Date();
  const start = startValue
    ? new Date(`${startValue}T00:00:00.000Z`)
    : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    throw new Error("Choose a valid reporting date range.");
  }
  if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new Error("Reporting date ranges can’t exceed 366 days.");
  }
  return { start, end };
}

export async function getCalendarReportingData(
  calendarId: string,
  searchParams: URLSearchParams,
  includeSyncErrors: boolean,
) {
  const { start, end } = reportingPeriod(searchParams);
  const platformValue = searchParams.get("platform")?.toUpperCase();
  if (platformValue && !REPORTING_PLATFORMS.includes(platformValue as SocialPlatform)) {
    throw new Error("Choose a supported social platform.");
  }
  const platform = platformValue as SocialPlatform | null;

  const [permission, connections, posts, insights] = await Promise.all([
    db.calendarReportingPermission.findUnique({ where: { calendarId } }),
    db.socialConnection.findMany({
      where: { calendarId, ...(platform ? { platform } : {}) },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        accountName: true,
        username: true,
        status: true,
        connectedAt: true,
        disconnectedAt: true,
        lastSyncAttemptAt: true,
        lastSyncAt: true,
        ...(includeSyncErrors ? { lastSyncError: true } : {}),
        accountMetricSnapshots: {
          where: { snapshotDate: { gte: start, lte: end } },
          orderBy: { snapshotDate: "desc" },
          take: 90,
        },
      },
      orderBy: { platform: "asc" },
    }),
    db.publishedSocialPost.findMany({
      where: {
        calendarId,
        ...(platform ? { platform } : {}),
        publishedAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        platform: true,
        platformPostId: true,
        permalink: true,
        status: true,
        publishedAt: true,
        platformPostType: true,
        metricSnapshots: {
          where: { snapshotDate: { gte: start, lte: end } },
          orderBy: { snapshotDate: "desc" },
          take: 90,
        },
        calendarPost: {
          select: {
            id: true,
            caption: true,
            postType: true,
            category: true,
            assets: { select: { fileKey: true, mediaType: true, displayOrder: true }, orderBy: { displayOrder: "asc" } },
          },
        },
        connection: { select: { accountName: true, username: true } },
      },
      orderBy: { publishedAt: "desc" },
    }),
    db.reportingInsight.findMany({
      where: {
        calendarId,
        periodStart: { lte: end },
        periodEnd: { gte: start },
        ...(platform ? { OR: [{ platform }, { platform: null }] } : {}),
      },
      orderBy: { generatedAt: "desc" },
    }),
  ]);

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    clientSharing: {
      enabled: permission?.enabled ?? false,
      grantedAt: permission?.grantedAt?.toISOString() ?? null,
      revokedAt: permission?.revokedAt?.toISOString() ?? null,
    },
    connections: connections.map((connection) => ({
      id: connection.id,
      platform: connection.platform,
      accountName: connection.accountName,
      username: connection.username,
      status: connection.status,
      connectedAt: connection.connectedAt,
      disconnectedAt: connection.disconnectedAt,
      lastSyncAttemptAt: connection.lastSyncAttemptAt,
      lastSyncAt: connection.lastSyncAt,
      ...(includeSyncErrors ? { lastSyncError: "lastSyncError" in connection ? connection.lastSyncError : null } : {}),
      accountMetricSnapshots: connection.accountMetricSnapshots,
    })),
    posts: posts.map((post) => ({
      id: post.id,
      platform: post.platform,
      platformPostId: post.platformPostId,
      permalink: post.permalink,
      status: post.status,
      publishedAt: post.publishedAt,
      platformPostType: post.platformPostType,
      metricSnapshots: post.metricSnapshots,
      connection: post.connection,
      calendarPost: {
        id: post.calendarPost.id,
        caption: post.calendarPost.caption,
        postType: post.calendarPost.postType,
        ...(includeSyncErrors ? { category: post.calendarPost.category } : {}),
        assets: post.calendarPost.assets.map((asset) => ({
          mediaType: asset.mediaType,
          displayOrder: asset.displayOrder,
          previewUrl: publicUrlFor(asset.fileKey),
        })),
      },
    })),
    insights: insights.map((insight) => includeSyncErrors
      ? insight
      : {
          id: insight.id,
          platform: insight.platform,
          periodStart: insight.periodStart,
          periodEnd: insight.periodEnd,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          recommendation: insight.recommendation,
          generatedAt: insight.generatedAt,
        }),
  };
}
