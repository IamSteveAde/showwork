"use client";

import { useState } from "react";

export interface CalendarVideoCommentData {
  id: string;
  authorName: string | null;
  authorEmail: string;
  note: string;
  videoTimestampSeconds: number;
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CalendarVideoComments({
  comments,
  readOnly,
  getCurrentTime,
  onSeekTo,
  onAddComment,
}: {
  comments: CalendarVideoCommentData[];
  // Read-only for the manager/collaborator side — they see exactly
  // where feedback applies, but adding comments is a client-only
  // action for this feature, at least for now.
  readOnly: boolean;
  getCurrentTime?: () => number;
  onSeekTo: (seconds: number) => void;
  onAddComment?: (note: string, timestampSeconds: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [capturedTimestamp, setCapturedTimestamp] = useState(0);

  const startAdding = () => {
    setCapturedTimestamp(getCurrentTime?.() ?? 0);
    setNoteText("");
    setAdding(true);
  };

  const submit = () => {
    if (!noteText.trim() || !onAddComment) return;
    onAddComment(noteText.trim(), capturedTimestamp);
    setNoteText("");
    setAdding(false);
  };

  const sorted = [...comments].sort((a, b) => a.videoTimestampSeconds - b.videoTimestampSeconds);

  return (
    <div className="flex flex-col gap-2">
      {sorted.length > 0 && (
        <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
          {sorted.map((c) => (
            <div key={c.id} className="flex items-start gap-1.5 text-xs">
              <button
                onClick={() => onSeekTo(c.videoTimestampSeconds)}
                className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono font-semibold transition-colors hover:opacity-80"
                style={{ background: "rgba(36,120,255,0.18)", color: "#68B2FF" }}
                title="Jump to this moment"
              >
                {formatTimestamp(c.videoTimestampSeconds)}
              </button>
              <span className="min-w-0 flex-1 text-white/60">
                <span className="font-medium text-white/70">{c.authorName || c.authorEmail}:</span> {c.note}
              </span>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        adding ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold" style={{ background: "rgba(36,120,255,0.18)", color: "#68B2FF" }}>
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
            style={{ background: "rgba(36,120,255,0.15)", color: "#68B2FF" }}
          >
            <span aria-hidden>+</span> Comment at current moment
          </button>
        )
      )}
    </div>
  );
}