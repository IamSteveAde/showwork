"use client";

import { useState } from "react";

type AccountType = "INDIVIDUAL" | "COMPANY";
type Step = "closed" | "choose-type" | "form";

const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  price: string;
  description: string;
  bullets: string[];
}[] = [
  {
    value: "INDIVIDUAL",
    label: "Individual",
    price: "₦2,800/mo",
    description: "For a solo social media manager working independently.",
    bullets: ["Unlimited client calendars", "No collaborators — just you", "Upgrade to Company anytime"],
  },
  {
    value: "COMPANY",
    label: "Company",
    price: "₦15,000/mo",
    description: "For teams with designers, editors or content creators.",
    bullets: ["Unlimited client calendars", "Invite up to 10 collaborators", "Flexible workspace permissions"],
  },
];

export default function CreateCalendarForm({
  calendarAccountType,
}: {
  calendarAccountType: AccountType | null;
}) {
  const [step, setStep] = useState<Step>("closed");
  const [chosenType, setChosenType] = useState<AccountType | null>(calendarAccountType);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExistingPlan = Boolean(calendarAccountType);

  const openForm = () => {
    setStep(hasExistingPlan ? "form" : "choose-type");
  };

  const close = () => {
    if (loading) return;
    setStep("closed");
    setError(null);
  };

  const submit = async () => {
    if (!clientName.trim()) {
      setError("Enter the client's name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          accountType: chosenType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        } else {
          window.location.href = `/dashboard/calendars/${data.calendarId}`;
        }
      } else {
        setError(data.error ?? "Failed to create calendar");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const activeTypeInfo = ACCOUNT_TYPES.find((type) => type.value === chosenType);

  if (step === "closed") {
    return (
      <button
        type="button"
        onClick={openForm}
        className="group relative w-full overflow-hidden rounded-[24px] border border-[#D9E4F3] bg-[linear-gradient(135deg,#F7FAFF_0%,#EEF5FF_100%)] p-5 text-left shadow-[0_10px_35px_rgba(36,120,255,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#BCD1F2] hover:shadow-[0_18px_45px_rgba(36,120,255,0.10)] sm:p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#2478FF]/10 blur-[45px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-1/2 bg-gradient-to-r from-[#2478FF] to-transparent" />

        <div className="relative flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2478FF] shadow-sm ring-1 ring-[#2478FF]/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="4" width="18" height="17" rx="2.5" />
                <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                <path d="M12 12v6M9 15h6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[-0.01em] text-[#0A0D12]">
                Create another client workspace
              </p>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#667085]">
                {hasExistingPlan
                  ? "Your current plan already covers your client workspaces. Just enter the next client."
                  : "Set up your first client workspace and choose the plan that fits how you work."}
              </p>
            </div>
          </div>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2478FF] text-white shadow-[0_8px_22px_rgba(36,120,255,0.22)] transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </button>
    );
  }

  if (step === "choose-type") {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-[#202630] bg-[#0D1117] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#2478FF]/15 blur-[75px]" />

        <div className="relative mb-7 flex items-start justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#79AEFF]">
              One-time setup
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.035em]">Choose how you work.</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-white/45">
              This decides your account plan. Once you choose, you can create unlimited client workspaces without choosing a plan again.
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </div>

        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setChosenType(type.value);
                setStep("form");
              }}
              className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#2478FF]/40 hover:bg-white/[0.055]"
            >
              {type.value === "COMPANY" && (
                <span className="absolute right-4 top-4 rounded-full bg-[#2478FF] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white">
                  For teams
                </span>
              )}
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2478FF]/10 text-[#6FA7FF]">
                <span className="text-sm font-semibold">{type.value === "COMPANY" ? "02" : "01"}</span>
              </div>
              <div className="flex items-end justify-between gap-3">
                <h4 className="text-lg font-semibold">{type.label}</h4>
                <span className="text-sm font-semibold text-[#79AEFF]">{type.price}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/45">{type.description}</p>
              <ul className="mt-5 space-y-2.5">
                {type.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[11px] text-white/55">
                    <span className="mt-0.5 text-[#4ADE80]">✓</span>
                    {bullet}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4 text-[10px] font-semibold text-white/35 group-hover:text-white">
                Select {type.label}
                <span>→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="relative mt-6 text-center text-[10px] text-white/25">
          Your first use includes a free 3-day trial. No payment is needed to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#202630] bg-[#0D1117] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:p-8">
      <div className="pointer-events-none absolute -right-28 -top-28 h-64 w-64 rounded-full bg-[#2478FF]/15 blur-[75px]" />
      <div className="relative">
        <div className="mb-7 flex items-start justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2478FF]/20 bg-[#2478FF]/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#79AEFF]">
              {activeTypeInfo?.label ?? "Client"} account
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.035em]">Create the workspace.</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-white/45">
              Give your client a permanent place for content, reviews, approvals and collaboration.
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
            ×
          </button>
        </div>

        {!hasExistingPlan && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.055] px-4 py-3.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">✓</span>
            <p className="text-xs leading-5 text-white/55">
              Your account includes a free <span className="font-semibold text-white">3-day trial</span>. No payment is needed to get started.
            </p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
              Client name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(event) => {
                setClientName(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Chuchin Ultimate Productions"
              autoComplete="organization"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-white/20 focus:border-[#2478FF]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#2478FF]/10"
            />
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2478FF]/10 text-[#79AEFF]">⌁</span>
            <p className="text-xs leading-5 text-white/45">
              A secure client password will be generated automatically. You can change it whenever you need.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2478FF] to-[#0052FF] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(36,120,255,0.20)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(36,120,255,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating workspace...
              </>
            ) : (
              <>
                Create workspace
                <span className="text-white/70">→</span>
              </>
            )}
          </button>
          <button type="button" onClick={close} disabled={loading} className="rounded-2xl border border-white/10 px-5 py-3.5 text-xs font-semibold text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50">
            Cancel
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] leading-5 text-white/20">
          {hasExistingPlan
            ? "Your existing account plan applies to this workspace."
            : "If your trial has already been used, secure payment will open after creation."}
        </p>
      </div>
    </div>
  );
}
