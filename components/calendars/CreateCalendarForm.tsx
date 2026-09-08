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
    description: "For a solo social media manager working alone.",
    bullets: ["Unlimited client calendars", "No collaborators — just you", "Can upgrade to Company anytime"],
  },
  {
    value: "COMPANY",
    label: "Company",
    price: "₦15,000/mo",
    description: "For a team that needs designers or content creators working alongside you.",
    bullets: ["Unlimited client calendars", "Invite up to 10 collaborators", "View, add-content, or edit permissions per person"],
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

  const openForm = () => {
    // Already decided for this account — skip straight past the
    // choice screen, since it's a one-time decision, not something
    // asked again on every new calendar.
    setStep(calendarAccountType ? "form" : "choose-type");
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
          // Either a trial just started, or the account is already
          // active — either way, straight into the calendar.
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

  const activeTypeInfo = ACCOUNT_TYPES.find((t) => t.value === chosenType);

  if (step === "closed") {
    return (
      <button
        onClick={openForm}
        className="group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
        style={{
          borderColor: "rgba(36,120,255,0.22)",
          background: "linear-gradient(135deg, rgba(36,120,255,0.075) 0%, rgba(36,120,255,0.025) 100%)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div className="absolute inset-y-0 left-0 w-1" style={{ background: "linear-gradient(180deg, #2478FF 0%, #0052FF 100%)" }} />
        <div className="flex items-center justify-between gap-4 pl-2">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(36,120,255,0.12)", color: "#2478FF" }}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="17" rx="2.5" />
                <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                <path d="M12 12v6M9 15h6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Create a client calendar</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">Give your client a dedicated space to review, approve and collaborate.</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            {calendarAccountType && (
              <span className="hidden rounded-full px-3 py-1.5 text-[11px] font-semibold sm:block" style={{ background: "rgba(36,120,255,0.1)", color: "#68A4FF" }}>
                {calendarAccountType === "COMPANY" ? "₦15,000 / month" : "₦2,800 / month"}
              </span>
            )}
            <span className="flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5" style={{ background: "#2478FF", color: "#fff" }}>
              →
            </span>
          </div>
        </div>
      </button>
    );
  }

  if (step === "choose-type") {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border p-6 sm:p-7"
        style={{ background: "linear-gradient(145deg, #191919 0%, #121212 100%)", borderColor: "rgba(255,255,255,0.09)" }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white">How will you be using this?</h3>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/40">
              This choice is permanent for your account — pick the one that matches how you actually work.
            </p>
          </div>
          <button type="button" onClick={() => setStep("closed")} aria-label="Close" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/35 hover:bg-white/5 hover:text-white/70">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setChosenType(type.value);
                setStep("form");
              }}
              className="flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all hover:-translate-y-0.5"
              style={{ borderColor: "rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-semibold text-white">{type.label}</span>
                <span className="text-sm font-semibold" style={{ color: "#68A4FF" }}>{type.price}</span>
              </div>
              <p className="text-xs text-white/50">{type.description}</p>
              <ul className="flex flex-col gap-1.5">
                {type.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[11px] text-white/40">
                    <span className="mt-0.5 flex-shrink-0" style={{ color: "#4ade80" }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <p className="mt-5 text-center text-[10px] text-white/20">
          Both include a free 3-day trial the very first time you use it — no payment needed to get started.
        </p>
      </div>
    );
  }

  // step === "form"
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6 sm:p-7"
      style={{ background: "linear-gradient(145deg, #191919 0%, #121212 100%)", borderColor: "rgba(255,255,255,0.09)", boxShadow: "0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)" }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-20 blur-3xl" style={{ background: "#2478FF" }} />

      <div className="relative">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(36,120,255,0.12)", color: "#4D8FFF" }}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="17" rx="2.5" />
                  <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                  <path d="M12 12v6M9 15h6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-[10px] font-bold uppercase" style={{ color: "#4D8FFF", letterSpacing: "0.12em" }}>
                {activeTypeInfo?.label ?? "New"} client workspace
              </span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-white">Create a calendar</h3>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/40">Set up a private content calendar your client can access, review and approve.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep("closed");
              setError(null);
            }}
            aria-label="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            ×
          </button>
        </div>

        <div className="mb-6 flex items-center justify-between rounded-xl border px-4 py-3" style={{ background: "rgba(36,120,255,0.055)", borderColor: "rgba(36,120,255,0.12)" }}>
          <div>
            <p className="text-xs font-medium text-white/50">{activeTypeInfo?.label ?? "Client"} calendar</p>
            <p className="mt-0.5 text-xs text-white/30">Billed monthly to your account, covers every calendar</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{activeTypeInfo?.price ?? "—"}</p>
            <p className="text-[10px] text-white/30">per month</p>
          </div>
        </div>

        {!calendarAccountType && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5" style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.16)" }}>
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(74,222,128,0.14)", color: "#4ade80" }}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[11px] leading-relaxed text-white/60">
              Your account includes a free <span className="font-semibold text-white">3-day trial</span> — no payment needed to get started.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.42)", letterSpacing: "0.1em" }}>
              Client name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Chuchin Ultimate Productions"
              autoComplete="organization"
              className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-[#2478FF]/60 focus:ring-4 focus:ring-[#2478FF]/10"
              style={{ fontSize: "16px", background: "rgba(255,255,255,0.045)", borderColor: "rgba(255,255,255,0.09)" }}
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border px-4 py-3.5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(36,120,255,0.12)", color: "#4D8FFF" }}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[11px] leading-relaxed text-white/45">
              A password for your client will be generated automatically — you&apos;ll see it right after creating this calendar, and can change it to anything you like at any time.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3" style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.14)" }}>
            <span className="mt-0.5 text-xs text-red-400">!</span>
            <p className="text-xs leading-relaxed text-red-300">{error}</p>
          </div>
        )}

        <div className="mt-7 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating workspace...
              </>
            ) : (
              <>
                Create calendar
                <span className="text-white/70">→</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("closed");
              setError(null);
            }}
            disabled={loading}
            className="rounded-xl px-4 py-3 text-xs font-medium text-white/35 transition-colors hover:bg-white/5 hover:text-white/65 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-white/20">
          If your trial has already been used, you&apos;ll be taken to secure payment right after creating it.
        </p>
      </div>
    </div>
  );
}