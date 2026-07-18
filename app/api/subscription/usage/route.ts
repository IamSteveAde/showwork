import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import { PLAN_DISPLAY_NAME, NEXT_TIER, TIERS } from "@/lib/subscriptionTiers";

export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await getCreatorUsage(creator);
  const nextTier = NEXT_TIER[usage.tier];

  // Same "approaching the limit" threshold used on the main dashboard —
  // roughly the last 20% of the cycle's allowance, or fewer than 1
  // whole project left, whichever is more.
  const nearCap = usage.limit !== Infinity && usage.remaining <= Math.max(1, Math.ceil(usage.limit * 0.2));
  const atCap = usage.limit !== Infinity && usage.remaining <= 0;

  return NextResponse.json({
    planName: PLAN_DISPLAY_NAME[usage.tier],
    used: usage.used,
    limit: usage.limit === Infinity ? null : usage.limit,
    remaining: usage.limit === Infinity ? null : usage.remaining,
    nearCap,
    atCap,
    nextTier: nextTier
      ? { name: TIERS[nextTier].name, priceNgn: TIERS[nextTier].priceNgn, limit: TIERS[nextTier].limit === Infinity ? null : TIERS[nextTier].limit }
      : null,
  });
}