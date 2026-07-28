"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeliveryStatus = "DELIVERED" | "APPROVED" | "PAID";

const STAGES: { key: DeliveryStatus; label: string; description: string }[] = [
  {
    key: "DELIVERED",
    label: "Delivered",
    description: "Client can review and leave approve/revision notes. Downloads are locked.",
  },
  {
    key: "APPROVED",
    label: "Approved",
    description: "Client has signed off on the delivery. Downloads are still locked until payment.",
  },
  {
    key: "PAID",
    label: "Paid",
    description: "Every file in this project is now downloadable by the client.",
  },
];

/**
 * The creator-side control for advancing a project through its
 * delivery lifecycle. Marking PAID is the one action that unlocks
 * every download on the client side — enforced server-side, not just
 * a visual label — so it asks for a real confirmation before applying.
 */
export default function DeliveryStatusControl({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: DeliveryStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STAGES.findIndex((s) => s.key === currentStatus);

  const applyStatus = async (status: DeliveryStatus) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryStatus: status }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError("Failed to update status");
    }
    setLoading(false);
    setConfirmingPaid(false);
  };

  const handleStageClick = (status: DeliveryStatus) => {
    if (status === currentStatus) return;
    if (status === "PAID") {
      setConfirmingPaid(true);
      return;
    }
    applyStatus(status);
  };

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
      <h2 className="mb-1 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
        Delivery status
      </h2>
      <p className="mb-5 text-xs text-white/40">
        This is what your client sees too — the same three stages, in sync.
      </p>

      <div className="mb-5 flex items-center gap-2">
        {STAGES.map((stage, i) => {
          const reached = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={stage.key} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => handleStageClick(stage.key)}
                disabled={loading || isCurrent}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-lg px-3 py-3 text-center transition-colors disabled:cursor-default"
                style={{
                  background: isCurrent ? "rgba(245,200,66,0.12)" : "rgba(255,255,255,0.04)",
                  border: isCurrent ? "1px solid rgba(245,200,66,0.4)" : "1px solid transparent",
                }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: reached ? "#F5C842" : "rgba(255,255,255,0.1)",
                    color: reached ? "#0A0A0A" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {reached ? "✓" : i + 1}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: isCurrent ? "#F5C842" : "rgba(255,255,255,0.7)" }}
                >
                  {stage.label}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <div className="h-px w-3 flex-shrink-0" style={{ background: i < currentIndex ? "#F5C842" : "rgba(255,255,255,0.15)" }} />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-white/50">{STAGES[currentIndex].description}</p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {confirmingPaid && (
        <div className="mt-4 rounded-lg p-4" style={{ background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.25)" }}>
          <p className="mb-3 text-sm font-medium text-white">
            Mark this project as Paid? Every file becomes downloadable by your client immediately.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => applyStatus("PAID")}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
              style={{ background: "#F5C842", color: "#0A0A0A" }}
            >
              {loading ? "Confirming..." : "Yes, mark as Paid"}
            </button>
            <button
              onClick={() => setConfirmingPaid(false)}
              className="rounded-lg px-4 py-2 text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}