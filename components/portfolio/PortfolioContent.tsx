"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import PortfolioMediaModal, { type PortfolioMediaItem } from "@/components/portfolio/PortfolioMediaModal";
import WhatsAppChatWidget from "@/components/portfolio/WhatsAppChatWidget";

interface PortfolioSectionData {
  id: string;
  name: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  media: PortfolioMediaItem[];
}

function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

const DEFAULT_CTA_TEXT =
  "Let's create something worth remembering — reach out and let's deliver the best for your next project.";

function whatsappHref(number: string, companyName: string): string {
  const digitsOnly = number.replace(/[^0-9]/g, "");
  const message = `Hi ${companyName}, I saw your portfolio on Showwork and I'd love to talk about a project.`;
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

function IconWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.85L2.05 22l5.36-1.4a9.9 9.9 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.13-2.9-7C17 3.03 14.53 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.25 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="M3 6.5l9 6.5 9-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTwitter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7C16.4 3.66 15.4 3.57 14.2 3.57c-2.4 0-4.05 1.47-4.05 4.16v2.16H7.4V13h2.75v8h3.35Z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12s0-3.1-.4-4.6a3 3 0 0 0-2.1-2.1C17.9 5 12 5 12 5s-5.9 0-7.5.3a3 3 0 0 0-2.1 2.1C2 8.9 2 12 2 12s0 3.1.4 4.6a3 3 0 0 0 2.1 2.1C6.1 19 12 19 12 19s5.9 0 7.5-.3a3 3 0 0 0 2.1-2.1c.4-1.5.4-4.6.4-4.6Zm-11.9 3V9l5.2 3-5.2 3Z" />
    </svg>
  );
}

// A repeating 6-tile rhythm — one large "feature" tile, a tall one, a
// wide one, and three standard squares — cycling for however many
// items a section has. This is what makes it read as *designed*
// rather than random: the same considered pattern Apple's editorial
// pages and premium agency reels use, not an arbitrary shuffle.
function bentoSpan(index: number): string {
  const pattern = [
    "col-span-2 row-span-2", // feature
    "col-span-1 row-span-1",
    "col-span-1 row-span-2", // tall
    "col-span-2 row-span-1", // wide
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
  ];
  return pattern[index % pattern.length];
}

// Shared across every tile on the page — caps how many videos can
// ever be decoding/playing at the same time. This, not the fade-in
// animations, is what actually causes scroll jank on a media-heavy
// page: a fast scroll past a dozen autoplay video tiles can trigger a
// dozen simultaneous video decodes, which is genuinely expensive.
// Real sites with lots of autoplay media (Vimeo showcases, agency
// reels) all cap concurrent playback the same way.
const MAX_CONCURRENT_VIDEOS = 3;
const playingVideos: HTMLVideoElement[] = [];

function requestPlay(vid: HTMLVideoElement) {
  if (playingVideos.includes(vid)) return;
  if (playingVideos.length >= MAX_CONCURRENT_VIDEOS) {
    playingVideos.shift()?.pause();
  }
  playingVideos.push(vid);
  vid.play().catch(() => {});
}

function releasePlay(vid: HTMLVideoElement) {
  const idx = playingVideos.indexOf(vid);
  if (idx !== -1) playingVideos.splice(idx, 1);
  vid.pause();
}

function BentoTile({
  item,
  index,
  onOpen,
}: {
  item: PortfolioMediaItem;
  index: number;
  onOpen: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Tighter margin than before (-20% instead of -10%) — a tile has to
  // be meaningfully on screen, not just barely peeking into view,
  // before it's considered "in view" and allowed to play. Fewer tiles
  // qualify at once during a fast scroll, so fewer videos ever compete
  // for the concurrency slots above.
  const inView = useInView(containerRef, { once: false, margin: "-20%" });
  const nearView = useInView(containerRef, { once: true, margin: "800px" });
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (nearView) setShouldLoad(true);
  }, [nearView]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || item.type !== "VIDEO") return;
    if (inView) requestPlay(vid);
    else releasePlay(vid);
    return () => releasePlay(vid);
  }, [inView, shouldLoad, item.type]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative cursor-pointer overflow-hidden rounded-xl bg-black ${bentoSpan(index)}`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "300px 300px" }}
      onClick={onOpen}
      onContextMenu={(e) => e.preventDefault()}
    >
      {item.type === "VIDEO" ? (
        shouldLoad && (
          <video
            ref={videoRef}
            src={item.url}
            muted
            loop
            playsInline
            preload="auto"
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.05] group-hover:brightness-110"
          />
        )
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.caption || ""}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover transition-all duration-700 ease-out group-hover:scale-[1.05] group-hover:brightness-110"
        />
      )}

      {/* Thin gold edge on hover — the "tile lights up" feel, like a
          museum panel being highlighted, rather than the whole card
          lifting off the page. */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-[#F5C842]/70" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />

      {item.type === "VIDEO" && (
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          <span className="text-[9px] font-medium uppercase tracking-wider text-white/80">Playing</span>
        </div>
      )}

      {item.caption && (
        <p className="pointer-events-none absolute bottom-3 left-4 right-4 translate-y-1 truncate text-sm font-medium text-white opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
          {item.caption}
        </p>
      )}
    </motion.div>
  );
}

function DocTile({ item, index, onOpen }: { item: PortfolioMediaItem; index: number; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl bg-white shadow-lg shadow-black/10 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
      style={{ contentVisibility: "auto", containIntrinsicSize: "300px 400px" }}
      onClick={onOpen}
    >
      {item.type === "PDF" ? (
        <iframe src={`${item.url}#toolbar=0&navpanes=0&page=1`} title={item.caption || "Document"} className="pointer-events-none h-full w-full border-0" />
      ) : (
        <iframe src={officeViewerUrl(item.url)} title={item.caption || "Document"} className="pointer-events-none h-full w-full border-0" />
      )}
      {item.caption && (
        <p className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">{item.caption}</p>
      )}
    </motion.div>
  );
}

