"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

export interface ReviewEntry {
  reviewerName: string | null;
  reviewerEmail: string;
  status: "APPROVED" | "NEEDS_REVISION";
  note: string | null;
  createdAt: string;
}

/**
 * Opens when a creator clicks a file — shows a larger preview alongside
 * every single review left on it, each with who left it (name, falling
 * back to email if they somehow have no name on file) and what they
 * said. Multiple people can review the same file, so this is a list,
 * not a single "current status."
 */
export default function ReviewsModal({
  url,
  filename,
  type,
  caption,
  reviews,
  onClose,
}: {
  url: string;
  filename: string;
  type: "PHOTO" | "VIDEO";
  caption: string | null;
  reviews: ReviewEntry[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 py-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
      >
        ✕
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl md:flex-row"
        style={{ background: "#141414" }}
      >
        <div className="relative flex-1 bg-black" style={{ minHeight: 280 }}>
          {type === "VIDEO" ? (
            <video src={url} controls className="h-full max-h-[85vh] w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={caption || filename} className="h-full max-h-[85vh] w-full object-contain" />
          )}
        </div>

        <div className="flex w-full flex-col gap-3 overflow-y-auto p-5 md:w-80">
          <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Reviews ({reviews.length})
          </p>

          {reviews.length === 0 ? (
            <p className="text-sm text-white/30">No one has reviewed this file yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviews.map((r, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{r.reviewerName || "Unnamed viewer"}</p>
                      <p className="text-xs text-white/30">{r.reviewerEmail}</p>
                    </div>
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={
                        r.status === "APPROVED"
                          ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                          : { background: "rgba(249,115,22,0.15)", color: "#fdba74" }
                      }
                    >
                      {r.status === "APPROVED" ? "✓ Approved" : "✎ Revision"}
                    </span>
                  </div>
                  {r.note && (
                    <p className="mt-2 rounded bg-black/30 px-2 py-1.5 text-xs text-white/70">
                      &ldquo;{r.note}&rdquo;
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-white/25">
                    {new Date(r.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}