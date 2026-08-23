"use client";

import { useState } from "react";

const COLOR = { blue: "#2478FF", black: "#0A0A0A" };
const RANK_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
const RANK_COLOR: Record<number, string> = { 1: "#F5C842", 2: "#C0C0C0", 3: "#CD7F32" };

interface Winner {
  id: string;
  name: string;
  category: string;
  projectLink: string;
  rank: number;
}

interface CompletedCycle {
  id: string;
  monthLabel: string;
  winners: Winner[];
}

export default function SpotlightLeaderboard({ cycles }: { cycles: CompletedCycle[] }) {
  const [selectedId, setSelectedId] = useState(cycles[0]?.id ?? null);

  if (cycles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-black/15 p-12 text-center">
        <p className="text-sm text-black/40">No winners announced yet — the first Spotlight results will show up here.</p>
      </div>
    );
  }

  const selected = cycles.find((c) => c.id === selectedId) ?? cycles[0];

  return (
    <div className="mx-auto max-w-3xl">
      {cycles.length > 1 && (
        <div className="mb-8 flex justify-center">
          <select
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black outline-none"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.monthLabel}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((rank) => {
          const winner = selected.winners.find((w) => w.rank === rank);
          return (
            <div
              key={rank}
              className="flex flex-col items-center gap-3 rounded-2xl border border-black/10 bg-white p-6 text-center"
              style={{ borderTop: `3px solid ${RANK_COLOR[rank]}` }}
            >
              <span className="text-2xl font-extrabold" style={{ color: RANK_COLOR[rank] }}>
                {RANK_LABEL[rank]}
              </span>
              {winner ? (
                <>
                  <p className="text-base font-bold text-black">{winner.name}</p>
                  <p className="text-xs font-semibold text-black/40">{winner.category}</p>
                  <a
                    href={winner.projectLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-xs font-bold underline"
                    style={{ color: COLOR.blue }}
                  >
                    View project
                  </a>
                </>
              ) : (
                <p className="text-xs text-black/30">Not announced</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}