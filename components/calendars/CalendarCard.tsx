"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PLAN_STATUS_LABEL: Record<
  string,
  { text: string; color: string; bg: string; dot: string }
> = {
  BUILDING: { text: "Building", color: "#A1A1AA", bg: "rgba(161,161,170,0.10)", dot: "#A1A1AA" },
  AWAITING_APPROVAL: { text: "Awaiting approval", color: "#FFCC00", bg: "rgba(255,204,0,0.10)", dot: "#FFCC00" },
  PLAN_APPROVED: { text: "Plan approved", color: "#4ADE80", bg: "rgba(74,222,128,0.10)", dot: "#4ADE80" },
  PLAN_NEEDS_CHANGES: { text: "Needs changes", color: "#F97316", bg: "rgba(249,115,22,0.10)", dot: "#F97316" },
};

function ArrowUpRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}
function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

interface CalendarCardProps {
  id: string;
  clientName: string;
  planStatus: string;
  postCount: number;
  createdAt: string; // ISO string — serialized once on the server, formatted here
  globalIndex: number;
}

export default function CalendarCard({ id, clientName, planStatus, postCount, createdAt, globalIndex }: CalendarCardProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = PLAN_STATUS_LABEL[planStatus] ?? PLAN_STATUS_LABEL.BUILDING;
  const href = `/dashboard/calendars/${id}`;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete — try again");
        setDeleting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111111] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.13] hover:bg-[#141414] hover:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        {/* Full-card navigation target — sits underneath everything
            else. The visible content above it uses pointer-events-none
            so clicks pass through to this link, except the delete
            button, which explicitly re-enables its own pointer events
            so it captures its click instead of triggering navigation. */}
        <Link href={href} className="absolute inset-0 z-0" aria-label={`Open ${clientName}`} />

        {/* Hover glow */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
          style={{ background: "#2478FF" }}
        />

        {/* Delete icon — top-right corner, above everything, captures
            its own click rather than passing through to the link. */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          aria-label={`Delete ${clientName}'s workspace`}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 text-white/30 opacity-0 backdrop-blur-sm transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>

        <div className="pointer-events-none relative">
          {/* Card top */}
          <div className="relative flex items-start justify-between px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">
                <span className="text-xs font-semibold tabular-nums text-white/55">
                  {String(globalIndex).padStart(2, "0")}
                </span>
                <span
                  className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-300 group-hover:w-full"
                  style={{ background: "#2478FF" }}
                />
              </div>

              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold"
                style={{ color: status.color, background: status.bg, borderColor: `${status.color}18` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
                {status.text}
              </span>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/20 transition-all duration-300 group-hover:border-[#2478FF]/25 group-hover:bg-[#2478FF]/10 group-hover:text-[#68B2FF]">
              <ArrowUpRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>

          {/* Main content */}
          <div className="relative px-5 pb-5 sm:px-6 sm:pb-6">
            <h2 className="line-clamp-1 text-[17px] font-semibold tracking-[-0.02em] text-white transition-colors group-hover:text-white">
              {clientName}
            </h2>
            <p className="mt-1.5 line-clamp-1 text-xs text-white/25">Client content workspace</p>

            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="px-3.5 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/20">Content</p>
                <p className="mt-1 text-sm font-semibold text-white/65">
                  {postCount}
                  <span className="ml-1 text-[10px] font-normal text-white/25">{postCount === 1 ? "post" : "posts"}</span>
                </p>
              </div>
              <div className="border-l border-white/[0.06] px-3.5 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/20">Created</p>
                <p className="mt-1 text-xs font-medium text-white/50">
                  {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-medium text-white/20 transition-colors group-hover:text-white/35">Open workspace</span>
              <span className="text-white/15 transition-all group-hover:translate-x-1 group-hover:text-[#68B2FF]">
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation popup — a real modal, not an inline card overlay,
          since deleting a client's whole workspace (posts, uploaded
          media, everything) is irreversible and deserves a proper
          interrupt rather than something easy to click past. */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !deleting && setConfirming(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <TrashIcon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Delete this workspace?</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              This permanently deletes <span className="font-medium text-white/80">{clientName}</span>&apos;s calendar, every planned post, and all uploaded media. Your client will lose access immediately. This can&apos;t be undone.
            </p>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete workspace"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}