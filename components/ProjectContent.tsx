"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import Image from "next/image";
import type { MediaItem, DeliverySection, DeliveryFolder } from "@/app/[slug]/DeliveryPage";
import type { ReviewEntry } from "@/components/ReviewControls";
import type { VideoCommentEntry } from "@/components/VideoComments";
import VideoModal from "@/components/VideoModal";
import Lightbox from "@/components/Lightbox";
import DocModal from "@/components/Docmodal";
import DeliveryStatusBanner from "@/components/DeliveryStatusBanner";
import { downloadFile, downloadAllAsZip } from "@/lib/download";
import ReviewControls from "@/components/ReviewControls";

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


function Header({
  clientName,
  logoUrl,
  primaryColor,
  sections,
}: {
  clientName: string;
  logoUrl: string | null;
  primaryColor: string;
  sections: { id: string; name: string }[];
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(8,8,8,0.82)" : "linear-gradient(to bottom, rgba(0,0,0,0.62), transparent)",
        backdropFilter: scrolled ? "blur(22px) saturate(140%)" : "blur(2px)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-4 md:px-10 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 backdrop-blur">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="text-[11px] font-semibold text-white">
                {clientName.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-[-0.02em] text-white">{clientName}</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/35">Private project</p>
          </div>
        </div>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1 backdrop-blur-xl md:flex">
          {sections.slice(0, 6).map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className={`rounded-full px-4 py-2 text-[10px] font-medium transition-all ${
                i === 0 ? "bg-white text-black" : "text-white/45 hover:bg-white/10 hover:text-white"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[9px] font-medium text-white/50 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: primaryColor }} />
            Secure preview
          </span>
          <button
            onClick={() => sections[0] && scrollToSection(sections[0].id)}
            className="rounded-full bg-white px-4 py-2 text-[10px] font-semibold text-black transition-transform hover:scale-[1.03]"
          >
            View work
          </button>
        </div>
      </div>

      {sections.length > 0 && (
        <div className="border-t border-white/[0.06] md:hidden">
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-5 py-2.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[10px] font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

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
  const heroOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <section ref={heroRef} className="relative h-[92svh] min-h-[680px] w-full overflow-hidden bg-[#080808]">
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
            style={{ opacity: 0.9 }}
          />
        ) : (
          <motion.div
            initial={{ scale: 1.02 }}
            animate={{ scale: [1.02, 1.08, 1.02] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-full w-full"
          >
            <Image src={heroMedia.url} alt={heroMedia.caption} fill priority sizes="100vw" quality={92} className="object-cover" />
          </motion.div>
        )}
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgba(255,255,255,0.12),transparent_26%)]" />

      <motion.div style={{ opacity: heroOpacity }} className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-12 px-6 pb-10 md:px-10 md:pb-14 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white"
                style={{ borderColor: `${primaryColor}66`, background: `${primaryColor}22` }}
              >
                Private presentation
              </span>
              <span className="text-[10px] text-white/35">{fileCount} assets</span>
            </div>
            <h1 className="max-w-4xl text-[clamp(3rem,7.5vw,7rem)] font-light leading-[0.88] tracking-[-0.085em] text-white">
              {tagline}
            </h1>
          </motion.div>

          <motion.button
            onClick={onViewWork}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="group flex shrink-0 items-center gap-4 self-start rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl transition hover:-translate-y-0.5 md:self-auto"
          >
            <span>Explore the work</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform group-hover:translate-y-0.5"
              style={{ background: primaryColor }}
            >
              ↓
            </span>
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}


const MAX_CONCURRENT_VIDEOS = 3;
const playingVideos: HTMLVideoElement[] = [];
function requestPlay(vid: HTMLVideoElement) {
  if (playingVideos.includes(vid)) return;
  if (playingVideos.length >= MAX_CONCURRENT_VIDEOS) playingVideos.shift()?.pause();
  playingVideos.push(vid);
  vid.play().catch(() => {});
}
function releasePlay(vid: HTMLVideoElement) {
  const idx = playingVideos.indexOf(vid);
  if (idx !== -1) playingVideos.splice(idx, 1);
  vid.pause();
}

function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

function detectAspectRatio(item: MediaItem): Promise<number> {
  return new Promise((resolve) => {
    if (item.type === "VIDEO") {
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.src = item.url;
      vid.onloadedmetadata = () => {
        resolve(vid.videoWidth && vid.videoHeight ? vid.videoWidth / vid.videoHeight : 1);
      };
      vid.onerror = () => resolve(1);
    } else {
      const img = new window.Image();
      img.onload = () => {
        resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
      };
      img.onerror = () => resolve(1);
      img.src = item.url;
    }
  });
}

interface JustifiedRow {
  items: MediaItem[];
  widths: number[];
  height: number;
}

function computeJustifiedRows(
  items: MediaItem[],
  aspectRatios: Record<string, number>,
  containerWidth: number,
  targetRowHeight: number,
  gap: number,
  maxPerRow: number
): JustifiedRow[] {
  const rows: JustifiedRow[] = [];
  let currentItems: MediaItem[] = [];
  let aspectSum = 0;

  const flushRow = (stretch: boolean) => {
    if (currentItems.length === 0) return;
    const totalGap = gap * (currentItems.length - 1);
    const height = stretch ? (containerWidth - totalGap) / aspectSum : targetRowHeight;
    const widths = currentItems.map((it) => aspectRatios[it.id] * height);
    rows.push({ items: currentItems, widths, height });
    currentItems = [];
    aspectSum = 0;
  };

  for (const item of items) {
    const ratio = aspectRatios[item.id] ?? 1;
    currentItems.push(item);
    aspectSum += ratio;
    const totalGap = gap * (currentItems.length - 1);
    const widthAtTargetHeight = aspectSum * targetRowHeight + totalGap;
    if (widthAtTargetHeight >= containerWidth || currentItems.length >= maxPerRow) {
      flushRow(true);
    }
  }
  flushRow(false);

  return rows;
}

function JustifiedWallGallery({
  items,
  viewerEmail,
  primaryColor,
  onOpen,
  onReview,
  onDeleteReview,
}: {
  items: MediaItem[];
  viewerEmail: string;
  primaryColor: string;
  onOpen: (item: MediaItem) => void;
  onReview: (mediaId: string, status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
  onDeleteReview: (mediaId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    items.forEach((item) => {
      if (aspectRatios[item.id] !== undefined) return;
      detectAspectRatio(item).then((ratio) => {
        if (!cancelled) setAspectRatios((prev) => ({ ...prev, [item.id]: ratio }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const allKnown = items.every((item) => aspectRatios[item.id] !== undefined);
  const gap = 1;
  const targetRowHeight = 340;
  const maxPerRow = isMobile ? 1 : 4;

  const rows = useMemo(() => {
    if (!allKnown || containerWidth === 0) return [];
    return computeJustifiedRows(items, aspectRatios, containerWidth, targetRowHeight, gap, maxPerRow);
  }, [allKnown, containerWidth, items, aspectRatios, maxPerRow]);

  let runningIndex = 0;

  return (
    <div ref={containerRef}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex justify-center" style={{ gap }}>
          {row.items.map((item, i) => {
            const idx = runningIndex++;
            return (
              <WallTile
                key={item.id}
                item={item}
                index={idx}
                viewerEmail={viewerEmail}
                primaryColor={primaryColor}
                width={row.widths[i]}
                height={row.height}
                onOpen={() => onOpen(item)}
                onReview={(status, note) => onReview(item.id, status, note)}
                onDeleteReview={() => onDeleteReview(item.id)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}


function WallTile({
  item,
  index,
  viewerEmail,
  primaryColor,
  width,
  height,
  onOpen,
  onReview,
  onDeleteReview,
}: {
  item: MediaItem;
  index: number;
  viewerEmail: string;
  primaryColor: string;
  width: number;
  height: number;
  onOpen: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
  onDeleteReview: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nearView = useInView(containerRef, { once: true, margin: "-20%" });
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (nearView) setShouldLoad(true);
  }, [nearView]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || item.type !== "VIDEO" || !shouldLoad) return;
    requestPlay(vid);
    const retry = () => requestPlay(vid);
    window.addEventListener("touchstart", retry, { once: true });
    window.addEventListener("click", retry, { once: true });
    return () => {
      releasePlay(vid);
      window.removeEventListener("touchstart", retry);
      window.removeEventListener("click", retry);
    };
  }, [shouldLoad, item.type]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.65, delay: (index % 8) * 0.025 }}
      className="group relative overflow-hidden rounded-[18px] bg-[#171717] shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
      style={{ width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={onOpen}
        onContextMenu={(e) => e.preventDefault()}
        className="relative cursor-pointer overflow-hidden"
        style={{ width, height }}
      >
        {item.type === "VIDEO" ? (
          shouldLoad ? (
            <video
              ref={videoRef}
              src={item.url}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out"
              style={{ transform: hovered ? "scale(1.045)" : "scale(1)" }}
            />
          ) : (
            <div className="absolute inset-0 bg-white/[0.04]" />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.caption}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-700 ease-out"
            style={{ transform: hovered ? "scale(1.045)" : "scale(1)" }}
          />
        )}

        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent 55%)",
          }}
        />

        {item.approvalStatus !== "PENDING" && (
          <div
            className="absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-semibold shadow-lg"
            style={
              item.approvalStatus === "APPROVED"
                ? { background: "#22C55E", color: "#07110A" }
                : { background: "#F97316", color: "#160A02" }
            }
          >
            {item.approvalStatus === "APPROVED" ? "✓ Approved" : "✎ Revision"}
          </div>
        )}

        <div
          className="absolute right-3 top-3 transition-all duration-300"
          style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(-5px)" }}
        >
          {item.type !== "VIDEO" && <DownloadIconButton onDownload={() => downloadFile(item.id)} />}
        </div>

        {item.type === "VIDEO" && (
          <div
            className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1.5 text-[9px] font-medium text-white/75 backdrop-blur"
            style={{ opacity: hovered ? 1 : 0 }}
          >
            Motion
          </div>
        )}

        {item.caption && (
          <div
            className="absolute inset-x-4 bottom-4 transition-all duration-300"
            style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(8px)" }}
          >
            <p className="truncate text-sm font-medium text-white">{item.caption}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/40">Open to review</p>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] bg-[#111111]">
        <ReviewControls
          reviews={item.reviews}
          viewerEmail={viewerEmail}
          onApprove={() => onReview("APPROVED")}
          onRequestRevision={(note) => onReview("NEEDS_REVISION", note)}
          onDeleteReview={onDeleteReview}
        />
      </div>
    </motion.div>
  );
}



function DocTile({
  doc,
  index,
  viewerEmail,
  onOpen,
  onReview,
  onDeleteReview,
}: {
  doc: MediaItem;
  index: number;
  viewerEmail: string;
  onOpen: () => void;
  onReview: (status: "APPROVED" | "NEEDS_REVISION", note?: string) => void;
  onDeleteReview: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: index * 0.035 }}
      className="group overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.07)]"
    >
      <div onClick={onOpen} className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-slate-100">
        {doc.type === "PDF" ? (
          <iframe src={`${doc.url}#toolbar=0&navpanes=0&page=1`} title={doc.caption || "Document"} className="pointer-events-none h-full w-full border-0" />
        ) : (
          <iframe src={officeViewerUrl(doc.url)} title={doc.caption || "Document"} className="pointer-events-none h-full w-full border-0" />
        )}

        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/[0.035]" />

        {doc.approvalStatus !== "PENDING" && (
          <div
            className="absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-semibold shadow-lg"
            style={
              doc.approvalStatus === "APPROVED"
                ? { background: "#22C55E", color: "#07110A" }
                : { background: "#F97316", color: "#160A02" }
            }
          >
            {doc.approvalStatus === "APPROVED" ? "✓ Approved" : "✎ Revision"}
          </div>
        )}

        <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
          <DownloadIconButton onDownload={() => downloadFile(doc.id)} light />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <p className="truncate text-sm font-medium text-slate-800">{doc.caption || "Untitled document"}</p>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-slate-400">{doc.type}</span>
      </div>

      <div className="border-t border-slate-100 bg-[#111111]">
        <ReviewControls
          reviews={doc.reviews}
          viewerEmail={viewerEmail}
          onApprove={() => onReview("APPROVED")}
          onRequestRevision={(note) => onReview("NEEDS_REVISION", note)}
          onDeleteReview={onDeleteReview}
        />
      </div>
    </motion.div>
  );
}


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
  deliveryStatus,
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
  deliveryStatus: "DELIVERED" | "APPROVED" | "PAID";
}) {
  const [openVideoIdx, setOpenVideoIdx] = useState<number | null>(null);
  const [openPhotoIdx, setOpenPhotoIdx] = useState<number | null>(null);
  const [openDocIdx, setOpenDocIdx] = useState<number | null>(null);
  const [zippingSectionId, setZippingSectionId] = useState<string | null>(null);
  const [zipError, setZipError] = useState<{ sectionId: string; message: string } | null>(null);
  const contentStartRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState(media);

  // Timestamped video comments, per media item — kept as its own
  // piece of state rather than folded into `items`, since comments
  // have nothing to do with approval status the way reviews do; this
  // is purely a display/annotation concern layered on top.
  const [commentsByMedia, setCommentsByMedia] = useState<Record<string, VideoCommentEntry[]>>(
    Object.fromEntries(media.map((m) => [m.id, m.comments ?? []]))
  );

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

    const previousItems = items;

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

      if (!res.ok) {
        setItems(previousItems);
      }
    } catch {
      setItems(previousItems);
    }
  };

  const deleteReview = async (mediaId: string) => {
    const previousItems = items;

    setItems((prev) =>
      prev.map((m) => {
        if (m.id !== mediaId) return m;
        const nextReviews = m.reviews.filter(
          (r) => r.reviewerEmail.toLowerCase() !== viewerEmail.toLowerCase()
        );
        const anyNeedsRevision = nextReviews.some((r) => r.status === "NEEDS_REVISION");
        const mostRecentRevision = [...nextReviews].reverse().find((r) => r.status === "NEEDS_REVISION");
        return {
          ...m,
          reviews: nextReviews,
          approvalStatus: nextReviews.length === 0 ? "PENDING" : anyNeedsRevision ? "NEEDS_REVISION" : "APPROVED",
          approvalNote: anyNeedsRevision ? mostRecentRevision?.note ?? null : null,
        };
      })
    );

    try {
      const res = await fetch(`/api/media/${mediaId}/review`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerEmail }),
      });
      if (!res.ok) {
        setItems(previousItems);
      }
    } catch {
      setItems(previousItems);
    }
  };

  // Adds a new timestamped comment — optimistic with a temporary id,
  // swapped for the real one once the server confirms it, removed
  // entirely if the request fails.
  const addComment = async (mediaId: string, note: string, videoTimestampSeconds: number) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticComment: VideoCommentEntry = {
      id: tempId,
      reviewerName: viewerName,
      reviewerEmail: viewerEmail,
      note,
      videoTimestampSeconds,
      createdAt: new Date().toISOString(),
    };

    setCommentsByMedia((prev) => ({
      ...prev,
      [mediaId]: [...(prev[mediaId] ?? []), optimisticComment],
    }));

    try {
      const res = await fetch(`/api/media/${mediaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, videoTimestampSeconds, reviewerName: viewerName, viewerEmail }),
      });
      if (!res.ok) {
        setCommentsByMedia((prev) => ({
          ...prev,
          [mediaId]: (prev[mediaId] ?? []).filter((c) => c.id !== tempId),
        }));
        return;
      }
      const { comment } = await res.json();
      setCommentsByMedia((prev) => ({
        ...prev,
        [mediaId]: (prev[mediaId] ?? []).map((c) => (c.id === tempId ? comment : c)),
      }));
    } catch {
      setCommentsByMedia((prev) => ({
        ...prev,
        [mediaId]: (prev[mediaId] ?? []).filter((c) => c.id !== tempId),
      }));
    }
  };

  const deleteComment = async (mediaId: string, commentId: string) => {
    const previousComments = commentsByMedia[mediaId] ?? [];

    setCommentsByMedia((prev) => ({
      ...prev,
      [mediaId]: (prev[mediaId] ?? []).filter((c) => c.id !== commentId),
    }));

    try {
      const res = await fetch(`/api/media/${mediaId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerEmail }),
      });
      if (!res.ok) {
        setCommentsByMedia((prev) => ({ ...prev, [mediaId]: previousComments }));
      }
    } catch {
      setCommentsByMedia((prev) => ({ ...prev, [mediaId]: previousComments }));
    }
  };

  const withLiveStatus = (m: MediaItem): MediaItem =>
    items.find((i) => i.id === m.id) ?? m;

  const videos = items.filter((m) => m.type === "VIDEO");
  const photos = items.filter((m) => m.type === "PHOTO");
  const docs = items.filter((m) => m.type === "PDF" || m.type === "DOCUMENT");

  const heroMedia =
    videos.length > 0
      ? (creatorPickedHero?.type === "VIDEO" ? creatorPickedHero : videos[0])
      : (creatorPickedHero ?? photos[0] ?? null);

  const tagline = heroTagline?.trim() || "The work. Delivered properly.";

  const ungroupedVideos = ungroupedMedia.filter((m) => m.type === "VIDEO");
  const ungroupedPhotos = ungroupedMedia.filter((m) => m.type === "PHOTO");
  const ungroupedDocs = ungroupedMedia.filter((m) => m.type === "PDF" || m.type === "DOCUMENT");

  const renderSections: {
    id: string;
    name: string;
    mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
    media: MediaItem[];
    folders: DeliveryFolder[];
  }[] = [
    ...sections.map((s) => ({ id: s.id, name: s.name, mediaType: s.mediaType, media: s.media, folders: s.folders })),
    ...(ungroupedVideos.length > 0
      ? [{ id: "ungrouped-video", name: "Other films", mediaType: "VIDEO" as const, media: ungroupedVideos, folders: [] }]
      : []),
    ...(ungroupedPhotos.length > 0
      ? [{ id: "ungrouped-photo", name: "Other photos", mediaType: "PHOTO" as const, media: ungroupedPhotos, folders: [] }]
      : []),
    ...(ungroupedDocs.length > 0
      ? [{ id: "ungrouped-docs", name: "Other documents", mediaType: "PDF" as const, media: ungroupedDocs, folders: [] }]
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
        sectionMedia.map((m) => ({ mediaId: m.id })),
        zipName,
        () => {}
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
      transition={{ duration: 0.65 }}
      className="min-h-screen bg-[#090909] text-white"
    >
      <Header
        clientName={clientName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        sections={renderSections.map((s) => ({ id: s.id, name: s.name }))}
      />

      {heroMedia && (
        <Hero
          heroMedia={heroMedia}
          tagline={tagline}
          primaryColor={primaryColor}
          fileCount={items.length}
          onViewWork={scrollToContent}
        />
      )}

      <div ref={contentStartRef} className="scroll-mt-28" />
      <DeliveryStatusBanner status={deliveryStatus} />

      <section className="bg-[#090909] px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em]" style={{ color: primaryColor }}>
                The project
              </p>
              <h2 className="mt-3 text-3xl font-light tracking-[-0.055em] text-white md:text-5xl">
                Explore everything, at your pace.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/35">
              Open any asset to view it in full, leave feedback, request a revision, or approve it.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Assets", items.length],
              ["Films", videos.length],
              ["Images", photos.length],
              ["Documents", docs.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
                <p className="text-2xl font-light tracking-[-0.04em] text-white">{value}</p>
                <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.15em] text-white/25">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {renderSections.map((section, sectionIdx) => {
        const isDark = sectionIdx % 2 === 0;
        const bg = isDark ? "#090909" : "#F6F6F2";
        const textColor = isDark ? "#FFFFFF" : "#111111";
        const countColor = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.35)";
        const isZipping = zippingSectionId === section.id;

        return (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-28 px-5 py-20 md:px-10 md:py-28"
            style={{ background: bg }}
          >
            <div className="mx-auto max-w-[1500px]">
              <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="mt-1 text-[9px] font-semibold tracking-[0.2em]" style={{ color: isDark ? `${primaryColor}` : "rgba(0,0,0,0.28)" }}>
                    {String(sectionIdx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: isDark ? `${primaryColor}` : "#2563EB" }}>
                      {section.mediaType === "VIDEO" ? "Film" : section.mediaType === "PHOTO" ? "Photography" : "Documents"}
                    </p>
                    <h2 className="mt-2 text-3xl font-light tracking-[-0.06em] md:text-5xl" style={{ color: textColor }}>
                      {section.name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: countColor }}>
                    {section.media.length} {section.media.length === 1 ? "item" : "items"}
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
                    className="rounded-full border px-4 py-2 text-[10px] font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={
                      isDark
                        ? { borderColor: "rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.04)" }
                        : { borderColor: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.7)", background: "rgba(255,255,255,0.75)" }
                    }
                  >
                    {isZipping ? "Preparing…" : "Download all"}
                  </button>
                </div>
              </div>

              {zipError?.sectionId === section.id && (
                <div className="mb-5 rounded-xl bg-red-500 px-4 py-3 text-xs font-medium text-white">{zipError.message}</div>
              )}

              {section.mediaType === "VIDEO" || section.mediaType === "PHOTO" ? (
                <JustifiedWallGallery
                  items={section.media.map(withLiveStatus)}
                  viewerEmail={viewerEmail}
                  primaryColor={primaryColor}
                  onOpen={(item) => {
                    const list = section.mediaType === "VIDEO" ? videos : photos;
                    const globalIdx = list.findIndex((x) => x.id === item.id);
                    section.mediaType === "VIDEO" ? setOpenVideoIdx(globalIdx) : setOpenPhotoIdx(globalIdx);
                  }}
                  onReview={(mediaId, status, note) => submitReview(mediaId, status, note)}
                  onDeleteReview={(mediaId) => deleteReview(mediaId)}
                />
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
                        onDeleteReview={() => deleteReview(d.id)}
                      />
                    );
                  })}
                </div>
              )}

              {section.folders.map((folder) => (
                <div key={folder.id} className="mt-16">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="h-px w-8" style={{ background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.16)" }} />
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                      {folder.name}
                    </h3>
                  </div>

                  {section.mediaType === "VIDEO" || section.mediaType === "PHOTO" ? (
                    <JustifiedWallGallery
                      items={folder.media.map(withLiveStatus)}
                      viewerEmail={viewerEmail}
                      primaryColor={primaryColor}
                      onOpen={(item) => {
                        const list = section.mediaType === "VIDEO" ? videos : photos;
                        const globalIdx = list.findIndex((x) => x.id === item.id);
                        section.mediaType === "VIDEO" ? setOpenVideoIdx(globalIdx) : setOpenPhotoIdx(globalIdx);
                      }}
                      onReview={(mediaId, status, note) => submitReview(mediaId, status, note)}
                      onDeleteReview={(mediaId) => deleteReview(mediaId)}
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      {folder.media.map((d, i) => {
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
                            onDeleteReview={() => deleteReview(d.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <footer className="bg-[#090909] px-6 py-20 text-center md:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 h-10 w-10 rounded-full border border-white/10 bg-white/[0.04]" />
          <p className="text-2xl font-light tracking-[-0.045em] text-white md:text-3xl">
            That’s the work.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/30">
            Presented privately to {clientName}. Every asset is available in full quality.
          </p>
          {badgeVisible && (
            <a
              href="https://useshowwork.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex rounded-full border px-4 py-2 text-[10px] font-semibold transition hover:bg-white/5"
              style={{ color: primaryColor, borderColor: `${primaryColor}40` }}
            >
              Presented with Showwork →
            </a>
          )}
        </div>
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
            onDeleteReview={() => deleteReview(videos[openVideoIdx].id)}
            comments={commentsByMedia[videos[openVideoIdx].id] ?? []}
            onAddComment={(note, timestamp) => addComment(videos[openVideoIdx].id, note, timestamp)}
            onDeleteComment={(commentId) => deleteComment(videos[openVideoIdx].id, commentId)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openPhotoIdx !== null && photos[openPhotoIdx] && (
          <Lightbox
            key="lightbox"
            photo={photos[openPhotoIdx]}
            index={openPhotoIdx}
            total={photos.length}
            viewerEmail={viewerEmail}
            onClose={() => setOpenPhotoIdx(null)}
            onPrev={() => setOpenPhotoIdx((i) => (i! - 1 + photos.length) % photos.length)}
            onNext={() => setOpenPhotoIdx((i) => (i! + 1) % photos.length)}
            onReview={(status, note) => submitReview(photos[openPhotoIdx].id, status, note)}
            onDeleteReview={() => deleteReview(photos[openPhotoIdx].id)}
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
            onDeleteReview={() => deleteReview(docs[openDocIdx].id)}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}