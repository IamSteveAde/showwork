"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Plus_Jakarta_Sans } from "next/font/google";
import HostApplicationModal from "@/components/creativo/HostApplicationModal";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const BLUE = "#3350D8";
const PINK = "#F17FBE";
const ORANGE = "#E37B34";
const YELLOW = "#F4C430";
const TEAL = "#1D5A4C";
const LIME = "#CBEB6E";
const CREAM = "#EFE2C4";
const BROWN = "#3B2A1A";

type Category = "Photography" | "Videography" | "Motion" | "Editing";
const CATEGORIES: Category[] = ["Photography", "Videography", "Motion", "Editing"];

export interface LeaderboardEntryData {
  id: string;
  name: string;
  profileImageUrl: string | null;
  category: string;
  whatTheyDo: string | null;
  contact: string | null;
  portfolioUrl: string | null;
  whatsappNumber: string | null;
  wonFor: string;
  points: number;
  periodDate: string;
}

export interface WebinarData {
  id: string;
  flyerImageUrl: string | null;
  topic: string;
  guests: string | null;
  startsAt: string;
  venue: string | null;
  applyUrl: string | null;
  replayUrl: string | null;
}

function periodKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function periodLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Builds a wa.me link pre-filled with a message that references the
// spotlight itself — the whole point being that whoever clicks it
// arrives with real context already typed, not a blank chat window.
function spotlightWhatsappHref(whatsappNumber: string, name: string): string {
  const message = `Hi ${name}, I saw you were spotlighted on Creativo and would love to work with you on a project.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// Rank-based accent — 1st gets pink, 2nd yellow, 3rd lime — so the
// "podium" reads instantly by color, not just by a small number badge.
const RANK_COLOR = [PINK, YELLOW, LIME];

// ─────────────────────────────────────────────
// Signature motif — a soft, slowly-drifting gradient blob. Reused
// across every section with a different color, so the page has one
// consistent visual language rather than each accent block inventing
// its own decoration.
// ─────────────────────────────────────────────
function DriftBlob({ color, size, x, y, duration, delay, opacity = 0.5 }: { color: string; size: number; x: string; y: string; duration: number; delay: number; opacity?: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{ width: size, height: size, left: x, top: y, background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 0%, ${color}00 70%)`, filter: "blur(60px)" }}
      animate={{ x: [0, 40, -25, 0], y: [0, -35, 25, 0], scale: [1, 1.1, 0.95, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function IconCheck({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M5 12.5l4.5 4.5L19 7" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Magnetic button — a small tactile pull toward the cursor, springing
// back on leave. One recurring interaction detail carried through
// every primary CTA on the page.
function MagneticButton({ children, className, style, href }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setOffset({ x: (e.clientX - (rect.left + rect.width / 2)) * 0.25, y: (e.clientY - (rect.top + rect.height / 2)) * 0.35 });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 150, damping: 12 }}
      className={className}
      style={style}
    >
      {children}
    </motion.a>
  );
}

export default function CreativoContent({
  memberCountLabel,
  entries,
  webinars,
}: {
  memberCountLabel: string | null;
  entries: LeaderboardEntryData[];
  webinars: WebinarData[];
}) {
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const availablePeriods = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      const key = periodKey(e.periodDate);
      if (!seen.has(key)) seen.set(key, e.periodDate);
    }
    return [...seen.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  const [filterPeriodKey, setFilterPeriodKey] = useState<string | null>(null);
  const effectivePeriodKey = filterPeriodKey ?? availablePeriods[0]?.[0] ?? null;

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const matchesCategory = filterCategory === "All" || e.category === filterCategory;
        const matchesPeriod = effectivePeriodKey === null || periodKey(e.periodDate) === effectivePeriodKey;
        return matchesCategory && matchesPeriod;
      })
      .sort((a, b) => b.points - a.points);
  }, [entries, filterCategory, effectivePeriodKey]);

  const heroTopEntries = useMemo(() => {
    const mostRecentKey = availablePeriods[0]?.[0];
    if (!mostRecentKey) return [];
    return entries
      .filter((e) => periodKey(e.periodDate) === mostRecentKey)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);
  }, [entries, availablePeriods]);

  const now = new Date();
  const upcomingWebinars = webinars.filter((w) => new Date(w.startsAt) >= now).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const pastWebinars = webinars.filter((w) => new Date(w.startsAt) < now);

  return (
    <main className={`${jakarta.variable} min-h-screen bg-white`} style={{ fontFamily: "var(--font-jakarta)" }}>
      {/* ── NAV ── */}
      <header
        className="fixed inset-x-0 top-0 z-40 transition-all duration-500"
        style={{ background: scrolled ? "rgba(10,10,10,0.85)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/creativo.svg" alt="Creativo" className="h-7 w-auto" />
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="hidden text-sm font-semibold text-white/60 transition-colors hover:text-white sm:block">
              Showwork
            </Link>
            <Link href="/login" className="hidden text-sm font-semibold text-white/60 transition-colors hover:text-white sm:block">
              Log in
            </Link>
            <Link href="/signup" className="hidden text-sm font-semibold text-white/60 transition-colors hover:text-white sm:block">
              Sign up
            </Link>
            <MagneticButton
              href="https://tinyurl.com/creativocommunity"
              className="rounded-full px-5 py-2.5 text-sm font-bold text-black"
              style={{ background: PINK, boxShadow: `0 8px 28px -10px ${PINK}99` }}
            >
              Join community
            </MagneticButton>
            {/* Hamburger — Showwork / Log in / Sign up collapse behind
                this below sm, since the Join button already takes
                priority on mobile and three more links won't fit. */}
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-full sm:hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                {mobileNavOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden sm:hidden"
              style={{ background: "rgba(10,10,10,0.97)", backdropFilter: "blur(16px)" }}
            >
              <div className="flex flex-col gap-1 px-6 pb-6 pt-2">
                <Link href="/" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/5 hover:text-white">
                  Showwork
                </Link>
                <Link href="/login" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/5 hover:text-white">
                  Log in
                </Link>
                <Link href="/signup" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/5 hover:text-white">
                  Sign up
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── 1. HERO — aurora gradient mesh, the page's signature moment ── */}
      <section ref={heroRef} className="relative flex min-h-screen items-center overflow-hidden px-6 pb-16 pt-32 md:px-10" style={{ background: "#08080A" }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <DriftBlob color={BLUE} size={520} x="-10%" y="-10%" duration={22} delay={0} opacity={0.55} />
          <DriftBlob color={PINK} size={460} x="55%" y="-8%" duration={26} delay={2} opacity={0.45} />
          <DriftBlob color={BLUE} size={340} x="70%" y="55%" duration={19} delay={4} opacity={0.35} />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(#FFFFFF 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative mx-auto w-full max-w-6xl">
          {heroTopEntries.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mb-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {heroTopEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${RANK_COLOR[i]}33` }}
                >
                  <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20 blur-xl" style={{ background: RANK_COLOR[i] }} aria-hidden />
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {entry.profileImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.profileImageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <span
                      className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold text-black"
                      style={{ background: RANK_COLOR[i] }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{entry.name}</p>
                    <p className="truncate text-xs" style={{ color: `${RANK_COLOR[i]}CC` }}>{entry.category}</p>
                    <p className="mt-0.5 truncate text-xs text-white/40">{entry.wonFor}</p>
                    {(entry.portfolioUrl || entry.whatsappNumber) && (
                      <div className="mt-2 flex items-center gap-3">
                        {entry.portfolioUrl && (
                          <a href={entry.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold underline" style={{ color: RANK_COLOR[i] }}>
                            Portfolio
                          </a>
                        )}
                        {entry.whatsappNumber && (
                          <a href={spotlightWhatsappHref(entry.whatsappNumber, entry.name)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold underline" style={{ color: RANK_COLOR[i] }}>
                            Work with them
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <p className="mb-14 text-sm text-white/30">Nobody on the leaderboard yet — check back soon.</p>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 }} className="mb-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: LIME }} />
            <p className="text-xs font-bold uppercase text-white/55" style={{ letterSpacing: "0.2em" }}>
              {memberCountLabel || "A growing community"}
            </p>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
            className="max-w-4xl text-[clamp(2.4rem,7vw,5.2rem)] font-extrabold leading-[0.98] tracking-tight text-white"
          >
            Better clients.{" "}
            <span style={{ background: `linear-gradient(120deg, ${BLUE}, ${PINK})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Better pay.
            </span>
            <br />
            <span className="font-light text-white/60">Real visibility.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 max-w-xl text-base leading-relaxed text-white/55 md:text-lg"
          >
            A community by Showwork for photographers, videographers, editors, and
            motion designers who are done being the best-kept secret in the room.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }} className="mt-10 flex flex-wrap items-center gap-6">
            <MagneticButton
              href="https://tinyurl.com/creativocommunity"
              className="rounded-full px-9 py-4 text-sm font-bold text-black"
              style={{ background: PINK, boxShadow: `0 16px 44px -12px ${PINK}aa` }}
            >
              Join community
            </MagneticButton>
            <a href="#video" className="group flex items-center gap-3 text-sm font-semibold text-white/65 transition-colors hover:text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition-colors group-hover:border-white/50">▶</span>
              Watch the intro
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ── 2. EMBEDDED VIDEO ── */}
      <section id="video" className="px-6 py-20 md:px-10 md:py-28" style={{ background: "#08080A" }}>
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-3xl shadow-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <video src="/images/intro.mp4" autoPlay muted loop controls playsInline className="w-full" />
          </motion.div>
        </div>
      </section>

      {/* ── 3. FILTERABLE LEADERBOARD ── */}
      <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
          <DriftBlob color={BLUE} size={380} x="80%" y="0%" duration={24} delay={0} opacity={0.15} />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }}>
            <p className="mb-3 text-xs font-bold uppercase" style={{ color: BLUE, letterSpacing: "0.2em" }}>Leaderboard</p>
            <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-black md:text-5xl">Who's winning right now.</h2>
            <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <p className="max-w-lg text-base leading-relaxed text-black/55">
                Every month, Creativo members submit real client work through
                Showwork. The community votes, and the strongest work in each
                category gets the spotlight — actual recognition, not a
                popularity contest.
              </p>
              <a
                href="https://tinyurl.com/creativocommunity"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-full px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                style={{ background: BLUE, boxShadow: `0 12px 32px -10px ${BLUE}88` }}
              >
                Want your name up here? Join community →
              </a>
            </div>
          </motion.div>

          {availablePeriods.length === 0 ? (
            <p className="text-sm text-black/40">No leaderboard entries yet.</p>
          ) : (
            <>
              <div className="mb-10 flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  {(["All", ...CATEGORIES] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilterCategory(c)}
                      className="rounded-full px-4 py-2 text-xs font-bold transition-all"
                      style={filterCategory === c ? { background: BLUE, color: "#FFFFFF" } : { background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  {availablePeriods.map(([key, iso]) => (
                    <button
                      key={key}
                      onClick={() => setFilterPeriodKey(key)}
                      className="rounded-full px-4 py-2 text-xs font-bold transition-all"
                      style={effectivePeriodKey === key ? { background: "#111111", color: "#FFFFFF" } : { background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}
                    >
                      {periodLabel(iso)}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-black/10 p-10 text-center text-sm text-black/35">
                  Nobody selected for {filterCategory === "All" ? "this period" : filterCategory} yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEntries.map((entry, i) => {
                    const rankColor = RANK_COLOR[i] ?? "#00000022";
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.5, delay: (i % 6) * 0.06 }}
                        whileHover={{ y: -5 }}
                        className="group relative overflow-hidden rounded-2xl p-4"
                        style={{ background: i < 3 ? `${rankColor}14` : "#F7F7F5", border: i < 3 ? `1px solid ${rankColor}44` : "1px solid rgba(0,0,0,0.06)" }}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-black/5">
                            {entry.profileImageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.profileImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            )}
                            <span
                              className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold text-black"
                              style={{ background: i < 3 ? rankColor : "#FFFFFF", border: i >= 3 ? "1px solid rgba(0,0,0,0.1)" : undefined }}
                            >
                              {i + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-black">{entry.name}</p>
                            <p className="truncate text-xs text-black/45">{entry.category} — {entry.wonFor}</p>
                            <p className="mt-1 text-xs font-bold" style={{ color: BLUE }}>{entry.points} points</p>
                            {(entry.portfolioUrl || entry.whatsappNumber) && (
                              <div className="mt-2 flex items-center gap-3">
                                {entry.portfolioUrl && (
                                  <a href={entry.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold underline" style={{ color: BLUE }}>
                                    Portfolio
                                  </a>
                                )}
                                {entry.whatsappNumber && (
                                  <a href={spotlightWhatsappHref(entry.whatsappNumber, entry.name)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold underline" style={{ color: PINK }}>
                                    Work with them
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── 4. WHY CREATIVO ── */}
      <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28" style={{ background: "#0A0A0A" }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <DriftBlob color={PINK} size={420} x="-8%" y="30%" duration={23} delay={1} opacity={0.3} />
          <DriftBlob color={BLUE} size={340} x="75%" y="10%" duration={20} delay={3} opacity={0.25} />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }}>
            <p className="mb-3 text-xs font-bold uppercase" style={{ color: PINK, letterSpacing: "0.2em" }}>Why Creativo</p>
            <h2 className="mb-14 max-w-xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">What being in the room actually gets you.</h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { title: "Referrals", body: "Work that comes through other members before it's posted anywhere public." },
              { title: "Pricing and positioning", body: "How to charge what the work is worth, and say it without flinching." },
              { title: "A real network", body: "People in the same categories, dealing with the same clients, the same problems." },
              { title: "Monthly spotlight", body: "A real shot at the leaderboard — visibility that isn't paid for." },
            ].map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl p-7"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${PINK}22` }}>
                  <IconCheck color={PINK} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{b.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{b.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. WEBINARS — teal accent block, flyers given real prominence ── */}
      <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28" style={{ background: TEAL }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <DriftBlob color={LIME} size={400} x="70%" y="-10%" duration={21} delay={0} opacity={0.25} />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }}>
            <p className="mb-3 text-xs font-bold uppercase" style={{ color: LIME, letterSpacing: "0.2em" }}>Webinars</p>
            <h2 className="mb-5 max-w-xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">Real sessions, real questions answered.</h2>
            <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <p className="max-w-lg text-base leading-relaxed text-white/55">
                Every session comes from someone who's actually done the work —
                pricing conversations, landing clients, the parts of this job
                nobody teaches. Know something worth sharing?
              </p>
              <button
                onClick={() => setHostModalOpen(true)}
                className="flex-shrink-0 rounded-full px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.03]"
                style={{ background: LIME }}
              >
                Apply to host →
              </button>
            </div>
          </motion.div>

          {upcomingWebinars.length === 0 && pastWebinars.length === 0 ? (
            <p className="text-sm text-white/40">No webinars scheduled yet.</p>
          ) : (
            <>
              {upcomingWebinars.length > 0 && (
                <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {upcomingWebinars.map((w, i) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      whileHover={{ y: -4 }}
                      className="flex gap-5 overflow-hidden rounded-2xl p-5"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      {w.flyerImageUrl && (
                        <div className="relative flex-shrink-0" style={{ transform: "rotate(-2deg)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={w.flyerImageUrl} alt="" className="h-28 w-22 rounded-xl object-cover shadow-lg" style={{ width: 88 }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="mb-2.5 inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase" style={{ background: LIME, color: "#0A0A0A" }}>Upcoming</span>
                        <h3 className="mb-1.5 text-lg font-bold text-white">{w.topic}</h3>
                        <p className="mb-1 text-sm text-white/55">{w.guests && `${w.guests} — `}{new Date(w.startsAt).toLocaleString()}</p>
                        {w.venue && <p className="mb-3.5 text-xs text-white/40">{w.venue}</p>}
                        {w.applyUrl && (
                          <a href={w.applyUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold" style={{ color: LIME }}>Reserve a spot →</a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {pastWebinars.length > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {pastWebinars.map((w, i) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="flex gap-5 rounded-2xl p-5"
                      style={{ background: "rgba(255,255,255,0.045)" }}
                    >
                      {w.flyerImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.flyerImageUrl} alt="" className="h-28 w-22 flex-shrink-0 rounded-xl object-cover opacity-70" style={{ width: 88 }} />
                      )}
                      <div className="min-w-0">
                        <span className="mb-2.5 inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)" }}>Past</span>
                        <h3 className="mb-1.5 text-lg font-bold text-white">{w.topic}</h3>
                        <p className="mb-3.5 text-sm text-white/50">{w.guests && `${w.guests} — `}{new Date(w.startsAt).toLocaleDateString()}</p>
                        {w.replayUrl && (
                          <a href={w.replayUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold" style={{ color: LIME }}>Watch the replay →</a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── 6. POWERED BY SHOWWORK ── */}
      <section className="px-6 py-24 text-center md:px-10 md:py-32">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className="mx-auto max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase" style={{ color: BLUE, letterSpacing: "0.2em" }}>Powered by Showwork</p>
          <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-black md:text-4xl">Creativo runs on Showwork.</h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-black/55">
            Showwork is the platform top creators use to deliver client work,
            get it approved, and get paid — properly. The monthly challenge
            draws directly from that real work: active Showwork users with a
            submitted project are automatically eligible to enter, at no
            extra cost.
          </p>
          <Link
            href="/"
            className="mt-9 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
            style={{ background: `linear-gradient(120deg, ${BLUE}, ${PINK})`, boxShadow: `0 14px 40px -12px ${BLUE}66` }}
          >
            Get started on Showwork
            <span aria-hidden>→</span>
          </Link>
        </motion.div>
      </section>

      {/* ── 7. MEMBER PROOF ──
          No real testimonials system exists yet — left out entirely
          rather than filled with placeholder quotes. Add back once
          real member quotes exist. ── */}

      {/* ── 8. FAQ ── */}
      <section className="px-6 py-20 md:px-10 md:py-28" style={{ background: "#F7F7F5" }}>
        <div className="mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }}>
            <p className="mb-3 text-xs font-bold uppercase" style={{ color: BLUE, letterSpacing: "0.2em" }}>FAQ</p>
            <h2 className="mb-12 text-3xl font-extrabold tracking-tight text-black md:text-4xl">Questions people actually ask.</h2>
          </motion.div>
          <div className="flex flex-col divide-y divide-black/8">
            {[
              { q: "Does it cost anything?", a: "No. Creativo is free to join." },
              { q: "Who's eligible?", a: "Active Showwork users with at least one submitted project can enter the monthly challenge." },
              { q: "How does the challenge work?", a: "Submit your work through Showwork each month. The community votes, and the top entries in each category make the leaderboard." },
              { q: "How do I join?", a: "Tap \"Join community\" — it takes you straight to the group, no application or waiting." },
            ].map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-black">
                  {item.q}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-black/40 transition-transform group-open:rotate-45" style={{ background: "rgba(0,0,0,0.05)" }}>+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-black/55">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. FOOTER CTA ── */}
      <section className="relative overflow-hidden px-6 py-28 text-center md:px-10 md:py-36" style={{ background: "#08080A" }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <DriftBlob color={PINK} size={440} x="15%" y="10%" duration={22} delay={0} opacity={0.4} />
          <DriftBlob color={BLUE} size={360} x="65%" y="30%" duration={19} delay={2} opacity={0.35} />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className="relative mx-auto max-w-xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            The best creators aren't figuring this out alone.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/55">
            Real feedback, real referrals, a real shot at the monthly spotlight,
            and sessions from people who've actually done it. Free, always — one
            link away.
          </p>
          <div className="mt-9">
            <MagneticButton
              href="https://tinyurl.com/creativocommunity"
              className="rounded-full px-9 py-4 text-sm font-bold text-black"
              style={{ background: PINK, boxShadow: `0 18px 50px -14px ${PINK}b3` }}
            >
              Join community
            </MagneticButton>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 px-6 py-8 text-center" style={{ background: "#08080A" }}>
        <p className="text-xs text-white/25">Creativo is a community by Showwork.</p>
      </footer>

      <HostApplicationModal open={hostModalOpen} onClose={() => setHostModalOpen(false)} />
    </main>
  );
}