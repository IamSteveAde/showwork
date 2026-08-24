"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, ArrowUpRight, ArrowRight, ExternalLink, Users } from "lucide-react";

const BLUE = "#2478FF";
const BLUE_DARK = "#0052FF";
const BLACK = "#080808";
const YELLOW = "#FFCC00";
const CATEGORIES = ["Photography", "Videography", "Motion", "Editing"];
const RANK_COLOR = ["#FFCC00", "#68B2FF", "#0052FF"];

export interface LeaderboardEntryData {
  id: string;
  name: string;
  profileImageUrl: string | null;
  category: string;
  portfolioUrl: string | null;
  whatsappNumber: string | null;
  wonFor: string;
  points: number;
  periodDate: string;
}

function periodKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Matches the exact pattern already used on /creativo — a pre-filled
// message referencing the Spotlight itself, not a blank chat window.
function spotlightWhatsappHref(whatsappNumber: string, name: string): string {
  const message = `Hi ${name}, I saw your work on the Creativo leaderboard and would love to work with you on a project.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function EntryCard({ entry, rankIndex }: { entry: LeaderboardEntryData; rankIndex: number }) {
  const rankColor = RANK_COLOR[rankIndex] ?? "#00000022";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (rankIndex % 6) * 0.06 }}
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden rounded-2xl p-4"
      style={{ background: rankIndex < 3 ? `${rankColor}14` : "#F7F7F5", border: rankIndex < 3 ? `1px solid ${rankColor}44` : "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-3.5">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-black/5">
          {entry.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.profileImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          )}
          <span
            className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold text-black"
            style={{ background: rankIndex < 3 ? rankColor : "#FFFFFF", border: rankIndex >= 3 ? "1px solid rgba(0,0,0,0.1)" : undefined }}
          >
            {rankIndex + 1}
          </span>
        </div>
                <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-black">{entry.name}</p>
            <span className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold" style={{ background: `${rankColor}22`, color: rankColor }}>
              {entry.points} pts
            </span>
          </div>
          <p className="truncate text-xs text-black/45">{entry.category} — {entry.wonFor}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {entry.portfolioUrl && (
              <a
                href={entry.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/portfolio inline-flex items-center gap-1.5 rounded-full border border-[#2478FF]/15 bg-[#2478FF]/[0.07] px-3 py-1.5 text-[10px] font-extrabold text-[#0052FF] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2478FF]/30 hover:bg-[#2478FF] hover:text-white hover:shadow-[0_8px_20px_-10px_#2478FF]"
              >
                View portfolio
                <ArrowUpRight
                  size={12}
                  strokeWidth={2.4}
                  className="transition-transform duration-300 group-hover/portfolio:translate-x-0.5 group-hover/portfolio:-translate-y-0.5"
                />
              </a>
            )}

            {entry.whatsappNumber && (
              <a
                href={spotlightWhatsappHref(entry.whatsappNumber, entry.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="group/contact inline-flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-black/[0.035] px-3 py-1.5 text-[10px] font-extrabold text-black/55 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#25D366]/25 hover:bg-[#25D366] hover:text-white hover:shadow-[0_8px_20px_-10px_#25D366]"
              >
                Contact creator
                <ArrowRight
                  size={12}
                  strokeWidth={2.4}
                  className="transition-transform duration-300 group-hover/contact:translate-x-0.5"
                />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPageContent({ entries }: { entries: LeaderboardEntryData[] }) {
  const [view, setView] = useState<"month" | "allTime">("month");
  const [filterCategory, setFilterCategory] = useState<string | "All">("All");
  const [allTimePage, setAllTimePage] = useState(1);
  const ALL_TIME_PER_PAGE = 10;

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

  const monthEntries = useMemo(() => {
    return entries
      .filter((e) => filterCategory === "All" || e.category === filterCategory)
      .filter((e) => effectivePeriodKey === null || periodKey(e.periodDate) === effectivePeriodKey)
      .sort((a, b) => b.points - a.points);
  }, [entries, filterCategory, effectivePeriodKey]);

  // Cumulative, all-time view — entries aren't tied to a real account
  // (a manually-added winner has no creator relation at all), so a
  // trimmed, lowercased name is the best available key to group
  // repeat winners under. Wins are counted, not just points summed,
  // since "won 3 separate months" is the more meaningful all-time
  // signal than raw point totals across differently-sized fields.
  const allTimeLeaders = useMemo(() => {
    const byName = new Map<string, { name: string; profileImageUrl: string | null; portfolioUrl: string | null; whatsappNumber: string | null; category: string; wins: number; totalPoints: number; mostRecentDate: string }>();

       for (const e of entries.filter((e) => filterCategory === "All" || e.category === filterCategory)) {
      // WhatsApp number is the primary match — a phone number is a
      // far more reliable "same person" signal than a typed name,
      // which can vary slightly between separate months' entries.
      // Only falls back to name when no WhatsApp number was recorded.
      const key = e.whatsappNumber?.trim() ? `wa:${e.whatsappNumber.trim()}` : `name:${e.name.trim().toLowerCase()}`;
      const existing = byName.get(key);
      if (existing) {
        existing.wins += 1;
        existing.totalPoints += e.points;
        if (new Date(e.periodDate) > new Date(existing.mostRecentDate)) {
          existing.mostRecentDate = e.periodDate;
          existing.profileImageUrl = e.profileImageUrl;
          existing.portfolioUrl = e.portfolioUrl;
          existing.whatsappNumber = e.whatsappNumber;
          existing.category = e.category;
        }
      } else {
        byName.set(key, {
          name: e.name,
          profileImageUrl: e.profileImageUrl,
          portfolioUrl: e.portfolioUrl,
          whatsappNumber: e.whatsappNumber,
          category: e.category,
          wins: 1,
          totalPoints: e.points,
          mostRecentDate: e.periodDate,
        });
      }
    }

    return [...byName.values()].sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints);
  }, [entries, filterCategory]);

  const allTimeTotalPages = Math.max(
    1,
    Math.ceil(allTimeLeaders.length / ALL_TIME_PER_PAGE)
  );

  const paginatedAllTimeLeaders = useMemo(() => {
    const start = (allTimePage - 1) * ALL_TIME_PER_PAGE;
    return allTimeLeaders.slice(start, start + ALL_TIME_PER_PAGE);
  }, [allTimeLeaders, allTimePage]);

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative isolate min-h-[680px] overflow-hidden bg-[#05080F] sm:min-h-[720px]">
        {/* Fixed hero image — clipped to this section */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/hero1.png')",
            backgroundAttachment: "fixed",
          }}
          aria-hidden="true"
        />

        {/* Minimal cinematic treatment */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,8,15,0.42) 0%, rgba(5,8,15,0.58) 45%, rgba(5,8,15,0.94) 100%)",
          }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(circle at 22% 38%, rgba(36,120,255,0.22), transparent 34%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[680px] max-w-7xl items-center px-5 pb-16 pt-32 sm:min-h-[720px] sm:px-8 md:px-12 lg:px-16">
          <div className="max-w-5xl">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-9 bg-[#FFCC00]" />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-white/55 sm:text-[10px]">
                Creativo · Monthly Spotlight
              </span>
            </div>

            <h1 className="max-w-5xl text-[3.35rem] font-extrabold leading-[0.91] tracking-[-0.065em] text-white sm:text-6xl md:text-7xl lg:text-[6.5rem]">
              Great work
              <br />
              deserves to
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(100deg, #2478FF 0%, #68B2FF 48%, #FFCC00 100%)",
                }}
              >
                be seen.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-sm leading-7 text-white/55 sm:text-base md:text-lg">
              Discover the creators setting the standard. Explore the
              Spotlight leaderboard and join the community shaping what
              comes next.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/creativo"
                className="group inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-full bg-[#2478FF] px-6 py-3.5 text-xs font-extrabold text-white shadow-[0_18px_45px_-18px_#2478FF] transition-all duration-300 hover:-translate-y-1 hover:bg-[#0052FF] hover:shadow-[0_24px_55px_-18px_#2478FF] sm:min-w-[175px]"
              >
                <Users size={15} strokeWidth={2.4} />
                Join the community
                <ArrowRight
                  size={14}
                  strokeWidth={2.5}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <Link
                href="#leaderboard"
                className="group inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3.5 text-xs font-extrabold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.11] sm:min-w-[175px]"
              >
                View leaderboard
                <ArrowUpRight
                  size={14}
                  strokeWidth={2.4}
                  className="text-[#FFCC00] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-3 text-white/25">
              <span className="h-px w-8 bg-white/20" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em]">
                The creators to watch
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LEADERBOARD ── */}
      <section id="leaderboard" className="relative z-10 overflow-hidden border-t border-black/[0.06] bg-[#F7F9FC] px-6 py-16 md:px-16 md:py-24">
        <div
          className="pointer-events-none absolute -right-40 top-[-100px] h-[520px] w-[520px] rounded-full bg-[#2478FF]/10 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-40 bottom-[-180px] h-[480px] w-[480px] rounded-full bg-[#FFCC00]/[0.08] blur-[120px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#2478FF]">
                The leaderboard
              </p>
              <h2 className="max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] text-[#080808] sm:text-5xl md:text-6xl">
                The work that
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(100deg, #0052FF, #2478FF, #6C63FF)",
                  }}
                >
                  earned the spotlight.
                </span>
              </h2>
            </div>

            <div className="max-w-md text-sm leading-6 text-black/45 lg:pb-1">
              Explore the creators behind the standout work, compare this month with the full record, and discover who keeps showing up.
            </div>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex rounded-full bg-black/5 p-1">
              <button
                onClick={() => setView("month")}
                className="rounded-full px-5 py-2 text-xs font-bold transition-all"
                style={view === "month" ? { background: "#111111", color: "#FFFFFF" } : { color: "rgba(0,0,0,0.55)" }}
              >
                By month
              </button>
              <button
                onClick={() => setView("allTime")}
                className="rounded-full px-5 py-2 text-xs font-bold transition-all"
                style={view === "allTime" ? { background: "#111111", color: "#FFFFFF" } : { color: "rgba(0,0,0,0.55)" }}
              >
                All-time
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["All", ...CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => { setFilterCategory(c); setAllTimePage(1); }}
                  className="rounded-full px-4 py-2 text-xs font-bold transition-all"
                  style={filterCategory === c ? { background: BLUE, color: "#FFFFFF" } : { background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {view === "month" && availablePeriods.length > 1 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {availablePeriods.map(([key, iso]) => (
                <button
                  key={key}
                  onClick={() => setFilterPeriodKey(key)}
                  className="rounded-full px-4 py-2 text-xs font-bold transition-all"
                  style={effectivePeriodKey === key ? { background: BLUE_DARK, color: "#FFFFFF" } : { background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}
                >
                  {periodLabel(iso)}
                </button>
              ))}
            </div>
          )}

          {view === "month" ? (
            monthEntries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-black/10 p-10 text-center text-sm text-black/35">
                Nobody selected for{" "}
                {filterCategory === "All" ? "this period" : filterCategory}{" "}
                yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {monthEntries.map((entry, i) => (
                  <EntryCard key={entry.id} entry={entry} rankIndex={i} />
                ))}
              </div>
            )
          ) : allTimeLeaders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 p-10 text-center text-sm text-black/35">
              No winners in this category yet.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {paginatedAllTimeLeaders.map((leader, pageIndex) => {
                  const globalIndex =
                    (allTimePage - 1) * ALL_TIME_PER_PAGE + pageIndex;

                  return (
                    <motion.div
                      key={leader.name}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{
                        duration: 0.4,
                        delay: (pageIndex % 8) * 0.05,
                      }}
                      className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-4"
                    >
                      <span className="w-8 flex-shrink-0 text-center text-sm font-extrabold text-black/30">
                        {globalIndex + 1}
                      </span>

                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-black/5">
                        {leader.profileImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={leader.profileImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-black">
                          {leader.name}
                        </p>
                        <p className="truncate text-xs text-black/45">
                          {leader.category}
                        </p>
                      </div>

                                           <div className="flex-shrink-0 text-right">
                        <p
                          className="text-sm font-extrabold"
                          style={{ color: BLUE }}
                        >
                          {leader.wins}{" "}
                          {leader.wins === 1 ? "win" : "wins"}
                        </p>
                        <p className="text-[11px] font-semibold text-black/40">
                          {leader.totalPoints.toLocaleString()} pts total
                        </p>

                        <div className="mt-2 flex items-center justify-end gap-2">
                          {leader.portfolioUrl && (
                            <a
                              href={leader.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/portfolio inline-flex items-center gap-1 rounded-full border border-[#2478FF]/15 bg-[#2478FF]/[0.07] px-2.5 py-1.5 text-[9px] font-extrabold text-[#0052FF] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2478FF]/30 hover:bg-[#2478FF] hover:text-white"
                            >
                              Portfolio
                              <ExternalLink
                                size={11}
                                strokeWidth={2.4}
                                className="transition-transform group-hover/portfolio:translate-x-0.5 group-hover/portfolio:-translate-y-0.5"
                              />
                            </a>
                          )}

                          {leader.whatsappNumber && (
                            <a
                              href={spotlightWhatsappHref(
                                leader.whatsappNumber,
                                leader.name
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/contact inline-flex items-center gap-1 rounded-full border border-black/[0.07] bg-black/[0.035] px-2.5 py-1.5 text-[9px] font-extrabold text-black/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#25D366]/25 hover:bg-[#25D366] hover:text-white"
                            >
                              Contact
                              <ArrowRight
                                size={11}
                                strokeWidth={2.4}
                                className="transition-transform group-hover/contact:translate-x-0.5"
                              />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {allTimeTotalPages > 1 && (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/30">
                    Showing{" "}
                    {(allTimePage - 1) * ALL_TIME_PER_PAGE + 1}
                    {"–"}
                    {Math.min(
                      allTimePage * ALL_TIME_PER_PAGE,
                      allTimeLeaders.length
                    )}{" "}
                    of {allTimeLeaders.length} creators
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAllTimePage((page) => Math.max(1, page - 1))
                      }
                      disabled={allTimePage === 1}
                      className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-black/60 transition-all hover:border-black/20 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Previous
                    </button>

                    <span className="min-w-[72px] text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-black/35">
                      Page {allTimePage} / {allTimeTotalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setAllTimePage((page) =>
                          Math.min(allTimeTotalPages, page + 1)
                        )
                      }
                      disabled={allTimePage === allTimeTotalPages}
                      className="rounded-full bg-[#2478FF] px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#0052FF] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </section>

      {/* ── SHOWWORK CTA ── */}
      <section className="relative z-10 overflow-hidden bg-[#05080F] px-6 py-24 md:px-16 md:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.16]"
          style={{ backgroundImage: "url('/images/hero1.png')" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, #05080F 8%, rgba(5,8,15,0.82) 48%, rgba(5,8,15,0.9) 100%)",
          }}
          aria-hidden="true"
        />

        <div className="absolute left-[-100px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[#2478FF]/20 blur-[120px]" aria-hidden="true" />
        <div className="absolute right-[-80px] bottom-[-220px] h-[440px] w-[440px] rounded-full bg-[#FFCC00]/10 blur-[130px]" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_30px_100px_-45px_rgba(36,120,255,0.45)] backdrop-blur-xl md:p-12 lg:p-16">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
              <div className="max-w-3xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2478FF]/25 bg-[#2478FF]/10 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#68B2FF]">
                    Built for creative work
                  </span>
                </div>

                <h2 className="text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl md:text-6xl">
                  Your next great project
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(100deg, #2478FF, #68B2FF, #FFCC00)",
                    }}
                  >
                    starts here.
                  </span>
                </h2>

                <p className="mt-6 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
                  Deliver projects professionally or create a portfolio that makes your work impossible to overlook. Showwork gives your creative work the space it deserves.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/start"
                  className="group inline-flex min-w-[210px] items-center justify-center gap-3 rounded-full bg-[#2478FF] px-6 py-4 text-xs font-extrabold text-white shadow-[0_18px_45px_-18px_#2478FF] transition-all duration-300 hover:-translate-y-1 hover:bg-[#0052FF]"
                >
                  Deliver a project
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>

                <Link
                  href="/signup?next=/dashboard/portfolio"
                  className="group inline-flex min-w-[210px] items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-6 py-4 text-xs font-extrabold text-white transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10"
                >
                  Create your portfolio
                  <span className="text-[#FFCC00] transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
            <span>Showwork</span>
            <span>For creators who take their work seriously.</span>
          </div>
        </div>
      </section>
    </>
  );
}