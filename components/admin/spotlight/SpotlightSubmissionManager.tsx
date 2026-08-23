"use client";

import { useState, useMemo } from "react";

const COLOR = { gold: "#F5C842", black: "#0A0A0A", charcoal: "#1A1A1A" };
const CATEGORIES = ["Video", "Graphics", "Photography", "Branding"];

interface Submission {
  id: string;
  name: string;
  email: string;
  category: string;
  projectLink: string;
  description: string;
  note: string | null;
  isShortlisted: boolean;
  rank: number | null;
  submittedAt: string;
}

export default function SpotlightSubmissionManager({
  initialSubmissions,
  cycleLabel,
}: {
  initialSubmissions: Submission[];
  cycleLabel: string | null;
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [filterCategory, setFilterCategory] = useState<string | "All">("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filterCategory === "All" ? submissions : submissions.filter((s) => s.category === filterCategory)),
    [submissions, filterCategory]
  );

  const toggleShortlist = async (id: string, current: boolean) => {
    setUpdatingId(id);
    const res = await fetch(`/api/admin/spotlight/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isShortlisted: !current }),
    });
    if (res.ok) {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, isShortlisted: !current } : s)));
    }
    setUpdatingId(null);
  };

  const setRank = async (id: string, rank: number | null) => {
    setUpdatingId(id);
    const res = await fetch(`/api/admin/spotlight/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rank }),
    });
    if (res.ok) {
      // The server also clears this rank from whoever held it before
      // — reflected here locally too, so two rows never both show
      // "1st" until the next reload.
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id === id) return { ...s, rank };
          if (rank !== null && s.rank === rank) return { ...s, rank: null };
          return s;
        })
      );
    }
    setUpdatingId(null);
  };

  if (!cycleLabel) {
    return (
      <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
        <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>Submissions</h2>
        <p className="mt-3 text-sm text-white/30">No active cycle right now — activate one above to start receiving submissions.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Submissions — {cycleLabel}
          </h2>
          <p className="mt-1 text-xs text-white/30">
            {submissions.length} total · setting a rank below adds that submission straight to the public Creativo leaderboard
          </p>
        </div>
        <a
          href="/api/admin/spotlight/submissions/export"
          className="rounded-lg px-3.5 py-1.5 text-xs font-semibold"
          style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
        >
          Export CSV
        </a>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("All")}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold"
          style={{ background: filterCategory === "All" ? COLOR.gold : "rgba(255,255,255,0.06)", color: filterCategory === "All" ? COLOR.black : "rgba(255,255,255,0.6)" }}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold"
            style={{ background: filterCategory === cat ? COLOR.gold : "rgba(255,255,255,0.06)", color: filterCategory === cat ? COLOR.black : "rgba(255,255,255,0.6)" }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-sm text-white/30">No submissions in this category yet.</p>}
        {filtered.map((s) => (
          <div key={s.id} className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/50" style={{ background: "rgba(255,255,255,0.08)" }}>
                    {s.category}
                  </span>
                  {s.rank && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}>
                      {s.rank === 1 ? "1st place" : s.rank === 2 ? "2nd place" : "3rd place"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/50">{s.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-white/30">
                  <a href={s.projectLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">View project</a>
                  <span>{s.email}</span>
                </div>
                {s.note && <p className="mt-1.5 text-xs italic text-white/30">&ldquo;{s.note}&rdquo;</p>}
              </div>

              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <button
                  onClick={() => toggleShortlist(s.id, s.isShortlisted)}
                  disabled={updatingId === s.id}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{
                    background: s.isShortlisted ? "rgba(36,120,255,0.15)" : "rgba(255,255,255,0.06)",
                    color: s.isShortlisted ? "#68B2FF" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {s.isShortlisted ? "Shortlisted" : "Shortlist"}
                </button>

                <select
                  value={s.rank ?? ""}
                  onChange={(e) => setRank(s.id, e.target.value ? Number(e.target.value) : null)}
                  disabled={updatingId === s.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none disabled:opacity-50"
                >
                  <option value="" style={{ background: COLOR.black }}>No rank</option>
                  <option value="1" style={{ background: COLOR.black }}>1st place</option>
                  <option value="2" style={{ background: COLOR.black }}>2nd place</option>
                  <option value="3" style={{ background: COLOR.black }}>3rd place</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}