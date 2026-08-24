"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Crown,
  Sparkles,
  Trophy,
} from "lucide-react";

const BLUE = "#2478FF";
const BLUE_DARK = "#0052FF";
const YELLOW = "#FFCC00";
const CATEGORIES = ["Video/Motion", "Graphics Design", "Photography", "Branding/Illustration"];
const RANK_COLOR = ["#FFCC00", "#68B2FF", "#0052FF"];

export interface LeaderboardEntryData {
  id: string;
  name: string;
  profileImageUrl: string | null;
  category: string;
  portfolioUrl: string | null;
  wonFor: string;
  points: number;
  periodDate: string;
}

function periodKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function SpotlightLeaderboardSection({
  entries,
}: {
  entries: LeaderboardEntryData[];
}) {
  const [filterCategory, setFilterCategory] = useState<string | "All">("All");

  const mostRecentPeriodKey = useMemo(() => {
    if (entries.length === 0) return null;

    return entries
      .map((e) => periodKey(e.periodDate))
      .sort()
      .reverse()[0];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter(
        (e) => periodKey(e.periodDate) === mostRecentPeriodKey
      )
      .filter(
        (e) =>
          filterCategory === "All" ||
          e.category === filterCategory
      )
      .sort((a, b) => b.points - a.points);
  }, [entries, filterCategory, mostRecentPeriodKey]);

  return (
    <section className="relative overflow-hidden bg-[#F6F9FC] px-5 py-20 sm:px-8 md:px-12 md:py-28 lg:px-16">
      {/* Ambient brand lighting */}
      <div
        className="pointer-events-none absolute -left-48 top-[-160px] h-[520px] w-[520px] rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(36,120,255,0.13), rgba(36,120,255,0) 70%)",
        }}
      />

      <div
        className="pointer-events-none absolute -right-48 top-[10%] h-[480px] w-[480px] rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,204,0,0.09), rgba(255,204,0,0) 70%)",
        }}
      />

      {/* Subtle editorial grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.7) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        {/* ============================================================
            HEADER
            ============================================================ */}
        <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2478FF]/10 bg-white px-3.5 py-2 shadow-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2478FF]/10">
                <Sparkles
                  size={10}
                  strokeWidth={2.5}
                  className="text-[#2478FF]"
                />
              </span>

              <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-black/45">
                Monthly Spotlight
              </span>
            </div>

            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#2478FF]">
              Leaderboard
            </p>

            <h2 className="max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] text-black sm:text-5xl md:text-6xl">
              This month&apos;s
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(100deg, #0052FF, #2478FF, #6C63FF)",
                }}
              >
                Spotlight winners.
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-black/40 sm:text-base">
              The creators whose work stood out this month. Discover
              the people behind the work and explore what they made.
            </p>
          </div>

          <div className="hidden max-w-[230px] lg:block">
            <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.3)]">
              <div className="mb-4 flex items-center justify-between">
                <Trophy
                  size={17}
                  strokeWidth={2}
                  className="text-[#2478FF]"
                />

                <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-black/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFCC00]" />
                  Featured
                </span>
              </div>

              <p className="text-2xl font-extrabold tracking-[-0.04em] text-black">
                {filteredEntries.length}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/30">
                creators this month
              </p>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/[0.04]">
              <Trophy size={17} className="text-black/30" />
            </div>

            <p className="text-sm font-bold text-black/45">
              No winners announced yet.
            </p>
          </div>
        ) : (
          <>
            {/* ============================================================
                FILTERS
                ============================================================ */}
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(["All", ...CATEGORIES] as const).map((c) => {
                  const active = filterCategory === c;

                  return (
                    <button
                      key={c}
                      onClick={() => setFilterCategory(c)}
                      className="rounded-full border px-4 py-2.5 text-[10px] font-extrabold transition-all duration-300 hover:-translate-y-0.5 sm:text-xs"
                      style={{
                        background: active
                          ? "linear-gradient(135deg, #2478FF, #0052FF)"
                          : "#FFFFFF",
                        color: active
                          ? "#FFFFFF"
                          : "rgba(0,0,0,0.48)",
                        borderColor: active
                          ? BLUE
                          : "rgba(0,0,0,0.07)",
                        boxShadow: active
                          ? "0 10px 25px -15px #2478FF"
                          : "0 3px 12px -10px rgba(0,0,0,0.3)",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/25">
                Ranked by Spotlight points
              </p>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-12 text-center">
                <p className="text-sm text-black/35">
                  Nobody selected for{" "}
                  {filterCategory === "All"
                    ? "this month"
                    : filterCategory}{" "}
                  yet.
                </p>
              </div>
            ) : (
              <>
                {/* ========================================================
                    WINNERS
                    ======================================================== */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEntries.map((entry, i) => {
                    const rankColor =
                      RANK_COLOR[i] ?? "#DCE5F2";

                    const isTopThree = i < 3;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{
                          opacity: 0,
                          y: 20,
                        }}
                        whileInView={{
                          opacity: 1,
                          y: 0,
                        }}
                        viewport={{
                          once: true,
                          margin: "-40px",
                        }}
                        transition={{
                          duration: 0.5,
                          delay: (i % 6) * 0.06,
                        }}
                        whileHover={{
                          y: -6,
                        }}
                        className="group relative overflow-hidden rounded-[26px] border bg-white p-5 shadow-[0_20px_55px_-38px_rgba(0,0,0,0.32)] transition-all duration-300 hover:shadow-[0_28px_70px_-38px_rgba(36,120,255,0.28)]"
                        style={{
                          borderColor: isTopThree
                            ? `${rankColor}55`
                            : "rgba(0,0,0,0.06)",
                          background:
                            i === 0
                              ? "#FFFDF4"
                              : "#FFFFFF",
                        }}
                      >
                        {/* Top accent */}
                        {isTopThree && (
                          <div
                            className="absolute inset-x-0 top-0 h-1"
                            style={{
                              background:
                                i === 0
                                  ? "linear-gradient(90deg, #FFCC00, #2478FF)"
                                  : "linear-gradient(90deg, #2478FF, #68B2FF)",
                            }}
                          />
                        )}

                        <div className="mb-5 flex items-start justify-between">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold"
                            style={{
                              background:
                                i === 0
                                  ? YELLOW
                                  : i < 3
                                    ? rankColor
                                    : "#EEF3F9",
                              color:
                                i < 3
                                  ? "#080808"
                                  : "#6D7888",
                            }}
                          >
                            {i + 1}
                          </div>

                          {i === 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFCC00]/15 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#806600]">
                              <Crown size={10} strokeWidth={2.5} />
                              #1
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3.5">
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[17px] bg-[#EDF2F8] ring-1 ring-black/[0.05]">
                            {entry.profileImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={entry.profileImageUrl}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2478FF]/10 to-[#8B5CF6]/10 text-lg font-extrabold text-[#2478FF]">
                                {entry.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold tracking-[-0.02em] text-black">
                              {entry.name}
                            </p>

                            <p className="mt-1 truncate text-[11px] font-medium text-black/40">
                              {entry.category} — {entry.wonFor}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-black/[0.06] pt-4">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25">
                              Spotlight points
                            </p>

                            <p
                              className="mt-0.5 text-lg font-extrabold tracking-[-0.03em]"
                              style={{
                                color:
                                  i === 0
                                    ? "#9A7A00"
                                    : BLUE_DARK,
                              }}
                            >
                              {entry.points}
                            </p>
                          </div>

                          {entry.portfolioUrl && (
                            <a
                              href={entry.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/portfolio inline-flex items-center gap-1.5 rounded-full border border-[#2478FF]/15 bg-[#2478FF]/[0.07] px-3 py-2 text-[10px] font-extrabold text-[#0052FF] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2478FF]/30 hover:bg-[#2478FF] hover:text-white hover:shadow-[0_10px_24px_-14px_#2478FF]"
                            >
                              View work
                              <ArrowUpRight
                                size={12}
                                strokeWidth={2.5}
                                className="transition-transform duration-300 group-hover/portfolio:-translate-y-0.5 group-hover/portfolio:translate-x-0.5"
                              />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* ========================================================
                    BOTTOM CTA
                    ======================================================== */}
                <div className="relative mt-16 overflow-hidden rounded-[32px] bg-[#050A16] p-7 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.5)] sm:p-10 md:p-12">
                  <div
                    className="absolute -left-32 -top-40 h-[420px] w-[420px] rounded-full blur-[110px]"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(36,120,255,0.38), rgba(36,120,255,0) 70%)",
                    }}
                  />

                  <div
                    className="absolute -right-24 -bottom-40 h-[360px] w-[360px] rounded-full blur-[110px]"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,204,0,0.12), rgba(255,204,0,0) 70%)",
                    }}
                  />

                  <div
                    className="absolute inset-0 opacity-[0.035]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                      backgroundSize: "70px 70px",
                    }}
                  />

                  <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                        <Sparkles
                          size={11}
                          className="text-[#68B2FF]"
                        />

                        <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/45">
                          Creativo archive
                        </span>
                      </div>

                      <h3 className="text-3xl font-extrabold leading-[0.98] tracking-[-0.05em] text-white sm:text-4xl md:text-5xl">
                        Want to see who&apos;s
                        <br />
                        <span
                          className="bg-clip-text text-transparent"
                          style={{
                            backgroundImage:
                              "linear-gradient(100deg, #2478FF, #68B2FF, #FFCC00)",
                          }}
                        >
                          won before?
                        </span>
                      </h3>

                      <p className="mt-4 max-w-xl text-sm leading-6 text-white/40">
                        Explore the full Creativo leaderboard — every
                        month, every category, and the creators who
                        keep showing up.
                      </p>
                    </div>

                    <Link
                      href="/leaderboard"
                      className="group inline-flex w-fit flex-shrink-0 items-center gap-3 rounded-full bg-[#2478FF] px-6 py-4 text-xs font-extrabold text-white shadow-[0_18px_45px_-18px_#2478FF] transition-all duration-300 hover:-translate-y-1 hover:bg-[#0052FF] hover:shadow-[0_25px_55px_-18px_#2478FF] sm:px-7 sm:text-sm"
                    >
                      View full leaderboard
                      <ArrowRight
                        size={15}
                        strokeWidth={2.5}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
