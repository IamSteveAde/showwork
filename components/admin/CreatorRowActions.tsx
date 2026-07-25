"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorRowActions({
  creatorId,
  isComped,
  discountPercent,
  freeTierLimitOverride,
  expanded = false,
}: {
  creatorId: string;
  isComped: boolean;
  discountPercent: number;
  freeTierLimitOverride: number | null;
  expanded?: boolean;
}) {
  const router = useRouter();
  const [discountInput, setDiscountInput] = useState(String(discountPercent));
  const [freeLimitInput, setFreeLimitInput] = useState(
    freeTierLimitOverride !== null ? String(freeTierLimitOverride) : ""
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const patch = async (body: object, label: string) => {
    setLoading(label);
    await fetch(`/api/admin/creators/${creatorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
    setLoading(null);
  };

  const handleReset = async () => {
    await patch({ resetBilling: true }, "reset");
    setConfirmingReset(false);
  };

  return (
    <div className={expanded ? "flex flex-col gap-3" : "flex items-center gap-2"}>
      <button
        onClick={() => patch({ isComped: !isComped }, "comp")}
        disabled={loading === "comp"}
        className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
        style={
          isComped
            ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
            : { background: "rgba(255,255,255,0.08)", color: "white" }
        }
      >
        {loading === "comp" ? "..." : isComped ? "✓ Comped free" : "Grant free access"}
      </button>

      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          value={discountInput}
          onChange={(e) => setDiscountInput(e.target.value)}
          className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
        />
        <button
          onClick={() => patch({ discountPercent: Number(discountInput) }, "discount")}
          disabled={loading === "discount"}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842" }}
        >
          {loading === "discount" ? "..." : "% off"}
        </button>
      </div>

      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          placeholder="1"
          value={freeLimitInput}
          onChange={(e) => setFreeLimitInput(e.target.value)}
          className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
        />
        <button
          onClick={() =>
            patch(
              { freeTierLimitOverride: freeLimitInput === "" ? null : Number(freeLimitInput) },
              "freeLimit"
            )
          }
          disabled={loading === "freeLimit"}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
          title="How many free projects per month, instead of the standard 1. Leave blank to reset to default."
        >
          {loading === "freeLimit" ? "..." : "Free limit"}
        </button>
      </div>

      {/* Full billing reset — for accounts stuck in an inconsistent
          state (e.g. leftover subscription fields from before being
          comped, with nothing real behind them on Paystack anymore). */}
      {confirmingReset ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Wipe all billing state back to Free?</span>
          <button
            onClick={handleReset}
            disabled={loading === "reset"}
            className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading === "reset" ? "..." : "Confirm reset"}
          </button>
          <button onClick={() => setConfirmingReset(false)} className="text-xs text-white/40 underline">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingReset(true)}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
        >
          Reset billing state
        </button>
      )}
    </div>
  );
}