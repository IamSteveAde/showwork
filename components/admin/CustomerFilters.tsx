"use client";
import { useState } from "react";
import {
  CUSTOMER_PRODUCTS,
  CUSTOMER_STATUSES,
  type CustomerFilters,
} from "@/lib/adminCustomerFilters";
const input =
  "min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900";
export default function CustomerFiltersForm({
  filters: f,
}: {
  filters: CustomerFilters;
}) {
  const [range, setRange] = useState(f.range);
  const [from, setFrom] = useState(f.fromValue),
    [to, setTo] = useState(f.toValue);
  return (
    <form
      action="/admin/customers"
      className="space-y-4 rounded-2xl border bg-white p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_180px_165px]">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Customer
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Search name, email, company or phone"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Product
          <select name="product" defaultValue={f.product} className={input}>
            {Object.entries(CUSTOMER_PRODUCTS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Subscription status
          <select name="status" defaultValue={f.status} className={input}>
            {Object.entries(CUSTOMER_STATUSES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Payment period
          <select
            name="range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className={input}
          >
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {range === "custom" && (
          <>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
              From
              <input
                type="date"
                name="from"
                required
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
              To
              <input
                type="date"
                name="to"
                required
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className={input}
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Date applies to
          <select name="dateBasis" defaultValue={f.dateBasis} className={input}>
            <option value="any">Any payment in period</option>
            <option value="last">Latest payment date</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Sort by
          <select name="sort" defaultValue={f.sort} className={input}>
            <option value="last">Latest payment</option>
            <option value="spend">Highest lifetime spend</option>
            <option value="payments">Most payments</option>
            <option value="name">Customer name</option>
          </select>
        </label>
        <button className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          Apply filters
        </button>
        <a
          href="/admin/customers"
          className="px-2 py-2.5 text-sm text-slate-500 hover:text-blue-600"
        >
          Reset
        </a>
        <span className="ml-auto pb-2.5 text-xs text-slate-400">
          NGN · Africa/Lagos
        </span>
      </div>
    </form>
  );
}
