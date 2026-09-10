"use client";

import { useState } from "react";
import AiDraftReviewModal from "@/components/calendars/AiDraftReviewModal";

const PLATFORMS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "X", label: "X" },
  { value: "LINKEDIN", label: "LinkedIn" },
] as const;

export default function AiContentGeneratorCard({
  calendarId,
  hasBusinessSummary,
}: {
  calendarId: string;
  hasBusinessSummary: boolean;
}) {
  const today = new Date();
  const defaultStart = today.toISOString().slice(0, 10);
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [platforms, setPlatforms] = useState<string[]>(["INSTAGRAM"]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const generate = async () => {
    if (platforms.length === 0) {
      setError("Pick at least one platform");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, postsPerWeek, platforms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate content");
      setReviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[#263449] bg-[#0B111B] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2478FF]/10 text-[#2478FF]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="17" rx="3" />
                <path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5 text-white">Generate content</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#718096]">Create a batch of drafts</p>
            </div>
          </div>

          {!hasBusinessSummary ? (
            <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
              Upload a business document above first — the AI needs some understanding of this client before it can generate anything.
            </p>
          ) : (
            <>
              <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#AAB4C3]">
                Generates a batch of draft posts using everything the AI has learned. Nothing goes to the client until you review and confirm each one.
              </p>

              {error && (
                <p className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">{error}</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-[#718096]">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-[#223047] bg-[#0E1622] px-2.5 py-2 text-[11px] text-white outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-[#718096]">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-[#223047] bg-[#0E1622] px-2.5 py-2 text-[11px] text-white outline-none"
                  />
                </label>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-[#718096]">Posts per week</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={postsPerWeek}
                  onChange={(e) => setPostsPerWeek(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-[#223047] bg-[#0E1622] px-2.5 py-2 text-[11px] text-white outline-none"
                />
              </label>

              <div className="mt-3">
                <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.1em] text-[#718096]">Platforms</span>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => {
                    const selected = platforms.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => togglePlatform(p.value)}
                        className="rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-all"
                        style={{
                          borderColor: selected ? "#2478FF" : "#223047",
                          background: selected ? "rgba(36,120,255,0.14)" : "#0E1622",
                          color: selected ? "#68B2FF" : "#AAB4C3",
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {hasBusinessSummary && (
          <div className="border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
            <button
              onClick={generate}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
            >
              {generating ? "Generating..." : "Create content for me"}
            </button>
          </div>
        )}
      </div>

      {reviewOpen && (
        <AiDraftReviewModal calendarId={calendarId} onClose={() => setReviewOpen(false)} />
      )}
    </>
  );
}