"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GlobalDiscountForm({ currentPercent }: { currentPercent: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(currentPercent));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ globalDiscountPercent: Number(value) }),
    });
    setStatus(res.ok ? "Saved" : "Failed to save");
    setLoading(false);
    router.refresh();
    setTimeout(() => setStatus(null), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
      />
      <span className="text-sm text-white/40">%</span>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md px-4 py-2 text-xs font-semibold disabled:opacity-50"
        style={{ background: "#F5C842", color: "#0A0A0A" }}
      >
        {loading ? "..." : status ?? "Save"}
      </button>
    </form>
  );
}