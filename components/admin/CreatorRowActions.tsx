"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CreatorRowActions({ creatorId, isComped, discountPercent, freeTierLimitOverride, expanded = false }: {
  creatorId: string; isComped: boolean; discountPercent: number; freeTierLimitOverride: number | null; expanded?: boolean;
}) {
  const router = useRouter();
  const [freeLimitInput, setFreeLimitInput] = useState(freeTierLimitOverride !== null ? String(freeTierLimitOverride) : "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function patch(body: object, label: string) {
    setLoading(label); setError("");
    try {
      const response = await fetch(`/api/admin/creators/${creatorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not update account");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update account"); }
    finally { setLoading(null); }
  }
  return <div className={expanded ? "flex flex-col gap-3" : "flex flex-wrap items-center gap-2"}>
    <Link href={`/admin/billing-offers?creator=${encodeURIComponent(creatorId)}`} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Manage discounts & access</Link>
    {discountPercent > 0 && <span className="text-xs text-slate-500">Legacy discount: {discountPercent}%</span>}
    {isComped && <button disabled={!!loading} onClick={() => { if (window.confirm("End this account’s legacy complimentary Workspace access? Its paid subscriptions and newer grants will remain unchanged.")) void patch({ isComped: false }, "legacy"); }} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">{loading === "legacy" ? "Updating…" : "End legacy Workspace access"}</button>}
    <div className="flex items-center gap-2"><input aria-label="Free Delivery projects per 30 days" type="number" min={0} step={1} placeholder="1" value={freeLimitInput} onChange={e => setFreeLimitInput(e.target.value)} className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-950" /><button disabled={!!loading} onClick={() => void patch({ freeTierLimitOverride: freeLimitInput === "" ? null : Number(freeLimitInput) }, "limit")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600" title="Free Delivery projects per 30 days. Blank restores the standard allowance.">{loading === "limit" ? "Saving…" : "Free project limit"}</button></div>
    {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
  </div>;
}
