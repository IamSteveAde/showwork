"use client";
import { calendarMutationFetch } from "@/lib/publishing/clientRequests";

import WorkspaceFeatureNotice from "@/components/calendars/WorkspaceFeatureNotice";
import ReportingVisuals from "./ReportingVisuals";
import ReportingChannels from "./ReportingChannels";
import ReportingInsights from "./ReportingInsights";
import dashboardStyles from "./ReportingDashboard.module.css";


import { queueReportingRecommendation } from "@/lib/reporting/recommendationHandoff";
import UiSymbol from "@/components/ui/UiSymbol";
import IconText from "@/components/ui/IconText";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Check, Clock3, Eye, Flame, Minus, Target, RefreshCw, Sparkles, Users, ChartNoAxesCombined } from "lucide-react";

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
export type Report = {
  advancedAccess?: boolean;
  comparisonPeriod: { start: string; end: string };
  performance: Record<string, Change>;
  leads: { total: number; acquired: Change; hotCount: number; customers: number; hottest: Array<{ id: string; name: string; company: string | null; username: string | null; status: string; source: string; updatedAt: string; socialConversation: { platform: string; participantName: string | null; participantUsername: string | null } | null }> } | null;
  period: { start: string; end: string };
  facebookPageActivity: {
    pageId: string; pageName: string; followers: number | null;
    notices: string[];
    latestMetrics?: { asOf: string; reach: number | null; views: number | null; engagement: number | null; mediaViews: number | null } | null;
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

export default function CalendarReportingPanel({ calendarId, isManager, canAnalyze, canApplyRecommendations, canViewLeads = true, clientSlug, advancedAccess = true, recommendationsAccess = true }: { calendarId: string; isManager: boolean; canAnalyze: boolean; canApplyRecommendations: boolean; canViewLeads?: boolean; clientSlug?: string; advancedAccess?: boolean; recommendationsAccess?: boolean }) {
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
      const response = await calendarMutationFetch(`${clientSlug ? `/api/social-calendar/${encodeURIComponent(clientSlug)}` : `/api/calendars/${encodeURIComponent(calendarId)}`}/reporting?${query}`, { cache: "no-store" });
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
      const response = await calendarMutationFetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/sync`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start reporting sync.");
      if (!mounted.current) return;
      setSyncNotice("Syncing account insights and post metrics. This report will update automatically when finished.");
      const queuedAt = typeof data.queuedAt === "string" ? data.queuedAt : new Date().toISOString();
      const deadline = Date.now() + 5 * 60_000;
      const poll = async () => {
        if (!mounted.current) return;
        try {
          const statusResponse = await calendarMutationFetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/sync?since=${encodeURIComponent(queuedAt)}`, { cache: "no-store" });
          const status = await statusResponse.json();
          if (!mounted.current) return;
          if (!statusResponse.ok) throw new Error(status.error || "Could not check sync progress.");
          if (status.completed) {
            await latestLoad.current();
            if (!mounted.current) return;
            setSyncNotice(status.failed ? "Sync finished with account errors. Review the account status below." : "Sync complete. Your report now includes the latest available metrics.");
            setSyncing(false);
            return;
          }
          if (Date.now() >= deadline) {
            await latestLoad.current();
            if (!mounted.current) return;
            setSyncNotice("Sync is taking longer than expected. Some data may still be updating; check account status before retrying.");
            setSyncing(false);
            return;
          }
          syncTimer.current = window.setTimeout(() => { void poll(); }, 3000);
        } catch (err) {
          if (!mounted.current) return;
          setError(err instanceof Error ? err.message : "Could not check sync progress.");
          setSyncing(false);
        }
      };
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => { void poll(); }, 3000);
    } catch (err) {
      if (mounted.current) { setError(err instanceof Error ? err.message : "Could not start reporting sync."); setSyncing(false); }
    }
  }

  const connected = report?.connections.filter(c => c.status === "CONNECTED").length ?? 0;
  const [insightFilter, setInsightFilter] = useState("ALL");
  const shownInsights = report?.insights.filter(i => insightFilter === "ALL" || (insightFilter === "ACTION" ? Boolean(i.recommendation?.trim()) : i.type === insightFilter)) ?? [];

  const recommendations = shownInsights.filter(insight => insight.recommendation?.trim());
  const canApply = canApplyRecommendations && recommendationsAccess && !clientSlug && !loading && !analyzing && !!report;

  async function analyzePerformance() {
    setAnalyzing(true); setError("");
    try {
      const response = await calendarMutationFetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/analyze`, {
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
    { title: report?.performance.followers?.basis.startsWith("Current Facebook") ? "Current followers" : "Followers", metric: report?.performance.followers ?? unavailable, icon: Users, tint: "bg-amber-50 text-amber-700" },
    { title: report?.performance.reach?.basis.includes("Latest available") ? "Latest daily reach" : report?.performance.reach?.basis.includes("lifetime totals") ? "Post reach (sum)" : "Daily reach", metric: report?.performance.reach ?? unavailable, icon: Eye, tint: "bg-blue-50 text-blue-700" },
    { title: report?.performance.views?.basis.includes("Latest available") ? "Latest daily video views" : "Video views", metric: report?.performance.views ?? unavailable, icon: BarChart3, tint: "bg-violet-50 text-violet-700" },
    { title: report?.performance.engagement?.basis.includes("Latest available") ? "Latest daily engagements" : "Engagements", metric: report?.performance.engagement ?? unavailable, icon: Activity, tint: "bg-emerald-50 text-emerald-700" },
    ...(report?.performance.likes?.value != null ? [{ title: report.performance.likes.basis.includes("lifetime totals") ? "Post likes" : "Likes", metric: report.performance.likes, icon: Activity, tint: "bg-blue-50 text-blue-700" }] : []),
    ...(report?.performance.postMediaViews?.value != null ? [{ title: "Post media views", metric: report.performance.postMediaViews, icon: Eye, tint: "bg-indigo-50 text-indigo-700" }] : []),
    { title: "Total leads", metric: { value: report?.leads?.total ?? null, delta: report?.leads?.acquired.value ?? null, percent: null, basis: "new leads in selected period" }, icon: Target, tint: "bg-rose-50 text-rose-700" },
    { title: "New leads", metric: report?.leads?.acquired ?? unavailable, icon: Flame, tint: "bg-orange-50 text-orange-700" },
  ];
  const updatedAt = [
    ...report?.connections.filter(connection => connection.status === "CONNECTED").map(connection => connection.lastSyncAt).filter((value): value is string => !!value) ?? [],
    ...(report?.facebookPageActivity?.latestMetrics?.asOf ? [report.facebookPageActivity.latestMetrics.asOf] : []),
  ].sort().at(-1);
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
  const navigateToLeads = () => window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "leads" } }));

  return <section aria-busy={loading} className={dashboardStyles.dashboard} aria-label="Social reporting">
    <div className={dashboardStyles.hero}>
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-blue-100"><ChartNoAxesCombined className="h-3.5 w-3.5" /> Performance overview</div><h3 className="mt-4 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Your impact, in focus.</h3><p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">Understand your momentum. Find your next opportunity. Turn evidence into action.</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1.5"><CalendarDays className="h-3 w-3" />{from} — {to}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1.5"><Check className="h-3 w-3" />{connected} connected account{connected === 1 ? "" : "s"}</span></div></div>
        <div className={`${dashboardStyles.reportControls} flex flex-wrap items-end gap-2`}>
          <label className="text-[10px] font-semibold text-slate-300">From<input aria-label="Start date" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white [color-scheme:dark]" /></label>
          <label className="text-[10px] font-semibold text-slate-300">To<input aria-label="End date" type="date" value={to} min={from} max={dateInput(new Date())} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white [color-scheme:dark]" /></label>
          <label className="text-[10px] font-semibold text-slate-300">Platform<select aria-label="Platform" value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-[#202B3B] px-2.5 py-[9px] text-xs text-white"><option value="">All platforms</option>{Object.entries(label).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
          <button type="button" onClick={() => { setFrom(dateInput(new Date(Date.now() - 29 * 86400000))); setTo(dateInput(new Date())); setPlatform(""); setInsightFilter("ALL"); setPostsExpanded(false); }} className="rounded-lg border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/10">Reset</button>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-semibold text-[#101828] disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{loading ? "Updating" : "Refresh"}</button>
          {isManager && !clientSlug && <button type="button" onClick={() => void syncReportingNow()} disabled={syncing || !report?.connections.some(connection => ["INSTAGRAM", "TIKTOK", "FACEBOOK"].includes(connection.platform) && connection.status === "CONNECTED")} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Starting sync…" : "Sync data"}</button>}
        </div>
      </div>
    </div>

    <nav aria-label="Report sections" className={dashboardStyles.reportNav}>{[["performance", "Performance"], ...(!clientSlug && canViewLeads ? [["lead-opportunities", "Lead opportunities"]] : []), ["ai-insights", clientSlug ? "AI recommendations" : "AI action studio"], ["channel-detail", "Channels & content"]].map(([id, name]) => <a key={id} href={`#${id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">{name}</a>)}<div className="ml-auto flex gap-1">{[7, 30, 90].map(days => <button key={days} type="button" onClick={() => { setTo(dateInput(new Date())); setFrom(dateInput(new Date(Date.now() - (days - 1) * 86400000))); }} className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">{days}D</button>)}</div></nav>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {(!advancedAccess || report?.advancedAccess === false) && <WorkspaceFeatureNotice compact feature="advancedAnalytics" />}
    {loading && !report ? <div className="rounded-2xl border border-[#DFE6EF] bg-white p-8 text-center text-sm text-[#667085]">Loading performance data…</div> : report && <>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 id="performance" className="scroll-mt-6 text-lg font-semibold tracking-tight text-[#101828]">Your performance, in perspective</h4><p className="mt-1 text-xs text-[#667085]">Previous period: {report.comparisonPeriod.start.slice(0, 10)} — {report.comparisonPeriod.end.slice(0, 10)}. Each card identifies its comparison basis.</p></div><span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#667085]"><Clock3 className="h-3.5 w-3.5" />Updated {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}</span></div>
      <div className={dashboardStyles.metricGrid}>{cards.filter(card => (!clientSlug && canViewLeads) || !["Total leads", "New leads"].includes(card.title)).map(({ title, metric, icon: Icon, tint }) => <div key={title} className={dashboardStyles.metricCard}><div className="flex items-start justify-between"><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#667085]">{title}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-semibold tracking-[-.04em] text-[#101828] sm:text-[28px]">{number(metric.value)}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{metric.basis}</p><div className="mt-3 min-h-[48px]"><Trend metric={metric} followers={title === "Followers" || title === "Current followers"} /></div></div>)}</div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-semibold text-slate-800">Content published this period</p><p className="mt-1 text-[10px] text-slate-400">Current lifetime post counters · up to 500 stored posts per account across both periods</p></div>{[["Posts", report.accountPosts.length], ...(["views", "likes", "engagement"] as const).map(key => { const values = report.accountPosts.map(post => post[key]).filter((value): value is number => value != null); return [key === "engagement" ? "Engagements" : key === "views" ? "Views" : "Likes", values.length ? values.reduce((a, b) => a + b, 0) : null] as const; })].map(([name, value]) => <div key={name}><p className="text-lg font-semibold tracking-tight text-slate-800">{number(value as number | null)}</p><p className="text-[10px] text-slate-500">{name}</p></div>)}</div>
      <details className={dashboardStyles.methodology}><summary>How to read this report</summary><p className="text-[11px] leading-5 text-slate-500">Trends use available observations; missing days can affect period comparisons. Instagram views and interactions use the latest rolling total, without summing repeated totals. Native post fallbacks show current lifetime counters for content published in the period. Daily reach can include the same people on multiple days.</p></details>
      <ReportingVisuals timeline={timeline} posts={report.accountPosts} />
      <div>
        {!clientSlug && canViewLeads && <section id="lead-opportunities" className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Top five hottest leads"><div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6"><div><p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-600"><Flame className="h-3.5 w-3.5" /> Opportunity radar</p><h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Your 5 hottest leads</h4><p className="mt-1 text-xs text-slate-500">Hot leads acquired in this period, most recently updated first.</p></div><button type="button" onClick={navigateToLeads} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Open leads <ArrowUpRight className="h-3.5 w-3.5" /></button></div><div className="mx-5 mb-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center"><div><p className="text-lg font-semibold text-slate-900">{number(report.leads?.acquired.value)}</p><p className="text-[10px] text-slate-500">New this period</p></div><div><p className="text-lg font-semibold text-orange-600">{number(report.leads?.hotCount)}</p><p className="text-[10px] text-slate-500">Hot & open now</p></div><div><p className="text-lg font-semibold text-emerald-700">{number(report.leads?.customers)}</p><p className="text-[10px] text-slate-500">Now customers</p></div></div>{report.leads?.hottest.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Top five hot open leads created in the selected period, ordered by most recent update</caption><thead className="border-y border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-5 py-3">Lead</th><th scope="col" className="px-3 py-3">Source</th><th scope="col" className="px-3 py-3">Stage</th><th scope="col" className="px-5 py-3">Activity</th></tr></thead><tbody className="divide-y divide-slate-100">{report.leads.hottest.map((lead, index) => <tr key={lead.id} className="transition hover:bg-orange-50/40"><td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-600">{index + 1}</span><div><p className="font-semibold text-slate-900">{lead.socialConversation?.participantName || lead.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{lead.company || lead.username || lead.socialConversation?.participantUsername || "Hot lead"}</p></div></div></td><td className="px-3 py-3 text-slate-500">{lead.socialConversation ? label[lead.socialConversation.platform] || lead.socialConversation.platform : lead.source === "IMPORT" ? "Import" : "Manual"}</td><td className="px-3 py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold capitalize text-indigo-700">{lead.status.toLowerCase()}</span></td><td className="whitespace-nowrap px-5 py-3 text-slate-500">{new Date(lead.updatedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="mx-5 mb-5 rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-5 text-center"><Flame className="mx-auto h-6 w-6 text-orange-400" /><p className="mt-2 text-sm font-semibold text-slate-700">No hot open leads in this period</p><p className="mt-1 text-xs leading-5 text-slate-500">Qualify leads as Hot in your lead pipeline to surface your next opportunities here.</p></div>}<p className="px-5 pb-5 pt-3 text-[10px] leading-4 text-slate-400">Stages reflect current qualification. Customers and lost leads are excluded from the shortlist.{platform && " Platform filtering includes leads linked to that social channel."}</p></section>}
      </div>
      <ReportingInsights insights={shownInsights} total={report.insights.length} filter={insightFilter} onFilter={setInsightFilter} analyzing={analyzing} loading={loading} canAnalyze={canAnalyze} canApply={canApply} access={recommendationsAccess} client={Boolean(clientSlug)} onAnalyze={() => void analyzePerformance()} onApplyAll={applyAllRecommendations} onApply={applyRecommendation} />
      {report.facebookPageActivity && <details className={dashboardStyles.facebookDetail}><summary>Facebook Page activity <span>Live detail from Meta</span></summary><section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,.025)] sm:p-5" aria-label="Facebook Page activity"><div className="flex flex-col gap-3 border-b border-[#EEF1F5] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-[#101828]">Facebook Page activity</h4><span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">Connected</span></div><p className="mt-2 text-sm font-semibold text-[#344054]">{report.facebookPageActivity.pageName}</p><p className="mt-1 text-[11px] text-[#667085]">Page ID: <span className="font-mono">{report.facebookPageActivity.pageId}</span>{report.facebookPageActivity.followers != null && <> · {number(report.facebookPageActivity.followers)} followers</>}</p></div><p className="text-[10px] text-[#667085]">Live Page data from Meta · {from} — {to}</p></div>{report.facebookPageActivityError && <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{report.facebookPageActivityError}</p>}{report.facebookPageActivity.notices.map(notice => <p key={notice} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{notice}</p>)}<div className="mt-4"><h5 className="text-xs font-semibold text-[#344054]">Recent Page posts</h5>{report.facebookPageActivity.posts.length ? <div className="mt-3 divide-y divide-[#EEF1F5]">{report.facebookPageActivity.posts.map(post => <article key={post.id} className="flex gap-3 py-3">{post.imageUrl ? <img src={post.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-[#EEF1F5] object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-700">FB</div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><span className="text-[10px] font-bold text-[#101828]">Facebook</span>{post.createdAt && <span className="text-[10px] text-[#667085]">{new Date(post.createdAt).toLocaleDateString()}</span>}{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[#1768E8]"><>{"View on Facebook "}<UiSymbol name="upRight" /></></a>}</div><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-[#475467]"><IconText text={post.message || "Facebook Page post"} /></p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#667085]">{post.likes != null && <span>Likes {number(post.likes)}</span>}{post.comments != null && <span>Comments {number(post.comments)}</span>}{post.shares != null && <span>Shares {number(post.shares)}</span>}{post.reach != null && <span>Reach {number(post.reach)}</span>}{post.impressions != null && <span>Impressions {number(post.impressions)}</span>}</div></div></article>)}</div> : !report.facebookPageActivityError && <p className="mt-3 rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-[#667085]">No Page posts were returned for this date range.</p>}</div></section></details>}
      <ReportingChannels report={report} isManager={isManager && !clientSlug} syncing={syncing} syncNotice={syncNotice} onSync={() => void syncReportingNow()} expanded={postsExpanded} onToggle={() => setPostsExpanded(value => !value)} />

    </>}
  </section>;
}
