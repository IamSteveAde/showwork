"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import PortfolioMediaModal, { type PortfolioMediaItem } from "@/components/portfolio/PortfolioMediaModal";
import WhatsAppChatWidget from "@/components/portfolio/WhatsAppChatWidget";


// ─────────────────────────────────────────────
// INTRO / ABOUT — a creator introducing themselves, shown as the
// first real content after the hero. Soft, slowly drifting gradient
// orbs built from the portfolio's own primaryColor, everything
// animating in as it scrolls into view. Renders nothing if a creator
// hasn't filled any of this in yet.
// ─────────────────────────────────────────────
function FloatingOrb({
  color,
  size,
  initialX,
  initialY,
  duration,
  delay,
}: {
  color: string;
  size: number;
  initialX: string;
  initialY: string;
  duration: number;
  delay: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: initialX,
        top: initialY,
        background: `radial-gradient(circle, ${color}55 0%, ${color}00 70%)`,
        filter: "blur(40px)",
      }}
      animate={{ x: [0, 40, -30, 0], y: [0, -50, 30, 0], scale: [1, 1.15, 0.95, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function IntroSection({
  companyName,
  primaryColor,
  bioText,
  bioSkills,
  bioStat,
  bioPhotoUrl,
}: {
  companyName: string;
  primaryColor: string;
  bioText?: string | null;
  bioSkills?: string[];
  bioStat?: string | null;
  bioPhotoUrl?: string | null;
}) {
  const skills = bioSkills ?? [];
  const hasContent = Boolean(
    bioText || bioPhotoUrl || bioStat || skills.length > 0
  );

  if (!hasContent) return null;

  return (
    <section className="relative overflow-hidden bg-white px-6 py-24 md:px-14 md:py-32">
      {/* Very subtle creative background */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full opacity-[0.055] blur-3xl"
        style={{ backgroundColor: primaryColor }}
      />

      <div
        className="pointer-events-none absolute -bottom-48 -left-40 h-[420px] w-[420px] rounded-full opacity-[0.04] blur-3xl"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Fine editorial grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, #111 1px, transparent 1px),
              linear-gradient(to bottom, #111 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mx-auto max-w-[1280px]"
      >
        {/* Section label */}
        <div className="mb-14 flex items-center justify-between md:mb-20">
          <div className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />

            <span
              className="text-[11px] font-bold uppercase text-black/45"
              style={{ letterSpacing: "0.25em" }}
            >
              About
            </span>
          </div>

          <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-black/25 md:block">
            01 — Introduction
          </span>
        </div>

        {/* Main composition */}
        <div className="grid items-center gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          {/* Photo */}
          {bioPhotoUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mx-auto w-full max-w-[420px] lg:mx-0"
            >
              {/* Decorative offset shape */}
              <div
                className="absolute -bottom-4 -left-4 h-full w-full border"
                style={{
                  borderColor: `${primaryColor}35`,
                  transform: "rotate(-3deg)",
                }}
              />

              {/* Small accent */}
              <div
                className="absolute -right-3 -top-3 z-20 flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: primaryColor,
                }}
              >
                <span className="text-lg font-light text-white">↗</span>
              </div>

              {/* Image frame */}
              <div className="relative aspect-[4/5] overflow-hidden bg-black/[0.035]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bioPhotoUrl}
                  alt={companyName}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
                />

                {/* Image overlay */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}12, transparent 45%, rgba(0,0,0,0.08))`,
                  }}
                />
              </div>

              {/* Image caption */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/30">
                  The creator
                </span>

                <span className="text-[9px] uppercase tracking-[0.15em] text-black/25">
                  01
                </span>
              </div>
            </motion.div>
          )}

          {/* Content */}
          <div className="relative">
            {/* Oversized decorative number */}
            <div
              className="pointer-events-none absolute -right-2 -top-16 select-none text-[130px] font-black leading-none tracking-[-0.08em] text-black/[0.025] md:-right-8 md:-top-24 md:text-[200px]"
              aria-hidden="true"
            >
              01
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative mb-5 text-xs font-medium uppercase text-black/35"
              style={{ letterSpacing: "0.2em" }}
            >
              Meet {companyName}
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative max-w-[700px] text-[clamp(2.5rem,5vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-black"
            >
              {companyName}
              <span
                className="ml-1"
                style={{ color: primaryColor }}
              >
                .
              </span>
            </motion.h2>

            {bioText && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="relative mt-7 max-w-[620px] text-[15px] leading-7 text-black/55 md:mt-9 md:text-base md:leading-8"
              >
                {bioText}
              </motion.p>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="relative mt-8"
              >
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-black/30">
                  Expertise
                </p>

                <div className="flex max-w-[650px] flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <motion.span
                      key={`${skill}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{
                        duration: 0.35,
                        delay: 0.4 + i * 0.05,
                      }}
                      className="border px-3.5 py-2 text-[11px] font-medium text-black/65 transition-all duration-300 hover:text-black"
                      style={{
                        borderColor: `${primaryColor}35`,
                        backgroundColor: `${primaryColor}08`,
                      }}
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Stat */}
            {bioStat && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="relative mt-10 flex items-center gap-5"
              >
                <div
                  className="h-px w-12"
                  style={{ backgroundColor: primaryColor }}
                />

                <p
                  className="text-xl font-medium tracking-[-0.02em] md:text-2xl"
                  style={{ color: primaryColor }}
                >
                  {bioStat}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom editorial line */}
        <div className="mt-20 flex items-center gap-5 md:mt-28">
          <div className="h-px flex-1 bg-black/10" />

          <div
            className="h-2 w-2 rotate-45"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="h-px w-16 bg-black/10 md:w-32" />
        </div>
      </motion.div>
    </section>
  );
}
interface PortfolioSectionData {
  id: string;
  name: string;
  mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
  media: PortfolioMediaItem[];
  coverMediaId?: string | null;
}

// The creator's chosen cover for a section, falling back to the first
// uploaded file if they haven't explicitly picked one.
function sectionCover(section: PortfolioSectionData): PortfolioMediaItem | null {
  if (section.coverMediaId) {
    const chosen = section.media.find((m) => m.id === section.coverMediaId);
    if (chosen) return chosen;
  }
  return section.media[0] ?? null;
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

function IconDocument({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M15 3v5h5M8 12h8M8 16h8M8 20h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

function IconQuote({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M7.5 6C4.5 6 2 8.7 2 12.3c0 3 2 5.2 4.6 5.2.4 0 .8-.05 1.1-.15-.5 1.9-1.9 3.3-3.7 3.9l.6 1.3c3.4-1 5.9-3.9 5.9-8.3C10.5 9.8 9.3 6 7.5 6Zm10 0c-3 0-5.5 2.7-5.5 6.3 0 3 2 5.2 4.6 5.2.4 0 .8-.05 1.1-.15-.5 1.9-1.9 3.3-3.7 3.9l.6 1.3c3.4-1 5.9-3.9 5.9-8.3C20.5 9.8 19.3 6 17.5 6Z" />
    </svg>
  );
}

function IconStar({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#F5C842" : "none"} stroke={filled ? "#F5C842" : "rgba(22,21,19,0.25)"} strokeWidth="1.5">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.8-4.6 6.6-.9L12 2.5Z" strokeLinejoin="round" />
    </svg>
  );
}

interface PortfolioTestimonialData {
  id: string;
  clientName: string;
  clientRole: string | null;
  quote: string;
  rating: number | null;
  isApproved: boolean;
}

// The scrolling testimonial carousel — sits right after "Get in
// touch." Manual left/right navigation plus dot indicators (same
// pattern as the hero slider), a crossfade between quotes rather than
// a hard cut, and a large quiet quote mark instead of quotation marks
// in the text itself.
function TestimonialsCarousel({
  testimonials,
  primaryColor,
}: {
  testimonials: PortfolioTestimonialData[];
  primaryColor: string;
}) {
  const [index, setIndex] = useState(0);
  if (testimonials.length === 0) return null;
  const t = testimonials[index];

  const goPrev = () => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  const goNext = () => setIndex((i) => (i + 1) % testimonials.length);

  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-14 md:py-32" style={{ background: "#F3F0EA" }}>
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
        >
          <IconQuote className="mx-auto mb-8 h-9 w-9" style={{ color: primaryColor, opacity: 0.4 }} />
        </motion.div>

        <div className="min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(3px)" }}
              transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
            >
              {t.rating && (
                <div className="mb-5 flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <IconStar key={n} filled={n <= (t.rating ?? 0)} />
                  ))}
                </div>
              )}
              <p className="text-xl font-light leading-relaxed md:text-2xl" style={{ color: "#161513" }}>
                {t.quote}
              </p>
              <p className="mt-6 text-sm font-semibold" style={{ color: "#161513" }}>{t.clientName}</p>
              {t.clientRole && (
                <p className="text-xs" style={{ color: "rgba(22,21,19,0.5)" }}>{t.clientRole}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {testimonials.length > 1 && (
          <div className="mt-10 flex items-center justify-center gap-5">
            <button
              onClick={goPrev}
              aria-label="Previous testimonial"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5"
              style={{ border: "1px solid rgba(22,21,19,0.15)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M11 6l-6 6 6 6" stroke="#161513" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i === index ? 22 : 8, background: i === index ? primaryColor : "rgba(22,21,19,0.2)" }}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              aria-label="Next testimonial"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5"
              style={{ border: "1px solid rgba(22,21,19,0.15)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#161513" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// A repeating 6-tile rhythm — one large "feature" tile, a tall one, a
// wide one, and three standard squares — cycling for however many
// items a section has. This is what makes it read as *designed*
// rather than random: the same considered pattern Apple's editorial
// pages and premium agency reels use, not an arbitrary shuffle.

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

function TiledTile({
  item,
  index,
  primaryColor,
  width,
  height,
  onOpen,
}: {
  item: PortfolioMediaItem;
  index: number;
  primaryColor: string;
  width: number;
  height: number;
  onOpen: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nearView = useInView(containerRef, { once: true, margin: "-20%" });
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (nearView) setShouldLoad(true);
  }, [nearView]);

  useEffect(() => {
    // Only trigger play once, right after the video actually mounts —
    // no opposing pause call tied to a separate "inView" check here.
    // The previous version paused the video the instant it wasn't
    // strictly in view, which could fire in the very same tick as the
    // native autoplay attempt, killing it before a single frame had
    // even decoded — exactly what showed as a permanent black screen
    // rather than a paused frame.
    const vid = videoRef.current;
    if (!vid || item.type !== "VIDEO" || !shouldLoad) return;
    requestPlay(vid);

    // Mobile browsers (iOS Safari especially) can block a video's
    // very first autoplay attempt if it wasn't tied to a direct user
    // gesture, even with muted/playsInline/autoPlay all correctly
    // set — a scroll alone isn't always treated as sufficient on iOS
    // the way it is on desktop. Retrying on the very first tap
    // anywhere on the page catches this: once genuinely triggered by
    // a real gesture, mobile browsers reliably allow it from then on,
    // including for videos that mount afterward.
    const retryOnFirstTouch = () => requestPlay(vid);
    window.addEventListener("touchstart", retryOnFirstTouch, { once: true });
    window.addEventListener("click", retryOnFirstTouch, { once: true });
    return () => {
      window.removeEventListener("touchstart", retryOnFirstTouch);
      window.removeEventListener("click", retryOnFirstTouch);
    };
  }, [shouldLoad, item.type]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (index % 12) * 0.03 }}
      // Sized to the exact pixel dimensions computed by the justified
      // layout — every row is scaled so its items share one height and
      // fill the container's full width exactly, with zero gaps.
      // object-cover here is safe (not actually cropping) because the
      // box itself was already computed to match the media's real
      // aspect ratio.
      className="group relative cursor-pointer"
      style={{ width, height }}
      onClick={onOpen}
      onContextMenu={(e) => e.preventDefault()}
    >
      {item.type === "VIDEO" ? (
        shouldLoad && (
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
            // The dimmed → awake effect only applies on devices that
            // genuinely support hover ([@media(hover:hover)]) — on
            // touch devices there's no hover gesture to undo the dim,
            // so it never applies there at all; content shows at full
            // brightness immediately on mobile.
            className="absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out [@media(hover:hover)]:brightness-[0.55] [@media(hover:hover)]:saturate-[0.85] [@media(hover:hover)]:group-hover:brightness-100 [@media(hover:hover)]:group-hover:saturate-[1.05]"
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
         className="absolute inset-0 h-full w-full select-none object-cover"
        />
      )}

      {/* The "wakes up" glow — invisible at rest, fading in on hover as
          a soft colored ring plus an outward bloom, like the piece is
          lighting up from within. Same treatment as the project
          delivery gallery, using this portfolio's own brand color. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1.5px ${primaryColor}, 0 0 28px 2px ${primaryColor}66` }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />

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

// One tile per section on the category-selector screen — a
// representative cover (the section's first uploaded file), its name,
// and how much work is inside it. Clicking one swaps that image in as
// the new banner and reveals just that section's gallery underneath.
// A small, compact version of the category card — used in the
// horizontal "jump to another section" strip beneath a section's own
// gallery, so switching sections never requires backing all the way
// out to the main category grid first.
function MiniSectionCard({
  section,
  isActive,
  onSelect,
}: {
  section: PortfolioSectionData;
  isActive: boolean;
  onSelect: () => void;
}) {
  const cover = sectionCover(section);
  const isDocType = section.mediaType === "DOCUMENT" || section.mediaType === "PDF";

  return (
    <button
      onClick={onSelect}
      className="group relative aspect-[3/4] w-56 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl bg-black transition-transform duration-300 hover:-translate-y-1 sm:w-64 lg:w-72"
      style={{
        scrollSnapAlign: "start",
        outline: isActive ? "2px solid #F5C842" : "2px solid transparent",
        outlineOffset: "2px",
      }}
    >
      {cover ? (
        cover.type === "VIDEO" ? (
          <video src={cover.url} autoPlay muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        ) : isDocType ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.06]">
            <IconDocument className="h-8 w-8 text-white/25" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 bg-white/5" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-4 text-left">
        <p className="text-xs font-medium uppercase text-white/40" style={{ letterSpacing: "0.1em" }}>
          {section.media.length}
        </p>
        <p className="mt-1 truncate text-base font-medium text-white">{section.name}</p>
      </div>
    </button>
  );
}

function CategoryCard({
  section,
  index,
  onSelect,
}: {
  section: PortfolioSectionData;
  index: number;
  onSelect: () => void;
}) {
  const cover = sectionCover(section);
  const isDocType = section.mediaType === "DOCUMENT" || section.mediaType === "PDF";

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.1, delay: index * 0.12, ease: [0.19, 1, 0.22, 1] }}
      whileHover={{ y: -10, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] } }}
      onClick={onSelect}
      className="group relative aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-2xl bg-black shadow-lg shadow-black/20 md:w-[calc((100%-3rem)/3)]"
    >
      {cover ? (
        cover.type === "VIDEO" ? (
          <video
            src={cover.url}
            autoPlay
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
          />
        ) : isDocType ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.06]">
            <IconDocument className="h-16 w-16 text-white/25" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
          />
        )
      ) : (
        <div className="absolute inset-0 bg-white/5" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 transition-all duration-500 group-hover:ring-2 group-hover:ring-[#F5C842]/70" />

      {/* Circular arrow button — a real, considered control rather
          than a bare character, matching the same restrained,
          weighted style as the "All work" back button and the modal's
          navigation. Appears on hover, softly. */}
      <div
        className="absolute right-5 top-5 flex h-10 w-10 -translate-y-1 items-center justify-center rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
        style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M7 17L17 7M9 7h8v8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-7">
        <p className="text-xs font-medium uppercase text-white/45" style={{ letterSpacing: "0.2em" }}>
          {section.media.length} {section.media.length === 1 ? "piece" : "pieces"}
        </p>
        <h3 className="mt-2 text-2xl font-light tracking-tight text-white md:text-[1.65rem]">
          {section.name}
        </h3>
        {/* A thin line that draws itself in on hover — a quiet, premium
            signal of interactivity that doesn't rely on a bouncing icon
            or color change alone. */}
        <div
          className="mt-3 h-px w-0 transition-all duration-500 ease-out group-hover:w-12"
          style={{ background: "#F5C842" }}
        />
      </div>
    </motion.div>
  );
}

// Detects a file's real aspect ratio (width/height) without rendering
// it visibly — a plain in-memory Image for photos, and a detached
// <video> listening for loadedmetadata for videos, since there's no
// built-in equivalent of `new Image()` for video.
function detectAspectRatio(item: PortfolioMediaItem): Promise<number> {
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
  items: PortfolioMediaItem[];
  widths: number[];
  height: number;
}

// The actual justified-gallery algorithm — the same technique behind
// Google Photos / Flickr grids. Items are added to a row until that
// row, scaled to the target height, would overflow the container's
// width; then the whole row is rescaled so it fills the container's
// width *exactly*, sharing one height across every item in it. This
// is what guarantees zero gaps regardless of how differently-shaped
// the source media is — a wide video and a tall portrait photo end up
// sitting in the same row at whatever height makes both of them
// exactly fill their share of the row's width.
function computeJustifiedRows(
  items: PortfolioMediaItem[],
  aspectRatios: Record<string, number>,
  containerWidth: number,
  targetRowHeight: number,
  gap: number
): JustifiedRow[] {
  const rows: JustifiedRow[] = [];
  let currentItems: PortfolioMediaItem[] = [];
  let aspectSum = 0;

  const flushRow = (stretch: boolean) => {
    if (currentItems.length === 0) return;
    const totalGap = gap * (currentItems.length - 1);
    const height = stretch
      ? (containerWidth - totalGap) / aspectSum
      : targetRowHeight;
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
    if (widthAtTargetHeight >= containerWidth) {
      flushRow(true);
    }
  }
  // Last, possibly-incomplete row — left at the target height rather
  // than stretched, so a couple of leftover pieces don't get blown up
  // to fill the full width on their own.
  flushRow(false);

  return rows;
}

function JustifiedGallery({
  items,
  primaryColor,
  onOpen,
}: {
  items: PortfolioMediaItem[];
  primaryColor: string;
  onOpen: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // Only ever populated for items with no stored aspectRatio — a
  // legacy upload predating this system, or a video not yet covered
  // by the one-time backfill. Everything else skips this entirely.
  const [detectedRatios, setDetectedRatios] = useState<Record<string, number>>({});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Runs detection only for the items that actually need it — most
  // items already have a real, stored ratio and never touch this at
  // all. Never blocks anything: the gallery below renders immediately
  // using a reasonable guess for whichever items are still pending,
  // then quietly corrects just those specific tiles as their real
  // shape comes in.
  useEffect(() => {
    let cancelled = false;
    items.forEach((item) => {
      if (item.aspectRatio !== null) return;
      if (detectedRatios[item.id] !== undefined) return;
      detectAspectRatio(item).then((ratio) => {
        if (!cancelled) setDetectedRatios((prev) => ({ ...prev, [item.id]: ratio }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Every item gets a usable ratio immediately: its real stored
  // value, a value already detected for it, or — while detection for
  // that one specific item is still pending — a plain 1:1 guess. This
  // is what lets rows compute the moment the container has a width,
  // rather than waiting on every single item in the section first.
  const effectiveRatios = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.id] = item.aspectRatio ?? detectedRatios[item.id] ?? 1;
    }
    return map;
  }, [items, detectedRatios]);

  const gap = 3;
  const targetRowHeight = 340;

  const rows = useMemo(() => {
    if (containerWidth === 0) return [];
    return computeJustifiedRows(items, effectiveRatios, containerWidth, targetRowHeight, gap);
  }, [containerWidth, items, effectiveRatios]);
  let runningIndex = 0;

  return (
    <div ref={containerRef}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex justify-center" style={{ gap, marginBottom: rowIdx === rows.length - 1 ? 0 : gap }}>
          {row.items.map((item, i) => {
            const idx = runningIndex++;
            return (
              <TiledTile
                key={item.id}
                item={item}
                index={idx}
                primaryColor={primaryColor}
                width={row.widths[i]}
                height={row.height}
                onOpen={() => onOpen(idx)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function PortfolioContent({
  companyName,
  logoUrl,
  primaryColor,
  bgColor,
  heroMedia,
    heroBannerDesktopUrl,
  heroBannerDesktopType,
  heroBannerMobileUrl,
  heroBannerMobileType,
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
  bioText,
  bioSkills,
  bioStat,
  bioPhotoUrl,
  testimonials,
}: {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  bgColor: string;
    heroMedia: PortfolioMediaItem | null;
    heroBannerDesktopUrl: string | null;
  heroBannerDesktopType: string | null;
  heroBannerMobileUrl: string | null;
  heroBannerMobileType: string | null;
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
  bioText?: string | null;
  bioSkills?: string[];
  bioStat?: string | null;
  bioPhotoUrl?: string | null;
  testimonials: PortfolioTestimonialData[];
}) {
  const [scrolled, setScrolled] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const scrollStrip = (direction: "left" | "right") => {
    stripRef.current?.scrollBy({ left: direction === "left" ? -320 : 320, behavior: "smooth" });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const renderSections: PortfolioSectionData[] = [
    ...sections,
    ...(ungroupedMedia.length > 0
      ? [{ id: "ungrouped", name: "More work", mediaType: "PHOTO" as const, media: ungroupedMedia }]
      : []),
  ];

  const selectedSection = renderSections.find((s) => s.id === selectedSectionId) ?? null;
  const galleryItems = selectedSection ? selectedSection.media : [];
  const selectedCover = selectedSection ? sectionCover(selectedSection) : null;

  const handleSelectCategory = (id: string) => {
    setSelectedSectionId(id);
  };

  // Scrolls to the top whenever the selected section changes — in
  // either direction (picking a category, or going back to "All
  // work"). This has to run in an effect, *after* React has actually
  // re-rendered the new layout, not synchronously inside the click
  // handler — the fixed hero and its full-screen spacer disappear
  // entirely once a section is selected, which changes the page's
  // total height dramatically. Scrolling before that layout change
  // settles left the final position wrong, especially on mobile.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedSectionId]);

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

      {/* ── MAIN BANNER — only on the landing state. Once a category is
           picked, its own image takes over as the banner instead. ── */}
           {selectedSectionId === null && (heroBannerDesktopUrl || heroBannerMobileUrl || heroMedia) && (
        <>
          <section className="fixed inset-0 z-0 h-screen w-full overflow-hidden bg-black">
                     {heroBannerDesktopUrl || heroBannerMobileUrl ? (
              <>
                {/* Two dedicated banners, switched purely by CSS media
                    query — whichever one wasn't uploaded falls back to
                    the other, so setting only one still works fine.
                    Each independently renders as a video or image
                    based on its own recorded type. */}
                {(heroBannerMobileUrl || heroBannerDesktopUrl) && (
                  (heroBannerMobileUrl ? heroBannerMobileType : heroBannerDesktopType) === "VIDEO" ? (
                    <video
                      src={heroBannerMobileUrl || heroBannerDesktopUrl || ""}
                      autoPlay muted loop playsInline
                      className="block h-full w-full object-cover md:hidden"
                      style={{ opacity: 0.85 }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroBannerMobileUrl || heroBannerDesktopUrl || ""}
                      alt=""
                      className="block h-full w-full object-cover md:hidden"
                      style={{ opacity: 0.85 }}
                    />
                  )
                )}
                {(heroBannerDesktopUrl || heroBannerMobileUrl) && (
                  (heroBannerDesktopUrl ? heroBannerDesktopType : heroBannerMobileType) === "VIDEO" ? (
                    <video
                      src={heroBannerDesktopUrl || heroBannerMobileUrl || ""}
                      autoPlay muted loop playsInline
                      className="hidden h-full w-full object-cover md:block"
                      style={{ opacity: 0.85 }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroBannerDesktopUrl || heroBannerMobileUrl || ""}
                      alt=""
                      className="hidden h-full w-full object-cover md:block"
                      style={{ opacity: 0.85 }}
                    />
                  )
                )}
              </>
            ) : heroMedia!.type === "VIDEO" ? (
              <video src={heroMedia!.url} autoPlay muted loop playsInline className="h-full w-full object-cover" style={{ opacity: 0.85 }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroMedia!.url} alt="" className="h-full w-full object-cover" style={{ opacity: 0.85 }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.92) 100%)" }} />
            <motion.div
              initial={{ opacity: 0, y: 34, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.3, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center md:px-14"
            >
              <h1 className="max-w-2xl text-[clamp(1.75rem,5vw,3.5rem)] font-light leading-[1.15] tracking-tight text-white">
                {heroTagline || `The work of ${companyName}`}
              </h1>
              <button
                onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="group mt-8 flex items-center gap-3 rounded-full py-3.5 pl-7 pr-5 text-sm font-semibold transition-transform hover:scale-[1.03]"
                style={{ background: primaryColor, color: "#080808" }}
              >
                View portfolio
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/10 transition-transform duration-300 group-hover:translate-y-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v13M6 12l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </motion.div>
          </section>
          <div className="h-screen w-full" aria-hidden />
        </>
      )}

   <div className="relative z-10" style={{ background: bgColor }}>
        <div ref={contentRef} />
        {selectedSectionId === null && (
          <IntroSection
            companyName={companyName}
            primaryColor={primaryColor}
            bioText={bioText}
            bioSkills={bioSkills}
            bioStat={bioStat}
            bioPhotoUrl={bioPhotoUrl}
          />
        )}
        {selectedSectionId === null ? (
  // ── CATEGORY GRID — the "different segments" the creator has
  // built (Weddings, Logo Designs, Events, Corporate, etc), each
  // with a real cover image. Picking one is how you get to the
  // actual gallery. ──
  <section
    className="relative overflow-hidden bg-black px-6 py-24 md:px-14 md:py-32"
  >
    {/* Subtle ambient glow */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full opacity-[0.08] blur-[120px]"
      style={{ backgroundColor: primaryColor }}
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-48 -right-40 h-[450px] w-[450px] rounded-full opacity-[0.06] blur-[120px]"
      style={{ backgroundColor: primaryColor }}
    />

    {/* Very subtle grid */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }}
    />

    <div className="relative mx-auto max-w-[1400px]">
      {/* ───────────────── HEADER ───────────────── */}
      <motion.div
        initial={{
          opacity: 0,
          y: 24,
          filter: "blur(4px)",
        }}
        whileInView={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        }}
        viewport={{
          once: true,
          margin: "-80px",
        }}
        transition={{
          duration: 1,
          ease: [0.19, 1, 0.22, 1],
        }}
        className="mb-16"
      >
        {/* Eyebrow */}
        <div className="mb-5 flex items-center gap-3">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 0 16px ${primaryColor}99`,
            }}
          />

          <p
            className="text-xs font-semibold uppercase"
            style={{
              color: primaryColor,
              letterSpacing: "0.25em",
            }}
          >
            Explore the work
          </p>
        </div>

        {/* Heading */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="max-w-[850px] text-3xl font-light leading-tight tracking-[-0.03em] text-white md:text-5xl lg:text-6xl">
              Pick a category to step inside
              <span
                className="ml-1"
                style={{ color: primaryColor }}
              >
                .
              </span>
            </h2>

            <p className="mt-5 max-w-[560px] text-sm leading-7 text-white/40 md:text-base">
              Explore different collections of work, each with its own
              projects, stories and creative direction.
            </p>
          </div>

          {/* Category count */}
          <div className="hidden shrink-0 items-center gap-3 pb-1 md:flex">
            <span className="h-px w-8 bg-white/15" />

            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
              {renderSections.length}{" "}
              {renderSections.length === 1 ? "category" : "categories"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ───────────────── EXISTING CATEGORY GRID ───────────────── */}
      <div className="relative">
        {/*
          IMPORTANT:
          The original CategoryCard structure is intentionally preserved.
          Each card still receives the complete `section` object, meaning
          its cover image, title, media and all existing content remain.
        */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {renderSections.map((section, i) => (
            <CategoryCard
              key={section.id}
              section={section}
              index={i}
              onSelect={() => handleSelectCategory(section.id)}
            />
          ))}
        </div>
      </div>

      {/* ───────────────── BOTTOM DETAIL ───────────────── */}
      <motion.div
        initial={{
          opacity: 0,
        }}
        whileInView={{
          opacity: 1,
        }}
        viewport={{
          once: true,
        }}
        transition={{
          duration: 0.8,
          delay: 0.25,
        }}
        className="mt-16 md:mt-20"
      >
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.08]" />

          <div
            className="h-1.5 w-1.5 rotate-45"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 0 12px ${primaryColor}80`,
            }}
          />

          <div className="h-px w-12 bg-white/[0.08] md:w-20" />
        </div>
      </motion.div>
    </div>
  </section>
) : (
          <>
            {/* ── SECTION BANNER — the chosen category's own cover image,
                 now standing in as the banner for this view. ── */}
            <section className="relative h-[68vh] min-h-[460px] w-full overflow-hidden bg-black">
              <motion.div
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, ease: [0.19, 1, 0.22, 1] }}
                className="absolute inset-0"
              >
                {selectedCover?.type === "VIDEO" ? (
                  <video
                    key={selectedCover.url}
                    src={selectedCover.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                    style={{ opacity: 0.8 }}
                  />
                ) : selectedCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={selectedCover.url} src={selectedCover.url} alt="" className="h-full w-full object-cover" style={{ opacity: 0.8 }} />
                ) : null}
              </motion.div>
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.95) 100%)" }} />

              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                onClick={() => setSelectedSectionId(null)}
                className="absolute left-6 top-24 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 md:left-14 md:top-28"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}
                aria-label="Back to all work"
              >
                <IconArrowLeft className="h-4 w-4" />
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: 26, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, delay: 0.35, ease: [0.19, 1, 0.22, 1] }}
                className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-12 md:px-14 md:pb-16"
              >
                <p className="mb-2 text-xs font-medium uppercase text-white/50" style={{ letterSpacing: "0.25em" }}>
                  {selectedSection?.media.length} {selectedSection?.media.length === 1 ? "piece" : "pieces"}
                </p>
                <h2 className="text-3xl font-light tracking-tight text-white md:text-6xl">{selectedSection?.name}</h2>
              </motion.div>
            </section>

            {/* ── SECTION GALLERY — just this category's own work. ── */}
            <section className="px-6 py-16 md:px-14 md:py-24" style={{ background: "#000000" }}>
              <div className="mx-auto max-w-[1400px]">
                {selectedSection?.mediaType === "DOCUMENT" || selectedSection?.mediaType === "PDF" ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {galleryItems.map((item, idx) => (
                      <DocTile key={item.id} item={item} index={idx} onOpen={() => setOpenIdx(idx)} />
                    ))}
                  </div>
                ) : (
                  // A real justified gallery — every image and video
                  // keeps its own true, uncropped aspect ratio, but
                  // rows are computed so they always fill the full
                  // width exactly, at one shared height per row. This
                  // is what actually eliminates gaps between
                  // differently-shaped pieces, which simple CSS
                  // wrapping can't do.
                  <JustifiedGallery items={galleryItems} primaryColor={primaryColor} onOpen={(idx) => setOpenIdx(idx)} />
                )}
              </div>
            </section>

            {/* ── JUMP TO ANOTHER SECTION — a horizontal strip of every
                 category, so switching what you're looking at never
                 requires backing all the way out to the main grid
                 first. Only shown once you've actually stepped inside
                 a section. ── */}
            {renderSections.length > 1 && (
  <section className="relative overflow-hidden border-t border-white/[0.07] bg-[#050505] px-4 py-16 sm:px-6 md:px-10 lg:px-14 lg:py-20">
    {/* Ambient background */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.045), transparent 42%)",
      }}
    />

    <div className="relative mx-auto max-w-[1500px]">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-6 md:mb-10">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-7 bg-white/30" />
            <span
              className="text-[10px] font-medium uppercase text-white/40"
              style={{ letterSpacing: "0.24em" }}
            >
              Portfolio
            </span>
          </div>

          <h2 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl md:text-[34px]">
            More from this portfolio
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
            Explore more work and projects from this collection.
          </p>
        </div>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-2 sm:flex">
          <button
            onClick={() => scrollStrip("left")}
            aria-label="Previous projects"
            className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/55 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            <IconArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </button>

          <button
            onClick={() => scrollStrip("right")}
            aria-label="Next projects"
            className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/55 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <path
                d="M5 12H19M13 6L19 12L13 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Portfolio strip */}
      <div className="relative">
        {/* Left fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 top-0 z-[5] w-16 bg-gradient-to-r from-[#050505] to-transparent sm:w-24"
        />

        {/* Right fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 top-0 z-[5] w-16 bg-gradient-to-l from-[#050505] to-transparent sm:w-24"
        />

        <div
          ref={stripRef}
          className="scrollbar-hide flex snap-x snap-mandatory justify-start gap-4 overflow-x-auto pb-3 pr-12 pl-1 sm:gap-5 sm:pr-20"
          style={{
            scrollSnapType: "x proximity",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {renderSections.map((section, index) => (
            <div
              key={section.id}
              className="group shrink-0 snap-start"
              style={{
                animationDelay: `${index * 40}ms`,
              }}
            >
              <div
                className={`
                  relative overflow-hidden rounded-2xl
                  transition-all duration-500 ease-out
                  ${
                    section.id === selectedSectionId
                      ? "scale-[1.01]"
                      : "hover:-translate-y-1"
                  }
                `}
              >
                {/* Active glow */}
                {section.id === selectedSectionId && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-px z-20 rounded-2xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.32), rgba(255,255,255,0.06), transparent)",
                    }}
                  />
                )}

                <MiniSectionCard
                  section={section}
                  isActive={section.id === selectedSectionId}
                  onSelect={() => handleSelectCategory(section.id)}
                />

                {/* Active indicator */}
                {section.id === selectedSectionId && (
                  <div className="absolute bottom-2 left-1/2 z-30 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
                )}
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          @keyframes portfolioCardIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>

      {/* Mobile scroll hint */}
      <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/25 sm:hidden">
        <span>Swipe to explore</span>
        <span className="h-px w-5 bg-white/15" />
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M5 12H19M13 6L19 12L13 18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  </section>
)}
          </>
        )}

        {/* ── GET IN TOUCH — after the work, before the footer, on
             every view. ── */}
        {(whatsappNumber || contactEmail) && (
  <section
    className="relative overflow-hidden bg-white px-6 py-24 md:px-12 md:py-32"
    style={{ color: "#111111" }}
  >
    {/* Ambient accent glow */}
    <div
      className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full opacity-[0.09] blur-3xl"
      style={{ backgroundColor: primaryColor }}
    />

    <div
      className="pointer-events-none absolute -bottom-40 -left-40 h-[380px] w-[380px] rounded-full opacity-[0.05] blur-3xl"
      style={{ backgroundColor: primaryColor }}
    />

    {/* Subtle editorial grid */}
    <div className="pointer-events-none absolute inset-0 opacity-[0.025]">
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `
            linear-gradient(to right, #111 1px, transparent 1px),
            linear-gradient(to bottom, #111 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
    </div>

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative mx-auto max-w-[1400px]"
    >
      {/* Header / metadata */}
      <div className="mb-16 flex items-center justify-between md:mb-20">
        <div className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: primaryColor,
            }}
          />

          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-black/50">
            Get in touch
          </span>
        </div>

        <span className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-black/30 md:block">
          Available for new projects
        </span>
      </div>

      {/* Main editorial composition */}
      <div className="grid items-end gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20">
        {/* Left content */}
        <div className="relative">
          {/* Oversized decorative number */}
          <div
            className="pointer-events-none absolute -left-5 -top-16 select-none text-[150px] font-black leading-none tracking-[-0.08em] text-black/[0.035] md:-left-8 md:-top-24 md:text-[220px]"
            aria-hidden="true"
          >
            01
          </div>

          <p className="relative mb-7 max-w-xl text-sm leading-7 text-black/55 md:text-base">
            Have a project in mind, an idea worth exploring, or simply want to
            start a conversation?
          </p>

          <h2 className="relative max-w-[620px] text-[clamp(2rem,2.5vw,3rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-black">
  {ctaText || DEFAULT_CTA_TEXT}

  <span
    className="ml-1 inline-block align-[0.08em] text-[0.7em]"
    style={{
      color: primaryColor,
    }}
  >
    .
  </span>
</h2>
        </div>

        {/* Contact links */}
        <div className="relative lg:pb-2">
          <div className="mb-8 h-px w-full bg-black/10" />

          <div className="space-y-0">
            {/* WhatsApp */}
            {whatsappNumber && (
              <a
               href={whatsappHref(whatsappNumber, companyName)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[76px] items-center justify-between border-b border-black/10 py-4 transition-all duration-300 hover:pl-2"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: `${primaryColor}12`,
                      color: primaryColor,
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center">
                      <IconWhatsApp />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-black/35">
                      WhatsApp
                    </span>

                    <span className="mt-1 block text-sm font-semibold text-black">
                      Message me
                    </span>
                  </div>
                </div>

                <span
                  className="ml-4 shrink-0 text-2xl font-light transition-transform duration-300 group-hover:translate-x-1"
                  style={{
                    color: primaryColor,
                  }}
                  aria-hidden="true"
                >
                  ↗
                </span>
              </a>
            )}

            {/* Email */}
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="group flex min-h-[76px] items-center justify-between border-b border-black/10 py-4 transition-all duration-300 hover:pl-2"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black transition-transform duration-300 group-hover:scale-110">
                    <span className="flex h-5 w-5 items-center justify-center">
                      <IconEmail />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-black/35">
                      Email
                    </span>

                    <span className="mt-1 block truncate text-sm font-semibold text-black">
                      {contactEmail}
                    </span>
                  </div>
                </div>

                <span
                  className="ml-4 shrink-0 text-2xl font-light text-black/35 transition-all duration-300 group-hover:translate-x-1 group-hover:text-black"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </a>
            )}
          </div>

          {/* Availability */}
          <div className="mt-8 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-30"
                style={{
                  backgroundColor: primaryColor,
                }}
              />

              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: primaryColor,
                }}
              />
            </span>

            <span className="text-xs font-medium text-black/45">
              Let&apos;s make something memorable.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom creative divider */}
      <div className="relative mt-20 flex items-center gap-5 md:mt-28">
        <div className="h-px flex-1 bg-black/10" />

        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10"
          style={{
            transform: "rotate(-12deg)",
          }}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: primaryColor,
            }}
          />
        </div>

        <div className="h-px w-16 bg-black/10 md:w-32" />
      </div>
    </motion.div>
  </section>
)}

             <TestimonialsCarousel testimonials={testimonials.filter((t) => t.isApproved)} primaryColor={primaryColor} />

        <footer className="relative overflow-hidden border-t border-white/[0.06] bg-black px-6 py-16 md:px-14 md:py-20">
  {/* Ambient accent */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute -bottom-40 left-1/2 h-[360px] w-[520px] -translate-x-1/2 rounded-full opacity-[0.08] blur-[120px]"
    style={{ backgroundColor: primaryColor }}
  />

  <div className="relative mx-auto max-w-[1200px]">
    <div className="flex flex-col gap-12">
      {/* Top row */}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        {/* Brand */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
            Portfolio
          </p>

          <h3 className="max-w-[520px] text-2xl font-light tracking-[-0.03em] text-white md:text-3xl">
            {companyName}
          </h3>
        </div>

        {/* Contact */}
        {(contactEmail || whatsappNumber) && (
          <div className="flex flex-col gap-3 md:items-end">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
              Get in touch
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="group flex items-center gap-2 text-xs text-white/45 transition-colors hover:text-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all group-hover:border-white/20 group-hover:bg-white/[0.06]">
                    <IconEmail />
                  </span>
                  {contactEmail}
                </a>
              )}

              {whatsappNumber && (
                <a
                  href={whatsappHref(whatsappNumber, companyName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-xs text-white/45 transition-colors hover:text-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all group-hover:border-white/20 group-hover:bg-white/[0.06]">
                    <IconWhatsApp />
                  </span>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/[0.07]" />

      {/* Social + Showwork */}
      <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
        {/* Socials */}
        {(instagramUrl ||
          twitterUrl ||
          linkedinUrl ||
          tiktokUrl ||
          facebookUrl ||
          youtubeUrl) && (
          <div className="flex items-center gap-3">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/35 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <IconInstagram />
              </a>
            )}

            {twitterUrl && (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/35 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <IconTwitter />
              </a>
            )}

            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/35 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <IconLinkedIn />
              </a>
            )}

            {tiktokUrl && (
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/35 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <IconTikTok />
              </a>
            )}

            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/35 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <IconFacebook />
              </a>
            )}

            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/35 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <IconYouTube />
              </a>
            )}
          </div>
        )}

        {/* Showwork credit */}
        <div className="flex flex-col gap-3 md:items-end">
          <a
            href="https://useshowwork.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/25 transition-colors hover:text-white/45"
          >
            Portfolio powered by Showwork
          </a>

          <a
            href="https://useshowwork.com/signup?next=/dashboard/portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-xs font-semibold transition-all duration-300"
            style={{ color: primaryColor }}
          >
            Create your own portfolio — free
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              ↗
            </span>
          </a>
        </div>
      </div>

      {/* Bottom line */}
      <div className="flex items-center gap-4 pt-2">
        <div className="h-px flex-1 bg-white/[0.06]" />

        <div
          className="h-1.5 w-1.5 rotate-45"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="h-px w-12 bg-white/[0.06] md:w-20" />
      </div>
    </div>
  </div>
</footer>
      </div>

      <AnimatePresence>
        {openIdx !== null && galleryItems[openIdx] && (
          <PortfolioMediaModal
            item={galleryItems[openIdx]}
            index={openIdx}
            total={galleryItems.length}
            onClose={() => setOpenIdx(null)}
            onPrev={() => setOpenIdx((i) => (i! - 1 + galleryItems.length) % galleryItems.length)}
            onNext={() => setOpenIdx((i) => (i! + 1) % galleryItems.length)}
          />
        )}
      </AnimatePresence>

      {whatsappNumber && <WhatsAppChatWidget whatsappNumber={whatsappNumber} companyName={companyName} />}
    </main>
  );
}