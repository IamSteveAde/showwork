"use client";

import { useMemo, useState } from "react";

type AccountType = "INDIVIDUAL" | "COMPANY";
type BillingStatus = "PENDING_SETUP" | "TRIAL" | "ACTIVE" | "OFFLINE";
type PendingSwitch = "upgrade" | "downgrade" | null;

function SettingsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function UsersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShieldIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 5 3.2 8.7 7 10 3.8-1.3 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

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
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch>(null);

  const price = accountType === "COMPANY" ? "₦15,000" : "₦2,800";
  const planName = accountType === "COMPANY" ? "Company" : "Individual";
  const isActive = billingStatus === "ACTIVE";
  const isStillInTrial =
    billingStatus === "TRIAL" &&
    !!trialEndsAt &&
    new Date(trialEndsAt).getTime() > Date.now();

  const statusMeta = useMemo(() => {
    if (billingStatus === "ACTIVE") {
      return {
        label: "Active",
        text: "#16A34A",
        bg: "#ECFDF3",
        border: "#D1FADF",
        dot: "#22C55E",
      };
    }

    if (billingStatus === "TRIAL") {
      return {
        label: "Free trial",
        text: "#175CD3",
        bg: "#EFF8FF",
        border: "#D1E9FF",
        dot: "#2478FF",
      };
    }

    if (billingStatus === "OFFLINE") {
      return {
        label: "Inactive",
        text: "#B42318",
        bg: "#FEF3F2",
        border: "#FECDCA",
        dot: "#F04438",
      };
    }

    return {
      label: "Setup required",
      text: "#B54708",
      bg: "#FFFAEB",
      border: "#FEDF89",
      dot: "#F79009",
    };
  }, [billingStatus]);

  const formattedBillingDate = useMemo(() => {
    if (!subscriptionRenewsAt) return null;

    return new Date(subscriptionRenewsAt).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [subscriptionRenewsAt]);

  const runSwitch = async (
    kind: "upgrade" | "downgrade",
    payNow: boolean
  ) => {
    setLoading(kind);
    setError(null);
    setPendingSwitch(null);

    const endpoint =
      kind === "upgrade"
        ? "/api/calendars/upgrade-to-company"
        : "/api/calendars/downgrade-to-individual";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payNow }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        } else {
          window.location.reload();
        }
        return;
      }

      setError(data.error ?? "Failed to switch plans. Please try again.");
      setLoading(null);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const startSwitch = (kind: "upgrade" | "downgrade") => {
    if (isStillInTrial) {
      setPendingSwitch(kind);
      return;
    }

    void runSwitch(kind, false);
  };

  const cancel = async () => {
    setLoading("cancel");
    setError(null);

    try {
      const res = await fetch("/api/calendars/cancel-subscription", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        window.location.reload();
        return;
      }

      setError(data.error ?? "Failed to cancel. Please try again.");
      setLoading(null);
      setConfirmingCancel(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
      setConfirmingCancel(false);
    }
  };

  const pendingPrice =
    pendingSwitch === "upgrade" ? "₦15,000" : "₦2,800";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mb-8 flex w-full items-center justify-between gap-4 rounded-[22px] border border-[#E7E9EE] bg-white px-4 py-4 text-left shadow-[0_8px_30px_rgba(16,24,40,0.045)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D9DEE7] hover:shadow-[0_16px_40px_rgba(16,24,40,0.075)] sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2478FF]">
            <SettingsIcon className="h-[18px] w-[18px]" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-[-0.01em] text-[#101828]">
                Billing & plan
              </p>

              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{
                  color: statusMeta.text,
                  background: statusMeta.bg,
                  borderColor: statusMeta.border,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: statusMeta.dot }}
                />
                {statusMeta.label}
              </span>
            </div>

            <p className="mt-1 truncate text-xs text-[#667085]">
              {planName} · {price}/month
            </p>
          </div>
        </div>

        <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#475467]">
          Manage
          <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    );
  }

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-[28px] border border-[#E7E9EE] bg-white shadow-[0_20px_60px_rgba(16,24,40,0.08)]">
        <div className="relative overflow-hidden border-b border-[#EAECF0] bg-[#0B0D12] px-5 py-6 sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#2478FF] opacity-20 blur-[80px]" />
          <div className="pointer-events-none absolute right-24 top-4 h-24 w-24 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute right-16 top-10 h-40 w-40 rounded-full border border-white/[0.04]" />

          <div className="relative flex items-start justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78AEFF]">
                  Billing & plan
                </span>

                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    color:
                      billingStatus === "ACTIVE"
                        ? "#86EFAC"
                        : billingStatus === "TRIAL"
                          ? "#93C5FD"
                          : billingStatus === "OFFLINE"
                            ? "#FDA29B"
                            : "#FEC84B",
                    background: "rgba(255,255,255,0.045)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: statusMeta.dot }}
                  />
                  {statusMeta.label}
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
                {planName} plan
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/45">
                Manage your workspace plan, billing cycle and account access in
                one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmingCancel(false);
                setPendingSwitch(null);
                setError(null);
              }}
              aria-label="Close billing settings"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                Current plan
              </p>
              <p className="mt-2 text-base font-semibold text-[#101828]">
                {planName}
              </p>
              <p className="mt-1 text-xs text-[#667085]">{price}/month</p>
            </div>

            <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: statusMeta.dot }}
                />
                <p className="text-base font-semibold text-[#101828]">
                  {statusMeta.label}
                </p>
              </div>
              <p className="mt-1 text-xs text-[#667085]">
                {billingStatus === "TRIAL"
                  ? "Trial access is currently enabled."
                  : billingStatus === "ACTIVE"
                    ? "Your subscription is active."
                    : billingStatus === "OFFLINE"
                      ? "Your workspaces are currently locked."
                      : "Complete billing setup to continue."}
              </p>
            </div>

            <div className="rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                Next billing
              </p>
              <p className="mt-2 text-base font-semibold text-[#101828]">
                {isActive && formattedBillingDate
                  ? formattedBillingDate
                  : billingStatus === "TRIAL"
                    ? "After your trial"
                    : "—"}
              </p>
              <p className="mt-1 text-xs text-[#667085]">
                {isActive
                  ? "Your next scheduled renewal."
                  : "No active renewal date yet."}
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3.5 text-xs leading-5 text-[#B42318]"
            >
              {error}
            </div>
          )}

          <div className="mt-7">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                Plan management
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#101828]">
                Choose what fits how you work.
              </h3>
            </div>

            {accountType === "INDIVIDUAL" && (
              <div className="relative overflow-hidden rounded-[24px] border border-[#D1E9FF] bg-[#F5FAFF] p-5 sm:p-6">
                <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#2478FF] opacity-[0.08] blur-[55px]" />

                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5F0FF] text-[#2478FF]">
                        <UsersIcon className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#175CD3]">
                        Recommended for teams
                      </span>
                    </div>

                    <h4 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-[#101828]">
                      Upgrade to Company
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-[#475467]">
                      Invite up to 10 designers or content creators and manage
                      how each person can contribute to client workspaces.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                      {[
                        "Up to 10 collaborators",
                        "Role-based permissions",
                        "Unlimited client workspaces",
                      ].map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#344054]"
                        >
                          <CheckIcon className="h-3.5 w-3.5 text-[#12B76A]" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 lg:text-right">
                    <p className="text-2xl font-semibold tracking-tight text-[#101828]">
                      ₦15,000
                      <span className="ml-1 text-xs font-normal text-[#667085]">
                        /month
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={() => startSwitch("upgrade")}
                      disabled={loading === "upgrade"}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-5 py-3 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(36,120,255,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#1768E8] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                    >
                      {loading === "upgrade" ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Switching...
                        </>
                      ) : (
                        <>
                          Upgrade plan
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {accountType === "COMPANY" && (
              <div className="rounded-[24px] border border-[#EAECF0] bg-[#F9FAFB] p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#475467] shadow-sm ring-1 ring-[#EAECF0]">
                        <ShieldIcon className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#667085]">
                        Plan options
                      </span>
                    </div>

                    <h4 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-[#101828]">
                      Switch to Individual
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-[#475467]">
                      Move back to a solo account for ₦2,800/month. Every
                      collaborator and pending invitation must be removed first.
                    </p>
                  </div>

                  <div className="shrink-0 lg:text-right">
                    <p className="text-2xl font-semibold tracking-tight text-[#101828]">
                      ₦2,800
                      <span className="ml-1 text-xs font-normal text-[#667085]">
                        /month
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={() => startSwitch("downgrade")}
                      disabled={loading === "downgrade"}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-5 py-3 text-xs font-semibold text-[#344054] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                    >
                      {loading === "downgrade" ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#98A2B3]/30 border-t-[#475467]" />
                          Switching...
                        </>
                      ) : (
                        "Switch plan"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isActive && (
            <div className="mt-7 border-t border-[#EAECF0] pt-7">
              <div className="rounded-[22px] border border-[#FECDCA] bg-[#FFFBFA] p-5">
                {confirmingCancel ? (
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">
                      Cancel your subscription?
                    </p>
                    <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#667085]">
                      Your client workspaces will lock immediately. You and your
                      clients will not be able to access them until you subscribe
                      again.
                    </p>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() => void cancel()}
                        disabled={loading === "cancel"}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#D92D20] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#B42318] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading === "cancel" ? "Cancelling..." : "Yes, cancel subscription"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(false)}
                        disabled={loading === "cancel"}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold text-[#475467] transition-colors hover:bg-white disabled:opacity-60"
                      >
                        Keep my plan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">
                        Cancel subscription
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#667085]">
                        Stop billing and lock all client workspaces on this account.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(true)}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#FECDCA] bg-white px-4 py-2.5 text-xs font-semibold text-[#B42318] transition-colors hover:bg-[#FEF3F2]"
                    >
                      Cancel subscription
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {pendingSwitch && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0D12]/70 p-4 backdrop-blur-sm"
          onClick={() => loading === null && setPendingSwitch(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-switch-title"
            className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#11151C] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-[#2478FF] opacity-20 blur-[75px]" />

            <div className="relative">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2478FF]/20 bg-[#2478FF]/10 text-[#78AEFF]">
                  <ShieldIcon className="h-5 w-5" />
                </div>

                <button
                  type="button"
                  onClick={() => setPendingSwitch(null)}
                  disabled={loading !== null}
                  aria-label="Close plan switch dialog"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#78AEFF]">
                You still have free trial time
              </p>

              <h3
                id="trial-switch-title"
                className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white"
              >
                When should your new plan start?
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/50">
                You can activate billing now for {pendingPrice}/month, or switch
                the plan while keeping the rest of your current free trial.
              </p>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => void runSwitch(pendingSwitch, true)}
                  disabled={loading !== null}
                  className="group inline-flex min-h-12 items-center justify-between rounded-xl bg-[#2478FF] px-4 py-3 text-left text-sm font-semibold text-white transition-all hover:bg-[#1768E8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? "Starting checkout..."
                      : `Pay ${pendingPrice}/month now`}
                  </span>
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => void runSwitch(pendingSwitch, false)}
                  disabled={loading !== null}
                  className="min-h-12 rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Switch plan and keep my trial
                </button>
              </div>

              <p className="mt-4 text-center text-[10px] leading-4 text-white/25">
                Your existing client workspaces and content stay on your account.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
