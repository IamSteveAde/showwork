"use client";

type DeliveryStatus = "DELIVERED" | "APPROVED" | "PAID";

const STAGES: { key: DeliveryStatus; label: string }[] = [
  { key: "DELIVERED", label: "Delivered" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAID", label: "Paid" },
];

const DESCRIPTIONS: Record<DeliveryStatus, string> = {
  DELIVERED:
    "Your files are ready to review. Take your time — approve what works, flag anything that needs a change.",
  APPROVED:
    "You've approved this delivery. Once payment is confirmed, every file here unlocks for download.",
  PAID:
    "Payment confirmed — every file in this delivery is now yours to download and keep.",
};

/**
 * A clear, always-visible status strip shown to the client, matching
 * the same three stages the creator controls from their dashboard.
 * Same component/logic on both sides — nobody's ever looking at a
 * status that doesn't match what the other person sees.
 */
export default function DeliveryStatusBanner({ status }: { status: DeliveryStatus }) {
  const currentIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <div className="border-b border-white/5 bg-black px-6 py-6 md:px-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {STAGES.map((stage, i) => {
            const reached = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: reached ? "#F5C842" : "rgba(255,255,255,0.1)",
                      color: reached ? "#0A0A0A" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {reached ? "✓" : i + 1}
                  </span>
                  <span
                    className="text-xs font-semibold uppercase"
                    style={{
                      color: isCurrent ? "#F5C842" : reached ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className="h-px w-6"
                    style={{ background: i < currentIndex ? "#F5C842" : "rgba(255,255,255,0.1)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="max-w-md text-xs leading-relaxed text-white/50">{DESCRIPTIONS[status]}</p>
      </div>
    </div>
  );
}