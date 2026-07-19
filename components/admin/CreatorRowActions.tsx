"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorRowActions({
  creatorId,
  isComped,
  discountPercent,
  expanded = false,
}: {
  creatorId: string;
  isComped: boolean;
  discountPercent: number;
  expanded?: boolean;
}) {
  const router = useRouter();
  const [discountInput, setDiscountInput] = useState(String(discountPercent));
  const [loading, setLoading] = useState<string | null>(null);

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
    </div>
  );
}