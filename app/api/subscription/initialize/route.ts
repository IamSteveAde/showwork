import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { initializeOfferSubscription } from "@/lib/billingOffers";
import { appUrl } from "@/lib/url";
import { TIERS, planCodeForTier, PAID_TIER_ORDER, PaidTier, BillingCycle } from "@/lib/subscriptionTiers";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier, cycle, expectedQuote } = await req.json();

  if (!PAID_TIER_ORDER.includes(tier)) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }
  // Strict on purpose — this endpoint starts a real financial
  // transaction, so a missing or malformed cycle should fail loudly
  // right here rather than silently falling back to a guess that
  // might not match what the person actually chose.
  if (cycle !== "MONTHLY" && cycle !== "ANNUAL") {
    return NextResponse.json({ error: "Invalid billing cycle selected" }, { status: 400 });
  }

  try {
    const selectedTier = tier as PaidTier;
    const selectedCycle = cycle as BillingCycle;
    const reference = `showwork_sub_${creator.id}_${randomUUID()}`;
    const standardPriceNgn =
      selectedCycle === "ANNUAL" ? TIERS[selectedTier].priceNgnAnnual : TIERS[selectedTier].priceNgnMonthly;

    const planCode = planCodeForTier(selectedTier, selectedCycle);
    const amount = standardPriceNgn * 100;

    const result = await initializeOfferSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/billing?product=delivery&payment=callback`,
      planCode,
      amount,
      expectedQuote,
      metadata: { creatorId: creator.id, deliveryTier: selectedTier, billingCycle: selectedCycle },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  } catch (err) {
    if (err instanceof Error && err.message === "BILLING_QUOTE_CHANGED") return NextResponse.json({ error: "Your offer changed. Refresh the price and confirm again." }, { status: 409 });
    console.error("Subscription initialize error:", err);
    return NextResponse.json({ error: "Failed to start subscription" }, { status: 500 });
  }
}