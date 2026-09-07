"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CalendarSettingsMenu({
  calendarId,
  clientName,
  userRole,
  isManager,
}: {
  calendarId: string;
  clientName: string;
  userRole: "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";
  isManager: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(clientName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = userRole === "EDIT_CALENDAR";

  if (!canEdit) return null;

  const saveName = async () => {
    if (!newName.trim()) {
      setNameError("Name can't be empty");
      return;
    }
    setSavingName(true);
    setNameError(null);
    const res = await fetch(`/api/calendars/${calendarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_details", clientName: newName }),
    });
    if (res.ok) {
      setRenaming(false);
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setNameError(data.error ?? "Failed to save");
    }
    setSavingName(false);
  };

  const deleteCalendar = async () => {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/calendars/${calendarId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/calendars");
    } else {
      const data = await res.json();
      setDeleteError(data.error ?? "Failed to delete calendar");
      setDeleting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Calendar settings"
        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-12 z-50 w-72 rounded-2xl border p-2 shadow-2xl"
            style={{ background: "#1A1A1A", borderColor: "rgba(255,255,255,0.1)" }}
          >
            {!renaming && !confirmingDelete && (
              <>
                <button
                  onClick={() => setRenaming(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Rename calendar
                </button>
                {isManager && (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Delete calendar
                  </button>
                )}
              </>
            )}

            {renaming && (
              <div className="flex flex-col gap-2 p-2">
                <label className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                  Client name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                />
                {nameError && <p className="text-xs text-red-400">{nameError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveName}
                    disabled={savingName}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
                  >
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setRenaming(false)} className="text-xs text-white/40 underline">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {confirmingDelete && (
              <div className="flex flex-col gap-2.5 p-2">
                <p className="text-xs font-semibold text-red-400">
                  This deletes {clientName}&apos;s entire calendar — every post, all uploaded content, and cancels the subscription. This can&apos;t be undone.
                </p>
                <label className="text-[10px] text-white/40">
                  Type <strong className="text-white/70">{clientName}</strong> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-white outline-none"
                />
                {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={deleteCalendar}
                    disabled={deleting || confirmText !== clientName}
                    className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-40"
                  >
                    {deleting ? "Deleting..." : "Delete permanently"}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingDelete(false);
                      setConfirmText("");
                    }}
                    className="text-xs text-white/40 underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}