import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import { TIERS, PAID_TIER_ORDER, FREE_TIER_LIMIT, tierFromPlanCode, type BillingCycle } from "@/lib/subscriptionTiers";
import { verifyTransaction, fetchCustomerSubscriptions, cancelSubscription } from "@/lib/paystack";
import SubscribeButton from "@/components/SubscribeButton";
import CancelSubscriptionButton from "@/components/CancelSubscriptionButton";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; reference?: string; trxref?: string; tier?: string; cycle?: string }>;
}) {
  const { payment, reference, trxref, tier: selectedTierParam, cycle: cycleParam } = await searchParams;

  // Defaults to Annual — matches the same nudge used on the pricing
  // page, so someone arriving here from that CTA sees the same choice
  // they were just looking at, rather than it silently resetting.
  const selectedCycle: BillingCycle = cycleParam === "MONTHLY" ? "MONTHLY" : "ANNUAL";

  let creator = await getCurrentCreator();
  if (!creator) {
    const params = new URLSearchParams();
    if (selectedTierParam) params.set("tier", selectedTierParam);
    params.set("cycle", selectedCycle);
    redirect(`/login?next=${encodeURIComponent(`/dashboard/billing?${params.toString()}`)}`);
  }

  const ref = reference ?? trxref;

  // Fallback confirmation path: the webhook is the normal way subscription
  // details get saved, but it can't reach localhost during local
  // development, and can be delayed even in production. Runs on every
  // callback — not just first-ever subscribes — so switching from one
  // paid tier (or billing cycle) to another also gets picked up correctly.
  if (payment === "callback" && ref) {
    try {
      const verification = await verifyTransaction(ref);
      const isSuccessful = verification?.data?.status === "success";
      const planCode: string | undefined =
        typeof verification?.data?.plan === "string"
          ? verification.data.plan
          : verification?.data?.plan?.plan_code;
      const match = planCode ? tierFromPlanCode(planCode) : null;
      const customerCode = verification?.data?.customer?.customer_code;

      if (isSuccessful && match && customerCode) {
        const { tier, cycle } = match;
        const subs = await fetchCustomerSubscriptions(customerCode);
        const matchingSub = subs?.data?.find(
          (s: any) => (typeof s.plan === "string" ? s.plan : s.plan?.plan_code) === planCode
        );

        // Switching plans (or cycles) starts a brand new Paystack
        // subscription — if there's a different one already on file,
        // cancel it now so the creator isn't billed for two plans at
        // once going forward.
        if (
          creator.paystackSubscriptionCode &&
          creator.paystackEmailToken &&
          matchingSub?.subscription_code &&
          creator.paystackSubscriptionCode !== matchingSub.subscription_code
        ) {
          try {
            await cancelSubscription(creator.paystackSubscriptionCode, creator.paystackEmailToken);
          } catch (err) {
            console.error("Failed to cancel previous subscription during switch:", err);
          }
        }

        creator = await db.creator.update({
          where: { id: creator.id },
          data: {
            subscriptionActive: true,
            subscriptionTier: tier,
            subscriptionCycle: cycle,
            paystackCustomerCode: customerCode,
            paystackSubscriptionCode: matchingSub?.subscription_code ?? null,
            paystackEmailToken: matchingSub?.email_token ?? null,
            subscriptionRenewsAt: matchingSub?.next_payment_date ? new Date(matchingSub.next_payment_date) : null,
            currentCycleStart: new Date(),
          },
        });
      }
    } catch (err) {
      console.error("Subscription callback verification error:", err);
    }
  }

  const usage = await getCreatorUsage(creator);

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Billing
        </p>
        <h1 className="mb-3 text-3xl font-bold text-white">Your plan</h1>
        <p className="mb-6 text-sm" style={{ color: COLOR.midGray }}>
          You&apos;ve used <strong className="text-white/80">{usage.used}</strong>
          {usage.limit === Infinity ? "" : ` of ${usage.limit}`} project
          {usage.used === 1 ? "" : "s"} this {usage.tier === "FREE" ? "30 days" : "billing cycle"}.
        </p>

        {/* Monthly / Annual toggle — implemented as plain links rather
            than client-side state, since this page is a server
            component throughout (real database writes happen above).
            Clicking either option just reloads the page with a
            different ?cycle= param, preserving whichever tier (if
            any) was already selected. */}
        <div className="mb-10 flex items-center gap-3">
          <div
            className="relative inline-flex items-center gap-1 rounded-full p-1"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Link
              href={`/dashboard/billing?cycle=MONTHLY${selectedTierParam ? `&tier=${selectedTierParam}` : ""}`}
              className="rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300"
              style={{
                background: selectedCycle === "MONTHLY" ? COLOR.gold : "transparent",
                color: selectedCycle === "MONTHLY" ? COLOR.black : "rgba(255,255,255,0.6)",
              }}
            >
              Monthly
            </Link>
            <Link
              href={`/dashboard/billing?cycle=ANNUAL${selectedTierParam ? `&tier=${selectedTierParam}` : ""}`}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300"
              style={{
                background: selectedCycle === "ANNUAL" ? COLOR.gold : "transparent",
                color: selectedCycle === "ANNUAL" ? COLOR.black : "rgba(255,255,255,0.6)",
              }}
            >
              Annual
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  background: selectedCycle === "ANNUAL" ? "rgba(10,10,10,0.15)" : "rgba(245,200,66,0.15)",
                  color: selectedCycle === "ANNUAL" ? COLOR.black : COLOR.gold,
                }}
              >
                Save 5%
              </span>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Free tier card */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: COLOR.charcoal,
              border: usage.tier === "FREE" ? `1px solid ${COLOR.gold}` : "1px solid transparent",
            }}
          >
            <p className="mb-1 text-xs font-semibold uppercase" style={{ color: COLOR.midGray, letterSpacing: "0.08em" }}>
              Free
            </p>
            <p className="mb-4 text-2xl font-bold text-white">₦0</p>
            <p className="mb-5 text-sm text-white/50">{FREE_TIER_LIMIT} project per month</p>
            {usage.tier === "FREE" ? (
              <span className="text-xs font-semibold" style={{ color: COLOR.gold }}>Current plan</span>
            ) : (
              <span className="text-xs text-white/30">Included by default</span>
            )}
          </div>

          {/* Paid tiers */}
          {PAID_TIER_ORDER.map((tierKey) => {
            const info = TIERS[tierKey];
            const isCurrent = usage.tier === tierKey;
            const isSelected = selectedTierParam === tierKey && !isCurrent;
            const displayPrice =
              selectedCycle === "ANNUAL" ? Math.round(info.priceNgnAnnual / 12) : info.priceNgnMonthly;

            return (
              <div
                key={tierKey}
                className="relative rounded-2xl p-6"
                style={{
                  background: COLOR.charcoal,
                  border: isCurrent
                    ? `1px solid ${COLOR.gold}`
                    : isSelected
                      ? `1px solid ${COLOR.gold}`
                      : "1px solid transparent",
                  boxShadow: isSelected ? "0 0 0 3px rgba(245,200,66,0.15)" : undefined,
                }}
              >
                {isSelected && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                    style={{ background: COLOR.gold, color: COLOR.black, letterSpacing: "0.05em" }}
                  >
                    Your pick
                  </span>
                )}
                <p className="mb-1 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.08em" }}>
                  {info.name}
                </p>
                <p className="mb-1 text-2xl font-bold text-white">
                  ₦{displayPrice.toLocaleString()}
                  <span className="text-sm font-normal text-white/40">/mo</span>
                </p>
                {selectedCycle === "ANNUAL" && (
                  <p className="mb-4 text-xs" style={{ color: COLOR.gold }}>
                    Billed ₦{info.priceNgnAnnual.toLocaleString()} yearly
                  </p>
                )}
                {selectedCycle === "MONTHLY" && <div className="mb-4" />}
                <p className="mb-5 text-sm text-white/50">
                  {info.limit === Infinity ? "Unlimited projects" : `Up to ${info.limit} projects per month`}
                </p>

                {isCurrent ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold" style={{ color: COLOR.gold }}>
                      Current plan
                    </span>
                    {creator.subscriptionRenewsAt && (
                      <span className="text-xs text-white/30">
                        Renews {new Date(creator.subscriptionRenewsAt).toLocaleDateString("en-NG", {
                          day: "numeric", month: "long",
                        })}
                      </span>
                    )}
                    <CancelSubscriptionButton />
                  </div>
                ) : (
                  <SubscribeButton
                    tier={tierKey}
                    cycle={selectedCycle}
                    label={usage.tier === "FREE" ? "Subscribe" : "Switch to this plan"}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}