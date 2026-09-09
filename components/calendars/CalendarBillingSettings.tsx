"use client";

import { useState } from "react";

type AccountType = "INDIVIDUAL" | "COMPANY";
type BillingStatus = "PENDING_SETUP" | "TRIAL" | "ACTIVE" | "OFFLINE";

export default function CalendarBillingSettings({
  accountType,
  billingStatus,
  subscriptionRenewsAt,
}: {
  accountType: AccountType;
  billingStatus: BillingStatus;
  subscriptionRenewsAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = accountType === "COMPANY" ? "₦15,000" : "₦2,800";
  const isActive = billingStatus === "ACTIVE";

  // Same underlying route the "invite a collaborator" upgrade prompt
  // already uses elsewhere in the app — surfaced here too, so
  // upgrading doesn't require first stumbling into it by trying to
  // invite someone.
  const upgrade = async () => {
    setLoading("upgrade");
    setError(null);
    try {
      const res = await fetch("/api/calendars/upgrade-to-company", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        } else {
          window.location.reload();
        }
      } else {
        setError(data.error ?? "Failed to switch — try again");
        setLoading(null);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const downgrade = async () => {
    setLoading("downgrade");
    setError(null);
    try {
      const res = await fetch("/api/calendars/downgrade-to-individual", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        } else {
          window.location.reload();
        }
      } else {
        setError(data.error ?? "Failed to switch — try again");
        setLoading(null);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const cancel = async () => {
    setLoading("cancel");
    setError(null);
    try {
      const res = await fetch("/api/calendars/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        setError(data.error ?? "Failed to cancel — try again");
        setLoading(null);
        setConfirmingCancel(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
      setConfirmingCancel(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-8 flex w-full items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 text-left transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "rgba(36,120,255,0.1)", color: "#2478FF" }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Billing settings</p>
            <p className="text-xs text-white/40">
              {accountType === "COMPANY" ? "Company" : "Individual"} · {price}/month
            </p>
          </div>
        </div>
        <span className="text-xs text-white/30">Manage →</span>
      </button>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Billing settings</p>
          <p className="mt-1 text-xs text-white/40">
            {accountType === "COMPANY" ? "Company" : "Individual"} account — {price}/month
          </p>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs text-white/40 underline">
          Close
        </button>
      </div>

      {isActive && subscriptionRenewsAt && (
        <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Next billing date
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {new Date(subscriptionRenewsAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      )}

      {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

      <div className="flex flex-col gap-3">
        {accountType === "INDIVIDUAL" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2478FF]/20 bg-[#2478FF]/[0.05] p-4">
            <div>
              <p className="text-sm font-medium text-white">Switch to Company</p>
              <p className="mt-0.5 text-xs text-white/40">
                ₦15,000/month — unlocks inviting up to 10 designers or content creators to collaborate.
              </p>
            </div>
            <button
              onClick={upgrade}
              disabled={loading === "upgrade"}
              className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
            >
              {loading === "upgrade" ? "Switching..." : "Upgrade"}
            </button>
          </div>
        )}

        {accountType === "COMPANY" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] p-4">
            <div>
              <p className="text-sm font-medium text-white">Switch to Individual</p>
              <p className="mt-0.5 text-xs text-white/40">
                Drops to ₦2,800/month. You&apos;ll need to remove every collaborator and pending invite first.
              </p>
            </div>
            <button
              onClick={downgrade}
              disabled={loading === "downgrade"}
              className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              {loading === "downgrade" ? "Switching..." : "Switch"}
            </button>
          </div>
        )}

        {isActive && (
          <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] p-4">
            {confirmingCancel ? (
              <div>
                <p className="text-sm font-medium text-white">Cancel your subscription?</p>
                <p className="mt-1 text-xs text-white/50">
                  Every calendar on your account will lock immediately — you and your client won&apos;t be able to access any of them until you subscribe again.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={cancel}
                    disabled={loading === "cancel"}
                    className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {loading === "cancel" ? "Cancelling..." : "Yes, cancel"}
                  </button>
                  <button onClick={() => setConfirmingCancel(false)} className="text-xs text-white/40 underline">
                    Never mind
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Cancel subscription</p>
                  <p className="mt-0.5 text-xs text-white/40">Stop billing and lock every calendar on your account.</p>
                </div>
                <button
                  onClick={() => setConfirmingCancel(true)}
                  className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-red-400"
                  style={{ background: "rgba(239,68,68,0.1)" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}