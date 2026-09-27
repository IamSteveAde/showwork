import { Prisma, type SocialConnection } from "@prisma/client";
import { db } from "@/lib/db";
import { getSocialReportingAdapter } from "@/lib/reporting/adapters";
import { utcSnapshotDate } from "@/lib/socialReporting";
import type { NormalizedSocialMetrics } from "@/lib/reporting/types";

function snapshotFields(metrics: NormalizedSocialMetrics) {
  return {
    reach: metrics.reach ?? null,
    impressions: metrics.impressions ?? null,
    views: metrics.views ?? null,
    engagement: metrics.engagement ?? null,
    engagementRate: metrics.engagementRate ?? null,
    likes: metrics.likes ?? null,
    comments: metrics.comments ?? null,
    shares: metrics.shares ?? null,
    saves: metrics.saves ?? null,
    clicks: metrics.clicks ?? null,
    additionalMetrics: metrics.additionalMetrics
      ? metrics.additionalMetrics as Prisma.InputJsonValue
      : Prisma.JsonNull,
  };
}

function accountSnapshotFields(metrics: NormalizedSocialMetrics, followerGrowth: number | null) {
  return {
    followers: metrics.followers ?? null,
    followerGrowth,
    reach: metrics.reach ?? null,
    impressions: metrics.impressions ?? null,
    views: metrics.views ?? null,
    engagement: metrics.engagement ?? null,
    additionalMetrics: metrics.additionalMetrics
      ? metrics.additionalMetrics as Prisma.InputJsonValue
      : Prisma.JsonNull,
  };
}

function needsReauthorization(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("renew") || message.includes("expired") || message.includes("permission is missing") || message.includes("scope_not_authorized");
}

async function syncConnection(initialConnection: SocialConnection & {
  publishedPosts: { id: string; platformPostId: string | null; providerReference: string | null; publishedAt: Date | null }[];
}) {
  const adapter = getSocialReportingAdapter(initialConnection.platform);
  if (!adapter) {
    await db.socialConnection.update({
      where: { id: initialConnection.id },
      data: {
        lastSyncAttemptAt: new Date(),
        lastSyncError: `${initialConnection.platform} reporting adapter is not available yet.`,
      },
    });
    return { connectionId: initialConnection.id, status: "UNSUPPORTED" as const };
  }

  await db.socialConnection.update({
    where: { id: initialConnection.id },
    data: { lastSyncAttemptAt: new Date(), lastSyncError: null },
  });

  try {
    let connection: SocialConnection = initialConnection;
    const expiring = connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() <= Date.now() + 60_000;
    if (expiring && adapter.refreshConnection) connection = await adapter.refreshConnection(connection);
    else if (expiring) throw new Error(`${connection.platform} connection has expired. Reconnect the account to continue reporting.`);

    const [accountMetrics, postMetrics] = await Promise.all([
      adapter.fetchAccountMetrics(connection),
      adapter.fetchPostMetrics(connection, initialConnection.publishedPosts),
    ]);
    const snapshotDate = utcSnapshotDate();
    const previousAccountSnapshot = await db.socialAccountMetricSnapshot.findFirst({
      where: { socialConnectionId: connection.id, snapshotDate: { lt: snapshotDate } },
      orderBy: { snapshotDate: "desc" },
      select: { followers: true },
    });
    const followerGrowth = accountMetrics.followers != null && previousAccountSnapshot?.followers != null
      ? accountMetrics.followers - previousAccountSnapshot.followers
      : null;

    await db.socialAccountMetricSnapshot.upsert({
      where: { socialConnectionId_snapshotDate: { socialConnectionId: connection.id, snapshotDate } },
      create: {
        socialConnectionId: connection.id,
        snapshotDate,
        ...accountSnapshotFields(accountMetrics, followerGrowth),
      },
      update: accountSnapshotFields(accountMetrics, followerGrowth),
    });

    for (const post of initialConnection.publishedPosts) {
      const metrics = postMetrics.get(post.id);
      if (!metrics) continue;
      await db.socialPostMetricSnapshot.upsert({
        where: { publishedSocialPostId_snapshotDate: { publishedSocialPostId: post.id, snapshotDate } },
        create: {
          publishedSocialPostId: post.id,
          snapshotDate,
          engagementRateBasis: metrics.engagementRateBasis ?? null,
          ...snapshotFields(metrics),
        },
        update: {
          engagementRateBasis: metrics.engagementRateBasis ?? null,
          ...snapshotFields(metrics),
        },
      });
    }

    await db.socialConnection.update({
      where: { id: connection.id },
      data: { status: "CONNECTED", lastSyncAt: new Date(), lastSyncError: null },
    });
    return { connectionId: connection.id, status: "SYNCED" as const, postsUpdated: postMetrics.size };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Social reporting sync failed.";
    await db.socialConnection.update({
      where: { id: initialConnection.id },
      data: {
        status: needsReauthorization(error) ? "NEEDS_REAUTH" : initialConnection.status,
        lastSyncError: message.slice(0, 2000),
      },
    });
    console.error(`Reporting sync failed for ${initialConnection.platform} connection ${initialConnection.id}:`, error);
    return { connectionId: initialConnection.id, status: "FAILED" as const, error: message };
  }
}

/** Sync each account independently so one provider failure never blocks others. */
async function syncConnections(calendarId?: string) {
  const connections = await db.socialConnection.findMany({
    where: { status: { in: ["CONNECTED", "NEEDS_REAUTH"] }, ...(calendarId ? { calendarId } : {}) },
    include: {
      publishedPosts: {
        where: { status: "PUBLISHED" },
        select: { id: true, platformPostId: true, providerReference: true, publishedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const results = [];
  for (const connection of connections) {
    if (connection.status === "NEEDS_REAUTH") {
      results.push({ connectionId: connection.id, status: "NEEDS_REAUTH" as const });
      continue;
    }
    results.push(await syncConnection(connection));
  }
  return { total: connections.length, results };
}

export async function syncConnectedSocialReporting() {
  return syncConnections();
}

export async function syncCalendarSocialReporting(calendarId: string) {
  return syncConnections(calendarId);
}
