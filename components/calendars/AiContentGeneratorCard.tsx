"use client";

import { useState } from "react";
import AiDraftReviewModal from "@/components/calendars/AiDraftReviewModal";

const PLATFORMS = [
  { value: "INSTAGRAM", label: "Instagram", short: "IG" },
  { value: "TIKTOK", label: "TikTok", short: "TT" },
  { value: "YOUTUBE", label: "YouTube", short: "YT" },
  { value: "FACEBOOK", label: "Facebook", short: "FB" },
  { value: "X", label: "X", short: "X" },
  { value: "LINKEDIN", label: "LinkedIn", short: "LI" },
] as const;

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4.5" width="18" height="17" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2.75 13.9 9.1 20.25 11l-6.35 1.9L12 19.25l-1.9-6.35L3.75 11l6.35-1.9L12 2.75Z" strokeLinejoin="round" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AiContentGeneratorCard({
  calendarId,
  hasBusinessSummary,
}: {
  calendarId: string;
  hasBusinessSummary: boolean;
}) {
  const today = new Date();
  const defaultStart = today.toISOString().slice(0, 10);
  const defaultEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  )
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [customInstructions, setCustomInstructions] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["INSTAGRAM"]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const togglePlatform = (platform: string) => {
    setPlatforms((previous) =>
      previous.includes(platform)
        ? previous.filter((value) => value !== platform)
        : [...previous, platform]
    );
  };

  const generate = async () => {
    if (platforms.length === 0) {
      setError("Choose at least one platform.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Choose a start and end date.");
      return;
    }

    if (endDate < startDate) {
      setError("The end date must be after the start date.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          postsPerWeek,
          platforms,
          customInstructions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate content");
      }

      setReviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <section className="relative w-full min-w-0 overflow-hidden rounded-[30px] border border-[#DCE3EC] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#2478FF]/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[#7C3AED]/[0.035] blur-3xl" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2478FF]/15 bg-[#EEF5FF] text-[#2478FF] shadow-[0_8px_24px_rgba(36,120,255,0.08)]">
                <SparkIcon />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2478FF]" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#101828] sm:text-xl">
                    Generate content
                  </h2>
                  <span className="rounded-full border border-[#D9E2EF] bg-[#F8FAFC] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#667085]">
                    AI studio
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[#667085]">
                  Turn your client knowledge into a ready-to-review batch.
                </p>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 sm:flex">
              <CalendarIcon />
              <span className="text-[10px] font-semibold text-[#667085]">
                Drafts only
              </span>
            </div>
          </div>

          {!hasBusinessSummary ? (
            <div className="relative mt-6 overflow-hidden rounded-[22px] border border-[#E4E7EC] bg-[#F8FAFC] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#98A2B3] shadow-sm ring-1 ring-[#E4E7EC]">
                  <SparkIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#101828]">
                    Build the business context first
                  </p>
                  <p className="mt-1.5 max-w-xl text-[11px] leading-5 text-[#667085]">
                    Upload a business document above so the AI understands this
                    client before generating content. This keeps the drafts
                    grounded in the actual business rather than generic ideas.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[10px] font-semibold text-[#98A2B3]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />
                Business knowledge required
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-[22px] border border-[#DCE8F8] bg-[#F5F9FF] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#2478FF] shadow-sm ring-1 ring-[#DCE8F8]">
                    <SparkIcon />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#101828]">
                      Generate a batch, then review it
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#667085]">
                      Showwork uses the client&apos;s business knowledge,
                      your date range, platforms and instructions to create
                      draft posts. Nothing is sent to the client automatically.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FFF7F7] px-4 py-3.5 text-[11px] leading-5 text-[#B42318]"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F04438]" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.15em] text-[#667085]">
                    Start date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 text-xs font-medium text-[#344054] outline-none transition-all hover:border-[#B9C7D8] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.15em] text-[#667085]">
                    End date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 text-xs font-medium text-[#344054] outline-none transition-all hover:border-[#B9C7D8] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-[22px] border border-[#E4E7EC] bg-[#F8FAFC] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#101828]">
                      Publishing rhythm
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-[#667085]">
                      Choose how many draft posts the AI should aim for each week.
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center rounded-xl border border-[#D9E2EC] bg-white p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPostsPerWeek((value) => Math.max(1, value - 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#101828]"
                      aria-label="Decrease posts per week"
                    >
                      −
                    </button>

                    <div className="min-w-[58px] px-2 text-center">
                      <p className="text-sm font-bold tracking-tight text-[#101828]">
                        {postsPerWeek}
                      </p>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                        per week
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPostsPerWeek((value) => Math.min(14, value + 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#101828]"
                      aria-label="Increase posts per week"
                    >
                      +
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  min={1}
                  max={14}
                  value={postsPerWeek}
                  onChange={(event) =>
                    setPostsPerWeek(
                      Math.min(14, Math.max(1, Number(event.target.value) || 1))
                    )
                  }
                  className="sr-only"
                  aria-label="Posts per week"
                />
              </div>

              <div className="mt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[#101828]">
                      Publishing platforms
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-[#667085]">
                      Choose where this batch should be tailored.
                    </p>
                  </div>

                  <span className="shrink-0 text-[10px] font-semibold text-[#98A2B3]">
                    {platforms.length} selected
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PLATFORMS.map((platform) => {
                    const selected = platforms.includes(platform.value);

                    return (
                      <button
                        key={platform.value}
                        type="button"
                        onClick={() => togglePlatform(platform.value)}
                        aria-pressed={selected}
                        className={`group flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                          selected
                            ? "border-[#B9D2FA] bg-[#F3F8FF] shadow-[0_5px_16px_rgba(36,120,255,0.07)]"
                            : "border-[#E4E7EC] bg-white hover:border-[#CBD5E1] hover:bg-[#FAFBFC]"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[8px] font-bold ${
                            selected
                              ? "bg-[#2478FF] text-white"
                              : "bg-[#F2F4F7] text-[#667085]"
                          }`}
                        >
                          {platform.short}
                        </span>

                        <span
                          className={`min-w-0 flex-1 truncate text-[10px] font-semibold ${
                            selected ? "text-[#175CD3]" : "text-[#475467]"
                          }`}
                        >
                          {platform.label}
                        </span>

                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#2478FF] bg-[#2478FF] text-white"
                              : "border-[#D0D5DD] bg-white"
                          }`}
                        >
                          {selected && (
                            <svg
                              viewBox="0 0 16 16"
                              className="h-2.5 w-2.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="m3.5 8 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-5 block">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-[#101828]">
                      Creative direction
                    </span>
                    <span className="mt-1 block text-[10px] leading-5 text-[#667085]">
                      Optional guidance for this batch.
                    </span>
                  </div>
                  <span className="hidden text-[9px] text-[#98A2B3] sm:block">
                    Optional
                  </span>
                </div>

                <textarea
                  value={customInstructions}
                  onChange={(event) => setCustomInstructions(event.target.value)}
                  rows={4}
                  maxLength={1200}
                  placeholder="e.g. Focus on our new product launch, keep the tone playful, avoid discussing pricing…"
                  className="mt-3 w-full resize-none rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3.5 text-[11px] leading-6 text-[#344054] outline-none transition-all placeholder:text-[#98A2B3] hover:border-[#B9C7D8] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
                />
                <div className="mt-1.5 text-right text-[9px] text-[#98A2B3]">
                  {customInstructions.length}/1200
                </div>
              </label>
            </>
          )}
        </div>

        {hasBusinessSummary && (
          <div className="relative border-t border-[#EEF0F3] bg-[#F8FAFC] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-7 sm:py-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828]">
                Ready to create your batch?
              </p>
              <p className="mt-1 text-[10px] leading-5 text-[#667085]">
                Your drafts will open in review before anything is published.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating || platforms.length === 0}
              className="group mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-5 py-3 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(36,120,255,0.20)] transition-all hover:-translate-y-0.5 hover:bg-[#1768E8] hover:shadow-[0_16px_34px_rgba(36,120,255,0.24)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 sm:mt-0 sm:w-auto"
            >
              {generating ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating…
                </>
              ) : (
                <>
                  Create content
                  <span className="transition-transform group-hover:translate-x-0.5">
                    <ArrowIcon />
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {reviewOpen && (
        <AiDraftReviewModal
          calendarId={calendarId}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </>
  );
}
