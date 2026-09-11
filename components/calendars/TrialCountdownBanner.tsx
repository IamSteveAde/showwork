"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AccountType = "INDIVIDUAL" | "COMPANY";

function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l1.55 5.95L19.5 10l-5.95 1.55L12 17.5l-1.55-5.95L4.5 10l5.95-1.55L12 2.5Z" />
      <path d="M19 16.5l.7 2.8 2.8.7-2.8.7-.7 2.8-.7-2.8-2.8-.7 2.8-.7.7-2.8Z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function TrialCountdownBanner({
  trialEndsAt,
  accountType,
}: {
  trialEndsAt: string;
  accountType: AccountType;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the countdown fresh without requiring a page refresh.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const trialEnd = useMemo(() => new Date(trialEndsAt).getTime(), [trialEndsAt]);
  const msLeft = trialEnd - now;
  const expired = msLeft <= 0;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const hoursLeft = Math.max(0, Math.ceil(msLeft / 3600000));

  const price = accountType === "COMPANY" ? "₦15,000" : "₦2,800";
  const planName = accountType === "COMPANY" ? "Company" : "Individual";

  const endDate = useMemo(
    () => new Date(trialEndsAt).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    [trialEndsAt]
  );

  const subscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/calendars/subscribe", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      setError(data.error ?? "We couldn't start checkout. Please try again.");
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const headline = expired
    ? "Your trial has ended"
    : daysLeft === 0
      ? "Your trial ends today"
      : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;

  const supportingText = expired
    ? "Subscribe to restore access to your client content workspaces."
    : "Keep your workspaces active after your free trial ends.";

  return (
    <section
      aria-label="Trial status"
      aria-live="polite"
      className="relative mb-8 overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#101318] shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
    >
      <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-[#2478FF] opacity-20 blur-[90px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-56 w-56 rounded-full bg-white/[0.025] blur-[90px]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      <div className="relative grid lg:grid-cols-[1fr_auto]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2478FF]/20 bg-[#2478FF]/10 text-[#6EA8FF]" aria-hidden="true">
              <SparkIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-[#2478FF]/20 bg-[#2478FF]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#78AEFF]">
                  {expired ? "Trial ended" : "Free trial"}
                </span>
                <span className="text-[10px] font-medium text-white/25">
                  {planName} · {price}/month
                </span>
              </div>

              <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
                {headline}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                {supportingText}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/35">
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon className="text-[#4ADE80]" />
                  Client workspaces stay yours
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon className="text-[#4ADE80]" />
                  Trial ends {endDate}
                </span>
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs leading-5 text-red-200">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.07] bg-white/[0.018] p-5 sm:p-7 lg:w-[300px] lg:border-l lg:border-t-0 lg:p-8">
          <div className="flex h-full flex-col justify-between gap-6">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/25">
                Continue without interruption
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-tight text-white">{price}</span>
                <span className="text-[11px] text-white/30">/ month</span>
              </div>
              {!expired && (
                <p className="mt-1 text-[10px] text-white/25">
                  {hoursLeft <= 24 ? "Less than a day remaining" : `${daysLeft} days remaining on your trial`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={subscribe}
                disabled={loading}
                className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-4 py-3 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(36,120,255,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#1768E8] hover:shadow-[0_16px_36px_rgba(36,120,255,0.28)] focus:outline-none focus:ring-2 focus:ring-[#2478FF]/40 focus:ring-offset-2 focus:ring-offset-[#101318] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Starting checkout...
                  </>
                ) : (
                  <>
                    {expired ? "Subscribe & restore access" : "Subscribe now"}
                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
