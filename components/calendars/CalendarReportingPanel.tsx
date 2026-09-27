"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Check, Clock3, Eye, Heart, Lightbulb, RefreshCw, Share2, Sparkles, Users, ChartNoAxesCombined } from "lucide-react";

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
type Report = {
  period: { start: string; end: string };
  clientSharing: { enabled: boolean };
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

function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400"><Activity className="h-3 w-3" /> Building history</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${up ? "text-emerald-700" : "text-rose-700"}`}><Icon className="h-3.5 w-3.5" />{Math.abs(value).toFixed(1)}%</span>;
}

export default function CalendarReportingPanel({ calendarId, isManager, canAnalyze, canApplyRecommendations }: { calendarId: string; isManager: boolean; canAnalyze: boolean; canApplyRecommendations: boolean }) {
  const [from, setFrom] = useState(() => dateInput(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => dateInput(new Date()));
  const [platform, setPlatform] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingShare, setSavingShare] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ from, to });
      if (platform) query.set("platform", platform);
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load reporting.");
      setReport(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load reporting."); }
    finally { setLoading(false); }
  }, [calendarId, from, to, platform]);

  useEffect(() => { void load(); }, [load]);

  async function syncReportingNow() {
    setSyncing(true); setError(""); setSyncNotice("");
    try {
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/sync`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start reporting sync.");
      setSyncNotice("Sync started. Refresh this report in a few seconds to see the latest status.");
      window.setTimeout(() => { void load(); }, 8000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not start reporting sync."); }
    finally { setSyncing(false); }
  }
  const accountTotals = useMemo(() => {
    if (!report) return { followers: null as number | null, growth: null as number | null, reach: null as number | null, views: null as number | null, engagement: null as number | null, likes: null as number | null, trends: {} as Record<string, number | null>, connected: 0 };
    const active = report.connections.filter(connection => connection.status === "CONNECTED");
    const latest = active.reduce((sum, connection) => sum + (connection.accountMetricSnapshots[0]?.followers ?? 0), 0);
    const histories = active.map(connection => {
      const ordered = [...connection.accountMetricSnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
      return ordered.filter(snapshot => snapshot.followers != null);
    });
    const hasFollowerData = histories.some(history => history.length > 0);
    const hasComparableHistory = active.length > 0 && histories.every(history => history.length >= 2);
    const starting = histories.reduce((sum, history) => sum + (history[0]?.followers ?? 0), 0);
    const byDate = new Map<string, Record<string, number>>();
    const nativeFallbackUsed = new Set<string>();
    // Instagram's account-level `views` insight is a date-range total, not
    // a daily value. Use the latest range total per connected account rather
    // than adding the same rolling total from every daily snapshot.
    const latestViews = active.reduce((sum, connection) => {
      const value = connection.accountMetricSnapshots
        .filter(snapshot => snapshot.views != null)
        .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0]?.views;
      return sum + (value ?? 0);
    }, 0);
    const hasViews = active.some(connection => connection.accountMetricSnapshots.some(snapshot => snapshot.views != null));
    for (const connection of active) {
      const snapshotMetrics = new Set<string>();
      for (const snapshot of connection.accountMetricSnapshots) {
        const dayKey = snapshot.snapshotDate.slice(0, 10);
        const day = byDate.get(dayKey) ?? {};
        for (const key of ["reach", "engagement"] as const) {
          if (snapshot[key] != null) {
            day[key] = (day[key] ?? 0) + snapshot[key]!;
            snapshotMetrics.add(key);
          }
        }
        const likes = snapshot.additionalMetrics?.likes;
        if (typeof likes === "number") {
          day.likes = (day.likes ?? 0) + likes;
          snapshotMetrics.add("likes");
        }
        byDate.set(dayKey, day);
      }
      for (const post of report.accountPosts.filter(item => item.connectionId === connection.id)) {
        const dayKey = post.publishedAt.slice(0, 10);
        const day = byDate.get(dayKey) ?? {};
        for (const key of ["reach", "engagement", "likes"] as const) {
          const value = post[key];
          if (connection.platform !== "FACEBOOK" && !snapshotMetrics.has(key) && value != null) {
            day[key] = (day[key] ?? 0) + value;
            nativeFallbackUsed.add(key);
          }
        }
        if (connection.platform === "TIKTOK" && post.views != null && !snapshotMetrics.has("views")) {
          day.views = (day.views ?? 0) + post.views;
          nativeFallbackUsed.add("views");
        }
        byDate.set(dayKey, day);
      }
    }
    const days = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
    const sum = (key: string) => {
      const values = days.map(([, day]) => day[key]).filter((value): value is number => value != null);
      return values.length ? values.reduce((total, value) => total + value, 0) : null;
    };
    const trends: Record<string, number | null> = {};
    for (const key of ["reach", "engagement", "likes"]) {
      const firstValue = days.find(([, day]) => day[key] != null)?.[1][key];
      const lastValue = [...days].reverse().find(([, day]) => day[key] != null)?.[1][key];
      trends[key] = !nativeFallbackUsed.has(key) && firstValue != null && lastValue != null && firstValue > 0
        ? ((lastValue - firstValue) / firstValue) * 100
        : null;
    }
    return {
      followers: hasFollowerData ? latest : null,
      growth: hasComparableHistory && starting > 0 ? ((latest - starting) / starting) * 100 : null,
      reach: sum("reach"),
      views: hasViews ? latestViews + (sum("views") ?? 0) : sum("views"),
      engagement: sum("engagement"),
      likes: sum("likes"),
      trends,
      connected: active.length,
    };
  }, [report]);

  async function toggleClientSharing() {
    if (!report) return;
    setSavingShare(true); setError("");
    try {
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !report.clientSharing.enabled }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update client access.");
      setReport({ ...report, clientSharing: { enabled: data.enabled } });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update client access."); }
    finally { setSavingShare(false); }
  }

  async function analyzePerformance() {
    setAnalyzing(true); setError("");
    try {
      const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/reporting/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, ...(platform ? { platform } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not analyze reporting data.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not analyze reporting data."); }
    finally { setAnalyzing(false); }
  }

  function applyRecommendation(title: string, description: string, recommendation: string | null) {
    if (!recommendation) return;
    const instructions = `Reporting insight: ${title}.\nRecommendation to test: ${recommendation}.\nEvidence: ${description}.\nBuild the next content batch around this experiment while following the business knowledge and brand voice.`.slice(0, 1200);
    window.sessionStorage.setItem(`calendar:${calendarId}:reporting-recommendation`, instructions);
    window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "generate" } }));
  }

  const cards = [
    { title: "Total reach", value: accountTotals.reach, trend: accountTotals.trends.reach ?? null, icon: Eye, tint: "bg-blue-50 text-blue-700" },
    { title: "Video views", value: accountTotals.views, trend: accountTotals.trends.views ?? null, icon: BarChart3, tint: "bg-violet-50 text-violet-700" },
    { title: "Engagements", value: accountTotals.engagement, trend: accountTotals.trends.engagement ?? null, icon: Activity, tint: "bg-emerald-50 text-emerald-700" },
    { title: "Followers", value: accountTotals.followers, trend: accountTotals.growth, icon: Users, tint: "bg-amber-50 text-amber-700" },
    { title: "Likes", value: accountTotals.likes, trend: accountTotals.trends.likes ?? null, icon: Heart, tint: "bg-rose-50 text-rose-700" },
    { title: "Platform posts", value: report?.accountPosts.length ?? 0, trend: null, icon: Share2, tint: "bg-slate-100 text-slate-700" },
  ];

  return <section className="space-y-6" aria-label="Social reporting">
    <div className="relative overflow-hidden rounded-2xl bg-[#101828] p-5 text-white shadow-[0_16px_44px_rgba(16,24,40,.14)] sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-blue-100"><ChartNoAxesCombined className="h-3.5 w-3.5" /> Performance overview</div><h3 className="mt-4 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Analytics &amp; reporting</h3><p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">A clear view of your social performance across connected channels and published content.</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1.5"><CalendarDays className="h-3 w-3" />{from} — {to}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1.5"><Check className="h-3 w-3" />{accountTotals.connected} connected account{accountTotals.connected === 1 ? "" : "s"}</span></div></div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-semibold text-slate-300">From<input aria-label="Start date" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white [color-scheme:dark]" /></label>
          <label className="text-[10px] font-semibold text-slate-300">To<input aria-label="End date" type="date" value={to} min={from} max={dateInput(new Date())} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white [color-scheme:dark]" /></label>
          <label className="text-[10px] font-semibold text-slate-300">Platform<select aria-label="Platform" value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-[#202B3B] px-2.5 py-[9px] text-xs text-white"><option value="">All platforms</option>{Object.entries(label).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-semibold text-[#101828] disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{loading ? "Updating" : "Refresh"}</button>
        </div>
      </div>
    </div>

    {isManager && report && <div className="flex flex-col gap-3 rounded-xl border border-[#DFE6EF] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#101828]">Share reporting with the client</p><p className="mt-1 text-xs text-[#667085]">{report.clientSharing.enabled ? "Clients with workspace access can view this report." : "Client reporting access is currently off."}</p></div><button type="button" disabled={savingShare} onClick={() => void toggleClientSharing()} className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${report.clientSharing.enabled ? "border border-[#D0D5DD] bg-white text-[#344054]" : "bg-[#1768E8] text-white"}`}>{savingShare ? "Saving…" : report.clientSharing.enabled ? "Disable client access" : "Enable client access"}</button></div>}

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading && !report ? <div className="rounded-2xl border border-[#DFE6EF] bg-white p-8 text-center text-sm text-[#667085]">Loading performance data…</div> : report && <>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-semibold text-[#101828]">Key performance indicators</h4><p className="mt-1 text-xs text-[#667085]">Trend compares the first and latest snapshots available in this date range.</p></div><span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#667085]"><Clock3 className="h-3.5 w-3.5" />Updated {report.connections.map(c => c.lastSyncAt).filter(Boolean).sort().at(-1) ? new Date(report.connections.map(c => c.lastSyncAt).filter(Boolean).sort().at(-1)!).toLocaleString() : "—"}</span></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{cards.map(({ title, value, trend, icon: Icon, tint }) => <div key={title} className="group rounded-xl border border-[#E7EBF1] bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,.025)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(16,24,40,.07)] sm:p-5"><div className="flex items-start justify-between"><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#667085]">{title}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-semibold tracking-[-.04em] text-[#101828] sm:text-[28px]">{number(value)}</p><div className="mt-2 min-h-[16px]"><Trend value={trend} /></div></div>)}</div>
      {report.facebookPageActivity && <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,.025)] sm:p-5" aria-label="Facebook Page activity"><div className="flex flex-col gap-3 border-b border-[#EEF1F5] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-[#101828]">Facebook Page activity</h4><span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">Connected</span></div><p className="mt-2 text-sm font-semibold text-[#344054]">{report.facebookPageActivity.pageName}</p><p className="mt-1 text-[11px] text-[#667085]">Page ID: <span className="font-mono">{report.facebookPageActivity.pageId}</span>{report.facebookPageActivity.followers != null && <> · {number(report.facebookPageActivity.followers)} followers</>}</p></div><p className="text-[10px] text-[#667085]">Live Page data from Meta · {from} — {to}</p></div>{report.facebookPageActivityError && <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{report.facebookPageActivityError}</p>}{report.facebookPageActivity.notices.map(notice => <p key={notice} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{notice}</p>)}<div className="mt-4"><h5 className="text-xs font-semibold text-[#344054]">Recent Page posts</h5>{report.facebookPageActivity.posts.length ? <div className="mt-3 divide-y divide-[#EEF1F5]">{report.facebookPageActivity.posts.map(post => <article key={post.id} className="flex gap-3 py-3">{post.imageUrl ? <img src={post.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-[#EEF1F5] object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-700">FB</div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><span className="text-[10px] font-bold text-[#101828]">Facebook</span>{post.createdAt && <span className="text-[10px] text-[#667085]">{new Date(post.createdAt).toLocaleDateString()}</span>}{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[#1768E8]">View on Facebook ↗</a>}</div><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-[#475467]">{post.message || "Facebook Page post"}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#667085]">{post.likes != null && <span>Likes {number(post.likes)}</span>}{post.comments != null && <span>Comments {number(post.comments)}</span>}{post.shares != null && <span>Shares {number(post.shares)}</span>}{post.reach != null && <span>Reach {number(post.reach)}</span>}{post.impressions != null && <span>Impressions {number(post.impressions)}</span>}</div></div></article>)}</div> : !report.facebookPageActivityError && <p className="mt-3 rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-[#667085]">No Page posts were returned for this date range.</p>}</div></section>}
      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-2xl border border-[#DFE6EF] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-[#101828]">Connected accounts</h4><p className="mt-1 text-xs text-[#667085]">Latest account sync status</p></div><div className="flex items-center gap-3"><span className="text-xs text-[#667085]">{report.connections.length} account{report.connections.length === 1 ? "" : "s"}</span>{isManager && <button type="button" onClick={() => void syncReportingNow()} disabled={syncing || !report.connections.some(connection => ["INSTAGRAM", "TIKTOK", "FACEBOOK"].includes(connection.platform) && connection.status === "CONNECTED")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-semibold text-[#344054] disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Starting…" : "Sync now"}</button>}</div></div>
          {syncNotice && <p role="status" className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">{syncNotice}</p>}
          {report.connections.length ? <div className="mt-4 divide-y divide-[#EEF1F5]">{report.connections.map(connection => <div key={connection.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#101828]">{label[connection.platform] || connection.platform}<span className="font-normal text-[#667085]">{connection.username ? ` · @${connection.username}` : connection.accountName ? ` · ${connection.accountName}` : ""}</span></p><p className="mt-1 text-[11px] text-[#667085]">{connection.lastSyncAt ? `Last synced ${new Date(connection.lastSyncAt).toLocaleString()}` : "Waiting for first sync"}</p>{connection.lastSyncError && <p className="mt-1 text-[11px] text-red-600">{connection.lastSyncError}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${connection.status === "CONNECTED" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{connection.status === "CONNECTED" ? "Connected" : connection.status === "NEEDS_REAUTH" ? "Reconnect" : "Disconnected"}</span></div>)}</div> : <p className="mt-5 rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-[#667085]">No reporting accounts are connected yet. Connect a supported social account in Channels to begin collecting performance data.</p>}</div>
        <div className="rounded-2xl border border-[#DFE6EF] bg-white p-4 sm:p-5"><div><h4 className="text-sm font-semibold text-[#101828]">Platform posts</h4><p className="mt-1 text-xs text-[#667085]">Content fetched from connected social accounts during this period</p></div>
          {report.accountPosts.length ? <div className="mt-4 divide-y divide-[#EEF1F5]">{report.accountPosts.map(post => <article key={post.id} className="flex gap-3 py-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F7] text-[10px] font-bold text-[#667085]">{label[post.platform] || post.platform}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><span className="text-xs font-bold text-[#101828]">{label[post.platform] || post.platform}</span>{post.username && <span className="text-[10px] text-[#667085]">@{post.username}</span>}<span className="text-[10px] text-[#667085]">{new Date(post.publishedAt).toLocaleDateString()}</span>{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[#1768E8]">View post ↗</a>}</div><p className="mt-1 line-clamp-2 text-xs text-[#475467]">{post.caption || `${label[post.platform] || post.platform} ${post.postType?.toLowerCase() || "post"}`}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#667085]">{post.reach != null && <span>Reach {number(post.reach)}</span>}{post.views != null && <span>Views {number(post.views)}</span>}{post.engagement != null && <span>Engagement {number(post.engagement)}</span>}{post.likes != null && <span>Likes {number(post.likes)}</span>}{post.comments != null && <span>Comments {number(post.comments)}</span>}{post.shares != null && <span>Shares {number(post.shares)}</span>}{post.impressions != null && <span>Impressions {number(post.impressions)}</span>}{post.saves != null && <span>Saves {number(post.saves)}</span>}{[post.reach, post.views, post.engagement, post.likes, post.comments, post.shares].every(value => value == null) && <span>Metrics unavailable for this post.</span>}</div></div></article>)}</div> : <p className="mt-5 rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-[#667085]">No native posts are available for this period yet. Check each connection’s sync status and granted platform permissions.</p>}</div>
      </div>
      <div className="rounded-2xl border border-[#DFE6EF] bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,.025)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Lightbulb className="h-4 w-4" /></span><div><h4 className="text-sm font-semibold text-[#101828]">What’s working and what to improve</h4><p className="mt-1 text-xs leading-5 text-[#667085]">AI analysis is grounded in your synced post metrics, dates and captions.</p></div></div>{canAnalyze && <button type="button" onClick={() => void analyzePerformance()} disabled={analyzing || loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1768E8] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"><Sparkles className={`h-3.5 w-3.5 ${analyzing ? "animate-pulse" : ""}`} />{analyzing ? "Analyzing performance…" : report.insights.length ? "Refresh AI analysis" : "Analyze performance"}</button>}</div>
        {report.insights.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{report.insights.map(insight => <article key={insight.id} className="rounded-xl border border-[#E8EDF4] bg-[#F8FAFC] p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-[#1768E8]">{insight.platform ? label[insight.platform] || insight.platform : "All platforms"}</span><span className="text-[#98A2B3]">·</span><span className="text-[10px] font-semibold uppercase tracking-wide text-[#667085]">{insight.type.replaceAll("_", " ").toLowerCase()}</span></div><h5 className="mt-2 text-sm font-semibold text-[#101828]">{insight.title}</h5><p className="mt-1 text-xs leading-5 text-[#475467]">{insight.description}</p>{insight.recommendation && <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-blue-700">Recommended next step</p><p className="mt-1 text-xs leading-5 text-[#344054]">{insight.recommendation}</p>{canApplyRecommendations && <button type="button" onClick={() => applyRecommendation(insight.title, insight.description, insight.recommendation)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1768E8] hover:text-blue-800"><Sparkles className="h-3.5 w-3.5" />Use in next content calendar <ArrowUpRight className="h-3 w-3" /></button>}</div>}</article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-[#D9E2EF] bg-[#F8FAFC] px-4 py-5 text-center"><p className="text-xs font-medium text-[#344054]">No AI findings for this date range yet.</p><p className="mt-1 text-[11px] text-[#667085]">Run an analysis after social metrics have synced. The AI will call out data limitations instead of guessing.</p></div>}
      </div>
    </>}
  </section>;
}
