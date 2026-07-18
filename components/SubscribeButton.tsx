"use client";

import { useState } from "react";
import type { PaidTier } from "@/lib/subscriptionTiers";

export default function SubscribeButton({
  tier,
  label = "Subscribe",
}: {
  tier: PaidTier;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to start subscription");
      }
      const { authorizationUrl } = await res.json();
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full rounded-lg py-2.5 text-xs font-semibold transition-transform hover:scale-[1.01] disabled:opacity-50"
        style={{ background: "#F5C842", color: "#0A0A0A" }}
      >
        {loading ? "Redirecting..." : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}