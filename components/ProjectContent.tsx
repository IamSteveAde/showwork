"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import Image from "next/image";
import type { MediaItem } from "@/app/[slug]/DeliveryPage";
import VideoModal from "@/components/VideoModal";
import Lightbox from "@/components/Lightbox";
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

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await onDownload();
    } catch {
      // Silent — a failed download here isn't critical enough to
      // interrupt the viewing experience with an error message.
    } finally {
      setBusy(false);
    }
  };

  return (
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
  );
}

// ─────────────────────────────────────────────
// HEADER — persistent across the whole page.
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
// HERO — video always wins when one exists. A photo hero only happens
// if the project has no video at all.
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
  onOpen,
  onReview,
}: {
  video: MediaItem;
  index: number;
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
          status={video.approvalStatus}
          note={video.approvalNote}
          onApprove={() => onReview("APPROVED")}
          onRequestRevision={(note) => onReview("NEEDS_REVISION", note)}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// PHOTO GRID TILE — next/image for real optimization: resized,
// re-encoded (WebP/AVIF), and only loaded as it scrolls into view.
// This is the actual fix for slow photo loading.
// ─────────────────────────────────────────────
function PhotoTile({
  photo,
  index,
  onOpen,
  onReview,
}: {
  photo: MediaItem;
  index: number;
  onOpen: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      className="overflow-hidden rounded-xl bg-black/5"
    >
      <div onClick={onOpen} className="group relative aspect-[4/5] cursor-pointer">
        <Image
          src={photo.url}
          alt={photo.caption}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          quality={82}
          loading="lazy"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
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
          status={photo.approvalStatus}
          note={photo.approvalNote}
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
  heroMedia: creatorPickedHero,
  heroTagline,
  viewerEmail,
}: {
  clientName: string;
  primaryColor: string;
  logoUrl: string | null;
  badgeVisible: boolean;
  media: MediaItem[];
  heroMedia: MediaItem | null;
  heroTagline: string | null;
  viewerEmail: string;
}) {
  const [openVideoIdx, setOpenVideoIdx] = useState<number | null>(null);
  const [openPhotoIdx, setOpenPhotoIdx] = useState<number | null>(null);
  const [zippingVideos, setZippingVideos] = useState<string | null>(null);
  const [zippingPhotos, setZippingPhotos] = useState<string | null>(null);
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
    setItems((prev) =>
      prev.map((m) =>
        m.id === mediaId
          ? { ...m, approvalStatus: status, approvalNote: status === "NEEDS_REVISION" ? note ?? null : null }
          : m
      )
    );
    try {
      await fetch(`/api/media/${mediaId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, viewerEmail, clientName }),
      });
    } catch {
      // Best-effort — the click already reflects locally; a network
      // hiccup here isn't worth interrupting the viewer over.
    }
  };

  const videos = items.filter((m) => m.type === "VIDEO");
  const photos = items.filter((m) => m.type === "PHOTO");

  // Rule: if any video exists, a video is always the hero — the creator's
  // pick only decides *which* video. A photo hero only happens when the
  // project has no video at all.
  const heroMedia =
    videos.length > 0
      ? (creatorPickedHero?.type === "VIDEO" ? creatorPickedHero : videos[0])
      : (creatorPickedHero ?? photos[0] ?? null);

  const tagline = heroTagline?.trim() || "The work. Delivered properly.";

  // The hero item also appears again below, alongside everything else —
  // being the banner doesn't remove it from the collection.
  const gridVideos = videos;
  const gridPhotos = photos;

  const scrollToContent = () => {
    contentStartRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDownloadAllVideos = async () => {
    setZippingVideos("Preparing...");
    try {
      await downloadAllAsZip(
        gridVideos.map((v) => ({ url: v.url, filename: filenameFromUrl(v.url) })),
        `${clientName}-films.zip`,
        (done, total) => setZippingVideos(`Zipping ${done}/${total}...`)
      );
    } catch {
      setZippingVideos("Failed — try again");
      setTimeout(() => setZippingVideos(null), 2500);
      return;
    }
    setZippingVideos(null);
  };

  const handleDownloadAllPhotos = async () => {
    setZippingPhotos("Preparing...");
    try {
      await downloadAllAsZip(
        gridPhotos.map((p) => ({ url: p.url, filename: filenameFromUrl(p.url) })),
        `${clientName}-photos.zip`,
        (done, total) => setZippingPhotos(`Zipping ${done}/${total}...`)
      );
    } catch {
      setZippingPhotos("Failed — try again");
      setTimeout(() => setZippingPhotos(null), 2500);
      return;
    }
    setZippingPhotos(null);
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

      {/* FILMS — black surface */}
      {gridVideos.length > 0 && (
        <section className="bg-black px-6 py-16 md:px-14 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-light text-white md:text-3xl">Films</h2>
              <div className="mx-6 hidden h-px flex-1 sm:block" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium uppercase text-white/30" style={{ letterSpacing: "0.2em" }}>
                  {gridVideos.length}
                </span>
                <button
                  onClick={handleDownloadAllVideos}
                  disabled={!!zippingVideos}
                  className="rounded-full border px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white disabled:opacity-50"
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}
                >
                  {zippingVideos ?? "Download all"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gridVideos.map((v, i) => (
                <VideoTile
                  key={v.id}
                  video={v}
                  index={i}
                  onOpen={() => setOpenVideoIdx(i)}
                  onReview={(status, note) => submitReview(v.id, status, note)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PHOTOGRAPHY — off-white surface */}
      {gridPhotos.length > 0 && (
        <section className="px-6 py-16 md:px-14 md:py-24" style={{ background: "#FAFAF7" }}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-light md:text-3xl" style={{ color: "#111111" }}>
                Photography
              </h2>
              <div className="mx-6 hidden h-px flex-1 sm:block" style={{ background: "rgba(0,0,0,0.08)" }} />
              <div className="flex items-center gap-4">
                <span
                  className="text-xs font-medium uppercase"
                  style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em" }}
                >
                  {gridPhotos.length}
                </span>
                <button
                  onClick={handleDownloadAllPhotos}
                  disabled={!!zippingPhotos}
                  className="rounded-full border px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ borderColor: "rgba(0,0,0,0.15)", color: "rgba(0,0,0,0.7)" }}
                >
                  {zippingPhotos ?? "Download all"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {gridPhotos.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  index={i}
                  onOpen={() => setOpenPhotoIdx(i)}
                  onReview={(status, note) => submitReview(p.id, status, note)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="flex flex-col items-center gap-3 border-t border-white/5 bg-black px-6 py-14 text-center">
        <p className="text-sm font-light text-white/30">Presented by {clientName}</p>
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
        {openVideoIdx !== null && (
          <VideoModal
            video={gridVideos[openVideoIdx]}
            index={openVideoIdx}
            total={gridVideos.length}
            onClose={() => setOpenVideoIdx(null)}
            onPrev={() => setOpenVideoIdx((i) => (i! - 1 + gridVideos.length) % gridVideos.length)}
            onNext={() => setOpenVideoIdx((i) => (i! + 1) % gridVideos.length)}
            onReview={(status, note) => submitReview(gridVideos[openVideoIdx].id, status, note)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {openPhotoIdx !== null && (
          <Lightbox
            photo={gridPhotos[openPhotoIdx]}
            index={openPhotoIdx}
            total={gridPhotos.length}
            onClose={() => setOpenPhotoIdx(null)}
            onPrev={() => setOpenPhotoIdx((i) => (i! - 1 + gridPhotos.length) % gridPhotos.length)}
            onNext={() => setOpenPhotoIdx((i) => (i! + 1) % gridPhotos.length)}
            onReview={(status, note) => submitReview(gridPhotos[openPhotoIdx].id, status, note)}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}