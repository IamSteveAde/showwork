"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeliveryStatus = "DELIVERED" | "APPROVED" | "PAID";

const STAGES: {
  key: DeliveryStatus;
  label: string;
  description: string;
}[] = [
  {
    key: "DELIVERED",
    label: "Delivered",
    description:
      "Client can review the delivery and leave approval or revision notes. Downloads remain locked.",
  },
  {
    key: "APPROVED",
    label: "Approved",
    description:
      "Client has signed off on the delivery. Downloads remain locked until payment is confirmed.",
  },
  {
    key: "PAID",
    label: "Paid",
    description:
      "Payment is confirmed and every delivered file is now available for client download.",
  },
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 10.25 8.25 13.5 15 6.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="8.25"
        width="11"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 8.25V6.5a3 3 0 0 1 6 0v1.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 10h12M11 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner({
  dark = false,
}: {
  dark?: boolean;
}) {
  return (
    <span
      className={[
        "h-3.5 w-3.5 animate-spin rounded-full border-2",
        dark
          ? "border-blue-200 border-t-blue-600"
          : "border-white/30 border-t-white",
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

/**
 * Creator-side delivery lifecycle control.
 *
 * DELIVERED → APPROVED → PAID
 *
 * PAID is the only state that unlocks downloads.
 * The server remains authoritative for that permission.
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
  const [updatingStatus, setUpdatingStatus] =
    useState<DeliveryStatus | null>(null);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STAGES.findIndex(
    (stage) => stage.key === currentStatus,
  );

  const currentStage =
    STAGES[currentIndex] ?? STAGES[0];

  const applyStatus = async (status: DeliveryStatus) => {
    if (loading) return;

    setLoading(true);
    setUpdatingStatus(status);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliveryStatus: status,
        }),
      });

      if (!res.ok) {
        setError(
          "We couldn't update the delivery status. Please try again.",
        );
        return;
      }

      router.refresh();
    } catch {
      setError(
        "Something went wrong while updating the status. Please try again.",
      );
    } finally {
      setLoading(false);
      setUpdatingStatus(null);
      setConfirmingPaid(false);
    }
  };

  const handleStageClick = (status: DeliveryStatus) => {
    if (loading || status === currentStatus) return;

    if (status === "PAID") {
      setConfirmingPaid(true);
      return;
    }

    applyStatus(status);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_24px_70px_-42px_rgba(37,99,235,0.45)]">
      {/* Header */}
      <div className="px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CheckIcon className="h-4 w-4" />
              </span>

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Delivery status
              </p>
            </div>

            <h3 className="mt-2.5 text-[18px] font-bold tracking-[-0.03em] text-slate-950">
              {currentStage.label}
            </h3>

            <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-500">
              This status is shared with your client and stays in sync with
              their delivery experience.
            </p>
          </div>

          <span
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em]",
              currentStatus === "PAID"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700",
            ].join(" ")}
          >
            {currentStatus === "PAID"
              ? "Downloads unlocked"
              : "In progress"}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 pb-6 sm:px-7">
        <div className="rounded-[20px] border border-blue-50 bg-slate-50/75 p-3 sm:p-4">
          <div className="flex items-start">
            {STAGES.map((stage, index) => {
              const reached = index <= currentIndex;
              const isCurrent = index === currentIndex;
              const isLast = index === STAGES.length - 1;
              const isUpdating = updatingStatus === stage.key;

              return (
                <div
                  key={stage.key}
                  className="flex min-w-0 flex-1 items-start"
                >
                  <div className="flex min-w-0 flex-1 flex-col items-center">
                    <button
                      type="button"
                      onClick={() =>
                        handleStageClick(stage.key)
                      }
                      disabled={loading || isCurrent}
                      aria-current={
                        isCurrent ? "step" : undefined
                      }
                      className={[
                        "group relative flex w-full flex-col items-center rounded-2xl px-2 py-3 transition-all duration-200",
                        isCurrent
                          ? "bg-white shadow-[0_10px_28px_-18px_rgba(37,99,235,0.55)]"
                          : "hover:bg-white hover:shadow-[0_8px_24px_-20px_rgba(37,99,235,0.45)]",
                        loading || isCurrent
                          ? "cursor-default"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-200",
                          reached
                            ? "border-blue-600 bg-blue-600 text-white shadow-[0_7px_18px_-9px_rgba(37,99,235,0.85)]"
                            : "border-slate-200 bg-white text-slate-400",
                          isCurrent
                            ? "ring-4 ring-blue-50"
                            : "",
                          isUpdating
                            ? "scale-95"
                            : "",
                        ].join(" ")}
                      >
                        {isUpdating ? (
                          <Spinner dark />
                        ) : reached ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </span>

                      <span
                        className={[
                          "mt-2.5 inline-flex min-h-[18px] items-center justify-center gap-1.5 text-[11px] font-bold transition-colors",
                          isCurrent
                            ? "text-blue-700"
                            : reached
                              ? "text-slate-700"
                              : "text-slate-400",
                        ].join(" ")}
                      >
                        {isUpdating ? (
                          <>
                            <span
                              className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
                              aria-hidden="true"
                            />
                            Updating…
                          </>
                        ) : (
                          stage.label
                        )}
                      </span>
                    </button>
                  </div>

                  {!isLast && (
                    <div className="mt-[29px] flex h-1.5 w-8 shrink-0 items-center sm:w-12">
                      <div className="h-px w-full overflow-hidden bg-blue-100">
                        <div
                          className={[
                            "h-full transition-all duration-500",
                            index < currentIndex
                              ? "w-full bg-blue-500"
                              : "w-0 bg-transparent",
                          ].join(" ")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current state */}
      <div className="mx-6 mb-6 rounded-2xl border border-blue-50 bg-white px-4 py-4 sm:mx-7">
        <div className="flex items-start gap-3">
          <div
            className={[
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              currentStatus === "PAID"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-blue-50 text-blue-600",
            ].join(" ")}
          >
            {currentStatus === "PAID" ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <LockIcon className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-800">
              {currentStage.label}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {currentStage.description}
            </p>
          </div>
        </div>
      </div>

      {/* Payment confirmation */}
      {confirmingPaid && (
        <div className="mx-6 mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 sm:mx-7">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <CheckIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  Confirm payment
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Marking this project as paid will immediately release
                  downloads for every delivered file.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => applyStatus("PAID")}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_14px_28px_-12px_rgba(37,99,235,0.9)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && updatingStatus === "PAID" ? (
                  <>
                    <Spinner />
                    Confirming…
                  </>
                ) : (
                  <>
                    Confirm payment
                    <ArrowIcon className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setConfirmingPaid(false)}
                disabled={loading}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 sm:mx-7">
          <p className="text-xs font-medium leading-5 text-red-600">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}