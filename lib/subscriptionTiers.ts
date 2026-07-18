export type Tier = "FREE" | "STARTER" | "GROWTH" | "UNLIMITED";
export type PaidTier = Exclude<Tier, "FREE">;

export const FREE_TIER_LIMIT = 1;

export const TIERS: Record<PaidTier, { name: string; priceNgn: number; limit: number; planCodeEnv: string }> = {
  STARTER: {
    name: "Starter",
    priceNgn: 5900,
    limit: 5,
    planCodeEnv: "PAYSTACK_PLAN_CODE_STARTER",
  },
  GROWTH: {
    name: "Growth",
    priceNgn: 10500,
    limit: 20,
    planCodeEnv: "PAYSTACK_PLAN_CODE_GROWTH",
  },
  UNLIMITED: {
    name: "Unlimited",
    priceNgn: 15000,
    limit: Infinity,
    planCodeEnv: "PAYSTACK_PLAN_CODE_UNLIMITED",
  },
};

export const PAID_TIER_ORDER: PaidTier[] = ["STARTER", "GROWTH", "UNLIMITED"];

export function tierLimit(tier: Tier): number {
  if (tier === "FREE") return FREE_TIER_LIMIT;
  return TIERS[tier].limit;
}

export function planCodeForTier(tier: PaidTier): string {
  const envVar = TIERS[tier].planCodeEnv;
  const code = process.env[envVar];
  if (!code) throw new Error(`Missing environment variable ${envVar}`);
  return code;
}

/** Matches a Paystack plan_code back to which of our tiers it belongs to. */
export function tierFromPlanCode(planCode: string): PaidTier | null {
  for (const tier of PAID_TIER_ORDER) {
    if (process.env[TIERS[tier].planCodeEnv] === planCode) return tier;
  }
  return null;
}