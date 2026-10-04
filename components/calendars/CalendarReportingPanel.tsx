"use client";

import WorkspaceFeatureNotice from "@/components/calendars/WorkspaceFeatureNotice";


import { queueReportingRecommendation } from "@/lib/reporting/recommendationHandoff";
import UiSymbol from "@/components/ui/UiSymbol";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronDown, ChevronUp, Clock3, Eye, Lightbulb, Flame, Minus, Target, RefreshCw, Sparkles, Users, ChartNoAxesCombined } from "lucide-react";

type Metrics = {
  reach?: number | null;
  impressions?: number | null;
  views?: number | null;
  engagement?: number | null;
  engagementRate?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
};
type Change = { value: number | null; delta: number | null; percent: number | null; basis: string; note?: string };
type Report = {
  advancedAccess?: boolean;
  comparisonPeriod: { start: string; end: string };
  performance: Record<string, Change>;
  leads: { total: number; acquired: Change; hotCount: number; customers: number; hottest: Array<{ id: string; name: string; company: string | null; username: string | null; status: string; source: string; updatedAt: string; socialConversation: { platform: string; participantName: string | null; participantUsername: string | null } | null }> } | null;
  period: { start: string; end: string };
  facebookPageActivity: {
    pageId: string; pageName: string; followers: number | null;
    notices: string[];
    posts: Array<{ id: string; message: string | null; createdAt: string | null; permalink: string | null; imageUrl: string | null; likes: number | null; comments: number | null; shares: number | null; reach: number | null; impressions: number | null }>;
  } | null;
  facebookPageActivityError: string | null;
  connections: Array<{
    id: string; platform: string; platformAccountId: string; accountName: string | null; username: string | null;
    status: string; lastSyncAt: string | null; lastSyncAttemptAt: string | null; lastSyncError?: string | null;
    accountMetricSnapshots: Array<{ snapshotDate: string; followers: number | null; followerGrowth: number | null; reach: number | null; views: number | null; engagement: number | null; additionalMetrics?: Record<string, unknown> | null }>;
  }>;
  accountPosts: Array<{
    id: string; connectionId: string; platform: string; platformPostId: string; caption: string | null; postType: string | null;
    publishedAt: string; permalink: string | null; views: number | null; reach: number | null;
    impressions: number | null; engagement: number | null; likes: number | null; comments: number | null;
    shares: number | null; saves: number | null; metricsUpdatedAt: string | null;
    accountName: string | null; username: string | null; source: "PLATFORM";
  }>;
  posts: Array<{
    id: string; platform: string; permalink: string | null; status: string; publishedAt: string | null;
    metricSnapshots: Array<Metrics & { snapshotDate: string }>;
    connection: { accountName: string | null; username: string | null } | null;
    calendarPost: { caption: string | null; postType: string; assets: Array<{ mediaType: string; previewUrl: string | null }> };
  }>;
  insights: Array<{ id: string; platform: string | null; type: string; title: string; description: string; recommendation: string | null; generatedAt: string }>;
};

