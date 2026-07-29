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
 * Shows every reviewer's input, and — critically — knows which one (if
 * any) belongs to the *current* viewer, so they can't submit the same
 * verdict twice. They can still change their mind (approve → revision
 * or back), which updates their one entry rather than adding a new one.
 */
export default function ReviewControls({
  reviews,
  viewerEmail,
  onApprove,
  onRequestRevision,
  onDeleteReview,
}: {
  reviews: ReviewEntry[];
  viewerEmail: string;
  onApprove: () => void;
  onRequestRevision: (note: string) => void;
  onDeleteReview: () => void;
}) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const myReview = reviews.find(
    (r) => r.reviewerEmail.toLowerCase() === viewerEmail.toLowerCase()
  );

  const submit = () => {
    onRequestRevision(noteText.trim());
    setNoteText("");
    setShowNoteInput(false);
  };

  const handleApproveClick = () => {
    if (myReview?.status === "APPROVED") {
      setDuplicateError("You've already approved this file.");
      setTimeout(() => setDuplicateError(null), 3000);
      return;
    }
    setDuplicateError(null);
    onApprove();
  };

  const handleRevisionClick = () => {
    if (myReview?.status === "NEEDS_REVISION") {
      setDuplicateError("You've already flagged this file for revision.");
      setTimeout(() => setDuplicateError(null), 3000);
      return;
    }
    setDuplicateError(null);
    setShowNoteInput(true);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex w-full flex-col gap-2 p-2">
      {reviews.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {reviews.map((r, i) => {
            const isMe = r.reviewerEmail.toLowerCase() === viewerEmail.toLowerCase();
            return (
              <div key={i} className="overflow-hidden rounded-md bg-white/5 px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium text-white/70">
                    {r.reviewerName || r.reviewerEmail}
                    {isMe && <span className="ml-1.5 text-[10px] text-white/40">(you)</span>}
                  </span>
                  <span
                    className="flex-shrink-0 font-semibold"
                    style={{ color: r.status === "APPROVED" ? "#22C55E" : "#F97316" }}
                  >
                    {r.status === "APPROVED" ? "✓ Approved" : "✎ Revision"}
                  </span>
                </div>
                {r.note && <p className="mt-1 text-white/50">&ldquo;{r.note}&rdquo;</p>}
                {isMe && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteReview(); }}
                    className="mt-1 text-[10px] font-medium text-white/30 underline hover:text-red-400"
                  >
                    Remove my feedback
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clear "this is your own current verdict" indicator, distinct
          from the reviews list above — makes it unmistakable that
          clicking the same action again won't do anything new. */}
      {myReview && !showNoteInput && (
        <p className="text-center text-[11px] text-white/40">
          You {myReview.status === "APPROVED" ? "approved" : "flagged this for revision"} —
          {" "}you can change your mind below.
        </p>
      )}

      {duplicateError && (
        <p className="text-center text-[11px] font-medium text-orange-400">{duplicateError}</p>
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
            onClick={handleApproveClick}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors"
            style={
              myReview?.status === "APPROVED"
                ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }
            }
          >
            {myReview?.status === "APPROVED" ? "✓ You approved this" : "✓ Approve"}
          </button>
          <button
            onClick={handleRevisionClick}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors"
            style={
              myReview?.status === "NEEDS_REVISION"
                ? { background: "rgba(249,115,22,0.15)", color: "#fdba74" }
                : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }
            }
          >
            {myReview?.status === "NEEDS_REVISION" ? "✎ You flagged this" : "✎ Needs revision"}
          </button>
        </div>
      )}
    </div>
  );
}