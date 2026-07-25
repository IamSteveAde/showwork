"use client";

import { useState } from "react";

type Status = "APPROVED" | "NEEDS_REVISION";

export interface ReviewEntry {
  reviewerName: string | null;
  reviewerEmail: string;
  status: Status;
  note: string | null;
  createdAt: string;
}

/**
 * Approve / request-revision controls for a single piece of media.
 * Shows every reviewer's input, not just the most recent one — a
 * second person's review adds to the list rather than replacing the
 * first person's, so a creator can see if multiple people weighed in
 * and disagreed.
 */
export default function ReviewControls({
  reviews,
  onApprove,
  onRequestRevision,
}: {
  reviews: ReviewEntry[];
  onApprove: () => void;
  onRequestRevision: (note: string) => void;
}) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  const submit = () => {
    onRequestRevision(noteText.trim());
    setNoteText("");
    setShowNoteInput(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex w-full flex-col gap-2 p-2">
      {reviews.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {reviews.map((r, i) => (
            <div key={i} className="rounded-md bg-white/5 px-2.5 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white/70">
                  {r.reviewerName || r.reviewerEmail}
                </span>
                <span
                  className="font-semibold"
                  style={{ color: r.status === "APPROVED" ? "#22C55E" : "#F97316" }}
                >
                  {r.status === "APPROVED" ? "✓ Approved" : "✎ Revision"}
                </span>
              </div>
              {r.note && <p className="mt-1 text-white/50">&ldquo;{r.note}&rdquo;</p>}
            </div>
          ))}
        </div>
      )}

      {showNoteInput ? (
        <div className="flex flex-col gap-2">
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
            <button onClick={submit} className="flex-1 rounded-md bg-white py-1.5 text-xs font-semibold text-black">
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
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onApprove}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-white/10 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/20"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setShowNoteInput(true)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-white/10 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/20"
          >
            ✎ Needs revision
          </button>
        </div>
      )}
    </div>
  );
}