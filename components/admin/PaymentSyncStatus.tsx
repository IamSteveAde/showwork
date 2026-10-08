"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Status = {
  live: boolean;
  migrationRequired: boolean;
  lastSyncedAt: string | null;
  inProgress: boolean;
  busy: boolean;
  issues: number;
  unattributed: number;
};
export default function PaymentSyncStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    const response = await fetch("/api/admin/payment-revenue", {
      cache: "no-store",
    });
    if (response.ok) setStatus(await response.json());
    else setMessage("Payment sync status is unavailable.");
  }
  useEffect(() => {
    void refresh().catch(() =>
      setMessage("Payment sync status is unavailable."),
    );
  }, []);
  async function sync() {
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payment-revenue", {
        method: "POST",
      });
      const result = await response.json();
      setMessage(
        response.ok
          ? result.busy
            ? "A sync is already running."
            : result.complete
              ? "Payments synced. Revenue is up to date."
              : "Payments synced. Historical reconciliation will continue automatically."
          : result.failed
            ? `${result.failed} payments need review. Verified charges are preserved in revenue.`
            : (result.error ?? "Payment sync failed."),
      );
      await refresh();
      router.refresh();
    } catch {
      setMessage("Couldn’t sync payments. Try again.");
    } finally {
      setRunning(false);
    }
  }
  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Payment sync</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {status
              ? status.migrationRequired
                ? "Historical sync is awaiting setup. Existing verified payments remain visible."
                : status.live
                  ? status.inProgress
                    ? "Historical reconciliation is in progress."
                    : status.lastSyncedAt
                      ? `Last completed ${new Date(status.lastSyncedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`
                      : "Historical reconciliation has not run yet."
                  : "Test billing connection · test charges are excluded from revenue."
              : "Checking payment sync…"}
          </p>
        </div>
        <button
          onClick={sync}
          disabled={
            running || !status?.live || status.busy || status.migrationRequired
          }
          className="rounded-lg border px-4 py-2 text-xs font-medium text-blue-700 disabled:opacity-40"
        >
          {running ? "Syncing…" : "Sync payments"}
        </button>
      </div>
      {status && status.issues > 0 && (
        <p className="mt-3 text-xs text-amber-700">
          {status.issues} payment references need review. {status.unattributed}{" "}
          verified charges await product attribution.
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-xs text-slate-500">
          {message}
        </p>
      )}
    </section>
  );
}
