"use client";
import SubscriptionCheckoutButton from "@/components/billing/SubscriptionCheckoutButton";
import type { PaidTier, BillingCycle } from "@/lib/subscriptionTiers";
export default function SubscribeButton({ tier, cycle, label = "Subscribe" }: { tier: PaidTier; cycle: BillingCycle; label?: string }) {
  return <SubscriptionCheckoutButton product="DELIVERY" plan={tier} cycle={cycle} label={label} />;
}
