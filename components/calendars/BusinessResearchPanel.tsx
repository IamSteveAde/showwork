"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowUpRight, BookOpen, CheckCircle2, CircleHelp, Loader2, RefreshCw, FlaskConical } from "lucide-react";
import type { BusinessResearchResult } from "@/lib/openai";

type Run = { id: string; status: string; phase: string; focus: string; sourceHash: string | null; result: BusinessResearchResult | null; excludedFindingIds: string[]; error: string | null; createdAt: string; completedAt: string | null };
type Snapshot = { runs: Run[]; sourceHash: string; sourceCount: number };
export default function BusinessResearchPanel({ calendarId, canManage }: { calendarId: string; canManage: boolean }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const endpoint = `/api/calendars/${calendarId}/research`;
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load research.");
      setData(body); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load research."); }
  }, [endpoint]);
  useEffect(() => { void refresh(); }, [refresh]);
  const pending = data?.runs.find(r => ["QUEUED", "RUNNING"].includes(r.status));
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [pending?.id, refresh]);
  const latest = data?.runs.find(r => r.status === "SUCCEEDED");
  const run = data?.runs.find(r => r.id === selected) ?? latest;
  const fresh = !!run && run.sourceHash === data?.sourceHash && !!run.completedAt && Date.now() - Date.parse(run.completedAt) < 30 * 86400000;
  const activeRun = data?.runs.find(r => r.status === "SUCCEEDED" && r.sourceHash === data.sourceHash && !!r.completedAt && Date.now() - Date.parse(r.completedAt) < 30 * 86400000);
  const active = run?.id === activeRun?.id && fresh;
  async function start() {
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focus }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to start research.");
      setSelected(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to start research."); }
    finally { setBusy(false); }
  }
  async function toggle(findingId: string, excluded: boolean) {
    if (!run) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: run.id, findingId, excluded }) });
      if (!response.ok) throw new Error("Could not update this finding.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update finding."); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0 space-y-6 text-slate-800">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102D50] via-[#164B91] to-[#1768E8] p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-100"><FlaskConical size={17} /> Research studio</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{data ? `${data.sourceCount} business sources` : "Loading sources"}</span></div>
      <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">A clearer view. A smarter next move.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Explore your audience and market. Turn cited findings into content experiments, grounded in what your business actually does.</p>
      {canManage && <div className="mt-6 max-w-3xl">
        <label htmlFor="research-focus" className="mb-2 block text-sm font-medium">What should we investigate?</label>
        <textarea id="research-focus" value={focus} onChange={e => setFocus(e.target.value)} maxLength={1200} rows={3} placeholder="Include your public website, industry and audience. For example: what questions do first-time customers ask before booking a photographer in Lagos?" className="w-full min-w-0 resize-y rounded-2xl border border-white/20 bg-white p-4 text-sm leading-6 text-slate-900 placeholder:text-slate-500" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-blue-100">Use public topics. Keep private customer details out of research.</span><button onClick={start} disabled={busy || !!pending || focus.trim().length < 10 || !data?.sourceCount} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 disabled:opacity-50">{busy || pending ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />} {pending ? "Research in progress" : "Start research"}</button></div>
      </div>}
    </section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={() => void refresh()} className="ml-2 underline">Refresh</button></p>}
    {pending && <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5"><Loader2 className="mt-1 shrink-0 animate-spin text-blue-600" size={20}/><div className="min-w-0"><p className="font-semibold">{pending.phase}</p><p className="mt-1 break-words text-sm text-slate-600">{pending.focus}</p><p className="mt-2 text-xs text-slate-500">This can take a few minutes. You can leave this tab and return.</p></div></div>}
    {data?.runs[0]?.status === "FAILED" && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{data.runs[0].error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">What we’ve learned</h3><button onClick={() => void refresh()} className="inline-flex items-center gap-2 text-sm text-blue-700"><RefreshCw size={15}/> Refresh</button></div>
    {run?.result ? <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700"><BookOpen size={16}/>{active ? "Informing content & analytics" : "Research archive · not currently used"}</div><p className="text-sm leading-6">{run.result.summary}</p><p className="mt-3 text-xs leading-5 text-slate-500">{!fresh ? "Business sources changed or this research is over 30 days old. Run fresh research to use these insights." : "Research suggests experiments. It does not establish prices, policies or customer commitments, and is not used as factual evidence in inbox replies."}</p></div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">{run.result.findings.map((finding, i) => {
        const excluded = run.excludedFindingIds.includes(finding.id);
        return <article key={finding.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">{String(i + 1).padStart(2, "0")}</span><span className="text-xs text-slate-500">{excluded ? "Excluded" : active ? "In use" : "Saved finding"}</span></div>
          <h4 className="text-lg font-semibold leading-snug">{finding.title}</h4><p className="mt-3 text-sm leading-6 text-slate-600">{finding.learning}</p>
          <div className="mt-4 rounded-xl bg-blue-50 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">An experiment to try</p><p className="text-sm leading-6">{finding.application}</p></div>
          <div className="mt-4 flex flex-wrap gap-2">{finding.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-blue-700"><span className="truncate">{run.result?.sources.find(s => s.url === url)?.title || `Source ${index + 1}`}</span><ArrowUpRight size={13} className="shrink-0"/></a>)}</div>
          {canManage && <label className="mt-5 flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-4 text-sm"><input type="checkbox" checked={!excluded} disabled={busy} onChange={() => void toggle(finding.id, !excluded)} className="h-4 w-4 accent-blue-600"/> Include in recommendations</label>}
        </article>;
      })}</div>
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5"><h4 className="flex items-center gap-2 font-semibold"><CircleHelp size={18}/> What we still don’t know</h4><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{run.result.unknowns.length ? run.result.unknowns.map((item, i) => <li key={i}>{item}</li>) : <li>No additional gaps were reported by this run. Findings still require judgment and testing.</li>}</ul></section>
    </> : !pending && <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-8 text-center"><BookOpen className="mx-auto text-blue-600" size={28}/><h4 className="mt-3 font-semibold">Build a research library with evidence.</h4><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Add business sources in Knowledge, then choose a research question. Findings, sources and unanswered questions will appear here.</p></div>}
    {!!data?.runs.length && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h4 className="mb-3 font-semibold">Research history</h4><div className="divide-y divide-slate-100">{data.runs.map(item => <button key={item.id} disabled={!item.result} onClick={() => setSelected(item.id)} className="flex w-full min-w-0 items-start gap-3 py-3 text-left disabled:cursor-default"><CheckCircle2 size={16} className="mt-1 shrink-0 text-blue-600"/><span className="min-w-0"><span className="block break-words text-sm">{item.focus}</span><span className="mt-1 block text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()} · {item.phase}</span></span></button>)}</div></section>}
  </div>;
}
