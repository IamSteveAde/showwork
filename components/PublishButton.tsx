"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublishButton({
  projectId,
  creatorEmail,
  isFirstFree,
}: {
  projectId: string;
  creatorEmail: string;
  isFirstFree: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, creatorEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to start payment");
      }

      const data = await res.json();

      if (data.free) {
        // First-ever publish — already marked paid server-side, no
        // checkout needed. Refresh so the page re-fetches and shows "Live".
        router.refresh();
        return;
      }

      window.location.href = data.authorizationUrl; // redirect to Paystack checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePublish}
        disabled={loading}
        className="rounded-lg px-5 py-3 text-sm font-medium disabled:opacity-50"
        style={{ background: "#F5C842", color: "#0A0A0A" }}
      >
        {loading
          ? isFirstFree
            ? "Publishing..."
            : "Redirecting to payment..."
          : isFirstFree
            ? "Publish — free for your first project"
            : "Publish — ₦5,000"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}