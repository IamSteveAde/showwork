"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CalendarRowActions({
  calendarId,
  billingStatus,
}: {
  calendarId: string;
  billingStatus: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = async (action: string, label: string) => {
    setLoading(label);
    setError(null);

    try {
      const res = await fetch(`/api/admin/social-calendars/${calendarId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));

      setError(data.error ?? `Request failed (${res.status})`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
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
          disabled={loading !== null}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{
            background: "rgba(34,197,94,0.15)",
            color: "#4ade80",
          }}
        >
          {loading === "grant" ? "..." : "Grant free month"}
        </button>

        {confirmingReset ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={loading !== null}
              className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {loading === "reset" ? "..." : "Confirm"}
            </button>

            <button
              onClick={() => setConfirmingReset(false)}
              disabled={loading !== null}
              className="text-xs text-white/40 underline disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            disabled={loading !== null}
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            Reset billing
          </button>
        )}
      </div>

      {billingStatus === "ACTIVE" && (
        <p className="text-[10px] text-white/30">
          Calendar access is active for this manager's account.
        </p>
      )}

      {error && (
        <p className="text-[10px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}