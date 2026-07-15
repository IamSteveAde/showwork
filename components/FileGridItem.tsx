"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ReplaceFileButton from "@/components/ReplaceFileButton";

interface FileGridItemProps {
  mediaId: string;
  url: string;
  filename: string;
  caption: string | null;
  type: "PHOTO" | "VIDEO";
  approvalStatus: "PENDING" | "APPROVED" | "NEEDS_REVISION";
  approvalNote: string | null;
}

export default function FileGridItem({
  mediaId,
  url,
  filename,
  caption,
  type,
  approvalStatus,
  approvalNote,
}: FileGridItemProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [editing, setEditing] = useState(false);
  const [captionText, setCaptionText] = useState(caption ?? "");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveCaption = async () => {
    await fetch(`/api/media/${mediaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: captionText }),
    });
    setEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/media/${mediaId}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="group relative aspect-square overflow-hidden rounded-xl bg-white/5"
        onMouseEnter={() => videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        }}
      >
        {type === "VIDEO" ? (
          <video
            ref={videoRef}
            src={url}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <Image
            src={url}
            alt={caption || filename}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            quality={80}
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}

        {/* approval badge */}
        {approvalStatus !== "PENDING" && (
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={
              approvalStatus === "APPROVED"
                ? { background: "#22C55E", color: "#080808" }
                : { background: "#F97316", color: "#080808" }
            }
          >
            {approvalStatus === "APPROVED" ? "✓ Approved" : "✎ Revision"}
          </div>
        )}

        {/* hover overlay: edit / delete */}
        <div className="absolute inset-0 flex items-start justify-end gap-1.5 bg-black/0 p-2 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            aria-label="Edit label"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 transition-transform hover:scale-105"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5L9.5 3.5L3.5 9.5H1.5V7.5L7.5 1.5Z" stroke="#080808" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            aria-label="Delete file"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 transition-transform hover:scale-105"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 3h7M4 3V1.8h3V3M3 3v6.2h5V3" stroke="#080808" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* caption edit overlay */}
        {editing && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col justify-end gap-2 bg-black/85 p-3"
          >
            <input
              autoFocus
              type="text"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder="Add a label..."
              style={{ fontSize: "16px" }}
              className="w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white outline-none"
            />
            <div className="flex gap-2">
              <button onClick={saveCaption} className="flex-1 rounded-md bg-white py-1.5 text-xs font-semibold text-black">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="rounded-md px-3 py-1.5 text-xs text-white/50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* delete confirmation overlay */}
        {confirmDelete && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-4 text-center"
          >
            <p className="text-xs text-white/80">Delete this file? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-3 py-1.5 text-xs text-white/50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="truncate px-0.5 text-xs text-white/50">{caption || filename}</p>

      {approvalStatus === "NEEDS_REVISION" && (
        <>
          {approvalNote && (
            <p className="rounded bg-black/30 px-2 py-1.5 text-xs text-white/70">
              &ldquo;{approvalNote}&rdquo;
            </p>
          )}
          <ReplaceFileButton mediaId={mediaId} type={type} label="↑ Upload revised version" />
        </>
      )}
    </div>
  );
}