export default function PortfolioContent({
  companyName,
  logoUrl,
  primaryColor,
  bgColor,
  heroMedia,
  heroTagline,
  sections,
  ungroupedMedia,
  contactEmail,
  whatsappNumber,
  ctaText,
  instagramUrl,
  twitterUrl,
  linkedinUrl,
  tiktokUrl,
  facebookUrl,
  youtubeUrl,
}: {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  bgColor: string;
  heroMedia: PortfolioMediaItem | null;
  heroTagline: string | null;
  sections: PortfolioSectionData[];
  ungroupedMedia: PortfolioMediaItem[];
  contactEmail: string | null;
  whatsappNumber: string | null;
  ctaText: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const allItems: PortfolioMediaItem[] = [...sections.flatMap((s) => s.media), ...ungroupedMedia];

  const renderSections = [
    ...sections,
    ...(ungroupedMedia.length > 0 ? [{ id: "ungrouped", name: "More work", mediaType: "PHOTO" as const, media: ungroupedMedia }] : []),
  ];

  return (
    <main className="min-h-screen" style={{ background: bgColor }}>
      <header
        className="fixed left-[5%] right-[5%] top-4 z-30 flex items-center justify-between rounded-full px-6 py-3.5 transition-shadow duration-500 md:top-6 md:px-8"
        style={{
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.35)" : "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-6 w-auto" />
        ) : (
          <span className="truncate text-sm font-medium uppercase text-white" style={{ letterSpacing: "0.15em" }}>
            {companyName}
          </span>
        )}

        <div className="flex items-center gap-4">
          <span className="hidden text-xs font-medium uppercase text-white/40 sm:inline" style={{ letterSpacing: "0.2em" }}>
            Portfolio
          </span>
          {(whatsappNumber || contactEmail) && <div className="hidden h-4 w-px bg-white/15 sm:block" />}
          {whatsappNumber && (
            <a
              href={whatsappHref(whatsappNumber, companyName)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message on WhatsApp"
              className="text-white/70 transition-colors hover:text-white"
            >
              <IconWhatsApp />
            </a>
          )}
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              aria-label="Email"
              className="text-white/70 transition-colors hover:text-white"
            >
              <IconEmail />
            </a>
          )}
        </div>
      </header>

      {heroMedia && (
        <section className="fixed inset-0 z-0 h-screen w-full overflow-hidden bg-black">
          {heroMedia.type === "VIDEO" ? (
            <video src={heroMedia.url} autoPlay muted loop playsInline className="h-full w-full object-cover" style={{ opacity: 0.85 }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroMedia.url} alt="" className="h-full w-full object-cover" style={{ opacity: 0.85 }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.92) 100%)" }} />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-20 md:px-14 md:pb-24"
          >
            <h1 className="max-w-2xl text-[clamp(1.75rem,5vw,3.5rem)] font-light leading-[1.15] tracking-tight text-white">
              {heroTagline || `The work of ${companyName}`}
            </h1>
            <button
              onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="mt-8 flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: primaryColor, color: "#080808" }}
            >
              View the work
              <span aria-hidden>↓</span>
            </button>
          </motion.div>
        </section>
      )}

      {heroMedia && <div className="h-screen w-full" aria-hidden />}

      <div className="relative z-10" style={{ background: bgColor }}>
        <div ref={contentRef} />

        {renderSections.map((section, i) => {
          const isDark = i % 2 === 0;
          const textColor = isDark ? "#FFFFFF" : "#111111";
          const numberColor = isDark ? "rgba(245,200,66,0.5)" : "rgba(0,0,0,0.25)";

          return (
            <section key={section.id} className="px-6 py-24 md:px-14 md:py-32" style={{ background: isDark ? "#000000" : "#FAFAF7" }}>
              <div className="mx-auto max-w-[1400px]">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7 }}
                  className="mb-14 flex items-baseline gap-4"
                >
                  <span className="text-sm font-light" style={{ color: numberColor }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-3xl font-light tracking-tight md:text-5xl" style={{ color: textColor }}>
                    {section.name}
                  </h2>
                </motion.div>

                {section.mediaType === "DOCUMENT" || section.mediaType === "PDF" ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {section.media.map((item, idx) => (
                      <DocTile key={item.id} item={item} index={idx} onOpen={() => setOpenIdx(allItems.findIndex((x) => x.id === item.id))} />
                    ))}
                  </div>
                ) : (
                  // The bento tile grid — fixed row height, deliberate
                  // varied spans per tile, gapless rhythm. This is the
                  // structured, "designed panel wall" feel, distinct
                  // from a loose masonry flow.
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" style={{ gridAutoRows: "180px" }}>
                    {section.media.map((item, idx) => (
                      <BentoTile key={item.id} item={item} index={idx} onOpen={() => setOpenIdx(allItems.findIndex((x) => x.id === item.id))} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}

        {/* ── GET IN TOUCH — the section after all the work, before
             the footer. This is where a client who's been scrolling
             through the portfolio actually acts on it. ── */}
        {(whatsappNumber || contactEmail) && (
          <section className="relative overflow-hidden px-6 py-28 text-center md:px-14 md:py-40" style={{ background: "#F3F0EA" }}>
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{ background: `radial-gradient(ellipse at center, ${primaryColor}44 0%, transparent 65%)` }}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto max-w-2xl"
            >
              <p className="mb-4 text-xs font-semibold uppercase" style={{ color: primaryColor, letterSpacing: "0.25em" }}>
                Get in touch
              </p>
              <h2 className="mb-10 text-2xl font-light leading-snug md:text-4xl" style={{ color: "#111111" }}>
                {ctaText || DEFAULT_CTA_TEXT}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {whatsappNumber && (
                  <a
                    href={whatsappHref(whatsappNumber, companyName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-full px-8 py-4 text-sm font-semibold transition-transform hover:scale-[1.03]"
                    style={{ background: primaryColor, color: "#080808" }}
                  >
                    <IconWhatsApp />
                    Message on WhatsApp
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-2.5 rounded-full border px-8 py-4 text-sm font-semibold transition-colors hover:bg-black/[0.03]"
                    style={{ borderColor: "rgba(0,0,0,0.15)", color: "#111111" }}
                  >
                    <IconEmail />
                    Email us
                  </a>
                )}
              </div>
            </motion.div>
          </section>
        )}

        <footer className="border-t border-white/5 bg-black px-6 py-14 md:px-14">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <p className="text-sm font-light text-white/40">{companyName}</p>

            {(contactEmail || whatsappNumber) && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-xs text-white/50 transition-colors hover:text-white">
                    <IconEmail />
                    {contactEmail}
                  </a>
                )}
                {whatsappNumber && (
                  <a
                    href={whatsappHref(whatsappNumber, companyName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-white/50 transition-colors hover:text-white"
                  >
                    <IconWhatsApp />
                    WhatsApp
                  </a>
                )}
              </div>
            )}

            {(instagramUrl || twitterUrl || linkedinUrl || tiktokUrl || facebookUrl || youtubeUrl) && (
              <div className="flex items-center gap-4 text-white/40">
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="transition-colors hover:text-white">
                    <IconInstagram />
                  </a>
                )}
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" className="transition-colors hover:text-white">
                    <IconTwitter />
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="transition-colors hover:text-white">
                    <IconLinkedIn />
                  </a>
                )}
                {tiktokUrl && (
                  <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="transition-colors hover:text-white">
                    <IconTikTok />
                  </a>
                )}
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="transition-colors hover:text-white">
                    <IconFacebook />
                  </a>
                )}
                {youtubeUrl && (
                  <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="transition-colors hover:text-white">
                    <IconYouTube />
                  </a>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-col items-center gap-3">
              <a
                href="https://useshowwork.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-white/30 transition-colors hover:text-white/50"
              >
                Portfolio powered by Showwork
              </a>
              <a
                href="https://useshowwork.com/signup?next=/dashboard/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border px-5 py-2 text-xs font-semibold transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.15)", color: primaryColor }}
              >
                Create your own portfolio — free →
              </a>
            </div>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {openIdx !== null && allItems[openIdx] && (
          <PortfolioMediaModal
            item={allItems[openIdx]}
            index={openIdx}
            total={allItems.length}
            onClose={() => setOpenIdx(null)}
            onPrev={() => setOpenIdx((i) => (i! - 1 + allItems.length) % allItems.length)}
            onNext={() => setOpenIdx((i) => (i! + 1) % allItems.length)}
          />
        )}
      </AnimatePresence>

      {whatsappNumber && <WhatsAppChatWidget whatsappNumber={whatsappNumber} companyName={companyName} />}
    </main>
  );
}