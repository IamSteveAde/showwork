"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import PortfolioMediaModal, { type PortfolioMediaItem } from "@/components/portfolio/PortfolioMediaModal";

interface PortfolioSectionData {
  id: string;
  name: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  media: PortfolioMediaItem[];
}

function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
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
  const inView = useInView(containerRef, { once: false, margin: "-10%" });
  const nearView = useInView(containerRef, { once: true, margin: "800px" });
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (nearView) setShouldLoad(true);
  }, [nearView]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || item.type !== "VIDEO") return;
    if (inView) vid.play().catch(() => {});
    else vid.pause();
  }, [inView, shouldLoad, item.type]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative cursor-pointer overflow-hidden rounded-xl bg-black ${bentoSpan(index)}`}
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
}: {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  bgColor: string;
  heroMedia: PortfolioMediaItem | null;
  heroTagline: string | null;
  sections: PortfolioSectionData[];
  ungroupedMedia: PortfolioMediaItem[];
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
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-6 transition-all duration-500 md:px-14"
        style={{
          background: scrolled ? "rgba(0,0,0,0.7)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-7 w-auto" />
        ) : (
          <span className="text-sm font-medium uppercase text-white" style={{ letterSpacing: "0.2em" }}>
            {companyName}
          </span>
        )}
        <span className="text-xs font-medium uppercase text-white/40" style={{ letterSpacing: "0.25em" }}>
          Portfolio
        </span>
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

        <footer className="flex flex-col items-center gap-3 border-t border-white/5 bg-black px-6 py-14 text-center">
          <p className="text-sm font-light text-white/30">{companyName}</p>
          <a
            href="https://useshowwork.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: primaryColor }}
          >
            Portfolio powered by Showwork →
          </a>
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
    </main>
  );
}