"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, ChevronDown,
  ChevronLeft, ChevronRight, Crown, Medal, Sparkles,
  Trophy, UsersRound, ExternalLink, MessageCircle,
} from "lucide-react";

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

type AllTimeLeader = {
  key: string;
  name: string;
  profileImageUrl: string | null;
  portfolioUrl: string | null;
  whatsappNumber: string | null;
  category: string;
  wins: number;
  totalPoints: number;
  mostRecentDate: string;
};

const CATEGORIES = ["Video/Motion", "Graphics Design", "Photography", "Branding/Illustration"] as const;
const PAGE_SIZE = 10;

function periodKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown month";
  return date.toLocaleDateString("en-US", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

function safeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function whatsappHref(number: string, name: string): string {
  const digits = number.replace(/\D/g, "");
  const message = `Hi ${name}, I saw your work on the Creativo leaderboard and would love to work with you on a project.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function trackContact(name: string) {
  // Preserve the original Meta Pixel event without depending on global TS declarations.
  const fbq = (window as Window & {
    fbq?: (event: string, action: string, data: Record<string, string>) => void;
  }).fbq;
  fbq?.("track", "Contact", {
    content_name: name,
    content_category: "CREATIVO Leaderboard",
  });
}

function Avatar({
  name, src, size = "md",
}: {
  name: string; src: string | null; size?: "md" | "lg" | "xl";
}) {
  const dimensions = size === "xl" ? "h-24 w-24 sm:h-28 sm:w-28"
    : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-[18px] bg-[#E6F0E9] ${dimensions}`}>
      {src ? (
        // External profile images can come from arbitrary community URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} loading="lazy" decoding="async"
          className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#16834B]">
          {name.trim().charAt(0).toUpperCase() || "C"}
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] ${light ? "text-[#D8F3A5]" : "text-[#16834B]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${light ? "bg-[#D8F3A5]" : "bg-[#16834B]"}`} />
      {children}
    </p>
  );
}

function Actions({
  name, portfolioUrl, whatsappNumber, compact = false,
}: {
  name: string; portfolioUrl: string | null; whatsappNumber: string | null; compact?: boolean;
}) {
  const portfolio = safeUrl(portfolioUrl);
  return (
    <div className={`flex flex-wrap items-center ${compact ? "gap-x-4 gap-y-2" : "gap-2"}`}>
      {portfolio && (
        <a href={portfolio} target="_blank" rel="noopener noreferrer"
          className={compact
            ? "inline-flex items-center gap-1 text-xs font-semibold text-[#155FC7] hover:underline"
            : "inline-flex items-center gap-2 rounded-full border border-[#D7E6DA] bg-white px-4 py-2.5 text-xs font-semibold text-[#102A29] transition-colors hover:border-[#155FC7] hover:text-[#155FC7]"}>
          Portfolio <ArrowUpRight size={14} aria-hidden />
        </a>
      )}
      {whatsappNumber && (
        <a href={whatsappHref(whatsappNumber, name)} target="_blank" rel="noopener noreferrer"
          onClick={() => trackContact(name)}
          className={compact
            ? "inline-flex items-center gap-1 text-xs font-semibold text-[#16834B] hover:underline"
            : "inline-flex items-center gap-2 rounded-full bg-[#102A29] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#155FC7]"}>
          {compact ? "Contact" : "Work together"} <ArrowUpRight size={14} aria-hidden />
        </a>
      )}
    </div>
  );
}

function FeaturedCreator({ entry, rank }: { entry: LeaderboardEntryData; rank: number }) {
  const first = rank === 1;
  return (
    <article className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 sm:p-7 ${
      first ? "border-[#B7DCC1] bg-[#EAF5EC]" : "border-[#E0E9E2] bg-white"
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] ${
          first ? "bg-[#D8F3A5] text-[#102A29]" : "bg-[#EFF4F0] text-[#64776B]"
        }`}>
          {first ? <Crown size={14} /> : <Medal size={14} />}
          {rank === 1 ? "Spotlight leader" : rank === 2 ? "Second place" : "Third place"}
        </span>
        <span className="text-sm font-semibold tabular-nums text-[#16834B]">#{String(rank).padStart(2, "0")}</span>
      </div>
      <div className="mt-8"><Avatar name={entry.name} src={entry.profileImageUrl} size="xl" /></div>
      <div className="mt-6 flex-1">
        <h3 className="break-words text-2xl font-semibold tracking-[-0.055em] text-[#102A29]">{entry.name}</h3>
        <p className="mt-1 text-xs font-medium text-[#738477]">{entry.category}</p>
        <p className="mt-5 border-t border-[#CFE0D2] pt-5 text-sm leading-6 text-[#536B5C]">{entry.wonFor}</p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#CFE0D2] pt-5">
        <div><p className="text-2xl font-semibold tabular-nums tracking-tight">{entry.points.toLocaleString()}</p><p className="text-[11px] text-[#718676]">Spotlight points</p></div>
        <Actions name={entry.name} portfolioUrl={entry.portfolioUrl} whatsappNumber={entry.whatsappNumber} compact />
      </div>
    </article>
  );
}

function CreatorRow({ entry, rank }: { entry: LeaderboardEntryData; rank: number }) {
  return (
    <article className="grid gap-4 rounded-[22px] border border-[#E1EAE3] bg-white p-4 transition-colors hover:border-[#BED7C4] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-[#8AA093]">{String(rank).padStart(2, "0")}</span>
        <Avatar name={entry.name} src={entry.profileImageUrl} />
        <div className="min-w-0 sm:hidden">
          <h3 className="truncate text-sm font-semibold">{entry.name}</h3>
          <p className="truncate text-xs text-[#75877A]">{entry.category}</p>
        </div>
      </div>
      <div className="hidden min-w-0 sm:block">
        <h3 className="truncate text-sm font-semibold">{entry.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-[#75877A]">{entry.category} · {entry.wonFor}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E9F0EA] pt-3 sm:justify-end sm:border-0 sm:pt-0">
        <span className="text-sm font-semibold tabular-nums text-[#16834B]">{entry.points.toLocaleString()} <span className="text-[11px] font-normal text-[#829487]">pts</span></span>
        <Actions name={entry.name} portfolioUrl={entry.portfolioUrl} whatsappNumber={entry.whatsappNumber} compact />
      </div>
    </article>
  );
}

function AllTimeRow({ leader, rank }: { leader: AllTimeLeader; rank: number }) {
  return (
    <article className={`grid gap-4 rounded-[22px] border p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5 ${
      rank <= 3 ? "border-[#CFE3D4] bg-[#F0F8F1]" : "border-[#E1EAE3] bg-white"
    }`}>
      <div className="flex min-w-0 items-center gap-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold tabular-nums ${
          rank <= 3 ? "bg-[#D8F3A5] text-[#102A29]" : "bg-[#F0F4F1] text-[#789082]"
        }`}>{String(rank).padStart(2, "0")}</span>
        <Avatar name={leader.name} src={leader.profileImageUrl} />
        <div className="min-w-0 sm:hidden">
          <h3 className="truncate text-sm font-semibold">{leader.name}</h3>
          <p className="truncate text-xs text-[#75877A]">{leader.category}</p>
        </div>
      </div>
      <div className="hidden min-w-0 sm:block">
        <h3 className="truncate text-sm font-semibold">{leader.name}</h3>
        <p className="mt-1 truncate text-xs text-[#75877A]">{leader.category}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#DDE9E0] pt-3 sm:justify-end sm:gap-6 sm:border-0 sm:pt-0">
        <div className="sm:text-right">
          <p className="text-sm font-semibold text-[#16834B]">{leader.wins} {leader.wins === 1 ? "win" : "wins"}</p>
          <p className="text-[11px] tabular-nums text-[#829487]">{leader.totalPoints.toLocaleString()} pts total</p>
        </div>
        <Actions name={leader.name} portfolioUrl={leader.portfolioUrl} whatsappNumber={leader.whatsappNumber} compact />
      </div>
    </article>
  );
}

export default function LeaderboardPageContent({ entries }: { entries: LeaderboardEntryData[] }) {
  const [view, setView] = useState<"month" | "allTime">("month");
  const [category, setCategory] = useState<string>("All");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const availablePeriods = useMemo(() => {
    const seen = new Map<string, string>();
    for (const entry of entries) {
      const key = periodKey(entry.periodDate);
      if (key && !seen.has(key)) seen.set(key, entry.periodDate);
    }
    return [...seen].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const currentPeriod = selectedPeriod && availablePeriods.some(([key]) => key === selectedPeriod)
    ? selectedPeriod : availablePeriods[0]?.[0] ?? null;

  const monthLeaders = useMemo(() => entries
    .filter(entry => category === "All" || entry.category === category)
    .filter(entry => currentPeriod === null || periodKey(entry.periodDate) === currentPeriod)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)),
    [entries, category, currentPeriod]);

  const allTimeLeaders = useMemo(() => {
    const grouped = new Map<string, AllTimeLeader>();
    for (const entry of entries) {
      if (category !== "All" && entry.category !== category) continue;
      const digits = entry.whatsappNumber?.replace(/\D/g, "") || "";
      const key = digits ? `wa:${digits}` : `name:${entry.name.trim().toLowerCase()}`;
      const current = grouped.get(key);
      if (current) {
        current.wins++;
        current.totalPoints += entry.points;
        if (+new Date(entry.periodDate) > +new Date(current.mostRecentDate)) {
          current.name = entry.name;
          current.profileImageUrl = entry.profileImageUrl;
          current.portfolioUrl = entry.portfolioUrl;
          current.whatsappNumber = entry.whatsappNumber;
          current.category = entry.category;
          current.mostRecentDate = entry.periodDate;
        }
      } else {
        grouped.set(key, {
          key, name: entry.name, profileImageUrl: entry.profileImageUrl,
          portfolioUrl: entry.portfolioUrl, whatsappNumber: entry.whatsappNumber,
          category: entry.category, wins: 1, totalPoints: entry.points,
          mostRecentDate: entry.periodDate,
        });
      }
    }
    return [...grouped.values()].sort((a, b) =>
      b.wins - a.wins || b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  }, [entries, category]);

  const totalPages = Math.max(1, Math.ceil(allTimeLeaders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = allTimeLeaders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const featured = monthLeaders.slice(0, 3);
  const remaining = monthLeaders.slice(3);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F8FAF5] text-[#102A29] [font-family:var(--font-jakarta),ui-sans-serif,system-ui,sans-serif]">
      {/* Shared site navbar should be rendered by the existing layout. */}

      <section className="relative overflow-hidden border-b border-[#DCE8DF] px-5 pb-20 pt-32 sm:px-8 lg:px-14 lg:pb-24 lg:pt-44">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 h-[480px] w-[480px] rounded-full bg-[#E4EDFF]/60 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            <Eyebrow>Creativo · Monthly spotlight</Eyebrow>
            <h1 className="mt-6 text-[clamp(3.6rem,7vw,7rem)] font-semibold leading-[0.96] tracking-[-0.08em]">
              Great work<br />deserves to<br /><span className="text-[#155FC7]">be seen<span className="text-[#16834B]">.</span></span>
            </h1>
            <p className="mt-7 max-w-[520px] text-base leading-8 text-[#61756A] sm:text-lg">
              Discover the creators setting the standard. Explore the spotlight leaderboard and meet the people shaping what comes next.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/creativo" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#155FC7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#104DA8]">
                <UsersRound size={17} /> Join the community <ArrowUpRight size={16} />
              </Link>
              <a href="#leaderboard" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#D5E2D9] bg-white px-6 py-3 text-sm font-semibold transition-colors hover:border-[#9DBBA6]">
                Explore rankings <ArrowRight size={17} />
              </a>
            </div>
          </div>
          <div className="relative">
            <div aria-hidden="true" className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-[#D8F3A5]" />
            <div className="relative rounded-[32px] border border-[#DCE9DF] bg-white p-6 shadow-[0_20px_70px_rgba(16,42,41,0.07)] sm:p-8">
              <div className="flex items-center justify-between gap-3 border-b border-[#E5EEE7] pb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#16834B]">The latest spotlight</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">Creators to watch</h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E9F1FF] text-[#155FC7]"><Sparkles size={21} /></span>
              </div>
              <div className="mt-5 space-y-3">
                {entries.length ? [...entries]
                  .filter(e => availablePeriods[0]?.[0] === periodKey(e.periodDate))
                  .sort((a, b) => b.points - a.points).slice(0, 3)
                  .map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-[#F6F9F6] p-3">
                      <span className="w-6 text-center text-xs font-semibold text-[#16834B]">{String(i + 1).padStart(2, "0")}</span>
                      <Avatar name={entry.name} src={entry.profileImageUrl} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{entry.name}</p><p className="truncate text-xs text-[#758679]">{entry.category}</p></div>
                      <Trophy size={16} className="shrink-0 text-[#155FC7]" />
                    </div>
                  )) : null}
                {!entries.length && <p className="py-12 text-center text-sm text-[#718375]">The next creator to be featured could be you.</p>}
              </div>
              <p className="mt-6 text-xs leading-6 text-[#728578]">Real work. Real creators. A spotlight earned.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="leaderboard" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <Eyebrow>The leaderboard</Eyebrow>
              <h2 className="mt-5 text-[clamp(2.7rem,5vw,5rem)] font-semibold leading-[1.03] tracking-[-0.07em]">
                The work that<br /><span className="text-[#155FC7]">earned the spotlight.</span>
              </h2>
            </div>
            <p className="max-w-[370px] text-sm leading-7 text-[#65786B]">
              Explore this month&apos;s standout creators, or switch to the all-time view to see who keeps showing up.
            </p>
          </div>

          <div className="mt-12 rounded-[28px] border border-[#DDE9E0] bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex w-fit rounded-full bg-[#F0F5F1] p-1" role="group" aria-label="Leaderboard view">
                <button type="button" onClick={() => setView("month")} aria-pressed={view === "month"}
                  className={`rounded-full px-5 py-2.5 text-xs font-semibold transition-colors ${view === "month" ? "bg-[#102A29] text-white" : "text-[#687C6F] hover:text-[#102A29]"}`}>This month</button>
                <button type="button" onClick={() => { setView("allTime"); setPage(1); }} aria-pressed={view === "allTime"}
                  className={`rounded-full px-5 py-2.5 text-xs font-semibold transition-colors ${view === "allTime" ? "bg-[#102A29] text-white" : "text-[#687C6F] hover:text-[#102A29]"}`}>All-time</button>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Filter leaderboard category">
                {(["All", ...CATEGORIES] as const).map(c => (
                  <button key={c} type="button" aria-pressed={category === c}
                    onClick={() => { setCategory(c); setPage(1); }}
                    className={`rounded-full px-4 py-2.5 text-xs font-semibold transition-colors ${category === c ? "bg-[#155FC7] text-white" : "bg-[#F0F5F1] text-[#617669] hover:bg-[#E4EFE7]"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {view === "month" && availablePeriods.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E9F0EA] pt-5">
                <p className="text-xs text-[#758779]">{monthLeaders.length} {monthLeaders.length === 1 ? "creator" : "creators"} in this selection</p>
                <div className="relative">
                  <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#738779]" />
                  <select aria-label="Choose spotlight month" value={currentPeriod ?? ""}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="appearance-none rounded-full border border-[#D9E6DC] bg-[#F8FAF5] py-2.5 pl-11 pr-10 text-xs font-semibold outline-none focus:border-[#155FC7]">
                    {availablePeriods.map(([key, iso]) => <option key={key} value={key}>{periodLabel(iso)}</option>)}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}
          </div>

          {view === "month" ? (
            monthLeaders.length === 0 ? (
              <div className="mt-8 rounded-[24px] border border-dashed border-[#CFE0D4] bg-white px-6 py-20 text-center text-sm text-[#718477]">
                No spotlight entries yet for this selection.
              </div>
            ) : (
              <>
                <div className="mt-10 flex items-center gap-3">
                  <Trophy size={18} className="text-[#16834B]" />
                  <h3 className="text-lg font-semibold tracking-tight">The top three</h3>
                  <span className="text-xs text-[#849688]">{currentPeriod ? periodLabel(availablePeriods.find(([k]) => k === currentPeriod)?.[1] ?? "") : ""}</span>
                </div>
                <div className="mt-5 grid items-stretch gap-4 md:grid-cols-3">
                  {featured.map((entry, i) => <FeaturedCreator key={entry.id} entry={entry} rank={i + 1} />)}
                </div>
                {remaining.length > 0 && (
                  <div className="mt-12">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold tracking-tight">More standout creators</h3>
                      <span className="text-xs text-[#7A8C7E]">{remaining.length} more</span>
                    </div>
                    <div className="space-y-3">
                      {remaining.map((entry, i) => <CreatorRow key={entry.id} entry={entry} rank={i + 4} />)}
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            allTimeLeaders.length === 0 ? (
              <div className="mt-8 rounded-[24px] border border-dashed border-[#CFE0D4] bg-white px-6 py-20 text-center text-sm text-[#718477]">
                No winners in this category yet.
              </div>
            ) : (
              <div className="mt-10">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><Trophy size={18} className="text-[#16834B]" /><h3 className="text-lg font-semibold tracking-tight">All-time leaders</h3></div>
                  <p className="text-xs text-[#7A8C7E]">Ranked by wins, then total points</p>
                </div>
                <div className="space-y-3">
                  {paginated.map((leader, i) => <AllTimeRow key={leader.key} leader={leader} rank={(safePage - 1) * PAGE_SIZE + i + 1} />)}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-xs text-[#718477]">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, allTimeLeaders.length)} of {allTimeLeaders.length} creators</p>
                    <div className="flex items-center gap-3">
                      <button type="button" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 rounded-full border border-[#D6E4DA] bg-white px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">
                        <ChevronLeft size={15} /> Previous
                      </button>
                      <span className="text-xs tabular-nums text-[#718477]">{safePage} / {totalPages}</span>
                      <button type="button" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="inline-flex items-center gap-1 rounded-full bg-[#102A29] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </section>

      <section className="bg-[#102A29] px-5 py-20 text-white sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto grid max-w-[1240px] items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <Eyebrow light>Built for creative work</Eyebrow>
            <h2 className="mt-6 text-[clamp(2.7rem,5.4vw,5.2rem)] font-semibold leading-[1.04] tracking-[-0.07em]">
              Your next great project<br /><span className="text-[#D8F3A5]">starts here.</span>
            </h2>
            <p className="mt-6 max-w-[570px] text-sm leading-7 text-white/65 sm:text-base">
              Deliver projects professionally or create a portfolio that makes your work impossible to overlook. Showwork gives your creative work the space it deserves.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/start" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#D8F3A5] px-6 py-3 text-sm font-semibold text-[#102A29] transition-colors hover:bg-white">
              Deliver a project <ArrowUpRight size={17} />
            </Link>
            <Link href="/signup?next=/dashboard/portfolio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              Create your portfolio <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
