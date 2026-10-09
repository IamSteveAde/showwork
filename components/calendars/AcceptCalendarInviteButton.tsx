"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptCalendarInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/invites/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not accept this invitation.");
      router.push(`/dashboard/calendars/${data.calendarId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={accept}
        disabled={loading}
        className="rounded-lg px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
      >
        {loading ? "Joining..." : "Accept invite"}
      </button>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}