"use client";

import { useState } from "react";

export default function CreateCalendarForm() {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = data.authorizationUrl;
      } else {
        setError(data.error ?? "Failed to create calendar");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
        style={{
          borderColor: "rgba(36,120,255,0.22)",
          background:
            "linear-gradient(135deg, rgba(36,120,255,0.075) 0%, rgba(36,120,255,0.025) 100%)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{
            background: "linear-gradient(180deg, #2478FF 0%, #0052FF 100%)",
          }}
        />

        <div className="flex items-center justify-between gap-4 pl-2">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "rgba(36,120,255,0.12)",
                color: "#2478FF",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="17" rx="2.5" />
                <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                <path d="M12 12v6M9 15h6" strokeLinecap="round" />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                Create a client calendar
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Give your client a dedicated space to review, approve and
                collaborate.
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-3">
            <span
              className="hidden rounded-full px-3 py-1.5 text-[11px] font-semibold sm:block"
              style={{
                background: "rgba(36,120,255,0.1)",
                color: "#68A4FF",
              }}
            >
              ₦5,000 / month
            </span>

            <span
              className="flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5"
              style={{
                background: "#2478FF",
                color: "#fff",
              }}
            >
              →
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6 sm:p-7"
      style={{
        background:
          "linear-gradient(145deg, #191919 0%, #121212 100%)",
        borderColor: "rgba(255,255,255,0.09)",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-20 blur-3xl"
        style={{ background: "#2478FF" }}
      />

      <div className="relative">
        {/* Header */}
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: "rgba(36,120,255,0.12)",
                  color: "#4D8FFF",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="17" rx="2.5" />
                  <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
                  <path d="M12 12v6M9 15h6" strokeLinecap="round" />
                </svg>
              </span>

              <span
                className="text-[10px] font-bold uppercase"
                style={{
                  color: "#4D8FFF",
                  letterSpacing: "0.12em",
                }}
              >
                New client workspace
              </span>
            </div>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              Create a calendar
            </h3>

            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/40">
              Set up a private content calendar your client can access,
              review and approve.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            aria-label="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            ×
          </button>
        </div>

        {/* Pricing */}
        <div
          className="mb-6 flex items-center justify-between rounded-xl border px-4 py-3"
          style={{
            background: "rgba(36,120,255,0.055)",
            borderColor: "rgba(36,120,255,0.12)",
          }}
        >
          <div>
            <p className="text-xs font-medium text-white/50">
              Client calendar
            </p>
            <p className="mt-0.5 text-xs text-white/30">
              Billed monthly
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-white">₦5,000</p>
            <p className="text-[10px] text-white/30">per month</p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Client name */}
          <div>
            <label
              className="mb-2 block text-[10px] font-bold uppercase"
              style={{
                color: "rgba(255,255,255,0.42)",
                letterSpacing: "0.1em",
              }}
            >
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
              style={{
                fontSize: "16px",
                background: "rgba(255,255,255,0.045)",
                borderColor: "rgba(255,255,255,0.09)",
              }}
            />
          </div>

          {/* Password — auto-generated, so this is informational only */}
          <div
            className="flex items-start gap-3 rounded-xl border px-4 py-3.5"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <span
              className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "rgba(36,120,255,0.12)",
                color: "#4D8FFF",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[11px] leading-relaxed text-white/45">
              A password for your client will be generated automatically —
              you&apos;ll see it right after creating this calendar, and can
              change it to anything you like at any time.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mt-5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3"
            style={{
              background: "rgba(239,68,68,0.07)",
              borderColor: "rgba(239,68,68,0.14)",
            }}
          >
            <span className="mt-0.5 text-xs text-red-400">!</span>
            <p className="text-xs leading-relaxed text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-7 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
            }}
          >
            {loading ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
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
              setOpen(false);
              setError(null);
            }}
            disabled={loading}
            className="rounded-xl px-4 py-3 text-xs font-medium text-white/35 transition-colors hover:bg-white/5 hover:text-white/65 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-white/20">
          You’ll be taken to secure payment after creating the calendar.
        </p>
      </div>
    </div>
  );
}