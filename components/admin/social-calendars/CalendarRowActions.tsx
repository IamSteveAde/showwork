"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CalendarRowActions({
  calendarId,
  billingStatus,
  lastFreeMonthGrantedAt,
}: {
  calendarId: string;
  billingStatus: string;
  lastFreeMonthGrantedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = async (action: string, label: string) => {
    setLoading(label);
    setError(null);
    const res = await fetch(`/api/admin/social-calendars/${calendarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Request failed (${res.status})`);
    }
    setLoading(null);
  };

  const handleReset = async () => {
    await patch("reset_billing", "reset");
    setConfirmingReset(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => patch("grant_free_month", "grant")}
          disabled={loading === "grant"}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
        >
          {loading === "grant" ? "..." : "Grant free month"}
        </button>

        {confirmingReset ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={loading === "reset"}
              className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {loading === "reset" ? "..." : "Confirm"}
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
            Reset billing
          </button>
        )}
      </div>
      {lastFreeMonthGrantedAt && (
        <p className="text-[10px] text-white/30">
          Last free month: {new Date(lastFreeMonthGrantedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}