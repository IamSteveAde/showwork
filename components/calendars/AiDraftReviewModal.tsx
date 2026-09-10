"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DraftPost {
  id: string;
  postDate: string;
  platform: string;
  postType: string | null;
  category: string | null;
  caption: string | null;
  contentIdea: string | null;
  cta: string | null;
  hashtags: string | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "#E1306C",
  TIKTOK: "#00F2EA",
  YOUTUBE: "#FF0000",
  FACEBOOK: "#1877F2",
  X: "#FFFFFF",
  LINKEDIN: "#0A66C2",
};

export default function AiDraftReviewModal({
  calendarId,
  onClose,
}: {
  calendarId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDrafts = async () => {
    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load drafts");
      setDrafts(data.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  useEffect(() => {
    loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDraft = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error("Failed to confirm draft");
      setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const discardDraft = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to discard draft");
      setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const confirmAll = async () => {
    if (!drafts) return;
    for (const draft of drafts) {
      await confirmDraft(draft.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4 md:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[90dvh] max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#263449] bg-[#0B111B] shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="flex-shrink-0 border-b border-[#223047] px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white sm:text-lg">Review AI-generated posts</h2>
              <p className="mt-1 text-[11px] text-[#AAB4C3]">
                {drafts ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} awaiting your review` : "Loading..."}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lg text-white/60">
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5">
          {error && (
            <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">{error}</p>
          )}

          {drafts === null && !error && (
            <p className="text-center text-xs text-[#718096]">Loading drafts...</p>
          )}

          {drafts && drafts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#263449] px-5 py-10 text-center">
              <p className="text-xs font-semibold text-white/60">Nothing left to review</p>
              <p className="mt-1 text-[10px] text-[#718096]">Every draft has been confirmed or discarded.</p>
            </div>
          )}

          {drafts && drafts.length > 0 && (
            <div className="flex flex-col gap-3">
              {drafts.map((draft) => {
                const color = PLATFORM_COLORS[draft.platform] ?? "#718096";
                const busy = busyId === draft.id;
                return (
                  <div key={draft.id} className="rounded-2xl border border-[#223047] bg-[#0E1622] p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ background: `${color}22`, color }}>
                        {draft.platform}
                      </span>
                      {draft.postType && (
                        <span className="text-[10px] text-[#718096]">{draft.postType}</span>
                      )}
                      <span className="ml-auto text-[10px] text-[#718096]">
                        {new Date(draft.postDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    {draft.caption && (
                      <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-white/80">{draft.caption}</p>
                    )}
                    {draft.contentIdea && (
                      <p className="mt-2 text-[11px] italic leading-relaxed text-[#AAB4C3]">{draft.contentIdea}</p>
                    )}
                    {draft.hashtags && (
                      <p className="mt-2 text-[11px] text-[#2478FF]">{draft.hashtags}</p>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => confirmDraft(draft.id)}
                        disabled={busy}
                        className="flex-1 rounded-lg bg-[#2478FF] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        {busy ? "Working..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => discardDraft(draft.id)}
                        disabled={busy}
                        className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-[11px] font-semibold text-red-300 disabled:opacity-50"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {drafts && drafts.length > 0 && (
          <div className="flex-shrink-0 border-t border-[#223047] bg-[#0E1622] p-4 sm:p-5">
            <button
              onClick={confirmAll}
              className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.1]"
            >
              Confirm all {drafts.length} drafts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}