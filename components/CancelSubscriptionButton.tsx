"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelSubscriptionButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to cancel");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-white/60">
          Cancelling stops this plan at the end of the current billing cycle — you&apos;ll drop to the free tier (1 project/month). Projects you&apos;ve already published stay live.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Confirm cancellation"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg px-4 py-2 text-xs text-white/50"
          >
            Never mind
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-white/40 underline transition-colors hover:text-white/70"
    >
      Cancel subscription
    </button>
  );
}