"use client";
import { calendarMutationFetch } from "@/lib/publishing/clientRequests";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Clock3, CloudUpload, FileCheck2, FileText, LoaderCircle, Search, Settings2, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  approvalFor,
  duplicateIndex,
  IMPORT_FIELDS,
  IMPORT_PLATFORMS,
  mapItems,
  parsePlatforms,
  rowIssues,
  type ExistingPost,
  type ImportMapping,
  type ImportOptions,
  type ImportRow,
  type SourceItem,
} from "@/lib/calendarImport/mapping";
import type { CalendarPostData } from "./CalendarGrid";

type Preview = {
  items: SourceItem[];
  mapping: ImportMapping;
  existing: ExistingPost[];
  filename: string;
  method: string;
};
const labels: Record<string, string> = {
  date: "Date",
  time: "Time",
  platform: "Platforms",
  postType: "Content format",
  category: "Category / pillar",
  caption: "Caption / copy",
  contentIdea: "Title / topic",
  hook: "Hook",
  script: "Script",
  cta: "Call to action",
  hashtags: "Hashtags",
  taggedAccounts: "Tagged accounts",
  linkUrl: "Link",
  notes: "Notes",
  status: "Source status",
};

export default function ImportCalendar({
  calendarId,
  theme: _theme,
  onImported,
}: {
  calendarId: string;
  theme: "dark" | "light";
  onImported: (posts: CalendarPostData[], firstDate: string | null) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "reading" | "saving">("idle");
  const [dragging, setDragging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [edits, setEdits] = useState<Record<string, ImportRow>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "attention" | "ready" | "duplicates">("all");
  const [bulkTime, setBulkTime] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmApprovals, setConfirmApprovals] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [requestId, setRequestId] = useState("");
  const pendingRequest = useRef<{
    body: string;
    saved?: { postIds: string[]; skipped: string[]; firstDate: string | null };
  } | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    timezone: "",
    dateOrder: "ASK",
    year: "",
    defaultTime: "",
    defaultPlatform: "",
  });

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  useEffect(() => {
    const element = dialog.current;
    return () => {
      // A modal dialog in a hidden workspace section can keep the page inert.
      if (element?.open) element.close();
    };
  }, []);

  function dismiss() {
    // Release the browser's modal state before navigation can hide this section.
    dialog.current?.close();
    setOpen(false);
    if (result) {
      window.dispatchEvent(
        new CustomEvent("showwork-workspace-navigate", { detail: { id: "content" } }),
      );
      router.refresh();
    }
  }

  function begin() {
    setPreview(null);
    setPhase("idle");
    setProcessingStep(0);
    setSettingsOpen(false);
    setMappingOpen(false);
    setDragging(false);
    setSearch("");
    setFilter("all");
    setBulkTime("");
    setExpanded(null);
    setEdits({});
    setExcluded(new Set());
    setKept(new Set());
    setError("");
    setResult(null);
    setConfirmApprovals(false);
    setReviewed(false);
    setRequestId(crypto.randomUUID());
    pendingRequest.current = null;
    setRetryPending(false);
    setOptions({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateOrder: "ASK",
      year: "",
      defaultTime: "",
      defaultPlatform: "",
    });
    if (fileInput.current) fileInput.current.value = "";
    setOpen(true);
  }
  function changed() {
    setReviewed(false);
    setConfirmApprovals(false);
    setError("");
  }
  const rows = useMemo(
    () =>
      preview
        ? mapItems(preview.items, mapping, options).map(
            (row) => edits[row.id] ?? row,
          )
        : [],
    [preview, mapping, options, edits],
  );
  const assessed = useMemo(() => {
    let duplicates: ReturnType<typeof duplicateIndex> | undefined;
    return rows.map((row) => {
      const issues = rowIssues(row, options);
      let exactCount = 0,
        possible = false,
        platforms: string[] = [];
      if (!issues.errors.length && issues.iso) {
        duplicates ??= duplicateIndex(
          preview?.existing ?? [],
          options.timezone,
        );
        platforms = parsePlatforms(row.platform);
        for (const platform of platforms) {
          const candidate: ExistingPost = {
            ...row,
            platform,
            postDate: issues.iso,
          };
          if (duplicates.exact(candidate)) exactCount++;
          else if (duplicates.possible(candidate)) possible = true;
          if (!excluded.has(row.id)) duplicates.add(candidate);
        }
      }
      return {
        row,
        issues,
        exactCount,
        possible,
        platforms,
        allExact: platforms.length > 0 && exactCount === platforms.length,
      };
    });
  }, [rows, options, preview, excluded]);
  const needsAttention = (item: (typeof assessed)[number]) => !excluded.has(item.row.id) && !item.allExact && (!!item.issues.errors.length || (item.possible && !kept.has(item.row.id)));
  const attentionCount = assessed.filter(needsAttention).length;
  const visibleRows = assessed.filter((item) => {
    const matches = [item.row.contentIdea, item.row.caption, item.row.platform, item.row.date, item.row.source].join(" ").toLowerCase().includes(search.toLowerCase());
    return matches && (filter === "all" || (filter === "attention" && needsAttention(item)) || (filter === "duplicates" && (item.allExact || item.possible || item.exactCount > 0)) || (filter === "ready" && !needsAttention(item) && !item.allExact && !excluded.has(item.row.id)));
  });
  function applyTime() {
    if (!bulkTime.trim()) return;
    setEdits((current) => Object.fromEntries(rows.map((row) => [row.id, excluded.has(row.id) ? (current[row.id] ?? row) : { ...row, time: bulkTime.trim() }])));
    setKept(new Set());
    changed();
  }
  const selected = assessed.filter(
    (item) => !excluded.has(item.row.id) && !item.allExact,
  );
  const postCount = selected.reduce(
    (count, item) => count + item.platforms.length - item.exactCount,
    0,
  );
  const invalid = selected.some(
    (item) =>
      item.issues.errors.length || (item.possible && !kept.has(item.row.id)),
  );
  const hasApprovals = selected.some(
    (item) => approvalFor(item.row.status) === "APPROVED",
  );

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Choose a file up to 3 MB.");
      return;
    }
    setBusy(true);
    setPhase("uploading");
    setProcessingStep(0);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      setPhase("reading");
      setProcessingStep(1);
      const response = await calendarMutationFetch(
        `/api/calendars/${calendarId}/imports/preview`,
        { method: "POST", body: form },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to read the file.");
      setProcessingStep(3);
      setPreview(data);
      setMapping(data.mapping);
      setEdits({});
      setExcluded(new Set());
      setKept(new Set());
      changed();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to read the file.",
      );
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }
  async function confirm() {
    if (!pendingRequest.current)
      pendingRequest.current = {
        body: JSON.stringify({
          requestId,
          options,
          confirmApprovals,
          rows: selected.map(({ row }) => ({
            ...row,
            keepPossibleDuplicate: kept.has(row.id),
          })),
        }),
      };
    setBusy(true);
    setPhase("saving");
    setError("");
    try {
      let saved = pendingRequest.current.saved;
      if (!saved) {
        const response = await calendarMutationFetch(
          `/api/calendars/${calendarId}/imports/confirm`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: pendingRequest.current.body,
          },
        );
        const data = await response.json();
        if (!response.ok) {
          // A validation/permission response means this attempt did not commit. Network failures retain the exact request.
          if (response.status < 500) {
            pendingRequest.current = null;
            setRetryPending(false);
            if (response.status === 409) {
              const latest = await calendarMutationFetch(`/api/calendars/${calendarId}/posts`, {
                cache: "no-store",
              });
              if (latest.ok) {
                const latestData = await latest.json();
                setPreview((current) =>
                  current
                    ? { ...current, existing: latestData.posts }
                    : current,
                );
                setReviewed(false);
              }
            }
          }
          throw new Error(data.error || "Unable to complete the import.");
        }
        saved = data;
        pendingRequest.current!.saved = data;
      }
      const response = await calendarMutationFetch(`/api/calendars/${calendarId}/posts`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "Import was saved, but the calendar could not refresh. Retry to refresh it.",
        );
      const data = await response.json();
      onImported(data.posts, saved!.firstDate);
      setResult(
        `${saved!.postIds.length} ${saved!.postIds.length === 1 ? "post" : "posts"} imported${saved!.skipped.length ? `; ${saved!.skipped.length} duplicates skipped` : ""}.`,
      );
      pendingRequest.current = null;
      setRetryPending(false);
    } catch (error) {
      setRetryPending(!!pendingRequest.current);
      setError(
        error instanceof Error
          ? error.message
          : "Connection interrupted. Retry the same confirmation safely.",
      );
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }
  const inputClass = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1768E8] focus:ring-4 focus:ring-[#1768E8]/10 disabled:opacity-50";
  const toggle = (values: Set<string>, id: string) => {
    const next = new Set(values);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const readOnly = busy || retryPending || !!result;
  const readyCount = assessed.filter((item) => !excluded.has(item.row.id) && !needsAttention(item) && !item.allExact).length;
  const duplicateCount = assessed.filter((item) => item.allExact || item.possible || item.exactCount > 0).length;
  const canConfirm = retryPending || (selected.length > 0 && !invalid && reviewed && (!hasApprovals || confirmApprovals) && postCount <= 500);
  const currentStep = result ? 3 : preview ? 2 : busy ? 1 : 0;

  return (
    <>
      <button type="button" onClick={begin} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#1768E8]/25 bg-[#1768E8]/10 px-4 text-sm font-semibold text-[#1768E8] transition hover:bg-[#1768E8]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1768E8]">
        <UploadCloud className="h-4 w-4" /> Import calendar
      </button>
      <dialog
        ref={dialog}
        onCancel={(event) => { event.preventDefault(); if (!busy) dismiss(); }}
        onClose={() => setOpen(false)}
        aria-labelledby="import-calendar-title"
        className="fixed inset-0 m-auto h-[min(94dvh,950px)] max-h-[94dvh] w-[calc(100%_-_16px)] max-w-[1160px] overflow-hidden rounded-[24px] border border-white/70 bg-[#F7F9FC] p-0 text-[#142033] shadow-[0_32px_120px_rgba(7,22,53,.35)] backdrop:bg-[#07152A]/70 backdrop:backdrop-blur-[8px] sm:rounded-[30px]"
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="relative shrink-0 border-b border-[#E8ECF3] bg-white px-5 py-4 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#1768E8]"><span className="h-1.5 w-1.5 rounded-full bg-[#1768E8]" /> SHOWWORK / CALENDAR STUDIO</div>
                <h2 id="import-calendar-title" className="text-[25px] font-semibold leading-tight tracking-[-.045em] sm:text-[34px]">{result ? "You're all set." : preview ? "Make your calendar yours." : "Bring your plan to life."}</h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{result ? "Your content is ready in Showwork." : preview ? "A final look before everything finds its place." : "From a document to a beautifully organized content calendar."}</p>
              </div>
              <button type="button" aria-label="Close import" onClick={dismiss} disabled={busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"><X className="h-[18px] w-[18px]" /></button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4" aria-label="Import progress">
              {(["Upload file", "Prepare content", "Review & import"] as const).map((name, i) => {
                const complete = i < currentStep || !!result;
                const active = i === currentStep && !result;
                return <div key={name} className="min-w-0">
                  <div className="mb-2 flex items-center gap-2"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${complete ? "bg-[#E2F6EC] text-[#16834B]" : active ? "bg-[#1768E8] text-white" : "bg-[#F1F4F9] text-slate-400"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : i + 1}</span><span className={`truncate text-[11px] font-semibold sm:text-xs ${active ? "text-[#1768E8]" : complete ? "text-slate-700" : "text-slate-400"}`}>{name}</span></div>
                  <div className={`h-1 rounded-full ${complete ? "bg-[#22A36A]" : active ? "bg-[#1768E8]" : "bg-[#E9EDF4]"}`} />
                </div>;
              })}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-7">
            {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><span>{error}</span></div>}

            {result ? (
              <div role="status" className="mx-auto flex max-w-xl flex-col items-center py-12 text-center sm:py-20">
                <div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] bg-[#E5F7EE] text-[#16834B]"><CheckCircle2 className="h-12 w-12" /><span className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-[#1768E8]/20" /></div>
                <h3 className="text-3xl font-semibold tracking-[-.045em]">Your plan has a new home.</h3>
                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">{result} Your content is organized and ready for your team to work on.</p>
                <button type="button" onClick={dismiss} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1768E8] px-7 font-semibold text-white shadow-[0_8px_24px_rgba(23,104,232,.22)] transition hover:bg-[#1258C9]">Go to calendar <ArrowRight className="h-4 w-4" /></button>
              </div>
            ) : !preview ? (
              <div className="mx-auto max-w-[760px] py-2 sm:py-8">
                {busy ? (
                  <div role="status" aria-live="polite" className="overflow-hidden rounded-[26px] border border-[#DFE7F4] bg-white p-6 text-center shadow-[0_12px_50px_rgba(21,42,76,.05)] sm:p-12">
                    <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#EAF2FF] text-[#1768E8]"><FileText className="h-10 w-10" /><LoaderCircle className="absolute -inset-3 h-[120px] w-[120px] animate-spin text-[#1768E8]/35" strokeWidth={1} /></div>
                    <h3 className="text-2xl font-semibold tracking-tight">{phase === "uploading" ? "Opening your file…" : "Putting your content together…"}</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">We’re finding your content, dates and platforms so you can review everything in one place.</p>
                    <div className="mx-auto mt-9 max-w-sm space-y-4 text-left">
                      {(["Receiving your document", "Reading content and tables", "Identifying fields and dates", "Preparing your preview"] as const).map((label, index) => <div key={label} className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${index < processingStep ? "bg-[#E2F6EC] text-[#16834B]" : index === processingStep ? "bg-[#EAF2FF] text-[#1768E8]" : "bg-slate-100 text-slate-400"}`}>{index < processingStep ? <Check className="h-4 w-4" /> : index === processingStep ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span><span className={`text-sm ${index <= processingStep ? "font-medium text-slate-800" : "text-slate-400"}`}>{label}</span></div>)}
                    </div>
                    <p className="mt-8 text-xs text-slate-400">Large documents can take a little longer. Keep this window open.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-7 text-center"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF2FF] px-3 py-1.5 text-[11px] font-bold text-[#1768E8]"><Sparkles className="h-3.5 w-3.5" /> YOUR CONTENT, ORGANIZED</span><h3 className="mt-4 text-2xl font-semibold tracking-[-.04em] sm:text-[29px]">One upload. A whole calendar.</h3><p className="mt-2 text-sm text-slate-500">No copying and pasting. Just bring what you already have.</p></div>
                    <div onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={(e) => { e.preventDefault(); setDragging(false); }} onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files[0]); }} className={`relative rounded-[26px] border-2 border-dashed p-7 text-center transition-all sm:p-12 ${dragging ? "scale-[1.01] border-[#1768E8] bg-[#EAF2FF]" : "border-[#BCD0F2] bg-white hover:border-[#1768E8] hover:bg-[#FAFCFF]"}`}>
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#EAF2FF] text-[#1768E8]"><CloudUpload className="h-8 w-8" /></div>
                      <h4 className="text-lg font-semibold tracking-tight">Drop your calendar here</h4><p className="mt-2 text-sm text-slate-500">or choose a file from your device</p>
                      <input ref={fileInput} id="calendar-import-file" type="file" accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,.txt,.html,.htm,text/html" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); }} className="sr-only" />
                      <button type="button" onClick={() => fileInput.current?.click()} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1768E8] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(23,104,232,.2)] transition hover:bg-[#1258C9]"><UploadCloud className="h-4 w-4" /> Browse files</button>
                      <p className="mt-6 text-xs text-slate-400">PDF, CSV, Excel, Word, TXT, HTML · Up to 3 MB · 200 items</p>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#16834B]" /> Secure document processing</span><span className="inline-flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-[#16834B]" /> Review before importing</span></div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-5 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#DFE7F4] bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#1768E8]"><FileCheck2 className="h-6 w-6" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900" title={preview.filename}>{preview.filename}</p><p className="mt-1 text-xs text-slate-500">{preview.method} · Successfully read</p></div></div>
                  <button type="button" disabled={readOnly} onClick={begin} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Change file</button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {([{ title: "Content items", value: rows.length, icon: FileText, tint: "text-[#1768E8] bg-[#EAF2FF]" }, { title: "Platform posts", value: postCount, icon: Sparkles, tint: "text-[#6D56D9] bg-[#F0ECFF]" }, { title: "Ready", value: readyCount, icon: CheckCircle2, tint: "text-[#16834B] bg-[#E5F7EE]" }, { title: "Need attention", value: attentionCount, icon: CircleAlert, tint: "text-[#B7791F] bg-[#FFF3DC]" }] as const).map((stat) => <div key={stat.title} className="rounded-[18px] border border-[#E6EAF2] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{stat.title}</span><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${stat.tint}`}><stat.icon className="h-4 w-4" /></span></div><div className="mt-2 text-[27px] font-semibold tracking-tight tabular-nums">{stat.value}</div></div>)}
                </div>

                <div className="overflow-hidden rounded-[20px] border border-[#E4EAF3] bg-white">
                  <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Settings2 className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Import preferences</p><p className="mt-0.5 text-xs text-slate-500">{options.timezone || "Select timezone"} · Date and time settings</p></div></div><ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${settingsOpen ? "rotate-180" : ""}`} /></button>
                  {settingsOpen && <fieldset disabled={readOnly} className="grid gap-4 border-t border-slate-100 bg-[#FBFCFE] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                    <label className="space-y-1.5 text-xs font-semibold text-slate-600">Import timezone<input aria-label="Import timezone" className={inputClass} value={options.timezone} onChange={(e) => { setOptions({ ...options, timezone: e.target.value }); changed(); }} /></label>
                    <label className="space-y-1.5 text-xs font-semibold text-slate-600">Numeric date order<select className={inputClass} value={options.dateOrder} onChange={(e) => { setOptions({ ...options, dateOrder: e.target.value as ImportOptions["dateOrder"] }); changed(); }}><option value="ASK">Flag ambiguous dates</option><option value="DMY">Day / month / year</option><option value="MDY">Month / day / year</option></select></label>
                    <label className="space-y-1.5 text-xs font-semibold text-slate-600">Year for missing years<input className={inputClass} inputMode="numeric" placeholder="e.g. 2026" value={options.year} onChange={(e) => { setOptions({ ...options, year: e.target.value }); changed(); }} /></label>
                    <label className="space-y-1.5 text-xs font-semibold text-slate-600">Fill missing times<input className={inputClass} placeholder="9 AM or 14:30" value={options.defaultTime} onChange={(e) => { setOptions({ ...options, defaultTime: e.target.value }); changed(); }} /></label>
                    <label className="space-y-1.5 text-xs font-semibold text-slate-600">Default platform<select className={inputClass} value={options.defaultPlatform} onChange={(e) => { setOptions({ ...options, defaultPlatform: e.target.value }); setEdits({}); changed(); }}><option value="">Require correction</option>{IMPORT_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select></label>
                    <label className="space-y-1.5 text-xs font-semibold text-slate-600">Time notation<select className={inputClass} value={options.timeFormat ?? "ASK"} onChange={(e) => { setOptions({ ...options, timeFormat: e.target.value as "ASK" | "24H" }); changed(); }}><option value="ASK">Ask if AM / PM unclear</option><option value="24H">24-hour time</option></select></label>
                    <div className="sm:col-span-2 lg:col-span-3"><p className="mb-2 text-xs font-semibold text-slate-600">Replace times across selected items</p><div className="flex flex-wrap gap-2"><input aria-label="Bulk replace time" className={`${inputClass} flex-1`} placeholder="e.g. 2:30 PM" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)} /><button type="button" onClick={applyTime} disabled={!bulkTime.trim()} className="rounded-xl bg-[#1768E8] px-5 text-sm font-semibold text-white disabled:opacity-40">Apply time</button></div><p className="mt-2 text-xs text-slate-400">This replaces existing and missing times for selected content.</p></div>
                  </fieldset>}
                </div>

                <div className="overflow-hidden rounded-[20px] border border-[#E4EAF3] bg-white">
                  <button type="button" onClick={() => setMappingOpen(!mappingOpen)} aria-expanded={mappingOpen} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileText className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Column mappings</p><p className="mt-0.5 text-xs text-slate-500">{Object.keys(mapping).length} source columns · Adjust how your fields are imported</p></div></div><ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${mappingOpen ? "rotate-180" : ""}`} /></button>
                  {mappingOpen && <fieldset disabled={readOnly} className="grid gap-4 border-t border-slate-100 bg-[#FBFCFE] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">{Object.entries(mapping).map(([header, field]) => <label key={header} className="space-y-1.5 text-xs font-semibold text-slate-600"><span className="block truncate" title={header}>{header}</span><select aria-label={`Map ${header}`} className={inputClass} value={field} onChange={(e) => { setMapping({ ...mapping, [header]: e.target.value as ImportMapping[string] }); setEdits({}); setKept(new Set()); changed(); }}><option value="custom">Keep as custom field</option><option value="ignore">Ignore</option>{IMPORT_FIELDS.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>)}</fieldset>}
                </div>

                <section className="overflow-hidden rounded-[22px] border border-[#E4EAF3] bg-white shadow-[0_8px_30px_rgba(21,42,76,.035)]">
                  <div className="border-b border-[#EDF0F5] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold tracking-tight">Your content</h3><p className="mt-1 text-xs text-slate-500">Select, review and refine your posts before importing.</p></div><div className="relative w-full sm:w-[255px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search imported content" className={`${inputClass} pl-9`} placeholder="Search content…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter imported content">{(["all", "ready", "attention", "duplicates"] as const).map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${filter === value ? "bg-[#1768E8] text-white" : "bg-[#F1F4F9] text-slate-600 hover:bg-[#E7EDF8]"}`}>{value === "all" ? `All ${rows.length}` : value === "ready" ? `Ready ${readyCount}` : value === "attention" ? `Needs attention ${attentionCount}` : `Duplicates ${duplicateCount}`}</button>)}</div>
                  </div>
                  <div className="space-y-3 bg-[#FAFBFD] p-3 sm:p-5">
                    {!visibleRows.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Nothing matches this view. Try another search or filter.</div>}
                    {visibleRows.map(({ row, issues, allExact, exactCount, possible }) => {
                      const selectedRow = !excluded.has(row.id) && !allExact;
                      const edit = (field: keyof ImportRow, value: string) => { setEdits({ ...edits, [row.id]: { ...row, [field]: value } }); setKept(new Set()); changed(); };
                      const warning = issues.errors.length > 0 || possible;
                      return <article key={row.id} className={`overflow-hidden rounded-[18px] border bg-white transition ${!selectedRow ? "border-slate-200 opacity-65" : issues.errors.length ? "border-red-200" : warning ? "border-amber-200" : "border-[#E4EAF3] hover:border-[#BBD0F2]"}`}>
                        <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                          <input type="checkbox" aria-label={`Import ${row.contentIdea || row.source.slice(0,80)}`} checked={selectedRow} disabled={readOnly || allExact} onChange={() => { setExcluded(toggle(excluded, row.id)); changed(); }} className="mt-1 h-4 w-4 shrink-0 accent-[#1768E8]" />
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${allExact ? "bg-slate-100 text-slate-600" : issues.errors.length ? "bg-red-50 text-red-700" : possible ? "bg-amber-50 text-amber-700" : "bg-[#E5F7EE] text-[#16834B]"}`}>{allExact ? "Already imported" : issues.errors.length ? "Needs correction" : possible ? "Possible duplicate" : "Ready"}</span>{row.postType && <span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10px] font-semibold text-[#1768E8]">{row.postType}</span>}</div>
                            <h4 className="break-words text-sm font-semibold leading-6 text-[#142033] sm:text-[15px]">{row.contentIdea || row.hook || row.caption.slice(0,100) || "Untitled content item"}</h4>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{issues.iso ? new Date(issues.iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: options.timezone || undefined }) : `${row.date || "Missing date"} · ${row.time || "Missing time"}`}</span><span>{row.platform || "Missing platform"}</span></div>
                            {row.caption && <p className="mt-3 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500 sm:text-sm">{row.caption}</p>}
                            <p className="mt-2 truncate text-[11px] text-slate-400" title={row.source}>{row.source}</p>
                            {!!exactCount && <p className="mt-2 text-xs text-amber-700">{exactCount} exact platform duplicate{exactCount === 1 ? "" : "s"} will be skipped.</p>}
                            {selectedRow && issues.errors.some((message) => /time|AM|PM/i.test(message)) && <label className="mt-3 block max-w-xs space-y-1 text-xs font-semibold text-slate-600">Correct this item's time<input className={inputClass} value={row.time} disabled={readOnly} placeholder="e.g. 9 AM or 14:30" onChange={(e) => edit("time", e.target.value)} /></label>}
                            {issues.errors.map((message, i) => <p key={`e${i}`} className="mt-2 text-xs text-red-700">{message}</p>)}
                            {issues.warnings.map((message, i) => <p key={`w${i}`} className="mt-1 text-xs text-amber-700">{message}</p>)}
                            {possible && <label className="mt-3 flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" className="mt-0.5 accent-[#1768E8]" disabled={readOnly} checked={kept.has(row.id)} onChange={() => { setKept(toggle(kept, row.id)); changed(); }} />Keep this as an additional post despite similar content.</label>}
                          </div>
                          <button type="button" disabled={readOnly} aria-expanded={expanded === row.id} onClick={() => setExpanded(expanded === row.id ? null : row.id)} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">{expanded === row.id ? "Done" : "Edit"}<ChevronDown className={`h-3.5 w-3.5 transition ${expanded === row.id ? "rotate-180" : ""}`} /></button>
                        </div>
                        {expanded === row.id && <fieldset disabled={readOnly} className="grid gap-4 border-t border-[#E8ECF3] bg-[#FBFCFE] p-4 sm:grid-cols-2 sm:p-5">{IMPORT_FIELDS.map((field) => <label key={field} className={`space-y-1.5 text-xs font-semibold text-slate-600 ${["caption", "script", "notes"].includes(field) ? "sm:col-span-2" : ""}`}>{labels[field]}{["caption", "script", "notes", "hook"].includes(field) ? <textarea rows={3} className={inputClass} value={row[field]} onChange={(e) => edit(field, e.target.value)} /> : <input className={inputClass} value={row[field]} placeholder={field === "date" ? "YYYY-MM-DD" : field === "platform" ? "Instagram, LinkedIn" : undefined} onChange={(e) => edit(field, e.target.value)} />}</label>)}{row.customFields.map((field, i) => <label key={i} className="space-y-1.5 text-xs font-semibold text-slate-600">{field.label}<textarea className={inputClass} value={field.value} onChange={(e) => { const fields = [...row.customFields]; fields[i] = { ...field, value: e.target.value }; setEdits({ ...edits, [row.id]: { ...row, customFields: fields } }); changed(); }} /></label>)}</fieldset>}
                      </article>;
                    })}
                  </div>
                </section>
                <div className="rounded-[20px] border border-[#E4EAF3] bg-white p-4 sm:p-5">
                  <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#16834B]" /><div><h4 className="text-sm font-semibold">A quick final check</h4><p className="mt-1 text-xs leading-5 text-slate-500">Nothing will be published automatically. You can attach media later in the post editor.</p></div></div>
                  <fieldset disabled={readOnly} className="mt-4 space-y-3 border-t border-slate-100 pt-4">{hasApprovals && <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#1768E8]" checked={confirmApprovals} onChange={(e) => setConfirmApprovals(e.target.checked)} /><span>I confirm the mapped approvals. Approved posts will be locked after import.</span></label>}<label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#1768E8]" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /><span>I have reviewed the selected content, dates, field mappings and warnings.</span></label></fieldset>
                  {retryPending && <p className="mt-3 text-xs text-amber-700">The import may already have been saved. Retrying uses the same request to prevent duplicates.</p>}
                  {invalid && <p className="mt-3 text-xs text-amber-700">Correct or exclude items needing attention before confirming.</p>}
                </div>
              </div>
            )}
          </div>

          {preview && !result && <footer className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#E5EAF2] bg-white px-4 py-3 shadow-[0_-8px_25px_rgba(15,31,59,.035)] sm:px-8 sm:py-4"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{postCount} {postCount === 1 ? "post" : "posts"} ready to add</p><p className="text-xs text-slate-500">{selected.length} selected items · Publishing stays off</p></div><button type="button" onClick={() => void confirm()} disabled={busy || !canConfirm} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1768E8] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(23,104,232,.18)] transition hover:bg-[#1258C9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1768E8] disabled:cursor-not-allowed disabled:bg-[#A9C6F8] disabled:shadow-none sm:px-7">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{busy ? "Saving your calendar…" : retryPending ? "Retry confirmation" : `Import ${postCount} ${postCount === 1 ? "post" : "posts"}`}</button></footer>}
        </div>
      </dialog>
    </>
  );
}
