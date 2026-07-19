"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCreatorButton({
  creatorId,
  creatorLabel,
}: {
  creatorId: string;
  creatorLabel: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/creators/${creatorId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete");
      setLoading(false);
      return;
    }
    router.push("/admin");
  };

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-[220px] text-right text-xs text-white/50">
          Permanently delete <strong className="text-white">{creatorLabel}</strong> and everything they&apos;ve created?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Confirm delete"}
          </button>
          <button onClick={() => setConfirming(false)} className="rounded-md px-3 py-1.5 text-xs text-white/50">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
    >
      Delete creator
    </button>
  );
}