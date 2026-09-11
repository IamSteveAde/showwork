"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CalendarPeopleManager from "./CalendarPeopleManager";

const BLUE = "#2478FF";

const PLAN_STATUS_LABEL: Record<
  string,
  { text: string; color: string; bg: string; dot: string }
> = {
  BUILDING: {
    text: "Building",
    color: "#667085",
    bg: "#F2F4F7",
    dot: "#98A2B3",
  },
  AWAITING_APPROVAL: {
    text: "Awaiting approval",
    color: "#B54708",
    bg: "#FFFAEB",
    dot: "#F79009",
  },
  PLAN_APPROVED: {
    text: "Plan approved",
    color: "#027A48",
    bg: "#ECFDF3",
    dot: "#12B76A",
  },
  PLAN_NEEDS_CHANGES: {
    text: "Needs changes",
    color: "#B42318",
    bg: "#FEF3F2",
    dot: "#F04438",
  },
};

function ArrowUpRightIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
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
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function ArrowRightIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
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
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function TrashIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CalendarIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
    </svg>
  );
}

interface CalendarCardProps {
  id: string;
  clientName: string;
  planStatus: string;
  postCount: number;
  createdAt: string;
  globalIndex: number;

  // Number of collaborators currently attached to this workspace.
  // The owner is added separately when displaying the total.
  collaboratorCount: number;
}

export default function CalendarCard({
  id,
  clientName,
  planStatus,
  postCount,
  createdAt,
  globalIndex,
  collaboratorCount,
}: CalendarCardProps) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status =
    PLAN_STATUS_LABEL[planStatus] ?? PLAN_STATUS_LABEL.BUILDING;

  const href = `/dashboard/calendars/${id}`;

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // The workspace owner is not stored in the collaborators relation,
  // so total people = owner + collaborators.
  const totalMembers = 1 + collaboratorCount;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/calendars/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));

        setError(
          data.error ?? "Failed to delete — try again.",
        );

        setDeleting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      <article className="group relative overflow-hidden rounded-[28px] border border-[#E4E7EC] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-[#D0D5DD] hover:shadow-[0_22px_55px_rgba(16,24,40,0.10)]">
        {/* =========================================================
            FULL CARD NAVIGATION
            ========================================================= */}
        <Link
          href={href}
          className="absolute inset-0 z-10 rounded-[28px]"
          aria-label={`Open ${clientName}`}
        />

        {/* =========================================================
            DECORATIVE ATMOSPHERE
            ========================================================= */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#2478FF]/[0.07] blur-3xl transition-all duration-500 group-hover:bg-[#2478FF]/[0.13]" />

        <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-[#2478FF]/[0.035] blur-3xl" />

        <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 opacity-40 [background-image:linear-gradient(to_right,#E4E7EC_1px,transparent_1px),linear-gradient(to_bottom,#E4E7EC_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(circle_at_top_right,black,transparent_72%)]" />

        {/* =========================================================
            DELETE
            ========================================================= */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            setError(null);
            setConfirming(true);
          }}
          aria-label={`Delete ${clientName}'s workspace`}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4E7EC] bg-white/90 text-[#475467] opacity-0 shadow-sm backdrop-blur transition-all duration-200 hover:border-[#FECDCA] hover:bg-[#FEF3F2] hover:text-[#D92D20] focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#2478FF]/20 group-hover:opacity-100"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>

        <div className="relative">
          {/* =======================================================
              HEADER
              ======================================================= */}
          <div className="flex items-start justify-between px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC]">
                <span className="text-[11px] font-bold tabular-nums tracking-[0.04em] text-[#475467]">
                  {String(globalIndex).padStart(2, "0")}
                </span>

                <span
                  className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                  style={{ background: BLUE }}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#475467]">
                  Client workspace
                </p>

                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold"
                    style={{
                      color: status.color,
                      background: status.bg,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: status.dot,
                      }}
                    />

                    {status.text}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-0 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAECF0] bg-[#F6F8FB] text-[#475467] transition-all duration-300 group-hover:border-[#BFDBFE] group-hover:bg-[#EFF6FF] group-hover:text-[#2478FF] sm:flex">
              <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </div>

          {/* =======================================================
              IDENTITY
              ======================================================= */}
          <div className="px-5 pb-6 sm:px-6">
            <h2 className="line-clamp-1 text-[21px] font-semibold tracking-[-0.035em] text-[#101828]">
              {clientName}
            </h2>

            <p className="mt-1.5 line-clamp-1 text-[12px] leading-5 text-[#475467]">
              Plan, present and manage ongoing client content.
            </p>

            {/* =====================================================
                METRICS
                ===================================================== */}
            <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#EAECF0] bg-[#F8FAFC]">
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-2 text-[#475467]">
                  <CalendarIcon className="h-3.5 w-3.5" />

                  <p className="text-[9px] font-bold uppercase tracking-[0.13em]">
                    Content
                  </p>
                </div>

                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#101828]">
                  {postCount}

                  <span className="ml-1.5 text-[10px] font-medium tracking-normal text-[#475467]">
                    {postCount === 1 ? "post" : "posts"}
                  </span>
                </p>
              </div>

              <div className="border-l border-[#EAECF0] px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#475467]">
                  Created
                </p>

                <p className="mt-2 text-sm font-semibold tracking-[-0.01em] text-[#344054]">
                  {formattedDate}
                </p>
              </div>
            </div>

            {/* =====================================================
                PEOPLE
                This sits above the card navigation layer.
                CalendarPeopleManager uses z-30 so clicking it does
                NOT open the workspace.
                ===================================================== */}
            <div className="relative z-30 mt-3">
              <CalendarPeopleManager
  calendarId={id}
  calendarName={clientName}
  totalMembers={totalMembers}
/>
            </div>

            {/* =====================================================
                CTA
                ===================================================== */}
            <div className="relative z-0 mt-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#475467] transition-colors group-hover:text-[#475467]">
                  Continue workspace
                </p>

                <p className="mt-1 text-xs font-medium text-[#475467]">
                  Open content planner
                </p>
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF2FF] text-[#2478FF] transition-all duration-300 group-hover:bg-[#2478FF] group-hover:text-white">
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>

          {/* =======================================================
              BOTTOM PROGRESS ACCENT
              ======================================================= */}
          <div className="h-[3px] w-full bg-[#F2F4F7]">
            <div
              className="h-full w-0 transition-all duration-500 group-hover:w-full"
              style={{
                background: BLUE,
              }}
            />
          </div>
        </div>
      </article>

      {/* ===========================================================
          DELETE CONFIRMATION
          =========================================================== */}
      {confirming && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/55 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => !deleting && setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${id}`}
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#EAECF0] bg-white shadow-[0_30px_90px_rgba(16,24,40,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FEF3F2] text-[#D92D20]">
                  <TrashIcon className="h-5 w-5" />
                </div>

                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  aria-label="Close delete confirmation"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#475467] transition-colors hover:bg-[#F2F4F7] hover:text-[#344054] disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <h3
                id={`delete-title-${id}`}
                className="mt-6 text-xl font-semibold tracking-[-0.03em] text-[#101828]"
              >
                Delete this workspace?
              </h3>

              <p className="mt-2.5 text-sm leading-6 text-[#475467]">
                This permanently deletes{" "}
                <span className="font-semibold text-[#344054]">
                  {clientName}
                </span>
                ’s calendar, planned posts and uploaded media. Your client
                will lose access immediately. This cannot be undone.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-xs leading-5 text-[#B42318]"
                >
                  {error}
                </div>
              )}

              <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#F6F8FB] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-[#D92D20] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#B42318] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Deleting…" : "Delete workspace"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}