const label: Record<string, string> = { INSTAGRAM: "Instagram", TIKTOK: "TikTok", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", X: "X", YOUTUBE: "YouTube" };
const dateInput = (date: Date) => date.toISOString().slice(0, 10);
const number = (value: number | null | undefined) => value == null ? "—" : Intl.NumberFormat(undefined, { maximumFractionDigits: 1, notation: value >= 100000 ? "compact" : "standard" }).format(value);

function renderMetricNote(note: string) {
  return note.split("→").map((part, index) => <span key={index}>{index > 0 && <><UiSymbol name="right" /><span className="sr-only">to</span></>}{part}</span>);
}

function Trend({ metric, followers = false }: { metric: Change; followers?: boolean }) {
  if (metric.delta == null) return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Activity className="h-3 w-3" />{renderMetricNote(metric.note || "No earlier data to compare")}<span className="sr-only"> · {metric.basis}</span></span>;
  const Icon = metric.delta === 0 ? Minus : metric.delta > 0 ? ArrowUpRight : ArrowDownRight;
  return <div><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${metric.delta === 0 ? "bg-slate-100 text-slate-600" : metric.delta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}><Icon aria-hidden="true" className="h-3.5 w-3.5" />{metric.delta > 0 ? "+" : metric.delta < 0 ? "−" : ""}{followers && metric.delta === 0 ? "No net follower change recorded" : `${metric.delta === 0 ? "0" : number(Math.abs(metric.delta))}${followers ? " followers" : ""}`}{metric.percent != null && !(followers && metric.delta === 0) && <span className="font-normal">({Math.abs(metric.percent).toFixed(1)}%)</span>}<span className="sr-only">{metric.delta > 0 ? "increase" : metric.delta < 0 ? "decrease" : "no change"}</span></span>{metric.note && <p className="mt-2 text-[10px] leading-4 text-slate-500">{renderMetricNote(metric.note)}</p>}</div>;
}

export default function CalendarReportingPanel({ calendarId, isManager, canAnalyze, canApplyRecommendations, clientSlug, advancedAccess = true, recommendationsAccess = true }: { calendarId: string; isManager: boolean; canAnalyze: boolean; canApplyRecommendations: boolean; clientSlug?: string; advancedAccess?: boolean; recommendationsAccess?: boolean }) {
  const [from, setFrom] = useState(() => dateInput(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => dateInput(new Date()));
  const [platform, setPlatform] = useState("");
  const queryKey = JSON.stringify([calendarId, clientSlug, from, to, platform]);
  const [loadedReport, setLoadedReport] = useState<{ key: string; data: Report } | null>(null);
  // A filter change immediately invalidates old actions, before the fetch effect runs.
  const report = loadedReport?.key === queryKey ? loadedReport.data : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [postsExpanded, setPostsExpanded] = useState(false);

  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!from || !to || from > to) { setError("Choose a valid reporting date range."); setLoadedReport(null); setLoading(false); return; }
    setLoading(true); setError(""); setLoadedReport(null); setPostsExpanded(false);
    try {
      const query = new URLSearchParams({ from, to });
      if (platform) query.set("platform", platform);
      const response = await fetch(`${clientSlug ? `/api/social-calendar/${encodeURIComponent(clientSlug)}` : `/api/calendars/${encodeURIComponent(calendarId)}`}/reporting?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load reporting.");
      if (version === requestVersion.current) setLoadedReport({ key: queryKey, data });
    } catch (err) { if (version === requestVersion.current) setError(err instanceof Error ? err.message : "Could not load reporting."); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [calendarId, clientSlug, from, to, platform, queryKey]);

  const latestLoad = useRef(load);
  const syncTimer = useRef<number | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    latestLoad.current = load;
    void load();
    return () => { ++requestVersion.current; };
  }, [load]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, []);

  async function syncReportingNow() {
    setSyncing(true); setError(""); setSyncNotice("");
    try {
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/sync`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start reporting sync.");
      if (!mounted.current) return;
      setSyncNotice("Sync started. Refresh this report in a few seconds to see the latest status.");
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => { void latestLoad.current(); }, 8000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not start reporting sync."); }
    finally { setSyncing(false); }
  }
  const connected = report?.connections.filter(c => c.status === "CONNECTED").length ?? 0;
  const [insightFilter, setInsightFilter] = useState("ALL");
  const shownInsights = report?.insights.filter(i => insightFilter === "ALL" || (insightFilter === "ACTION" ? Boolean(i.recommendation?.trim()) : i.type === insightFilter)) ?? [];

  const recommendations = shownInsights.filter(insight => insight.recommendation?.trim());
  const canApply = canApplyRecommendations && recommendationsAccess && !clientSlug && !loading && !analyzing && !!report;
  const shownPosts = postsExpanded ? report?.accountPosts ?? [] : report?.accountPosts.slice(0, 5) ?? [];

  async function analyzePerformance() {
    setAnalyzing(true); setError("");
    try {
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, ...(platform ? { platform } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not analyze reporting data.");
      if (mounted.current) await latestLoad.current();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not analyze reporting data."); }
    finally { setAnalyzing(false); }
  }

  function applyRecommendation(title: string, description: string, recommendation: string | null) {
    if (!canApply || !recommendation?.trim()) return;
    const instructions = `Reporting insight: ${title}.\nRecommendation to test: ${recommendation}.\nEvidence: ${description}.\nBuild the next content batch around this experiment while following the business knowledge and brand voice.`;
    openContentGenerator(instructions);
  }

  function applyAllRecommendations() {
    if (!canApply || !recommendations.length) return;
    const instructions = [
      "Apply all of these reporting recommendations across the next content batch while following the business knowledge and brand voice. Match each recommendation to its relevant platform and distribute experiments across suitable posts.",
      ...recommendations.map((insight, index) => `${index + 1}. ${insight.title} (${insight.platform ? label[insight.platform] || insight.platform : "All platforms"})\nRecommendation: ${insight.recommendation}\nEvidence: ${insight.description}`),
    ].join("\n\n");
    openContentGenerator(instructions);
  }

  function openContentGenerator(instructions: string) {
    if (!queueReportingRecommendation(calendarId, instructions)) return;
    window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "generate" } }));
  }

  const unavailable: Change = { value: null, delta: null, percent: null, basis: "vs previous period" };
  const cards = [
    { title: "Followers", metric: report?.performance.followers ?? unavailable, icon: Users, tint: "bg-amber-50 text-amber-700" },
    { title: "Daily reach", metric: report?.performance.reach ?? unavailable, icon: Eye, tint: "bg-blue-50 text-blue-700" },
    { title: "Video views", metric: report?.performance.views ?? unavailable, icon: BarChart3, tint: "bg-violet-50 text-violet-700" },
    { title: "Engagements", metric: report?.performance.engagement ?? unavailable, icon: Activity, tint: "bg-emerald-50 text-emerald-700" },
    { title: "Total leads", metric: { value: report?.leads?.total ?? null, delta: report?.leads?.acquired.value ?? null, percent: null, basis: "new leads in selected period" }, icon: Target, tint: "bg-rose-50 text-rose-700" },
    { title: "New leads", metric: report?.leads?.acquired ?? unavailable, icon: Flame, tint: "bg-orange-50 text-orange-700" },
  ];
  const reachDays = new Map<string, number>();
  for (const connection of report?.connections ?? []) {
    if (connection.status !== "CONNECTED") continue;
    for (const snapshot of connection.accountMetricSnapshots) {
      if (snapshot.reach != null) {
        const day = snapshot.snapshotDate.slice(0, 10);
        reachDays.set(day, (reachDays.get(day) ?? 0) + snapshot.reach);
      }
    }
  }
  const timeline: Array<[string, number | null]> = [];
  if (report && reachDays.size) {
    for (let timestamp = +new Date(report.period.start); timestamp <= +new Date(report.period.end); timestamp += 86400000) {
      const day = dateInput(new Date(timestamp));
      timeline.push([day, reachDays.get(day) ?? null]);
    }
  }
  const peakReach = Math.max(1, ...timeline.map(([, value]) => value ?? 0));
  const navigateToLeads = () => window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "leads" } }));

  return <section aria-busy={loading} className="space-y-6 rounded-3xl bg-slate-50/70 p-3 sm:p-5" aria-label="Social reporting">
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101828] via-[#172554] to-[#312E81] p-5 text-white shadow-[0_16px_44px_rgba(16,24,40,.14)] sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-blue-100"><ChartNoAxesCombined className="h-3.5 w-3.5" /> Performance overview</div><h3 className="mt-4 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Analytics &amp; reporting</h3><p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">Understand your momentum. Find your next opportunity. Turn evidence into action.</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1.5"><CalendarDays className="h-3 w-3" />{from} — {to}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1.5"><Check className="h-3 w-3" />{connected} connected account{connected === 1 ? "" : "s"}</span></div></div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-semibold text-slate-300">From<input aria-label="Start date" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white [color-scheme:dark]" /></label>
          <label className="text-[10px] font-semibold text-slate-300">To<input aria-label="End date" type="date" value={to} min={from} max={dateInput(new Date())} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white [color-scheme:dark]" /></label>
          <label className="text-[10px] font-semibold text-slate-300">Platform<select aria-label="Platform" value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-[#202B3B] px-2.5 py-[9px] text-xs text-white"><option value="">All platforms</option>{Object.entries(label).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
          <button type="button" onClick={() => { setFrom(dateInput(new Date(Date.now() - 29 * 86400000))); setTo(dateInput(new Date())); setPlatform(""); setInsightFilter("ALL"); setPostsExpanded(false); }} className="rounded-lg border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/10">Reset</button>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-semibold text-[#101828] disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{loading ? "Updating" : "Refresh"}</button>
        </div>
      </div>
    </div>

    <nav aria-label="Report sections" className="flex flex-wrap items-center gap-2">{[["performance", "Performance"], ...(!clientSlug ? [["lead-opportunities", "Lead opportunities"]] : []), ["ai-insights", clientSlug ? "AI recommendations" : "AI action studio"], ["channel-detail", "Channels & content"]].map(([id, name]) => <a key={id} href={`#${id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">{name}</a>)}<div className="ml-auto flex gap-1">{[7, 30, 90].map(days => <button key={days} type="button" onClick={() => { setTo(dateInput(new Date())); setFrom(dateInput(new Date(Date.now() - (days - 1) * 86400000))); }} className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">{days}D</button>)}</div></nav>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {(!advancedAccess || report?.advancedAccess === false) && <WorkspaceFeatureNotice compact feature="advancedAnalytics" />}
    {loading && !report ? <div className="rounded-2xl border border-[#DFE6EF] bg-white p-8 text-center text-sm text-[#667085]">Loading performance data…</div> : report && <>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 id="performance" className="scroll-mt-6 text-lg font-semibold tracking-tight text-[#101828]">Your performance, in perspective</h4><p className="mt-1 text-xs text-[#667085]">Previous period: {report.comparisonPeriod.start.slice(0, 10)} — {report.comparisonPeriod.end.slice(0, 10)}. Each card identifies its comparison basis.</p></div><span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#667085]"><Clock3 className="h-3.5 w-3.5" />Updated {report.connections.map(c => c.lastSyncAt).filter(Boolean).sort().at(-1) ? new Date(report.connections.map(c => c.lastSyncAt).filter(Boolean).sort().at(-1)!).toLocaleString() : "—"}</span></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.filter(card => !clientSlug || !["Total leads", "New leads"].includes(card.title)).map(({ title, metric, icon: Icon, tint }) => <div key={title} className="group rounded-2xl border border-[#E7EBF1] bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,.025)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(16,24,40,.07)] sm:p-5"><div className="flex items-start justify-between"><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#667085]">{title}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-semibold tracking-[-.04em] text-[#101828] sm:text-[28px]">{number(metric.value)}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{metric.basis}</p><div className="mt-3 min-h-[48px]"><Trend metric={metric} followers={title === "Followers"} /></div></div>)}</div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-semibold text-slate-800">Content published this period</p><p className="mt-1 text-[10px] text-slate-400">Current lifetime post counters · up to 500 stored posts per account across both periods</p></div>{[["Posts", report.accountPosts.length], ...(["views", "likes", "engagement"] as const).map(key => { const values = report.accountPosts.map(post => post[key]).filter((value): value is number => value != null); return [key === "engagement" ? "Engagements" : key === "views" ? "Views" : "Likes", values.length ? values.reduce((a, b) => a + b, 0) : null] as const; })].map(([name, value]) => <div key={name}><p className="text-lg font-semibold tracking-tight text-slate-800">{number(value as number | null)}</p><p className="text-[10px] text-slate-500">{name}</p></div>)}</div>
      <p className="text-[11px] leading-5 text-slate-500">Trends use available observations; missing days can affect period comparisons. Instagram views and interactions use the latest rolling total, without summing repeated totals. Native post fallbacks show current lifetime counters for content published in the period. Daily reach can include the same people on multiple days.</p>
      <div className={`grid gap-5 ${clientSlug ? "" : "xl:grid-cols-[1fr_1.25fr]"}`}>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Reach over time"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Audience momentum</p><h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Daily reach over time</h4><p className="mt-1 text-xs text-slate-500">Hover or focus a bar to inspect a day.</p></div><Eye className="h-5 w-5 text-indigo-400" /></div>{timeline.length ? <><div className="mt-6 overflow-x-auto"><div className="flex h-44 min-w-full items-end gap-1.5 border-b border-slate-100" style={{ minWidth: timeline.length * 10 }}>{timeline.map(([day, value]) => <div key={day} tabIndex={0} title={`${day}: ${value == null ? "No observation" : `${number(value)} reach`}`} aria-label={`${day}: ${value == null ? "No observation" : `${number(value)} reach`}`} className="min-w-[4px] flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-sky-400 transition hover:from-indigo-800 focus:outline focus:outline-2 focus:outline-indigo-400" style={{ height: `${value == null ? 2 : Math.max(2, value / peakReach * 100)}%`, background: value == null ? "#e2e8f0" : undefined }} />)}</div></div><div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>{timeline[0][0]}</span><span>{timeline.at(-1)?.[0]}</span></div><p className="mt-4 text-xs text-slate-500">{reachDays.size} observed days · Peak daily reach <span className="font-semibold text-slate-800">{number(Math.max(...timeline.map(([, value]) => value ?? 0)))}</span></p></> : <div className="mt-6 flex h-44 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500">Daily reach will appear after your accounts sync.</div>}</section>
        {!clientSlug && <section id="lead-opportunities" className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Top five hottest leads"><div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6"><div><p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-600"><Flame className="h-3.5 w-3.5" /> Opportunity radar</p><h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Your 5 hottest leads</h4><p className="mt-1 text-xs text-slate-500">Hot leads acquired in this period, most recently updated first.</p></div><button type="button" onClick={navigateToLeads} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Open leads <ArrowUpRight className="h-3.5 w-3.5" /></button></div><div className="mx-5 mb-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center"><div><p className="text-lg font-semibold text-slate-900">{number(report.leads?.acquired.value)}</p><p className="text-[10px] text-slate-500">New this period</p></div><div><p className="text-lg font-semibold text-orange-600">{number(report.leads?.hotCount)}</p><p className="text-[10px] text-slate-500">Hot & open now</p></div><div><p className="text-lg font-semibold text-emerald-700">{number(report.leads?.customers)}</p><p className="text-[10px] text-slate-500">Now customers</p></div></div>{report.leads?.hottest.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Top five hot open leads created in the selected period, ordered by most recent update</caption><thead className="border-y border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-5 py-3">Lead</th><th scope="col" className="px-3 py-3">Source</th><th scope="col" className="px-3 py-3">Stage</th><th scope="col" className="px-5 py-3">Activity</th></tr></thead><tbody className="divide-y divide-slate-100">{report.leads.hottest.map((lead, index) => <tr key={lead.id} className="transition hover:bg-orange-50/40"><td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-600">{index + 1}</span><div><p className="font-semibold text-slate-900">{lead.socialConversation?.participantName || lead.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{lead.company || lead.username || lead.socialConversation?.participantUsername || "Hot lead"}</p></div></div></td><td className="px-3 py-3 text-slate-500">{lead.socialConversation ? label[lead.socialConversation.platform] || lead.socialConversation.platform : lead.source === "IMPORT" ? "Import" : "Manual"}</td><td className="px-3 py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold capitalize text-indigo-700">{lead.status.toLowerCase()}</span></td><td className="whitespace-nowrap px-5 py-3 text-slate-500">{new Date(lead.updatedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="mx-5 mb-5 rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-5 text-center"><Flame className="mx-auto h-6 w-6 text-orange-400" /><p className="mt-2 text-sm font-semibold text-slate-700">No hot open leads in this period</p><p className="mt-1 text-xs leading-5 text-slate-500">Qualify leads as Hot in your lead pipeline to surface your next opportunities here.</p></div>}<p className="px-5 pb-5 pt-3 text-[10px] leading-4 text-slate-400">Stages reflect current qualification. Customers and lost leads are excluded from the shortlist.{platform && " Platform filtering includes leads linked to that social channel."}</p></section>}
      </div>
      <div id="ai-insights" className="scroll-mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-white to-indigo-50/70 p-5 shadow-[0_8px_32px_rgba(79,70,229,.06)] sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Lightbulb className="h-4 w-4" /></span><div><h4 className="text-sm font-semibold text-[#101828]">{clientSlug ? "AI recommendations" : "AI action studio"}</h4><p className="mt-1 text-xs leading-5 text-[#667085]">{clientSlug ? "Explore performance findings and AI recommendations for your content." : <>{"Evidence "}<UiSymbol name="right" />{" insight "}<UiSymbol name="right" />{" your next content experiment. Explore findings and put recommendations into practice."}</>}</p></div></div>{!clientSlug && <button type="button" onClick={() => void analyzePerformance()} disabled={analyzing || loading || !canAnalyze} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1768E8] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"><Sparkles className={`h-3.5 w-3.5 ${analyzing ? "animate-pulse" : ""}`} />{analyzing ? "Analyzing performance…" : report.insights.length ? "Refresh AI analysis" : "Analyze performance"}</button>}</div>
        {!clientSlug && !recommendationsAccess && <WorkspaceFeatureNotice compact feature="performanceRecommendations" />}
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter AI findings">{[["ALL", "All findings"], ["WHAT_WORKED", "Wins"], ["UNDERPERFORMED", "Improve"], ["TREND", "Trends"], ["ACTION", "Next actions"]].map(([key, name]) => <button type="button" key={key} aria-pressed={insightFilter === key} onClick={() => setInsightFilter(key)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${insightFilter === key ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50"}`}>{name}</button>)}</div>
        {!clientSlug && recommendations.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4"><p className="text-xs text-[#475467]">Use all {recommendations.length} recommendations matching the current filters in your next content batch.</p><button type="button" onClick={applyAllRecommendations} disabled={!canApply} className="inline-flex items-center gap-2 rounded-lg bg-[#1768E8] px-3.5 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><Sparkles className="h-3.5 w-3.5" />Apply all recommendations <ArrowUpRight className="h-3 w-3" /></button></div>}
        {analyzing && <p role="status" className="mt-4 rounded-xl bg-indigo-50 p-4 text-xs text-indigo-700">Reviewing your metrics and identifying evidence-backed content experiments…</p>}
        {shownInsights.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{shownInsights.map(insight => <article key={insight.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-[#1768E8]">{insight.platform ? label[insight.platform] || insight.platform : "All platforms"}</span><span className="text-[#98A2B3]">·</span><span className="text-[10px] font-semibold uppercase tracking-wide text-[#667085]">{insight.type.replaceAll("_", " ").toLowerCase()}</span></div><h5 className="mt-2 text-sm font-semibold text-[#101828]">{insight.title}</h5><p className="mt-1 text-xs leading-5 text-[#475467]">{insight.description}</p>{insight.recommendation?.trim() && <div className="relative mt-3 overflow-hidden rounded-lg border border-blue-100 bg-blue-50/70 p-3">
              <div aria-hidden={!recommendationsAccess ? true : undefined} className={!recommendationsAccess ? "pointer-events-none min-h-[160px] select-none blur-sm" : undefined}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-blue-700">Recommended next step</p><p className="mt-1 text-xs leading-5 text-[#344054]">{insight.recommendation}</p>{!clientSlug && <button disabled={!canApply} type="button" onClick={() => applyRecommendation(insight.title, insight.description, insight.recommendation)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1768E8] hover:text-blue-800"><Sparkles className="h-3.5 w-3.5" />Create content from this insight <ArrowUpRight className="h-3 w-3" /></button>}
              </div>
              {!recommendationsAccess && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-blue-50/80 px-4 py-5 text-center">
                  <Sparkles aria-hidden="true" className="h-5 w-5 text-[#1768E8]" />
                  <p className="max-w-xs text-xs font-semibold leading-5 text-[#344054]">Upgrade to Studio to view and use AI recommendations.</p>
                  <a href="/dashboard/billing?product=content-workspace#content-workspace-plans" className="rounded-lg bg-[#1768E8] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Upgrade to Studio</a>
                </div>
              )}
              </div>}</article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-[#D9E2EF] bg-[#F8FAFC] px-4 py-5 text-center"><p className="text-xs font-medium text-[#344054]">{report.insights.length ? "No findings match this filter." : "Your next move starts with an insight."}</p><p className="mt-1 text-[11px] text-[#667085]">{report.insights.length ? "Choose another filter to explore your analysis." : clientSlug ? "AI recommendations will appear here after your team analyzes this period." : "Sync your channels, analyze this period, then turn a recommendation into your next content calendar."}</p></div>}
      </div>
      {report.facebookPageActivity && <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,.025)] sm:p-5" aria-label="Facebook Page activity"><div className="flex flex-col gap-3 border-b border-[#EEF1F5] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-[#101828]">Facebook Page activity</h4><span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">Connected</span></div><p className="mt-2 text-sm font-semibold text-[#344054]">{report.facebookPageActivity.pageName}</p><p className="mt-1 text-[11px] text-[#667085]">Page ID: <span className="font-mono">{report.facebookPageActivity.pageId}</span>{report.facebookPageActivity.followers != null && <> · {number(report.facebookPageActivity.followers)} followers</>}</p></div><p className="text-[10px] text-[#667085]">Live Page data from Meta · {from} — {to}</p></div>{report.facebookPageActivityError && <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{report.facebookPageActivityError}</p>}{report.facebookPageActivity.notices.map(notice => <p key={notice} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{notice}</p>)}<div className="mt-4"><h5 className="text-xs font-semibold text-[#344054]">Recent Page posts</h5>{report.facebookPageActivity.posts.length ? <div className="mt-3 divide-y divide-[#EEF1F5]">{report.facebookPageActivity.posts.map(post => <article key={post.id} className="flex gap-3 py-3">{post.imageUrl ? <img src={post.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-[#EEF1F5] object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-700">FB</div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><span className="text-[10px] font-bold text-[#101828]">Facebook</span>{post.createdAt && <span className="text-[10px] text-[#667085]">{new Date(post.createdAt).toLocaleDateString()}</span>}{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[#1768E8]"><>{"View on Facebook "}<UiSymbol name="upRight" /></></a>}</div><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-[#475467]">{post.message || "Facebook Page post"}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#667085]">{post.likes != null && <span>Likes {number(post.likes)}</span>}{post.comments != null && <span>Comments {number(post.comments)}</span>}{post.shares != null && <span>Shares {number(post.shares)}</span>}{post.reach != null && <span>Reach {number(post.reach)}</span>}{post.impressions != null && <span>Impressions {number(post.impressions)}</span>}</div></div></article>)}</div> : !report.facebookPageActivityError && <p className="mt-3 rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-[#667085]">No Page posts were returned for this date range.</p>}</div></section>}
      <div id="channel-detail" className="scroll-mt-6 grid items-start gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-2xl border border-[#DFE6EF] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-[#101828]">Connected accounts</h4><p className="mt-1 text-xs text-[#667085]">Latest account sync status</p></div><div className="flex items-center gap-3"><span className="text-xs text-[#667085]">{report.connections.length} account{report.connections.length === 1 ? "" : "s"}</span>{isManager && <button type="button" onClick={() => void syncReportingNow()} disabled={syncing || !report.connections.some(connection => ["INSTAGRAM", "TIKTOK", "FACEBOOK"].includes(connection.platform) && connection.status === "CONNECTED")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-semibold text-[#344054] disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Starting…" : "Sync now"}</button>}</div></div>
          {syncNotice && <p role="status" className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">{syncNotice}</p>}
          {report.connections.length ? <div className="mt-4 divide-y divide-[#EEF1F5]">{report.connections.map(connection => <div key={connection.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#101828]">{label[connection.platform] || connection.platform}<span className="font-normal text-[#667085]">{connection.username ? ` · @${connection.username}` : connection.accountName ? ` · ${connection.accountName}` : ""}</span></p><p className="mt-1 text-[11px] text-[#667085]">{connection.lastSyncAt ? `Last synced ${new Date(connection.lastSyncAt).toLocaleString()}` : "Waiting for first sync"}</p>{connection.lastSyncError && <p className="mt-1 text-[11px] text-red-600">{connection.lastSyncError}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${connection.status === "CONNECTED" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{connection.status === "CONNECTED" ? "Connected" : connection.status === "NEEDS_REAUTH" ? "Reconnect" : "Disconnected"}</span></div>)}</div> : <p className="mt-5 rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-[#667085]">No reporting accounts are connected yet. Connect a supported social account in Channels to begin collecting performance data.</p>}</div>
        <div className="rounded-2xl border border-[#DFE6EF] bg-white p-4 sm:p-5"><div><h4 className="text-sm font-semibold text-[#101828]">Platform posts</h4><p className="mt-1 text-xs text-[#667085]">Content fetched from connected social accounts during this period</p></div>
          {report.accountPosts.length ? <div id="analytics-platform-posts" className="mt-4 divide-y divide-[#EEF1F5]">{shownPosts.map(post => <article key={post.id} className="flex gap-3 py-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F7] text-[10px] font-bold text-[#667085]">{label[post.platform] || post.platform}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><span className="text-xs font-bold text-[#101828]">{label[post.platform] || post.platform}</span>{post.username && <span className="text-[10px] text-[#667085]">@{post.username}</span>}<span className="text-[10px] text-[#667085]">{new Date(post.publishedAt).toLocaleDateString()}</span>{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[#1768E8]"><>{"View post "}<UiSymbol name="upRight" /></></a>}</div><p className="mt-1 line-clamp-2 text-xs text-[#475467]">{post.caption || `${label[post.platform] || post.platform} ${post.postType?.toLowerCase() || "post"}`}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#667085]">{post.reach != null && <span>Reach {number(post.reach)}</span>}{post.views != null && <span>Views {number(post.views)}</span>}{post.engagement != null && <span>Engagement {number(post.engagement)}</span>}{post.likes != null && <span>Likes {number(post.likes)}</span>}{post.comments != null && <span>Comments {number(post.comments)}</span>}{post.shares != null && <span>Shares {number(post.shares)}</span>}{post.impressions != null && <span>Impressions {number(post.impressions)}</span>}{post.saves != null && <span>Saves {number(post.saves)}</span>}{[post.reach, post.views, post.engagement, post.likes, post.comments, post.shares].every(value => value == null) && <span>Metrics unavailable for this post.</span>}</div></div></article>)}</div> : <p className="mt-5 rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-[#667085]">No native posts are available for this period yet. Check each connection’s sync status and granted platform permissions.</p>}{report.accountPosts.length > 5 && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F5] pt-4"><p className="text-[11px] text-[#667085]">Showing {shownPosts.length} of {report.accountPosts.length} posts</p><button type="button" aria-expanded={postsExpanded} aria-controls="analytics-platform-posts" onClick={() => setPostsExpanded(expanded => !expanded)} className="inline-flex items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-semibold text-[#344054] hover:bg-slate-50">{postsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{postsExpanded ? "View less" : "View more"}</button></div>}</div>
      </div>

    </>}
  </section>;
}
