"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Calendar, Layers, Crown, ArrowUpRight, ArrowRight, ExternalLink } from "lucide-react";

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

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="group rounded-[22px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08] sm:p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}>
        <Icon size={18} strokeWidth={2} style={{ color: accent }} />
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.1em" }}>{label}</p>
    </div>
  );
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
          <p className="truncate text-sm font-bold text-black">{entry.name}</p>
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
      const key = e.name.trim().toLowerCase();
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

  const insights = useMemo(() => {
    const totalWinners = entries.length;
    const totalMonths = availablePeriods.length;
    const categoryCounts = new Map<string, number>();
    for (const e of entries) categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
    const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const mostWins = Math.max(0, ...allTimeLeaders.map((l) => l.wins));
    return { totalWinners, totalMonths, topCategory, mostWins };
  }, [entries, availablePeriods, allTimeLeaders]);

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative isolate min-h-[760px] overflow-hidden bg-[#05080F]">
        {/* Hero-only background. The image uses fixed background attachment while
            remaining clipped to this hero section, so it never bleeds into the
            leaderboard or footer. */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/hero1.png')",
            backgroundAttachment: "fixed",
          }}
          aria-hidden="true"
        />

        {/* Premium readability treatment over the photography. */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,8,15,0.62) 0%, rgba(5,8,15,0.72) 42%, rgba(5,8,15,0.94) 100%)",
          }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(circle at 18% 25%, rgba(36,120,255,0.34), transparent 32%), radial-gradient(circle at 86% 22%, rgba(255,204,0,0.13), transparent 22%)",
          }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 z-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl flex-col justify-end px-6 pb-12 pt-40 md:px-12 md:pb-16 lg:px-16">
          <div className="grid items-end gap-12 lg:grid-cols-[1fr_440px]">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFCC00] shadow-[0_0_14px_rgba(255,204,0,0.8)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                  Creativo · Leaderboard
                </span>
              </div>

              <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] text-white sm:text-6xl md:text-7xl lg:text-[5.8rem]">
                Every winner,
                <br />
                every month,
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(100deg, #2478FF 0%, #68B2FF 45%, #FFFFFF 100%)",
                  }}
                >
                  all in one place.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-sm leading-7 text-white/55 sm:text-base md:text-lg">
                The full record of Creativo's Monthly Spotlight — filter by category and month, or see who&apos;s won the most, ever.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[40px] bg-[#2478FF]/10 blur-3xl" />

              <div className="relative grid grid-cols-2 gap-2.5 sm:gap-3">
                <StatCard icon={Trophy} label="Total winners" value={String(insights.totalWinners)} accent={YELLOW} />
                <StatCard icon={Calendar} label="Months run" value={String(insights.totalMonths)} accent={BLUE} />
                <StatCard icon={Layers} label="Top category" value={insights.topCategory} accent="#68B2FF" />
                <StatCard icon={Crown} label="Most wins, one creator" value={String(insights.mostWins)} accent={YELLOW} />
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-3 text-white/35">
            <span className="h-px w-10 bg-white/20" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
              Scroll to explore
            </span>
          </div>
        </div>
      </section>

      {/* ── LEADERBOARD ── */}
      <section className="relative z-10 overflow-hidden border-t border-black/[0.06] bg-[#F7F9FC] px-6 py-16 md:px-16 md:py-24">
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
                  onClick={() => setFilterCategory(c)}
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
                Nobody selected for {filterCategory === "All" ? "this period" : filterCategory} yet.
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
            <div className="flex flex-col gap-3">
              {allTimeLeaders.map((leader, i) => (
                <motion.div
                  key={leader.name}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
                  className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-4"
                >
                  <span className="w-8 flex-shrink-0 text-center text-sm font-extrabold text-black/30">{i + 1}</span>
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-black/5">
                    {leader.profileImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={leader.profileImageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-black">{leader.name}</p>
                    <p className="truncate text-xs text-black/45">{leader.category}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-extrabold" style={{ color: BLUE }}>{leader.wins} win{leader.wins === 1 ? "" : "s"}</p>
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
                          href={spotlightWhatsappHref(leader.whatsappNumber, leader.name)}
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
              ))}
            </div>
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
                  href="/projects"
                  className="group inline-flex min-w-[210px] items-center justify-center gap-3 rounded-full bg-[#2478FF] px-6 py-4 text-xs font-extrabold text-white shadow-[0_18px_45px_-18px_#2478FF] transition-all duration-300 hover:-translate-y-1 hover:bg-[#0052FF]"
                >
                  Deliver a project
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>

                <Link
                  href="/portfolio"
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