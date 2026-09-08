"use client";

import { useState } from "react";

// Shown at the top of the calendars dashboard for the whole duration
// of an account's trial — always visible, not just as a one-time
// toast, since the requirement is that the days-remaining count is
// something the manager can check back on anytime.
export default function TrialCountdownBanner({
  trialEndsAt,
  accountType,
}: {
  trialEndsAt: string;
  accountType: "INDIVIDUAL" | "COMPANY";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const expired = msLeft <= 0;
  const price = accountType === "COMPANY" ? "₦15,000" : "₦2,800";

  const subscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendars/subscribe", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setError(data.error ?? "Failed to start payment");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="mb-8 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
      style={
        expired
          ? { background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }
          : daysLeft <= 1
          ? { background: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.25)" }
          : { background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.2)" }
      }
    >
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: expired ? "#F87171" : daysLeft <= 1 ? "#F97316" : "#4ade80" }}
        >
          {expired
            ? "Your free trial has ended"
            : daysLeft === 0
            ? "Your free trial ends today"
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left on your free trial`}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {expired
            ? `Subscribe for ${price}/month to keep using your calendars.`
            : `Subscribe anytime for ${price}/month — your calendars stay locked once the trial runs out.`}
        </p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
      <button
        onClick={subscribe}
        disabled={loading}
        className="flex-shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
      >
        {loading ? "Starting checkout..." : "Subscribe now"}
      </button>
    </div>
  );
}