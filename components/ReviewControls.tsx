"use client";

import { useState } from "react";

type Status = "PENDING" | "APPROVED" | "NEEDS_REVISION";

/**
 * Approve / request-revision controls for a single piece of media.
 * Used both in the grid tiles (compact) and inside the full-quality
 * modals (roomier). Deliberately always visible rather than hover-only —
 * hover doesn't exist on a phone, and most clients will review on mobile.
 */
export default function ReviewControls({
  status,
  note,
  onApprove,
  onRequestRevision,
}: {
  status: Status;
  note: string | null;
  onApprove: () => void;
  onRequestRevision: (note: string) => void;
}) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(note ?? "");

  const submit = () => {
    onRequestRevision(noteText.trim());
    setShowNoteInput(false);
  };

  if (showNoteInput) {
    return (
      <div onClick={(e) => e.stopPropagation()} className="flex w-full flex-col gap-2 p-2">
        <textarea
          autoFocus
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="What needs to change?"
          rows={2}
          style={{ fontSize: "16px" }}
          className="w-full resize-none rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/30"
        />
        <div className="flex gap-2">
          <button
            onClick={submit}
            className="flex-1 rounded-md bg-white py-1.5 text-xs font-semibold text-black"
          >
            Send
          </button>
          <button
            onClick={() => setShowNoteInput(false)}
            className="rounded-md px-3 py-1.5 text-xs text-white/50 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex w-full items-center gap-1.5 p-2">
      <button
        onClick={onApprove}
        className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
          status === "APPROVED" ? "bg-green-500 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
        }`}
      >
        ✓ Approve
      </button>
      <button
        onClick={() => setShowNoteInput(true)}
        className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
          status === "NEEDS_REVISION" ? "bg-orange-500 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
        }`}
      >
        ✎ Needs revision
      </button>
    </div>
  );
}