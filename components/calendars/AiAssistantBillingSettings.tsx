"use client";

import { useState } from "react";

type BillingStatus = "PENDING_SETUP" | "TRIAL" | "ACTIVE" | "OFFLINE";

export default function AiAssistantBillingSettings({
  billingStatus,
  subscriptionRenewsAt,
}: {
  billingStatus: BillingStatus;
  subscriptionRenewsAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isActive = billingStatus === "ACTIVE";

  const subscribe = async () => {
    setLoading("subscribe");
    setError(null);
    try {
      const res = await fetch("/api/ai-assistant/subscribe", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setError(data.error ?? "Failed to start payment — try again");
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
      const res = await fetch("/api/ai-assistant/cancel-subscription", { method: "POST" });
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
              <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-white">AI content assistant billing</p>
            <p className="text-xs text-white/40">{isActive ? "Active" : "Not active"} · ₦15,000/month</p>
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
          <p className="text-sm font-semibold text-white">AI content assistant billing</p>
          <p className="mt-1 text-xs text-white/40">₦15,000/month · account-wide, covers every calendar</p>
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

      {!isActive ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2478FF]/20 bg-[#2478FF]/[0.05] p-4">
          <div>
            <p className="text-sm font-medium text-white">Activate the AI content assistant</p>
            <p className="mt-0.5 text-xs text-white/40">
              Unlocks business document upload, weekly AI research, and on-demand content generation across every calendar on your account.
            </p>
          </div>
          <button
            onClick={subscribe}
            disabled={loading === "subscribe"}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
          >
            {loading === "subscribe" ? "Starting checkout..." : "Subscribe"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] p-4">
          {confirmingCancel ? (
            <div>
              <p className="text-sm font-medium text-white">Cancel your AI assistant subscription?</p>
              <p className="mt-1 text-xs text-white/50">
                Every calendar on your account loses access to document upload, weekly research, and content generation immediately.
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
                <p className="mt-0.5 text-xs text-white/40">Stop billing and disable the AI assistant everywhere on your account.</p>
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
  );
}