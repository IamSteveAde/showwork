"use client";
import { useState } from "react";
export default function AnalyticsChart({
  rows,
}: {
  rows: { day: string; revenue: number; signups: number; activity: number }[];
}) {
  const [metric, setMetric] = useState<"revenue" | "signups" | "activity">(
    "revenue",
  );
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r[metric]));
  const points = rows
    .map(
      (r, i) =>
        `${42 + (i / Math.max(1, rows.length - 1)) * 850},${205 - (r[metric] / max) * 165}`,
    )
    .join(" ");
  const selected = hover === null ? null : rows[hover];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Performance over time</h2>
          <p className="mt-1 text-xs text-slate-500">
            Daily totals · hover or focus to explore
          </p>
        </div>
        <div
          className="flex rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="Chart metric"
        >
          {(["revenue", "signups", "activity"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={metric === m}
              onClick={() => setMetric(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${metric === m ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 h-5 text-xs text-slate-500" aria-live="polite">
        {selected
          ? `${selected.day} · ${metric === "revenue" ? "₦" : ""}${selected[metric].toLocaleString()} ${metric}`
          : `${metric === "revenue" ? "₦" : ""}${rows.reduce((s, r) => s + r[metric], 0).toLocaleString()} total in this period`}
      </div>
      <svg
        viewBox="0 0 920 240"
        className="mt-2 w-full"
        role="img"
        aria-label={`Daily ${metric} chart`}
      >
        <defs>
          <linearGradient id="admin-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity=".18" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1="42"
              x2="892"
              y1={205 - v * 165}
              y2={205 - v * 165}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text x="0" y={209 - v * 165} fontSize="10" fill="#64748b">
              {Intl.NumberFormat("en", { notation: "compact" }).format(max * v)}
            </text>
          </g>
        ))}
        <polygon
          points={`42,205 ${points} 892,205`}
          fill="url(#admin-chart-fill)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {rows.map((r, i) => (
          <rect
            key={r.day}
            x={
              42 +
              (i / Math.max(1, rows.length - 1)) * 850 -
              425 / Math.max(1, rows.length - 1)
            }
            y="30"
            width={Math.max(3, 850 / Math.max(1, rows.length - 1))}
            height="180"
            fill="transparent"
            tabIndex={0}
            aria-label={`${r.day}: ${r[metric]} ${metric}`}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{`${r.day}: ${r[metric].toLocaleString()}`}</title>
          </rect>
        ))}
        <text x="42" y="234" fontSize="11" fill="#64748b">
          {rows[0]?.day}
        </text>
        <text x="892" y="234" textAnchor="end" fontSize="11" fill="#64748b">
          {rows.at(-1)?.day}
        </text>
      </svg>
      {rows.every((r) => r[metric] === 0) && (
        <p className="text-center text-sm text-slate-400">
          No {metric} recorded for these filters.
        </p>
      )}
    </div>
  );
}
