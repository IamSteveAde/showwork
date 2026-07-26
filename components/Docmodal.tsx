"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { MediaItem } from "@/app/[slug]/DeliveryPage";
import { downloadFile, filenameFromUrl } from "@/lib/download";
import ReviewControls from "@/components/ReviewControls";

function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

export default function DocModal({
  doc,
  index,
  total,
  viewerEmail,
  onClose,
  onPrev,
  onNext,
  onReview,
}: {
  doc: MediaItem;
  index: number;
  total: number;
  viewerEmail: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadFile(doc.url, filenameFromUrl(doc.url));
    } catch {
      // non-critical, fail silently
    } finally {
      setDownloading(false);
    }
  };

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

      <button
        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
        aria-label="Download"
        disabled={downloading}
        className="absolute right-[4.5rem] top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        {downloading ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
            <path d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v7.5M6.5 8.5L3 5M6.5 8.5L10 5M1.5 11.5H11.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="Previous document"
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 md:left-6"
          >
            ←
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="Next document"
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 md:right-6"
          >
            →
          </button>
        </>
      )}

      <motion.div
        key={doc.id}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-[92vw] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white"
      >
        <div className="relative flex-1">
          {doc.type === "PDF" ? (
            <iframe src={doc.url} title={doc.caption || "Document"} className="h-full w-full border-0" />
          ) : (
            <iframe
              src={officeViewerUrl(doc.url)}
              title={doc.caption || "Document"}
              className="h-full w-full border-0"
            />
          )}
        </div>
        <div style={{ background: "#141414" }}>
          <ReviewControls
            reviews={doc.reviews}
            viewerEmail={viewerEmail}
            onApprove={() => onReview("APPROVED")}
            onRequestRevision={(note) => onReview("NEEDS_REVISION", note)}
          />
        </div>
      </motion.div>

      {total > 1 && (
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-medium text-white/40">
          {index + 1} / {total}
        </p>
      )}
    </motion.div>
  );
}