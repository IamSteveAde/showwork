"use client";

import { useState } from "react";

export interface VideoCommentEntry {
  id: string;
  reviewerName: string | null;
  reviewerEmail: string;
  note: string;
  videoTimestampSeconds: number;
  createdAt: string;
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Pinned, timestamped comments on one video — the whole feedback
 * mechanism for video, in place of a plain approve/revision verdict.
 * Deliberately compact: a single slim bar to add a comment, always in
 * the same place, always visible without scrolling for it. Existing
 * comments (if any) sit in their own small strip above it and scroll
 * independently — they never push the add-comment bar out of view.
 */
export default function VideoComments({
  comments,
  viewerEmail,
  getCurrentTime,
  onSeekTo,
  onAddComment,
  onDeleteComment,
}: {
  comments: VideoCommentEntry[];
  viewerEmail: string;
  getCurrentTime: () => number;
  onSeekTo: (seconds: number) => void;
  onAddComment: (note: string, videoTimestampSeconds: number) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [capturedTimestamp, setCapturedTimestamp] = useState(0);

  const startAdding = () => {
    setCapturedTimestamp(getCurrentTime());
    setNoteText("");
    setAdding(true);
  };

  const submit = () => {
    if (!noteText.trim()) return;
    onAddComment(noteText.trim(), capturedTimestamp);
    setNoteText("");
    setAdding(false);
  };

  const sorted = [...comments].sort((a, b) => a.videoTimestampSeconds - b.videoTimestampSeconds);

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex max-h-[132px] flex-col">
      {sorted.length > 0 && !adding && (
        <div className="flex max-h-16 flex-col gap-1 overflow-y-auto px-2 pt-1.5">
          {sorted.map((c) => {
            const isMe = c.reviewerEmail.toLowerCase() === viewerEmail.toLowerCase();
            return (
              <div key={c.id} className="flex items-center gap-1.5 text-[11px]">
                <button
                  onClick={() => onSeekTo(c.videoTimestampSeconds)}
                  className="flex-shrink-0 rounded px-1 py-0.5 font-mono font-semibold transition-colors hover:opacity-80"
                  style={{ background: "rgba(36,120,255,0.18)", color: "#5B9DFF" }}
                  title="Jump to this moment"
                >
                  {formatTimestamp(c.videoTimestampSeconds)}
                </button>
                <span className="min-w-0 flex-1 truncate text-white/60">
                  <span className="font-medium text-white/70">{isMe ? "You" : c.reviewerName || c.reviewerEmail}:</span> {c.note}
                </span>
                {isMe && (
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    className="flex-shrink-0 text-white/25 hover:text-red-400"
                    aria-label="Remove comment"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* The one thing that must always be visible and obvious — a
          slim, clearly-colored bar in the exact same spot every time,
          never buried under a growing comment list. */}
      <div className="flex-shrink-0 p-2">
        {adding ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                style={{ background: "rgba(36,120,255,0.18)", color: "#5B9DFF" }}
              >
                {formatTimestamp(capturedTimestamp)}
              </span>
              <input
                autoFocus
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Comment on this moment..."
                style={{ fontSize: "16px" }}
                className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/30"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={submit} className="flex-1 rounded-md bg-white py-1 text-xs font-semibold text-black">
                Send
              </button>
              <button onClick={() => setAdding(false)} className="rounded-md px-3 py-1 text-xs text-white/50 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startAdding}
            className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors hover:opacity-90"
            style={{ background: "rgba(36,120,255,0.15)", color: "#5B9DFF" }}
          >
            <span aria-hidden>+</span> Add comment at current moment
          </button>
        )}
      </div>
    </div>
  );
}