"use client";

import { useState } from "react";

export default function RetryCalendarPaymentButton({ calendarId }: { calendarId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/retry-payment`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.location.href = data.authorizationUrl;
      } else {
        setError(data.error ?? "Failed to start payment");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={retry}
        disabled={loading}
        className="rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
      >
        {loading ? "Starting checkout..." : "Complete payment"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}