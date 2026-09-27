import type { SocialPlatform } from "@prisma/client";
import type { SocialPlatformAdapter } from "@/lib/reporting/types";
import { instagramReportingAdapter } from "@/lib/reporting/adapters/instagram";
import { tiktokReportingAdapter } from "@/lib/reporting/adapters/tiktok";
import { facebookReportingAdapter } from "@/lib/reporting/adapters/facebook";
import { publishPostToInstagram } from "@/lib/instagramPublishing";
import { publishPostToTikTok } from "@/lib/tiktokPublishing";

const adapters: Partial<Record<SocialPlatform, SocialPlatformAdapter>> = {
  INSTAGRAM: { ...instagramReportingAdapter, publishPost: publishPostToInstagram },
  TIKTOK: { ...tiktokReportingAdapter, publishPost: publishPostToTikTok },
  FACEBOOK: facebookReportingAdapter,
};

export function getSocialPlatformAdapter(platform: SocialPlatform) {
  return adapters[platform] ?? null;
}

export const getSocialReportingAdapter = getSocialPlatformAdapter;
