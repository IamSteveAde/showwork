"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import Image from "next/image";
import type { MediaItem, DeliverySection } from "@/app/[slug]/DeliveryPage";
import type { ReviewEntry } from "@/components/ReviewControls";
import VideoModal from "@/components/VideoModal";
import Lightbox from "@/components/Lightbox";
import DocModal from "@/components/Docmodal";
import { downloadFile, downloadAllAsZip, filenameFromUrl } from "@/lib/download";
import ReviewControls from "@/components/ReviewControls";

// ─────────────────────────────────────────────
// DOWNLOAD BUTTON — small icon, used on every grid tile and inside
// both modals. Shows a brief spinner state while the fetch is in flight.
// ─────────────────────────────────────────────
function DownloadIconButton({
  onDownload,
  light = false,
}: {
  onDownload: () => Promise<void>;
  light?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDownload();
    } catch (err) {
      // Now visible, not silent — a person clicking download and
      // seeing nothing happen has no way to know something's actually
      // wrong (e.g. a CORS block on the file storage) without this.
      setError(err instanceof Error ? err.message : "Download failed");
      setTimeout(() => setError(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label="Download"
        disabled={busy}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity duration-300 disabled:opacity-60"
        style={{ background: light ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.9)" }}
      >
      {busy ? (
        <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="rgba(8,8,8,0.25)" strokeWidth="1.5" />
          <path d="M10.5 6a4.5 4.5 0 0 0-4.5-4.5" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path
            d="M5.5 1v6.5M5.5 7.5L2.5 4.5M5.5 7.5L8.5 4.5M1.5 9.5H9.5"
            stroke="#080808"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      </button>
      {error && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-10 mt-1.5 w-max max-w-[200px] rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white"
          style={{ background: "rgba(220,38,38,0.95)" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────
function Header({
  clientName,
  logoUrl,
  primaryColor,
}: {
  clientName: string;
  logoUrl: string | null;
  primaryColor: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-6 transition-all duration-500 md:px-14"
      style={{
        background: scrolled ? "rgba(0,0,0,0.7)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={clientName} className="h-7 w-auto" />
        ) : (
          <span className="text-sm font-medium uppercase text-white" style={{ letterSpacing: "0.2em" }}>
            {clientName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: primaryColor }} />
        <p className="text-xs font-medium uppercase text-white/40" style={{ letterSpacing: "0.25em" }}>
          Private preview
        </p>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
function Hero({
  heroMedia,
  tagline,
  primaryColor,
  fileCount,
  onViewWork,
}: {
  heroMedia: MediaItem;
  tagline: string;
  primaryColor: string;
  fileCount: number;
  onViewWork: () => void;
}) {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <section ref={heroRef} className="relative h-screen w-full overflow-hidden bg-black">
      <motion.div style={{ scale: heroScale }} className="absolute inset-0 origin-center">
        {heroMedia.type === "VIDEO" ? (
          <video
            ref={videoRef}
            src={heroMedia.url}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
            style={{ opacity: 0.85 }}
          />
        ) : (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-full w-full"
            style={{ opacity: 0.85 }}
          >
            <Image
              src={heroMedia.url}
              alt={heroMedia.caption}
              fill
              priority
              sizes="100vw"
              quality={90}
              className="object-cover"
            />
          </motion.div>
        )}
      </motion.div>

      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.92) 100%)" }}
      />

      <motion.div
        style={{ opacity: heroOpacity }}
        className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-16 md:px-14 md:pb-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            className="mb-4 text-xs font-medium uppercase"
            style={{ color: `${primaryColor}b3`, letterSpacing: "0.4em" }}
          >
            {fileCount} file{fileCount === 1 ? "" : "s"} · full quality
          </p>
          <h1 className="max-w-3xl text-[clamp(2rem,5.5vw,4rem)] font-light leading-[1.1] tracking-tight text-white">
            {tagline}
          </h1>

          <motion.button
            onClick={onViewWork}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
            style={{ background: primaryColor, color: "#080808" }}
          >
            View the needful
            <span aria-hidden>↓</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────
// VIDEO GRID TILE
// ─────────────────────────────────────────────
function VideoTile({
  video,
  index,
  viewerEmail,
  onOpen,
  onReview,
}: {
  video: MediaItem;
  index: number;
  viewerEmail: string;
  onOpen: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-10%" });
  const nearView = useInView(containerRef, { once: true, margin: "800px" });
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (nearView) setShouldLoad(true);
  }, [nearView]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (inView) vid.play().catch(() => {});
    else vid.pause();
  }, [inView, shouldLoad]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="overflow-hidden rounded-xl bg-white/5"
    >
      <div onClick={onOpen} className="group relative aspect-video cursor-pointer">
        {shouldLoad && (
          <video
            ref={videoRef}
            src={video.url}
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-black/50 to-transparent" />

        {video.approvalStatus !== "PENDING" && (
          <div
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={
              video.approvalStatus === "APPROVED"
                ? { background: "#22C55E", color: "#080808" }
                : { background: "#F97316", color: "#080808" }
            }
          >
            {video.approvalStatus === "APPROVED" ? "✓ Approved" : "✎ Revision"}
          </div>
        )}

        <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <DownloadIconButton onDownload={() => downloadFile(video.url, filenameFromUrl(video.url))} />
        </div>

        {video.caption && (
          <p className="absolute bottom-3 left-3 text-xs font-medium text-white/80">{video.caption}</p>
        )}
      </div>

      <div style={{ background: "#141414" }}>
        <ReviewControls
          reviews={video.reviews}
          viewerEmail={viewerEmail}
          onApprove={() => onReview("APPROVED")}
          onRequestRevision={(note) => onReview("NEEDS_REVISION", note)}
        />
      </div>
    </motion.div>
  );
}

function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

// ─────────────────────────────────────────────
// DOCUMENT GRID TILE — PDF and DOCX. Shows the real first page, full
// height, never cropped like a photo would be — a document reads
// completely differently squeezed into a square. 2 per row on desktop,
// 1 per row on mobile, matching how much room a document actually needs
// to be legible at a glance.
// ─────────────────────────────────────────────
function DocTile({
  doc,
  index,
  viewerEmail,
  onOpen,
  onReview,
}: {
  doc: MediaItem;
  index: number;
  viewerEmail: string;
  onOpen: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      className="overflow-hidden rounded-xl bg-white"
    >
      <div onClick={onOpen} className="group relative aspect-[3/4] cursor-pointer">
        {doc.type === "PDF" ? (
          <iframe
            src={`${doc.url}#toolbar=0&navpanes=0&page=1`}
            title={doc.caption || "Document"}
            className="pointer-events-none h-full w-full border-0"
          />
        ) : (
          <iframe
            src={officeViewerUrl(doc.url)}
            title={doc.caption || "Document"}
            className="pointer-events-none h-full w-full border-0"
          />
        )}

        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />

        {doc.approvalStatus !== "PENDING" && (
          <div
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={
              doc.approvalStatus === "APPROVED"
                ? { background: "#22C55E", color: "#080808" }
                : { background: "#F97316", color: "#080808" }
            }
          >
            {doc.approvalStatus === "APPROVED" ? "✓ Approved" : "✎ Revision"}
          </div>
        )}

        <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <DownloadIconButton onDownload={() => downloadFile(doc.url, filenameFromUrl(doc.url))} light />
        </div>

        {doc.caption && (
          <p className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {doc.caption}
          </p>
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
  );
}

// ─────────────────────────────────────────────
// PHOTO GRID TILE
// ─────────────────────────────────────────────
function PhotoTile({
  photo,
  index,
  viewerEmail,
  onOpen,
  onReview,
}: {
  photo: MediaItem;
  index: number;
  viewerEmail: string;
  onOpen: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
}) {
  // Orientation isn't known until the image actually loads — landscape
  // shots get their own full-width row (never cropped, never squeezed
  // into a square), while portrait and square shots share the normal
  // 3-per-row (desktop) / 1-per-row (mobile) grid. Starts as null and
  // briefly renders at default width until the real aspect ratio is read.
  const [isLandscape, setIsLandscape] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      className={`overflow-hidden rounded-xl bg-black/5 ${isLandscape ? "col-span-full" : ""}`}
    >
      <div onClick={onOpen} className="group relative cursor-pointer">
        {/* Plain <img>, not next/image's `fill` mode — `fill` requires
            object-fit (cover/contain into a fixed box), which is exactly
            the cropping/letterboxing this needs to avoid. A normal
            width-100%-height-auto image always shows the complete photo
            at its real aspect ratio, whatever that is. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption}
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            const img = e.currentTarget;
            setIsLandscape(img.naturalWidth > img.naturalHeight);
          }}
          className="block w-full transition-transform duration-500 group-hover:scale-[1.01]"
        />

        {photo.approvalStatus !== "PENDING" && (
          <div
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={
              photo.approvalStatus === "APPROVED"
                ? { background: "#22C55E", color: "#080808" }
                : { background: "#F97316", color: "#080808" }
            }
          >
            {photo.approvalStatus === "APPROVED" ? "✓ Approved" : "✎ Revision"}
          </div>
        )}

        <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <DownloadIconButton onDownload={() => downloadFile(photo.url, filenameFromUrl(photo.url))} />
        </div>
      </div>

      <div style={{ background: "#141414" }}>
        <ReviewControls
          reviews={photo.reviews}
          viewerEmail={viewerEmail}
          onApprove={() => onReview("APPROVED")}
          onRequestRevision={(note) => onReview("NEEDS_REVISION", note)}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function ProjectContent({
  clientName,
  primaryColor,
  logoUrl,
  badgeVisible,
  media,
  sections,
  ungroupedMedia,
  heroMedia: creatorPickedHero,
  heroTagline,
  viewerName,
  viewerEmail,
}: {
  clientName: string;
  primaryColor: string;
  logoUrl: string | null;
  badgeVisible: boolean;
  media: MediaItem[];
  sections: DeliverySection[];
  ungroupedMedia: MediaItem[];
  heroMedia: MediaItem | null;
  heroTagline: string | null;
  viewerName: string | null;
  viewerEmail: string;
}) {
  const [openVideoIdx, setOpenVideoIdx] = useState<number | null>(null);
  const [openPhotoIdx, setOpenPhotoIdx] = useState<number | null>(null);
  const [openDocIdx, setOpenDocIdx] = useState<number | null>(null);
  // Zip-download status, keyed by whichever section's "Download all"
  // was clicked — each section downloads independently of the others.
  const [zippingSectionId, setZippingSectionId] = useState<string | null>(null);
  const [zipError, setZipError] = useState<{ sectionId: string; message: string } | null>(null);
  const contentStartRef = useRef<HTMLDivElement>(null);

  // Local, mutable copy of the media list so an approve/revision click
  // reflects instantly in the grid and inside the open modal, without
  // waiting on a round trip. The API call happens in the background.
  const [items, setItems] = useState(media);

  const submitReview = async (
    mediaId: string,
    status: "APPROVED" | "NEEDS_REVISION",
    note?: string
  ) => {
    const optimisticEntry: ReviewEntry = {
      reviewerName: viewerName,
      reviewerEmail: viewerEmail,
      status,
      note: status === "NEEDS_REVISION" ? note?.trim() || null : null,
      createdAt: new Date().toISOString(),
    };

    // Keep a copy of the previous state so a rejected duplicate can be
    // rolled back cleanly instead of leaving a stale optimistic update.
    const previousItems = items;

    // Replace this viewer's own entry if they already have one (they're
    // changing their mind) — never append a second row for the same
    // person. Then recompute the aggregate the same way the server
    // does: any open revision flag wins overall.
    setItems((prev) =>
      prev.map((m) => {
        if (m.id !== mediaId) return m;
        const withoutMine = m.reviews.filter(
          (r) => r.reviewerEmail.toLowerCase() !== viewerEmail.toLowerCase()
        );
        const nextReviews = [...withoutMine, optimisticEntry];
        const anyNeedsRevision = nextReviews.some((r) => r.status === "NEEDS_REVISION");
        const mostRecentRevision = [...nextReviews].reverse().find((r) => r.status === "NEEDS_REVISION");
        return {
          ...m,
          reviews: nextReviews,
          approvalStatus: anyNeedsRevision ? "NEEDS_REVISION" : "APPROVED",
          approvalNote: anyNeedsRevision ? mostRecentRevision?.note ?? null : null,
        };
      })
    );

    try {
      const res = await fetch(`/api/media/${mediaId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, reviewerName: viewerName, viewerEmail, clientName }),
      });

      // A genuine duplicate (409) — the server rejected it, so roll
      // back the optimistic change rather than leaving a state the
      // database doesn't actually agree with. In practice this should
      // rarely fire, since the buttons themselves already prevent
      // clicking the same verdict twice — this is just the safety net.
      if (!res.ok) {
        setItems(previousItems);
      }
    } catch {
      setItems(previousItems);
    }
  };

  // Applies the same live-edited approval status from `items` onto
  // whatever media object we're about to render, so a review click
  // reflects instantly everywhere, section-grouped or not.
  const withLiveStatus = (m: MediaItem): MediaItem =>
    items.find((i) => i.id === m.id) ?? m;

  // Flat, global lists — used only for each modal's prev/next
  // navigation, so "next" cycles through everything of that type across
  // every section, not just within the one section you opened it from.
  const videos = items.filter((m) => m.type === "VIDEO");
  const photos = items.filter((m) => m.type === "PHOTO");
  const docs = items.filter((m) => m.type === "PDF" || m.type === "DOCUMENT");

  // Rule: if any video exists, a video is always the hero — the creator's
  // pick only decides *which* video. A photo hero only happens when the
  // project has no video at all.
  const heroMedia =
    videos.length > 0
      ? (creatorPickedHero?.type === "VIDEO" ? creatorPickedHero : videos[0])
      : (creatorPickedHero ?? photos[0] ?? null);

  const tagline = heroTagline?.trim() || "The work. Delivered properly.";

  // Real, creator-named sections — this is what replaces the old fixed
  // "Films" / "Photography" split. Any file never assigned to a section
  // (from before sections existed) still shows, grouped separately by
  // type so it doesn't get lost.
  const ungroupedVideos = ungroupedMedia.filter((m) => m.type === "VIDEO");
  const ungroupedPhotos = ungroupedMedia.filter((m) => m.type === "PHOTO");
  const ungroupedDocs = ungroupedMedia.filter((m) => m.type === "PDF" || m.type === "DOCUMENT");

  const renderSections: {
    id: string;
    name: string;
    mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
    media: MediaItem[];
  }[] = [
    ...sections.map((s) => ({ id: s.id, name: s.name, mediaType: s.mediaType, media: s.media })),
    ...(ungroupedVideos.length > 0
      ? [{ id: "ungrouped-video", name: "Other films", mediaType: "VIDEO" as const, media: ungroupedVideos }]
      : []),
    ...(ungroupedPhotos.length > 0
      ? [{ id: "ungrouped-photo", name: "Other photos", mediaType: "PHOTO" as const, media: ungroupedPhotos }]
      : []),
    ...(ungroupedDocs.length > 0
      ? [{ id: "ungrouped-docs", name: "Other documents", mediaType: "PDF" as const, media: ungroupedDocs }]
      : []),
  ];

  const scrollToContent = () => {
    contentStartRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDownloadSection = async (sectionId: string, sectionMedia: MediaItem[], zipName: string) => {
    setZippingSectionId(sectionId);
    setZipError(null);
    try {
      await downloadAllAsZip(
        sectionMedia.map((m) => ({ url: m.url, filename: filenameFromUrl(m.url) })),
        zipName,
        () => {} // could show progress per-section if wanted later
      );
    } catch (err) {
      setZipError({
        sectionId,
        message: err instanceof Error ? err.message : "Download failed",
      });
      setTimeout(() => setZipError(null), 5000);
    }
    setZippingSectionId(null);
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-black"
    >
      <Header clientName={clientName} logoUrl={logoUrl} primaryColor={primaryColor} />

      {heroMedia && (
        <Hero
          heroMedia={heroMedia}
          tagline={tagline}
          primaryColor={primaryColor}
          fileCount={items.length}
          onViewWork={scrollToContent}
        />
      )}

      <div ref={contentStartRef} />

      {/* Real, creator-named sections — alternating background per
          section, same visual rhythm as the old fixed Films/Photography
          split, just with whatever name the creator actually gave it. */}
      {renderSections.map((section, sectionIdx) => {
        const isDark = sectionIdx % 2 === 0;
        const bg = isDark ? "#000000" : "#FAFAF7";
        const textColor = isDark ? "#FFFFFF" : "#111111";
        const countColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)";
        const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
        const isZipping = zippingSectionId === section.id;

        return (
          <section
            key={section.id}
            className="px-6 py-16 md:px-14 md:py-24"
            style={{ background: bg }}
          >
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-2xl font-light md:text-3xl" style={{ color: textColor }}>
                  {section.name}
                </h2>
                <div className="mx-6 hidden h-px flex-1 sm:block" style={{ background: dividerColor }} />
                <div className="relative flex items-center gap-4">
                  <span
                    className="text-xs font-medium uppercase"
                    style={{ color: countColor, letterSpacing: "0.2em" }}
                  >
                    {section.media.length}
                  </span>
                  <button
                    onClick={() =>
                      handleDownloadSection(
                        section.id,
                        section.media,
                        `${clientName}-${section.name.toLowerCase().replace(/\s+/g, "-")}.zip`
                      )
                    }
                    disabled={isZipping}
                    className="rounded-full border px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                    style={
                      isDark
                        ? { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }
                        : { borderColor: "rgba(0,0,0,0.15)", color: "rgba(0,0,0,0.7)" }
                    }
                  >
                    {isZipping ? "Zipping..." : "Download all"}
                  </button>
                  {zipError?.sectionId === section.id && (
                    <div
                      className="absolute right-0 top-full z-10 mt-1.5 w-max max-w-[220px] rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white"
                      style={{ background: "rgba(220,38,38,0.95)" }}
                    >
                      {zipError.message}
                    </div>
                  )}
                </div>
              </div>

              {section.mediaType === "VIDEO" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.media.map((v, i) => {
                    const live = withLiveStatus(v);
                    const globalIdx = videos.findIndex((x) => x.id === v.id);
                    return (
                      <VideoTile
                        key={v.id}
                        video={live}
                        index={i}
                        viewerEmail={viewerEmail}
                        onOpen={() => setOpenVideoIdx(globalIdx)}
                        onReview={(status, note) => submitReview(v.id, status, note)}
                      />
                    );
                  })}
                </div>
              ) : section.mediaType === "PHOTO" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
                  {section.media.map((p, i) => {
                    const live = withLiveStatus(p);
                    const globalIdx = photos.findIndex((x) => x.id === p.id);
                    return (
                      <PhotoTile
                        key={p.id}
                        photo={live}
                        index={i}
                        viewerEmail={viewerEmail}
                        onOpen={() => setOpenPhotoIdx(globalIdx)}
                        onReview={(status, note) => submitReview(p.id, status, note)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {section.media.map((d, i) => {
                    const live = withLiveStatus(d);
                    const globalIdx = docs.findIndex((x) => x.id === d.id);
                    return (
                      <DocTile
                        key={d.id}
                        doc={live}
                        index={i}
                        viewerEmail={viewerEmail}
                        onOpen={() => setOpenDocIdx(globalIdx)}
                        onReview={(status, note) => submitReview(d.id, status, note)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}

      <footer className="flex flex-col items-center gap-3 border-t border-white/5 bg-black px-6 py-14 text-center">
        <p className="text-sm font-light text-white/30">Presented to {clientName}</p>
        {badgeVisible && (
          <a
            href="https://spotliteafrica.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: primaryColor }}
          >
            Presented with Spotlite Africa →
          </a>
        )}
      </footer>

      <AnimatePresence>
        {openVideoIdx !== null && videos[openVideoIdx] && (
          <VideoModal
            video={videos[openVideoIdx]}
            index={openVideoIdx}
            total={videos.length}
            viewerEmail={viewerEmail}
            onClose={() => setOpenVideoIdx(null)}
            onPrev={() => setOpenVideoIdx((i) => (i! - 1 + videos.length) % videos.length)}
            onNext={() => setOpenVideoIdx((i) => (i! + 1) % videos.length)}
            onReview={(status, note) => submitReview(videos[openVideoIdx].id, status, note)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {openPhotoIdx !== null && photos[openPhotoIdx] && (
          <Lightbox
            photo={photos[openPhotoIdx]}
            index={openPhotoIdx}
            total={photos.length}
            viewerEmail={viewerEmail}
            onClose={() => setOpenPhotoIdx(null)}
            onPrev={() => setOpenPhotoIdx((i) => (i! - 1 + photos.length) % photos.length)}
            onNext={() => setOpenPhotoIdx((i) => (i! + 1) % photos.length)}
            onReview={(status, note) => submitReview(photos[openPhotoIdx].id, status, note)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {openDocIdx !== null && docs[openDocIdx] && (
          <DocModal
            doc={docs[openDocIdx]}
            index={openDocIdx}
            total={docs.length}
            viewerEmail={viewerEmail}
            onClose={() => setOpenDocIdx(null)}
            onPrev={() => setOpenDocIdx((i) => (i! - 1 + docs.length) % docs.length)}
            onNext={() => setOpenDocIdx((i) => (i! + 1) % docs.length)}
            onReview={(status, note) => submitReview(docs[openDocIdx].id, status, note)}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}