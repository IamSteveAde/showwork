import { db } from "@/lib/db";
import { tierLimit, Tier } from "@/lib/subscriptionTiers";

interface CreatorForUsage {
  id: string;
  subscriptionActive: boolean;
  subscriptionTier: Tier;
  currentCycleStart: Date;
  isComped: boolean;
}

export interface UsageInfo {
  tier: Tier;
  limit: number;
  used: number;
  remaining: number;
  atCap: boolean;
  cycleStart: Date;
}

/**
 * Counts how many projects a creator has created in their current
 * billing cycle and compares it against their tier's cap. isComped
 * (admin-granted free access) overrides everything else — treated as
 * Unlimited regardless of what Paystack actually says. A lapsed or
 * cancelled paid subscription is treated as FREE — subscriptionTier
 * alone is not trusted as the source of truth for access.
 */
export async function getCreatorUsage(creator: CreatorForUsage): Promise<UsageInfo> {
  const effectiveTier: Tier = creator.isComped
    ? "UNLIMITED"
    : creator.subscriptionActive
      ? creator.subscriptionTier
      : "FREE";
  const limit = tierLimit(effectiveTier);

  // Free tier has no billing event to anchor a cycle to, so it uses a
  // rolling 30-day window instead of a stored, resettable cycle start.
  const cycleStart =
    effectiveTier === "FREE"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : creator.currentCycleStart;

  const used = await db.project.count({
    where: { creatorId: creator.id, createdAt: { gte: cycleStart } },
  });

  return {
    tier: effectiveTier,
    limit,
    used,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - used),
    atCap: used >= limit,
    cycleStart,
  };
}