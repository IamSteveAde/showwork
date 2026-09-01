"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import Image from "next/image";
import type { MediaItem } from "@/app/[slug]/DeliveryPage";
import { downloadFile } from "@/lib/download";
import ReviewControls from "@/components/ReviewControls";

// How far (in pixels) or how fast a swipe needs to travel before it
// counts as "go to the next/previous photo" rather than an accidental
// small drag — matches the feel of a native gallery app's swipe.
const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 500;

export default function Lightbox({
  photo,
  index,
  total,
  viewerEmail,
  onClose,
  onPrev,
  onNext,
  onReview,
  onDeleteReview,
}: {
  photo: MediaItem;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
  viewerEmail: string;
  onDeleteReview: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // Review controls stay hidden by default — a genuinely full-screen,
  // distraction-free view, the same way a native photo gallery app
  // works. Tapping the small toggle reveals them on demand instead of
  // permanently occupying part of the screen.
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadFile(photo.id);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
      setTimeout(() => setDownloadError(null), 4000);
    } finally {
      setDownloading(false);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_DISTANCE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      onPrev();
    } else if (offset.x < -SWIPE_DISTANCE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      onNext();
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
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Full-bleed image — no card, no rounded corners, no max-width.
          Draggable horizontally for swipe navigation; a small drag
          that doesn't cross the threshold just snaps back in place. */}
      <motion.div
        key={photo.id}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative h-full w-full"
      >
        <Image
          src={photo.url}
          alt={photo.caption}
          fill
          sizes="100vw"
          quality={90}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="object-contain select-none"
        />
      </motion.div>

      {/* Minimal top-corner controls — small, semi-transparent, out of
          the way of the actual image. No prev/next arrows at all;
          navigation is swipe (or arrow keys on desktop) only. */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
      >
        ✕
      </button>

      <div className="absolute right-16 top-4 z-10">
        <button
          onClick={handleDownload}
          aria-label="Download photo"
          disabled={downloading}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white disabled:opacity-50"
        >
          {downloading ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <path d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M6.5 1v7.5M6.5 8.5L3 5M6.5 8.5L10 5M1.5 11.5H11.5"
                stroke="white"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        {downloadError && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-lg px-3 py-2 text-xs font-medium text-white shadow-lg"
            style={{ background: "rgba(220,38,38,0.95)" }}
          >
            {downloadError}
          </div>
        )}
      </div>

      {/* A small, quiet toggle for the approve/revision panel — tucked
          bottom-right rather than a bar permanently occupying the
          screen. Tapping it slides the real controls up from the
          bottom; tapping again (or picking an action) dismisses it. */}
      <button
        onClick={() => setReviewPanelOpen((v) => !v)}
        aria-label={reviewPanelOpen ? "Hide review options" : "Show review options"}
        className="absolute bottom-5 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {total > 1 && (
        <p className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-xs font-medium text-white/40">
          {index + 1} / {total}
        </p>
      )}

      <AnimatePresence>
        {reviewPanelOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-0 z-20"
            style={{ background: "#141414" }}
          >
            <ReviewControls
              reviews={photo.reviews}
              viewerEmail={viewerEmail}
              onDeleteReview={onDeleteReview}
              onApprove={() => {
                onReview("APPROVED");
                setReviewPanelOpen(false);
              }}
              onRequestRevision={(note) => {
                onReview("NEEDS_REVISION", note);
                setReviewPanelOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}