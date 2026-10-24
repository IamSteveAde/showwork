"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/landing/SiteFooter";
import HostApplicationModal from "@/components/creativo/HostApplicationModal";
import WebinarRsvpModal from "@/components/creativo/WebinarRsvpModal";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check,
  ChevronDown, CirclePlay, Eye, HeartHandshake,
  MessageCircle, Sparkles, Trophy, UsersRound,
} from "lucide-react";

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

type Category = "Video/Motion" | "Graphics Design" | "Photography" | "Branding/Illustration";
const CATEGORIES: Category[] = ["Video/Motion", "Graphics Design", "Photography", "Branding/Illustration"];
const COMMUNITY = "https://tinyurl.com/creativocommunity";

const faq = [
  { q: "Does it cost anything?", a: "No. Creativo is free to join." },
  { q: "Who's eligible?", a: "Creativo is open to creators. Active Showwork users with submitted work can participate in eligible community challenges and spotlights." },
  { q: "How does the challenge work?", a: "Creators submit their work, the community engages with it, and standout entries earn visibility on the monthly spotlight." },
  { q: "How do I join?", a: "Tap Join community. You will be taken directly to the Creativo community." },
];

const advantages = [
  { icon: HeartHandshake, number: "01", title: "The right connections", description: "Meet people who understand your craft, refer opportunities, and open doors." },
  { icon: MessageCircle, number: "02", title: "Conversations that count", description: "Learn how other creatives price, present, and deliver their work." },
  { icon: UsersRound, number: "03", title: "People in your corner", description: "Get feedback, share progress, and grow alongside ambitious creatives." },
  { icon: Eye, number: "04", title: "Work worth seeing", description: "Get your strongest work in front of a community that notices." },
];

