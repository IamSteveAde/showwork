import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import { TIERS, PAID_TIER_ORDER, FREE_TIER_LIMIT } from "@/lib/subscriptionTiers";
import SubscribeButton from "@/components/SubscribeButton";
import CancelSubscriptionButton from "@/components/CancelSubscriptionButton";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

export default async function BillingPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

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
        <p className="mb-10 text-sm" style={{ color: COLOR.midGray }}>
          You&apos;ve used <strong className="text-white/80">{usage.used}</strong>
          {usage.limit === Infinity ? "" : ` of ${usage.limit}`} project
          {usage.used === 1 ? "" : "s"} this {usage.tier === "FREE" ? "30 days" : "billing cycle"}.
        </p>

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

            return (
              <div
                key={tierKey}
                className="rounded-2xl p-6"
                style={{
                  background: COLOR.charcoal,
                  border: isCurrent ? `1px solid ${COLOR.gold}` : "1px solid transparent",
                }}
              >
                <p className="mb-1 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.08em" }}>
                  {info.name}
                </p>
                <p className="mb-4 text-2xl font-bold text-white">
                  ₦{info.priceNgn.toLocaleString()}
                  <span className="text-sm font-normal text-white/40">/mo</span>
                </p>
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
                  <SubscribeButton tier={tierKey} label={usage.tier === "FREE" ? "Subscribe" : "Switch to this plan"} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}