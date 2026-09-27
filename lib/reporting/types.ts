import type { SocialConnection, SocialPlatform } from "@prisma/client";

export type NormalizedSocialMetrics = {
  reach?: number | null;
  impressions?: number | null;
  views?: number | null;
  engagement?: number | null;
  engagementRate?: number | null;
  engagementRateBasis?: "reach" | "impressions" | "views" | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  followers?: number | null;
  additionalMetrics?: Record<string, unknown>;
  sourceUpdatedAt?: Date | null;
};

export type PublishedPostRef = {
  id: string;
  platformPostId: string | null;
  providerReference: string | null;
  publishedAt: Date | null;
};

export interface SocialPlatformAdapter {
  readonly platform: SocialPlatform;
  refreshConnection?(connection: SocialConnection): Promise<SocialConnection>;
  publishPost?(calendarPostId: string): Promise<void>;
  fetchPublishedPosts?(connection: SocialConnection): Promise<PublishedPostRef[]>;
  fetchAccountMetrics(connection: SocialConnection): Promise<NormalizedSocialMetrics>;
  fetchPostMetrics(
    connection: SocialConnection,
    posts: PublishedPostRef[],
  ): Promise<Map<string, NormalizedSocialMetrics>>;
}

export type SocialReportingAdapter = SocialPlatformAdapter;