function keyOf(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function periodLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
function waHref(number: string, name: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${name}, I saw your work on Creativo and would love to work with you on a project.`)}`;
}
function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch { return null; }
}
function ExternalButton({ children, href = COMMUNITY, dark = false }: {
  children: React.ReactNode; href?: string; dark?: boolean;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155FC7] ${dark ? "bg-[#102A29] text-white" : "bg-[#155FC7] text-white"}`}>
      {children}<ArrowUpRight size={17} aria-hidden />
    </a>
  );
}
function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.17em] ${light ? "text-[#D8F3A5]" : "text-[#16834B]"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${light ? "bg-[#D8F3A5]" : "bg-[#16834B]"}`} />{children}
  </div>;
}
function Avatar({ name, src, size = "normal" }: { name: string; src: string | null; size?: "normal" | "large" }) {
  const className = `${size === "large" ? "h-16 w-16" : "h-12 w-12"} relative shrink-0 overflow-hidden rounded-2xl bg-[#E7EFFF]`;
  return <div className={className}>
    {src ? <Image src={src} alt={name} fill unoptimized sizes="64px" className="object-cover" /> :
      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#155FC7]">{name.charAt(0).toUpperCase()}</div>}
  </div>;
}

export default function CreativoContent({
  memberCountLabel, entries, webinars,
}: {
  memberCountLabel: string | null;
  entries: LeaderboardEntryData[];
  webinars: WebinarData[];
}) {
  const [category, setCategory] = useState<Category | "All">("All");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [hostOpen, setHostOpen] = useState(false);
  const [rsvp, setRsvp] = useState<WebinarData | null>(null);

  const periods = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const key = keyOf(e.periodDate);
      if (key && !map.has(key)) map.set(key, e.periodDate);
    }
    return [...map].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);
  const currentPeriod = selectedPeriod && periods.some(([key]) => key === selectedPeriod)
    ? selectedPeriod : periods[0]?.[0] ?? null;

  const spotlight = useMemo(() => entries
    .filter(e => currentPeriod === null || keyOf(e.periodDate) === currentPeriod)
    .sort((a, b) => b.points - a.points), [entries, currentPeriod]);
  const visible = useMemo(() => spotlight.filter(e => category === "All" || e.category === category), [spotlight, category]);
  const featured = spotlight.slice(0, 3);

  const sortedWebinars = useMemo(() => [...webinars].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)), [webinars]);
  const now = Date.now();
  const upcoming = sortedWebinars.filter(w => +new Date(w.startsAt) >= now);
  const past = sortedWebinars.filter(w => +new Date(w.startsAt) < now).reverse();

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F8FAF5] text-[#102A29] [font-family:var(--font-jakarta),ui-sans-serif,system-ui,sans-serif]">
      <Navbar />

      {/* Hero: light editorial layout with a genuine live community preview */}
      <section className="relative overflow-hidden border-b border-[#DDE8E0] px-5 pb-20 pt-32 sm:px-8 lg:px-14 lg:pb-28 lg:pt-44">
        <div aria-hidden className="pointer-events-none absolute -right-28 top-16 h-[450px] w-[450px] rounded-full bg-[#E7EEFF]/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1.1fr_.9fr] lg:gap-20">
          <div>
            <Eyebrow>Creativo by Showwork</Eyebrow>
            <h1 className="max-w-[740px] text-[clamp(3.7rem,7.5vw,7.6rem)] font-semibold leading-[0.96] tracking-[-0.085em]">
              Your work<br />deserves<br /><span className="text-[#155FC7]">a room<span className="text-[#16834B]">.</span></span>
            </h1>
            <p className="mt-8 max-w-[520px] text-base leading-8 text-[#62756A] sm:text-lg">
              Creativo is where photographers, videographers, editors and motion designers meet the people, feedback and opportunities that move their work forward.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <ExternalButton>Join the community</ExternalButton>
              <a href="#spotlight" className="inline-flex items-center gap-2 text-sm font-semibold text-[#102A29] hover:text-[#155FC7]">Explore the spotlight <ArrowDownRight size={18} /></a>
            </div>
            <div className="mt-12 flex items-center gap-3 border-t border-[#DDE8E0] pt-6 text-sm text-[#60756A]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6F4E8] text-[#16834B]"><UsersRound size={18}/></span>
              {memberCountLabel || "A growing community of creatives"}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-4 -top-5 h-32 w-32 rounded-full bg-[#D8F3A5]" aria-hidden />
            <div className="relative overflow-hidden rounded-[32px] border border-[#DDE8E0] bg-white p-6 shadow-[0_22px_75px_rgba(16,42,41,0.07)] sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-[#E8EEE9] pb-6">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#16834B]">Community spotlight</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">Creators to know.</h2></div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E9F1FF] text-[#155FC7]"><Sparkles size={22}/></span>
              </div>
              <div className="mt-6 space-y-3">
                {featured.length ? featured.map((entry, i) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-[#F8FAF5] p-3">
                    <span className="w-6 text-center text-xs font-bold text-[#16834B]">{String(i + 1).padStart(2, "0")}</span>
                    <Avatar name={entry.name} src={entry.profileImageUrl}/>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{entry.name}</p><p className="truncate text-xs text-[#74857A]">{entry.category}</p></div>
                    <Trophy size={17} className="text-[#155FC7]" aria-hidden />
                  </div>
                )) : <div className="rounded-2xl bg-[#F8FAF5] px-5 py-12 text-center text-sm text-[#718277]">The next creator in the spotlight could be you.</div>}
              </div>
              <Link href="/leaderboard" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#155FC7] hover:underline">View full leaderboard <ArrowRight size={16}/></Link>
            </div>
            <div className="absolute -bottom-6 -left-5 hidden rounded-2xl bg-[#102A29] px-5 py-4 text-sm font-medium text-white shadow-lg sm:block">Great work gets noticed <span className="ml-2 text-[#D8F3A5]">↗</span></div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section id="video" className="px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><Eyebrow>Step inside</Eyebrow><h2 className="text-[clamp(2.5rem,5vw,4.7rem)] font-semibold leading-[1.04] tracking-[-0.07em]">More than a community.<br/><span className="text-[#155FC7]">A creative room.</span></h2></div>
            <p className="max-w-[390px] text-sm leading-7 text-[#66796D]">See what Creativo is about and why the best opportunities often start with simply being in the room.</p>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#DDE8E0] bg-[#102A29] shadow-[0_20px_60px_rgba(16,42,41,0.08)]">
            <video src="/images/intro.mp4#t=0.1" controls preload="metadata" playsInline className="aspect-video w-full object-contain" aria-label="Introduction to the Creativo community" />
          </div>
        </div>
      </section>

      {/* Spotlight */}
      <section id="spotlight" className="border-y border-[#E2EAE4] bg-white px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div><Eyebrow>Monthly spotlight</Eyebrow><h2 className="text-[clamp(2.7rem,5vw,5rem)] font-semibold leading-[1.02] tracking-[-0.07em]">Great work should<br/><span className="text-[#155FC7]">be discoverable.</span></h2></div>
            <div className="max-w-[420px]"><p className="text-sm leading-7 text-[#65776B]">Every month, members submit real client work. The community helps put the strongest work in front of the people who should see it.</p><div className="mt-5"><ExternalButton>Want your work here?</ExternalButton></div></div>
          </div>
          <div className="mt-12 flex flex-col gap-5 border-y border-[#E6ECE7] py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" aria-label="Filter by category">
              {(["All", ...CATEGORIES] as const).map(c => <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}
                className={`rounded-full px-4 py-2.5 text-xs font-semibold transition-colors ${category === c ? "bg-[#102A29] text-white" : "bg-[#F1F5F1] text-[#5F7366] hover:bg-[#E5EFE7]"}`}>{c}</button>)}
            </div>
            {periods.length > 0 && <div className="relative inline-flex w-fit items-center">
              <CalendarDays size={16} className="pointer-events-none absolute left-4 text-[#617668]"/>
              <select aria-label="Spotlight month" value={currentPeriod ?? ""} onChange={e => setSelectedPeriod(e.target.value)}
                className="appearance-none rounded-full border border-[#DDE8E0] bg-white py-2.5 pl-11 pr-10 text-xs font-semibold text-[#102A29] outline-none focus:border-[#155FC7]">
                {periods.map(([key, iso]) => <option key={key} value={key}>{periodLabel(iso)}</option>)}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-4"/>
            </div>}
          </div>
          {visible.length === 0 ? <div className="mt-8 rounded-[24px] border border-dashed border-[#CFDDD2] bg-[#F8FAF5] px-6 py-16 text-center text-sm text-[#6B7E70]">No spotlight entries yet for this selection.</div> :
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((entry, index) => {
                const portfolio = safeExternalUrl(entry.portfolioUrl);
                return <article key={entry.id} className="group flex flex-col rounded-[26px] border border-[#E0EAE2] bg-[#F8FAF5] p-6 transition-colors hover:border-[#B9D3C2] hover:bg-[#F2F8F3]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3"><Avatar name={entry.name} src={entry.profileImageUrl} size="large"/><div className="min-w-0"><h3 className="truncate text-base font-semibold">{entry.name}</h3><p className="mt-1 truncate text-xs text-[#708377]">{entry.category}</p></div></div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E3EDFF] text-xs font-bold text-[#155FC7]">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="mt-7 flex-1 border-t border-[#E0EAE2] pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#789080]">Spotlighted for</p><p className="mt-2 text-sm font-medium leading-7">{entry.wonFor}</p></div>
                  <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#16834B]">{entry.points} points</span>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      {portfolio && <a href={portfolio} target="_blank" rel="noopener noreferrer" className="hover:text-[#155FC7]">Portfolio</a>}
                      {entry.whatsappNumber && <a href={waHref(entry.whatsappNumber, entry.name)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#155FC7]">Work together <ArrowUpRight size={14}/></a>}
                    </div>
                  </div>
                </article>;
              })}
            </div>}
          <div className="mt-10 text-center"><Link href="/leaderboard" className="inline-flex items-center gap-2 rounded-full border border-[#CFE0D4] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[#F0F6F1]">Explore full leaderboard <ArrowUpRight size={16}/></Link></div>
        </div>
      </section>

      {/* Value proposition */}
      <section className="bg-[#102A29] px-5 py-20 text-white sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <Eyebrow light>Why be here?</Eyebrow>
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <h2 className="text-[clamp(2.8rem,5.5vw,5.3rem)] font-semibold leading-[1.03] tracking-[-0.07em]">The things you<br/>cannot build <span className="text-[#D8F3A5]">alone.</span></h2>
            <p className="max-w-[340px] text-sm leading-7 text-white/65">A community is more than a group chat. It's a place where your next opportunity can begin.</p>
          </div>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {advantages.map(item => { const Icon = item.icon; return <div key={item.number} className="flex min-h-[265px] flex-col rounded-[24px] border border-white/15 bg-white/[0.055] p-6">
              <div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D8F3A5] text-[#102A29]"><Icon size={21}/></span><span className="text-xs text-white/45">{item.number}</span></div>
              <div className="mt-auto pt-9"><h3 className="text-lg font-semibold tracking-tight">{item.title}</h3><p className="mt-3 text-sm leading-6 text-white/60">{item.description}</p></div>
            </div>; })}
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="bg-[#EAF2FF] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div><Eyebrow>Learn from the room</Eyebrow><h2 className="text-[clamp(2.7rem,5vw,5rem)] font-semibold leading-[1.02] tracking-[-0.07em]">Conversations that<br/>make you <span className="text-[#155FC7]">smarter.</span></h2></div>
            <div className="max-w-[370px]"><p className="text-sm leading-7 text-[#60746D]">Creativo sessions bring experienced people into the room to talk about what creators actually need help figuring out.</p><button type="button" onClick={() => setHostOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#102A29] px-6 py-3 text-sm font-semibold text-white hover:bg-[#155FC7]">Apply to host <ArrowUpRight size={16}/></button></div>
          </div>
          {upcoming.length === 0 && past.length === 0 ? <div className="mt-12 rounded-[26px] border border-[#D5E2F2] bg-white/75 p-10 text-sm text-[#60746D]">New community sessions will appear here.</div> :
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[...upcoming, ...past].map(w => {
              const isUpcoming = +new Date(w.startsAt) >= now;
              const replay = safeExternalUrl(w.replayUrl);
              return <article key={w.id} className="flex flex-col overflow-hidden rounded-[26px] border border-[#D9E5F0] bg-white">
                {w.flyerImageUrl && <div className="relative w-full bg-[#DCE8F5]"><Image src={w.flyerImageUrl} alt={`${w.topic} flyer`} width={800} height={1000} unoptimized sizes="(max-width: 768px) 100vw, 400px" className="h-auto w-full" /></div>}
                <div className="flex flex-1 flex-col p-6">
                  <span className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isUpcoming ? "bg-[#E4F4E6] text-[#16834B]" : "bg-[#F1F4F7] text-[#738397]"}`}>{isUpcoming ? "Upcoming session" : "Past session"}</span>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em]">{w.topic}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#687B71]">{[w.guests, new Date(w.startsAt).toLocaleString()].filter(Boolean).join(" · ")}</p>
                  {isUpcoming ? <button type="button" onClick={() => setRsvp(w)} className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-[#155FC7]">Reserve your spot <ArrowUpRight size={16}/></button> :
                  replay ? <a href={replay} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-[#155FC7]"><CirclePlay size={17}/> Watch replay <ArrowUpRight size={16}/></a> : null}
                </div>
              </article>;
            })}
          </div>}
        </div>
      </section>

      {/* Showwork */}
      <section className="bg-white px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div><Eyebrow>Powered by Showwork</Eyebrow><h2 className="text-[clamp(2.7rem,5vw,5rem)] font-semibold leading-[1.04] tracking-[-0.07em]">The community<br/>meets <span className="text-[#155FC7]">the work.</span></h2>
            <p className="mt-7 max-w-[510px] text-base leading-8 text-[#63766A]">Creativo gives creators the room. Showwork helps them run the work that comes from it — from delivery and approval to getting paid.</p>
            <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#155FC7] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#104EA6]">Explore Showwork <ArrowUpRight size={17}/></Link>
          </div>
          <div className="relative overflow-hidden rounded-[32px] bg-[#D8F3A5] p-8 sm:p-12">
            <div className="flex h-[310px] flex-col justify-between rounded-[24px] border border-[#102A29]/10 bg-white/80 p-7 sm:p-9">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#102A29] text-white"><Check size={24}/></span>
              <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#16834B]">From connection to completion</p><p className="mt-3 text-[clamp(1.8rem,3vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.055em]">Meet the right people.<br/><span className="text-[#155FC7]">Deliver your best work.</span></p></div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#E2EAE4] bg-[#F8FAF5] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div><Eyebrow>Questions</Eyebrow><h2 className="text-[clamp(2.7rem,4.7vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.07em]">Good to<br/><span className="text-[#155FC7]">know.</span></h2></div>
          <div className="border-t border-[#DCE7DE]">{faq.map(item => <details key={item.q} className="group border-b border-[#DCE7DE] py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold marker:hidden [&::-webkit-details-marker]:hidden">{item.q}<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F0E8] text-[#102A29] transition-transform group-open:rotate-180"><ChevronDown size={18}/></span></summary>
            <p className="max-w-[590px] pt-4 text-sm leading-7 text-[#687B6E]">{item.a}</p>
          </details>)}</div>
        </div>
      </section>

      {/* Closing */}
      <section className="bg-[#D8F3A5] px-5 py-20 text-center sm:px-8 lg:py-28">
        <div className="mx-auto max-w-[820px]"><Eyebrow>There is room for you</Eyebrow><h2 className="text-[clamp(3rem,7vw,6.7rem)] font-semibold leading-[0.99] tracking-[-0.08em]">Stop being the<br/>best-kept <span className="text-[#155FC7]">secret.</span></h2>
          <p className="mx-auto mt-7 max-w-[540px] text-base leading-8 text-[#4B6552]">Join creators sharing knowledge, opportunities and the kind of momentum that's difficult to create alone.</p>
          <div className="mt-9"><ExternalButton dark>Join Creativo</ExternalButton></div>
        </div>
      </section>

      <SiteFooter />
      <HostApplicationModal open={hostOpen} onClose={() => setHostOpen(false)} />
      {rsvp && <WebinarRsvpModal webinarId={rsvp.id} topic={rsvp.topic} onClose={() => setRsvp(null)} />}
    </main>
  );
}
