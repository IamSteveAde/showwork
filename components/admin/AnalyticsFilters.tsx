"use client";
import { useState } from "react";
import { ADMIN_TOOLS } from "@/lib/adminAnalyticsOptions";
export default function AnalyticsFilters({
  tool,
  range,
  from,
  to,
}: {
  tool: string;
  range: string;
  from: string;
  to: string;
}) {
  const [period, setPeriod] = useState(range);
  const [startDate, setStartDate] = useState(from);
  const [endDate, setEndDate] = useState(to);
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      action="/admin/analytics"
    >
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        Tool
        <select
          name="tool"
          defaultValue={tool}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          {Object.entries(ADMIN_TOOLS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        Period
        <select
          name="range"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom dates</option>
        </select>
      </label>
      {period === "custom" && (
        <>
          <label className="flex flex-col gap-1.5 text-xs text-slate-500">
            From
            <input
              required
              type="date"
              name="from"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              className="rounded-lg border px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-slate-500">
            To
            <input
              required
              type="date"
              name="to"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="rounded-lg border px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </>
      )}
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Apply filters
      </button>
      <span className="ml-auto py-2 text-xs text-slate-400">
        Africa/Lagos · NGN
      </span>
    </form>
  );
}
