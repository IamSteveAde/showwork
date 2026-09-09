"use client";

import { useState } from "react";

type AccountType = "INDIVIDUAL" | "COMPANY";
type BillingStatus = "PENDING_SETUP" | "TRIAL" | "ACTIVE" | "OFFLINE";
type PendingSwitch = "upgrade" | "downgrade" | null;

export default function CalendarBillingSettings({
  accountType,
  billingStatus,
  subscriptionRenewsAt,
  trialEndsAt,
}: {
  accountType: AccountType;
  billingStatus: BillingStatus;
  subscriptionRenewsAt: string | null;
  trialEndsAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set instead of switching immediately when the account is still
  // genuinely inside a valid trial — that's the one case where paying
  // right now is a real choice rather than something already forced.
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch>(null);

  const price = accountType === "COMPANY" ? "₦15,000" : "₦2,800";
  const isActive = billingStatus === "ACTIVE";
  const isStillInTrial =
    billingStatus === "TRIAL" && !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();

  const runSwitch = async (kind: "upgrade" | "downgrade", payNow: boolean) => {
    setLoading(kind);
    setError(null);
    setPendingSwitch(null);
    const endpoint = kind === "upgrade" ? "/api/calendars/upgrade-to-company" : "/api/calendars/downgrade-to-individual";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payNow }),
      });
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

  // The button click itself — decides whether to just run the switch
  // outright (already active, trial already expired, never paid) or
  // to first ask, since only a still-valid trial has a real choice
  // behind it.
  const startSwitch = (kind: "upgrade" | "downgrade") => {
    if (isStillInTrial) {
      setPendingSwitch(kind);
    } else {
      runSwitch(kind, false);
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

  const pendingPrice = pendingSwitch === "upgrade" ? "₦15,000" : "₦2,800";

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
    <>
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
                onClick={() => startSwitch("upgrade")}
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
                onClick={() => startSwitch("downgrade")}
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

      {/* Trial-choice prompt — only ever shown when the account is
          still genuinely inside a valid trial, since that's the only
          case where paying right now is a real choice rather than
          something already forced by an expired trial or active
          subscription. */}
      {pendingSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPendingSwitch(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#2478FF]/10 text-[#2478FF]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">You&apos;re still on your free trial</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              You can keep using the rest of your trial for free and switch plans without paying yet. But we&apos;d recommend paying now at {pendingPrice}/month so nothing interrupts your client&apos;s calendar once the trial ends.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => runSwitch(pendingSwitch, true)}
                disabled={loading !== null}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
              >
                {loading ? "Starting checkout..." : `Pay ${pendingPrice}/month now`}
              </button>
              <button
                onClick={() => runSwitch(pendingSwitch, false)}
                disabled={loading !== null}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Not now — just switch, keep my trial
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}