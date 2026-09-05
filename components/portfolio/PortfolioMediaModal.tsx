"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

export interface PortfolioMediaItem {
  id: string;
  type: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  url: string;
  caption: string | null;
  // Stored at upload time (width ÷ height) — null for anything
  // uploaded before this existed, or a video that hasn't been
  // through the one-time backfill. The gallery uses this directly
  // when present, and only falls back to detecting a specific item's
  // shape itself when it's missing.
  aspectRatio: number | null;
}

function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

export default function PortfolioMediaModal({
  item,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  item: PortfolioMediaItem;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4 py-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
      >
        ✕
      </button>

      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="Previous"
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 md:left-6"
          >
            ←
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="Next"
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 md:right-6"
          >
            →
          </button>
        </>
      )}

      <motion.div
        key={item.id}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className={`overflow-hidden rounded-2xl ${item.type === "PDF" || item.type === "DOCUMENT" ? "h-[85vh] w-[92vw] max-w-3xl bg-white" : "max-h-[85vh] max-w-[92vw] bg-black"}`}
        style={{ pointerEvents: "auto" }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      >
        {item.type === "VIDEO" ? (
          <video
            src={item.url}
            controls
            autoPlay
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            className="max-h-[85vh] max-w-[92vw] object-contain"
          />
        ) : item.type === "PHOTO" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.caption || ""} className="max-h-[85vh] max-w-[92vw] object-contain" draggable={false} />
        ) : item.type === "PDF" ? (
          <iframe src={item.url} title={item.caption || "Document"} className="h-full w-full border-0" />
        ) : (
          <iframe src={officeViewerUrl(item.url)} title={item.caption || "Document"} className="h-full w-full border-0" />
        )}
      </motion.div>

      {total > 1 && (
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-medium text-white/40">
          {index + 1} / {total}
        </p>
      )}
    </motion.div>
  );
}