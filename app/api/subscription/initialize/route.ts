import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { initializeSubscription } from "@/lib/paystack";
import { appUrl } from "@/lib/url";
import { TIERS, planCodeForTier, PAID_TIER_ORDER, PaidTier } from "@/lib/subscriptionTiers";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier } = await req.json();

  if (!PAID_TIER_ORDER.includes(tier)) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }

  try {
    const selectedTier = tier as PaidTier;
    const reference = `showwork_sub_${creator.id}_${randomUUID()}`;
    const planCode = planCodeForTier(selectedTier);
    // Required by Paystack's validation even though the plan's own price
    // is what actually gets charged. Naira -> kobo, whole number.
    const amount = TIERS[selectedTier].priceNgn * 100;

    const result = await initializeSubscription({
      email: creator.email,
      reference,
      callbackUrl: `${appUrl()}/dashboard/billing?payment=callback`,
      planCode,
      amount,
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  } catch (err) {
    console.error("Subscription initialize error:", err);
    return NextResponse.json({ error: "Failed to start subscription" }, { status: 500 });
  }
}