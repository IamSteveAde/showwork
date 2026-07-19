import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeSubscription, createPlan } from "@/lib/paystack";
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
    const standardPriceNgn = TIERS[selectedTier].priceNgn;

    // A per-creator discount (admin-granted) takes priority over the
    // platform-wide one if both somehow apply — the more specific
    // override wins.
    const settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
    const discountPercent = creator.discountPercent > 0
      ? creator.discountPercent
      : settings?.globalDiscountPercent ?? 0;

    let planCode: string;
    let amount: number;

    if (discountPercent > 0) {
      // A genuinely discounted recurring price requires a real Paystack
      // plan at that price — Paystack charges whatever the plan says,
      // so a cosmetic discount that doesn't change the actual plan
      // wouldn't do anything. Created fresh each time rather than
      // cached, since discount percentages can change per creator.
      const discountedNgn = Math.round(standardPriceNgn * (1 - discountPercent / 100));
      const plan = await createPlan({
        name: `Showwork ${TIERS[selectedTier].name} (${discountPercent}% off) — ${creator.id}`,
        amountNgn: discountedNgn,
      });
      planCode = plan.data.plan_code;
      amount = discountedNgn * 100;
    } else {
      planCode = planCodeForTier(selectedTier);
      amount = standardPriceNgn * 100;
    }

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