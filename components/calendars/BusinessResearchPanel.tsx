"use client";
import researchStyles from "./ResearchStudio.module.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ArrowUpRight, BookOpen, ChevronDown, Loader2, RefreshCw, SlidersHorizontal, ArrowRight, History, MessageSquare, ScanSearch, Lightbulb, Link2 } from "lucide-react";
import { opportunityInstructions, queueResearchBrief } from "@/lib/knowledge/researchHandoff";
import { sourceAllowed, type ResearchPlan, type ResearchFeedback } from "@/lib/knowledge/researchPlan";
import type { BusinessResearchResult } from "@/lib/openai";

type Run = { id: string; status: string; phase: string; focus: string; sourceHash: string | null; result: BusinessResearchResult | null; findingFeedback?: ResearchFeedback | null; excludedFindingIds: string[]; error: string | null; createdAt: string; completedAt: string | null };
type Snapshot = { plan: ResearchPlan | null; runs: Run[]; sourceHash: string; sourceCount: number };
export default function BusinessResearchPanel({ calendarId, canManage, canGenerate = false }: { calendarId: string; canManage: boolean; canGenerate?: boolean }) {
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [plan, setPlan] = useState<ResearchPlan>({ goal: "", audience: "", priorities: "", excludedDomains: [] });
  const [planLoaded, setPlanLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});
  useEffect(() => { if (data && !planLoaded) { if (data.plan) setPlan(data.plan); setPlanLoaded(true); } }, [data, planLoaded]);
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
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
  useEffect(() => { setShowAll(false); }, [run?.id]);
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
  async function toggle(findingId: string, excluded: boolean, verdict?: "useful" | "irrelevant" | "incorrect") {
    if (!run) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: run.id, findingId, excluded, verdict, note: feedbackNotes[`${run.id}:${findingId}`] ?? run.findingFeedback?.[findingId]?.note ?? "" }) });
      if (!response.ok) throw new Error("Could not update this finding.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update finding."); }
    finally { setBusy(false); }
  }
  async function savePlan() {
    setBusy(true); setError("");
    try { const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "savePlan", plan }) });
      const body = await response.json(); if (!response.ok) throw Error(body.error); setNotice("Research plan saved. Future runs will use it."); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save plan."); } finally { setBusy(false); }
  }
  const fieldClass = "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";
  const secondaryClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:opacity-40";
  return <div className={researchStyles.studio}>
    <section className={researchStyles.hero} aria-labelledby="research-question-title">
      <div className={researchStyles.heroHeading}>
        <div><p className={researchStyles.eyebrow}><ScanSearch size={15}/> AI Studio / Research</p><h1 id="research-question-title">A better question.<br/><span>A sharper next move.</span></h1><p className={researchStyles.heroCopy}>Understand your audience, explore your market and find a fresh angle for your next creative brief.</p></div>
        <div className={researchStyles.researchArt} aria-hidden="true"><span/><div><ScanSearch size={38} strokeWidth={1.4}/></div><span><Lightbulb size={18}/></span></div>
      </div>
      {canManage && <div className={researchStyles.questionBox}>
        <label className="sr-only" htmlFor="research-focus">Your research question</label>
        <textarea ref={questionRef} id="research-focus" value={focus} onChange={e => setFocus(e.target.value)} maxLength={1200} rows={3} placeholder="For example: What stops small businesses in Nigeria from hiring a social media manager?" className={researchStyles.questionInput} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={researchStyles.questionHint}>Your knowledge provides context. Keep private details out of the question.</p>
          <button onClick={start} disabled={busy || !!pending || focus.trim().length < 10 || !data?.sourceCount} className={researchStyles.startButton}>{busy || pending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {pending ? "Researching…" : "Start research"}</button>
        </div>
        {data?.sourceCount === 0 && <p className="mt-3 text-sm text-amber-700">Add a document or website in Knowledge to get started.</p>}
      </div>}
      <div className={researchStyles.contextLine}><span><BookOpen size={13}/>{data ? `${data.sourceCount} business sources` : "Loading workspace…"}</span><span><Link2 size={13}/>Source links included in findings</span></div>
      <details className={`${researchStyles.preferences} group`}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-600 [&::-webkit-details-marker]:hidden"><SlidersHorizontal size={16} aria-hidden="true" /> Research preferences <span className="ml-auto text-xs font-normal text-slate-400">Optional</span><ChevronDown size={16} className="transition group-open:rotate-180" /></summary>
        <p className="mt-4 text-xs leading-5 text-slate-500">Set these once to guide future research. These fields are included in public research requests, so keep private details out.</p>
        <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          {([["goal", "Your marketing goal", "What are you trying to achieve?"], ["audience", "Your audience", "Who do you want to understand?"], ["priorities", "Topics to focus on", "Questions that matter to your business"]] as const).map(([key, label, placeholder]) => <label key={key} className="min-w-0 text-sm font-medium">{label}<textarea disabled={!canManage || busy} placeholder={placeholder} maxLength={1200} rows={2} value={plan[key]} onChange={e => setPlan(p => ({ ...p, [key]: e.target.value }))} className={fieldClass} /></label>)}
          <label className="min-w-0 text-sm font-medium">Sources to avoid<textarea disabled={!canManage || busy} rows={2} value={plan.excludedDomains.join("\n")} placeholder="example.com — one domain per line" onChange={e => setPlan(p => ({ ...p, excludedDomains: e.target.value.split("\n") }))} className={fieldClass} /></label>
        </div>
        {canManage && <button disabled={busy} onClick={savePlan} className={secondaryClass + " mt-4"}>Save preferences</button>}
      </details>
    </section>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={() => void refresh()} className="ml-2 underline">Try loading again</button></p>}
    {pending && <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5"><Loader2 className="mt-1 shrink-0 animate-spin text-blue-600" size={20}/><div className="min-w-0"><p className="text-sm font-semibold">{pending.phase}</p><p className="mt-1 break-words text-sm text-slate-600">{pending.focus}</p><p className="mt-2 text-xs text-slate-500">You can leave this page and return when it’s ready.</p></div></div>}
    {data?.runs[0]?.status === "FAILED" && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{data.runs[0].error}</p>}
    {run?.result ? <section aria-labelledby="research-findings-title" className={researchStyles.results}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className={researchStyles.eyebrow}><Lightbulb size={14}/> What we found</p><h2 id="research-findings-title" className={researchStyles.resultsTitle}>Ideas with a reason behind them.</h2><p className="mt-1 break-words text-sm text-slate-500">{run.focus}</p><p className="mt-2 text-xs text-slate-400">{new Date(run.createdAt).toLocaleDateString()} · {run.result.findings.length} findings · {active ? "Available to AI Studio" : "Archived research"}</p></div>
        <button aria-label="Refresh research results" onClick={() => void refresh()} className={secondaryClass + " shrink-0"}><RefreshCw size={16} /></button>
      </div>
      {!fresh && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This research is over 30 days old or your knowledge has changed. Run new research before using it for a brief.</p>}
      <details className={`${researchStyles.disclosure} group`}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><BookOpen size={16} className="text-blue-600" /> Read the summary</span><ChevronDown size={16} className="transition group-open:rotate-180" /></summary><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{run.result.summary}</p></details>
      <div className={researchStyles.findingGrid}>{run.result.findings.slice(0, showAll ? undefined : 4).map((finding, i) => {
        const sourceUrls = finding.sourceUrls.filter(url => sourceAllowed(url, data?.plan?.excludedDomains ?? []));
        const excluded = run.excludedFindingIds.includes(finding.id) || !sourceUrls.length;
        const key = `${run.id}:${finding.id}`;
        return <article key={key} className={researchStyles.finding} data-excluded={excluded}>
          <div className={researchStyles.findingTop}><span className={researchStyles.findingMark}><ScanSearch size={17}/><span>{String(i + 1).padStart(2, "0")}</span></span><span className={researchStyles.findingStatus}>{excluded ? "Excluded" : active ? "Ready to explore" : "Saved finding"}</span></div>
          <h4 className={researchStyles.findingTitle}>{finding.title}</h4>
          <p className={researchStyles.learning}>{finding.learning}</p>
          <div className={researchStyles.application}><p><Lightbulb size={13}/> An idea to try</p><p>{finding.application}</p></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className={researchStyles.sourceCount}><Link2 size={13}/>{sourceUrls.length} {sourceUrls.length === 1 ? "source" : "sources"}</span>{canManage && canGenerate && <button disabled={excluded || !active || busy} title={!active ? "Run current research to use this finding" : excluded ? "Include this finding before creating a brief" : undefined} onClick={() => { queueResearchBrief(calendarId, opportunityInstructions({ ...finding, sourceUrls })); window.dispatchEvent(new CustomEvent("showwork-workspace-navigate", { detail: { id: "generate" } })); }} className={researchStyles.createBrief}>Create brief <ArrowRight size={15}/></button>}</div>
          <details className={`${researchStyles.findingDetails} group`}><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-500 [&::-webkit-details-marker]:hidden">Details & sources <ChevronDown size={15} className="transition group-open:rotate-180" /></summary>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600"><p className="whitespace-pre-line">{finding.learning}</p><div><p className="font-medium text-slate-800">Suggested next step</p><p className="whitespace-pre-line">{finding.application}</p></div>
              {finding.relevance && <div><p className="font-medium text-slate-800">Why it matters for you</p><p>{finding.relevance}</p></div>}
              {finding.uncertainty && <div><p className="font-medium text-slate-800">What needs checking</p><p>{finding.uncertainty}</p></div>}
              {finding.successMeasure && <div><p className="font-medium text-slate-800">How to measure it</p><p>{finding.successMeasure}</p></div>}
              <p className="text-xs text-slate-400">Evidence date: {finding.evidenceDate || "Not available"}</p>
              <div className="space-y-2">{sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-start gap-2 text-sm text-blue-700 hover:underline"><ArrowUpRight size={15} className="mt-1 shrink-0" /><span className="min-w-0 break-words">{run.result?.sources.find(s => s.url === url)?.title || `Source ${index + 1}`}</span></a>)}</div>
              {canManage && <button disabled={busy} className={secondaryClass} onClick={() => { setFocus(`Investigate further: ${finding.title}. ${finding.application}`.slice(0, 1200)); setNotice("Follow-up question ready. Review it above, then start research."); questionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); questionRef.current?.focus({ preventScroll: true }); }}>Explore this further <ArrowUpRight size={15}/></button>}
            </div>
          </details>
          {canManage && <details className={`${researchStyles.findingDetails} group`}><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-slate-500 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><MessageSquare size={14}/> {run.findingFeedback?.[finding.id] ? "Your feedback" : "Improve this finding"}</span><ChevronDown size={15} className="transition group-open:rotate-180" /></summary>
            <label className="mt-4 block text-xs text-slate-500">What should we know? (optional)<textarea rows={2} maxLength={600} value={feedbackNotes[key] ?? run.findingFeedback?.[finding.id]?.note ?? ""} onChange={e => setFeedbackNotes(p => ({ ...p, [key]: e.target.value }))} className={fieldClass} /></label>
            <div className="mt-3 flex flex-wrap gap-2">{(["useful", "irrelevant", "incorrect"] as const).map(verdict => <button key={verdict} disabled={busy} onClick={() => void toggle(finding.id, verdict !== "useful", verdict)} aria-pressed={run.findingFeedback?.[finding.id]?.verdict === verdict} className="rounded-lg border border-slate-200 px-3 py-2 text-xs capitalize aria-pressed:border-blue-500 aria-pressed:bg-blue-50">{verdict}</button>)}</div>
            <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><input type="checkbox" checked={!excluded} disabled={busy || !sourceUrls.length} onChange={() => void toggle(finding.id, !excluded)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600"/> Use in AI recommendations</label>
          </details>}
        </article>;
      })}</div>
      {run.result.findings.length > 4 && <div className="text-center"><button className={secondaryClass} onClick={() => setShowAll(value => !value)}>{showAll ? "Show fewer findings" : `Show all ${run.result.findings.length} findings`}<ChevronDown size={15} className={showAll ? "rotate-180" : ""}/></button></div>}
      {!!run.result.unknowns.length && <details className={`${researchStyles.disclosure} group`}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-slate-600 [&::-webkit-details-marker]:hidden">Open questions ({run.result.unknowns.length})<ChevronDown size={16} className="transition group-open:rotate-180"/></summary><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-500">{run.result.unknowns.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
      <p className="px-1 text-xs leading-5 text-slate-400">Research suggests ideas to test. Your business knowledge remains the source of truth.</p>
    </section> : !pending && data && <div className={researchStyles.empty}><Search className="mx-auto text-blue-500" size={25}/><h3 className="mt-3 font-semibold">Your next idea starts with a question.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Ask above. We’ll bring back findings, sources and practical ideas for your content.</p></div>}
    {!!data?.runs.length && <details className={`${researchStyles.disclosure} group`}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-500 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><History size={16}/> Previous research</span><ChevronDown size={16} className="transition group-open:rotate-180"/></summary><div className="mt-3 divide-y divide-slate-100">{data.runs.map(item => <button key={item.id} disabled={!item.result} onClick={() => setSelected(item.id)} className="block w-full min-w-0 rounded-lg py-3 text-left disabled:opacity-50"><span className="block break-words text-sm text-slate-700">{item.focus}</span><span className="mt-1 block text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()} · {item.phase}</span></button>)}</div></details>}
  </div>;
}
