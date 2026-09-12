"use client";

import { useEffect, useMemo, useState } from "react";
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

interface Generation extends DraftPost {
  generationNumber: number;
  createdAt: string;
}

type EditableKey = "caption" | "contentIdea" | "cta" | "hashtags";

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X", "LINKEDIN"];

const PLATFORM_META: Record<string, { label: string; mark: string }> = {
  INSTAGRAM: { label: "Instagram", mark: "IG" },
  TIKTOK: { label: "TikTok", mark: "TK" },
  YOUTUBE: { label: "YouTube", mark: "YT" },
  FACEBOOK: { label: "Facebook", mark: "FB" },
  X: { label: "X", mark: "X" },
  LINKEDIN: { label: "LinkedIn", mark: "IN" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function snapshot(draft: DraftPost): DraftPost {
  return { ...draft };
}

export default function AiDraftReviewModal({
  calendarId,
  onClose,
}: {
  calendarId: string;
  onClose: () => void;
}) {
  const router = useRouter();

  const [drafts, setDrafts] = useState<DraftPost[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [generationIndex, setGenerationIndex] = useState(-1);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => drafts?.find((draft) => draft.id === selectedId) ?? null,
    [drafts, selectedId]
  );

  const selectedGeneration = generationIndex >= 0 ? generations[generationIndex] : null;

  async function readJson(res: Response) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  async function loadDrafts() {
    try {
      setError(null);
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts`, {
        cache: "no-store",
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load drafts");

      setDrafts(data.drafts ?? []);
      if (data.drafts?.length) setSelectedId((current: string | null) => current ?? data.drafts[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    }
  }

  async function loadGenerations(postId: string) {
    try {
      setError(null);
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${postId}`, {
        cache: "no-store",
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load generation history");

      const history = (data.generations ?? []) as Generation[];
      setGenerations(history);
      setGenerationIndex(history.length ? history.length - 1 : -1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load generation history");
    }
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  useEffect(() => {
    if (selectedId) loadGenerations(selectedId);
  }, [selectedId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function updateField(field: EditableKey, value: string) {
    if (!selected) return;
    setDrafts((current) =>
      current?.map((draft) => (draft.id === selected.id ? { ...draft, [field]: value } : draft)) ?? null
    );
  }

  async function saveEdits() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: selected.caption,
          contentIdea: selected.contentIdea,
          cta: selected.cta,
          hashtags: selected.hashtags,
          postDate: selected.postDate,
        }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to save edits");
      setError(null);
      await loadGenerations(selected.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edits");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to regenerate");

      const generation = data.generation as Generation;

      setDrafts((current) =>
        current?.map((draft) =>
          draft.id === selected.id
            ? {
                ...draft,
                postDate: generation.postDate,
                platform: generation.platform,
                postType: generation.postType,
                category: generation.category,
                caption: generation.caption,
                contentIdea: generation.contentIdea,
                cta: generation.cta,
                hashtags: generation.hashtags,
              }
            : draft
        ) ?? null
      );

      setInstruction("");
      await loadGenerations(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setBusy(false);
    }
  }

  async function restoreGeneration(generation: Generation) {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: generation.id }),
      });

      // The route above is intentionally the regeneration endpoint in this
      // example; restore uses the dedicated /restore endpoint below.
      if (!res.ok) throw new Error("Failed to restore generation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore generation");
    } finally {
      setSaving(false);
    }
  }

  async function restore(generation: Generation) {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/ai-drafts/${selected.id}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId: generation.id }),
        }
      );
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to restore generation");

      setDrafts((current) =>
        current?.map((draft) =>
          draft.id === selected.id ? { ...draft, ...data.post, postDate: data.post.postDate } : draft
        ) ?? null
      );
      await loadGenerations(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore generation");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDraft(id: string) {
    setSaving(true);
    try {
      const draft = drafts?.find((item) => item.id === id);
      if (!draft) return;

      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: draft.caption,
          contentIdea: draft.contentIdea,
          cta: draft.cta,
          hashtags: draft.hashtags,
          postDate: draft.postDate,
        }),
      });

      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to confirm draft");

      setDrafts((current) => current?.filter((item) => item.id !== id) ?? null);
      setSelectedId((current) => {
        if (current !== id) return current;
        const remaining = drafts?.filter((item) => item.id !== id) ?? [];
        return remaining[0]?.id ?? null;
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm draft");
    } finally {
      setSaving(false);
    }
  }

  async function discardDraft(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${id}`, {
        method: "DELETE",
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to discard draft");

      setDrafts((current) => current?.filter((item) => item.id !== id) ?? null);
      setSelectedId((current) => {
        if (current !== id) return current;
        const remaining = drafts?.filter((item) => item.id !== id) ?? [];
        return remaining[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard draft");
    } finally {
      setSaving(false);
    }
  }

  async function confirmAll() {
    if (!drafts?.length || saving) return;

    setSaving(true);
    try {
      for (const draft of drafts) {
        const res = await fetch(`/api/calendars/${calendarId}/ai-drafts/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: draft.caption,
            contentIdea: draft.contentIdea,
            cta: draft.cta,
            hashtags: draft.hashtags,
            postDate: draft.postDate,
          }),
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error ?? `Failed to confirm ${draft.id}`);
      }

      setDrafts([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm all drafts");
    } finally {
      setSaving(false);
    }
  }

  if (drafts === null) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07101C]/90 p-4">
        <div className="rounded-2xl border border-white/10 bg-[#0D1724] px-8 py-7 text-center text-white">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#4C9BFF]" />
          <p className="text-sm font-semibold">Opening your AI studio…</p>
        </div>
      </div>
    );
  }

  const remaining = drafts.length;
  const progress = remaining ? Math.round(((remaining - 1) / Math.max(1, remaining)) * 100) : 100;
  const meta = selected ? PLATFORM_META[selected.platform] ?? { label: selected.platform, mark: "•" } : null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#07101C]/80 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1440px] flex-col overflow-hidden bg-[#F5F7FB] shadow-2xl lg:my-6 lg:h-[calc(100dvh-48px)] lg:rounded-[28px]">
        <header className="flex shrink-0 items-center justify-between border-b border-[#E4E9F1] bg-white px-5 py-4 lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2478FF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
              Showwork AI Studio
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
              Review your content
            </h1>
            <p className="mt-1 text-xs text-[#667085]">
              Refine every post until it feels ready to publish.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4E9F1] bg-white text-xl text-[#667085] hover:bg-[#F5F7FB]"
            aria-label="Close AI Studio"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[310px] shrink-0 border-r border-[#E4E9F1] bg-white lg:flex lg:flex-col">
            <div className="border-b border-[#EEF2F6] px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#101828]">Draft queue</span>
                <span className="rounded-full bg-[#EEF5FF] px-2 py-1 text-[10px] font-bold text-[#2478FF]">
                  {remaining}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEF2F6]">
                <div
                  className="h-full rounded-full bg-[#2478FF] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {drafts.map((draft, index) => {
                const active = draft.id === selectedId;
                const draftMeta = PLATFORM_META[draft.platform] ?? { label: draft.platform, mark: "•" };

                return (
                  <button
                    key={draft.id}
                    onClick={() => setSelectedId(draft.id)}
                    className={`mb-2 w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#2478FF]/30 bg-[#F1F6FF]"
                        : "border-transparent bg-white hover:border-[#E4E9F1] hover:bg-[#FAFBFD]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#101828] text-[9px] font-bold text-white">
                        {draftMeta.mark}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#667085]">
                          {draftMeta.label}
                        </p>
                        <p className="text-xs font-semibold text-[#101828]">
                          {formatDate(draft.postDate)}
                        </p>
                      </div>
                      <span className="ml-auto text-[10px] text-[#98A2B3]">#{index + 1}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-[#667085]">
                      {draft.caption || "No caption yet"}
                    </p>
                  </button>
                );
              })}
            </div>

            {remaining > 0 && (
              <div className="border-t border-[#EEF2F6] p-4">
                <button
                  onClick={confirmAll}
                  disabled={saving}
                  className="w-full rounded-xl bg-[#101828] px-4 py-3 text-xs font-bold text-white hover:bg-[#1D2939] disabled:opacity-50"
                >
                  {saving ? "Saving…" : `Confirm all ${remaining} drafts`}
                </button>
              </div>
            )}
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto">
            {error && (
              <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 lg:mx-8">
                {error}
              </div>
            )}

            {selected ? (
              <div className="mx-auto max-w-[920px] p-5 lg:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EEF5FF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#2478FF]">
                    {meta?.label}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#667085] ring-1 ring-[#E4E9F1]">
                    {selected.postType || "Post"}
                  </span>
                  {selected.category && (
                    <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#667085] ring-1 ring-[#E4E9F1]">
                      {selected.category}
                    </span>
                  )}
                  <span className="ml-auto text-xs font-semibold text-[#667085]">
                    {formatDate(selected.postDate)}
                  </span>
                </div>

                <section className="mt-5 rounded-[28px] border border-[#E1E7EF] bg-white shadow-[0_20px_60px_rgba(16,24,40,0.07)]">
                  <div className="border-b border-[#EEF2F6] px-5 py-5 lg:px-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">
                          Draft editor
                        </p>
                        <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[#101828]">
                          Make it yours
                        </h2>
                      </div>
                      <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[#667085]">
                        Generation {generationIndex >= 0 ? generationIndex + 1 : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-5 p-5 lg:p-7">
                    {(
                      [
                        ["caption", "Caption", "Write the final words your audience will see."],
                        ["contentIdea", "Creative direction", "Describe what the visual or video should show."],
                        ["cta", "Call to action", "What should the audience do next?"],
                        ["hashtags", "Hashtags", "Add relevant hashtags, separated by spaces."],
                      ] as [EditableKey, string, string][]
                    ).map(([field, label, hint]) => (
                      <label key={field} className="block">
                        <span className="text-xs font-bold text-[#101828]">{label}</span>
                        <span className="ml-2 text-[10px] text-[#98A2B3]">{hint}</span>
                        <textarea
                          value={selected[field] ?? ""}
                          onChange={(e) => updateField(field, e.target.value)}
                          rows={field === "caption" ? 8 : 4}
                          className="mt-2 w-full resize-y rounded-2xl border border-[#D9E1EA] bg-[#FBFCFE] px-4 py-3 text-sm leading-relaxed text-[#101828] outline-none transition focus:border-[#2478FF] focus:bg-white focus:ring-4 focus:ring-[#2478FF]/10"
                        />
                      </label>
                    ))}

                    <div className="rounded-2xl border border-[#DDE8F8] bg-[#F4F8FF] p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2478FF] text-xs text-white">
                          ✦
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#101828]">Ask AI to take another pass</p>
                          <p className="text-[10px] text-[#667085]">
                            Be specific. You can regenerate as many times as you need.
                          </p>
                        </div>
                      </div>

                      <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        rows={3}
                        placeholder="e.g. Make the opening stronger, sound more premium, and use a softer CTA."
                        className="mt-3 w-full resize-none rounded-xl border border-[#D5E1F2] bg-white px-3.5 py-3 text-xs text-[#101828] outline-none focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
                      />

                      <button
                        onClick={regenerate}
                        disabled={busy}
                        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_24px_rgba(36,120,255,0.22)] hover:bg-[#1768EA] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy ? "Creating a new version…" : "Regenerate this post"}
                      </button>
                    </div>
                  </div>
                </section>

                {generations.length > 0 && (
                  <section className="mt-5 rounded-[24px] border border-[#E1E7EF] bg-white p-5 lg:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                          Version history
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-[#101828]">
                          Every AI generation is saved
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setGenerationIndex((value) => Math.max(0, value - 1))
                          }
                          disabled={generationIndex <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E1E7EF] text-[#667085] disabled:opacity-30"
                        >
                          ←
                        </button>
                        <span className="px-2 text-[10px] font-bold text-[#667085]">
                          {generationIndex + 1} / {generations.length}
                        </span>
                        <button
                          onClick={() =>
                            setGenerationIndex((value) =>
                              Math.min(generations.length - 1, value + 1)
                            )
                          }
                          disabled={generationIndex >= generations.length - 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E1E7EF] text-[#667085] disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                    </div>

                    {selectedGeneration && (
                      <div className="mt-4 rounded-2xl bg-[#F7F9FC] p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#101828]">
                            Generation {selectedGeneration.generationNumber}
                          </span>
                          <button
                            onClick={() => restore(selectedGeneration)}
                            disabled={saving}
                            className="rounded-lg border border-[#D5E1F2] bg-white px-3 py-2 text-[10px] font-bold text-[#2478FF] hover:bg-[#F1F6FF] disabled:opacity-50"
                          >
                            Restore this version
                          </button>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-[#667085]">
                          {selectedGeneration.caption || "No caption"}
                        </p>
                      </div>
                    )}
                  </section>
                )}

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => discardDraft(selected.id)}
                    disabled={saving}
                    className="rounded-xl border border-red-200 bg-white px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Discard this post
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={saveEdits}
                      disabled={saving}
                      className="rounded-xl border border-[#D9E1EA] bg-white px-4 py-3 text-xs font-bold text-[#101828] hover:bg-[#F7F9FC] disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save edits"}
                    </button>
                    <button
                      onClick={() => confirmDraft(selected.id)}
                      disabled={saving}
                      className="rounded-xl bg-[#101828] px-5 py-3 text-xs font-bold text-white hover:bg-[#1D2939] disabled:opacity-50"
                    >
                      Confirm & add to calendar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-full items-center justify-center p-8 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF2FF] text-2xl text-[#2478FF]">
                    ✓
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-[#101828]">All clear</h2>
                  <p className="mt-1 text-xs text-[#667085]">
                    Every AI draft has been reviewed.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-5 rounded-xl bg-[#101828] px-5 py-3 text-xs font-bold text-white"
                  >
                    Return to workspace
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
