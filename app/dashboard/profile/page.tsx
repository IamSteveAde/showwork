import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCreatorUsage } from "@/lib/subscriptionUsage";
import { PLAN_DISPLAY_NAME } from "@/lib/subscriptionTiers";
import ProfileForm from "@/components/profile/ProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import NotificationToggle from "@/components/profile/NotificationToggle";
import DangerZone from "@/components/profile/DangerZone";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

function formatNgn(n: number) {
  return `₦${n.toLocaleString()}`;
}

export default async function ProfilePage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const usage = await getCreatorUsage(creator);
  const planName = PLAN_DISPLAY_NAME[usage.tier];

  const paymentHistory = await db.paymentRecord.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Account
        </p>
        <h1 className="mb-10 text-3xl font-bold text-white">Your profile</h1>

        {/* PROFILE */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Profile
          </h2>
          <ProfileForm
            name={creator.name}
            phone={creator.phone}
            email={creator.email}
            emailVerified={creator.emailVerified}
            avatarUrl={creator.avatarUrl}
            initialsFallback={initials(creator.name, creator.email)}
          />
        </div>

        {/* PLAN & BILLING */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Plan & billing
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-white">{planName} plan</p>
              <p className="mt-1 text-sm text-white/50">
                {usage.limit === Infinity
                  ? "Unlimited projects"
                  : `${usage.used} of ${usage.limit} projects used this cycle`}
              </p>
              {creator.subscriptionRenewsAt && (
                <p className="mt-1 text-xs text-white/30">
                  Renews {new Date(creator.subscriptionRenewsAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <Link
              href="/dashboard/billing"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold"
              style={{ background: COLOR.gold, color: COLOR.black }}
            >
              Manage plan
            </Link>
          </div>
          {usage.limit !== Infinity && (
            <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`, background: COLOR.gold }}
              />
            </div>
          )}

          <div className="mt-6 border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="mb-3 text-xs font-semibold uppercase text-white/30" style={{ letterSpacing: "0.08em" }}>
              Billing history
            </p>
            {paymentHistory.length === 0 ? (
              <p className="text-sm text-white/30">No payments yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {paymentHistory.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-white/70">
                      {p.type === "PROJECT_ONE_TIME" ? "One-time project" : p.tier ? `${p.tier} subscription` : "Payment"}
                    </span>
                    <span className="text-white/50">{formatNgn(p.amountNgn)}</span>
                    <span className="text-xs text-white/30">
                      {p.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-white/25">
              Payment method on file is managed directly by Paystack during checkout — Showwork doesn&apos;t store your card details.
            </p>
          </div>
        </div>

        {/* ACCOUNT SETTINGS */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Account settings
          </h2>
          <div className="flex flex-col gap-6">
            <ChangePasswordForm />
            <div className="border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <NotificationToggle initialValue={creator.notifyOnView} />
            </div>
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <h2 className="mb-1 text-sm font-semibold uppercase text-red-400" style={{ letterSpacing: "0.08em" }}>
            Danger zone
          </h2>
          <p className="mb-5 text-xs text-white/40">These actions affect your entire account.</p>
          <DangerZone />
        </div>
      </div>
    </main>
  );
}