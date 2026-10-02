"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetCalendarButton({ calendarId, onReset }: { calendarId: string; onReset: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function reset() {
    if (busy || confirmation !== "RESET") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/calendars/${calendarId}/reset`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reset the calendar.");
      onReset();
      dialog.current?.close();
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not reset the calendar."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" onClick={() => { setConfirmation(""); setError(""); dialog.current?.showModal(); }} className="rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Reset calendar</button>
    <dialog ref={dialog} aria-labelledby="reset-calendar-title" aria-describedby="reset-calendar-description" onCancel={(event) => { if (busy) event.preventDefault(); }} className="w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/50">
      <h2 id="reset-calendar-title" className="text-lg font-bold">Reset calendar and delete all content?</h2>
      <div id="reset-calendar-description" className="mt-3 space-y-3 text-sm text-slate-600">
        <p>This permanently clears content across <strong>all months</strong> in this workspace, including approved posts.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Deletes every planned post and AI draft, captions, scripts, custom fields, and attached photos and videos.</li>
          <li>Deletes post comments, feedback, approvals, AI version history, and calendar publishing records and their metrics.</li>
          <li>Removes scheduled posts from this calendar and clears import history.</li>
          <li>Resets the calendar plan to Building and clears its approval.</li>
        </ul>
        <p>Your workspace settings, business knowledge, team, connected accounts, leads, and subscription stay in place. Posts already published on social platforms stay live.</p>
        <p className="font-semibold text-red-700">This cannot be undone.</p>
      </div>
      <label className="mt-4 block text-sm font-medium">Type RESET to confirm
        <input autoComplete="off" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button autoFocus type="button" disabled={busy} onClick={() => dialog.current?.close()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
        <button type="button" disabled={busy || confirmation !== "RESET"} onClick={() => void reset()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Resetting…" : "Delete all content"}</button>
      </div>
    </dialog>
  </>;
}
