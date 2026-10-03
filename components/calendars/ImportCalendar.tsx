"use client";

import UiSymbol from "@/components/ui/UiSymbol";
import { useEffect, useMemo, useRef, useState } from "react";
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
  theme,
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
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [edits, setEdits] = useState<Record<string, ImportRow>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [kept, setKept] = useState<Set<string>>(new Set());
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
  function begin() {
    setPreview(null);
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
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(
        `/api/calendars/${calendarId}/imports/preview`,
        { method: "POST", body: form },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to read the file.");
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
    setError("");
    try {
      let saved = pendingRequest.current.saved;
      if (!saved) {
        const response = await fetch(
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
              const latest = await fetch(`/api/calendars/${calendarId}/posts`, {
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
      const response = await fetch(`/api/calendars/${calendarId}/posts`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "Import was saved, but the calendar could not refresh. Retry to refresh it.",
        );
      const data = await response.json();
      onImported(data.posts, saved!.firstDate);
      router.refresh();
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
    }
  }
  const inputClass =
    "w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm";
  const toggle = (values: Set<string>, id: string) => {
    const next = new Set(values);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const readOnly = busy || retryPending || !!result;
  return (
    <>
      <button
        type="button"
        onClick={begin}
        className="flex min-h-11 items-center gap-2 rounded-full border border-[#2478FF]/30 bg-[#2478FF]/10 px-4 py-2 text-xs font-semibold text-[#2478FF] transition hover:bg-[#2478FF]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2478FF] sm:text-sm"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Import calendar
      </button>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setOpen(false);
        }}
        onClose={() => setOpen(false)}
        aria-labelledby="import-calendar-title"
        className={`fixed inset-0 m-auto max-h-[96dvh] w-[calc(100%_-_1rem)] sm:max-h-[92dvh] sm:w-[min(1100px,95vw)] overflow-y-auto rounded-2xl border p-0 shadow-2xl backdrop:bg-black/60 [&_option]:bg-white [&_option]:text-slate-900 ${theme === "dark" ? "border-white/20 bg-[#17191e] text-white" : "border-slate-200 bg-white text-slate-900"}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-current/15 bg-inherit p-5">
          <div>
            <h2 id="import-calendar-title" className="text-xl font-semibold">
              Import Calendar
            </h2>
            <p className="mt-1 text-sm opacity-70">
              Bring your content plan into Showwork.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            aria-label="Close import"
            className="rounded-lg px-3 py-2 disabled:opacity-40"
          ><UiSymbol name="close" /></button>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          <ol aria-label="Import progress" className="grid grid-cols-3 gap-2">
            {["Upload", "Review", "Confirm"].map((label, index) => {
              const current = result || (busy && preview) ? 2 : preview ? 1 : 0;
              return <li key={label} aria-current={index === current ? "step" : undefined} className={`flex items-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold ${index === current ? "bg-[#2478FF]/10 text-[#2478FF]" : "opacity-60"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${index <= current ? "bg-[#2478FF] text-white" : "border border-current/30"}`}>{index < current ? <><UiSymbol name="check" /></> : index + 1}</span>{label}</li>;
            })}
          </ol>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm"
            >
              {error}
            </p>
          )}
          {result ? (
            <div role="status" className="space-y-4">
              <p>{result}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-full bg-[#2478FF] px-5 py-3 font-semibold text-white"
              >
                View calendar
              </button>
            </div>
          ) : (
            <>
              {!preview && (
                <div className="space-y-3 rounded-xl border border-dashed border-current/30 p-6">
                  <label
                    className="block font-medium"
                    htmlFor="calendar-import-file"
                  >
                    Choose an existing content calendar
                  </label>
                  <p className="text-sm opacity-70">
                    PDF, CSV, XLS/XLSX, DOC/DOCX, or TXT. Up to 3 MB and 200
                    content items. Review your dates and copy before importing. For scanned PDFs,
                    export a text-based version first.
                  </p>
                  <input
                    ref={fileInput}
                    id="calendar-import-file"
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,.txt"
                    disabled={busy}
                    onChange={(event) => void upload(event.target.files?.[0])}
                    className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-[#2478FF] file:px-5 file:py-3 file:font-semibold file:text-white"
                  />
                </div>
              )}
              {busy && (
                <p role="status" className="text-sm">
                  {preview
                    ? "Saving confirmed posts…"
                    : "Reading your calendar and identifying content items…"}
                </p>
              )}
              {preview && (
                <>
                  <p className="text-sm">
                    <strong>{preview.filename}</strong> · {rows.length} detected
                    items
                    <br />
                    <span className="opacity-70">Review the items below, then confirm your import.</span>
                  </p>
                  <fieldset
                    disabled={readOnly}
                    className="grid gap-3 rounded-xl border border-current/15 p-4 sm:grid-cols-2 lg:grid-cols-5"
                  >
                    <legend className="px-2 text-sm font-semibold">
                      Date and platform settings
                    </legend>
                    <label className="space-y-1 text-xs">
                      Import timezone
                      <input
                        aria-label="Import timezone"
                        className={inputClass}
                        value={options.timezone}
                        onChange={(event) => {
                          setOptions({
                            ...options,
                            timezone: event.target.value,
                          });
                          changed();
                        }}
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      Numeric date order
                      <select
                        aria-label="Numeric date order"
                        className={inputClass}
                        value={options.dateOrder}
                        onChange={(event) => {
                          setOptions({
                            ...options,
                            dateOrder: event.target
                              .value as ImportOptions["dateOrder"],
                          });
                          changed();
                        }}
                      >
                        <option value="ASK">Flag ambiguous dates</option>
                        <option value="DMY">Day / month / year</option>
                        <option value="MDY">Month / day / year</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      Year for missing years
                      <input
                        aria-label="Year for missing years"
                        className={inputClass}
                        inputMode="numeric"
                        placeholder="Choose a year"
                        value={options.year}
                        onChange={(event) => {
                          setOptions({ ...options, year: event.target.value });
                          changed();
                        }}
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      Default for missing times
                      <input
                        aria-label="Default for missing times"
                        className={inputClass}
                        type="time"
                        value={options.defaultTime}
                        onChange={(event) => {
                          setOptions({
                            ...options,
                            defaultTime: event.target.value,
                          });
                          changed();
                        }}
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      Default for missing platforms
                      <select
                        aria-label="Default for missing platforms"
                        className={inputClass}
                        value={options.defaultPlatform}
                        onChange={(event) => {
                          setOptions({
                            ...options,
                            defaultPlatform: event.target.value,
                          });
                          setEdits({});
                          changed();
                        }}
                      >
                        <option value="">Require a correction</option>
                        {IMPORT_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {platform}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs opacity-70 sm:col-span-2 lg:col-span-5">
                      The calendar displays dates in your browser timezone (
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}). The
                      preview below shows that same calendar date. Changing
                      column mappings or the default platform resets individual
                      edits.
                    </p>
                  </fieldset>
                  <details className="rounded-xl border border-current/15 p-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Review and correct field mappings
                    </summary>
                    <fieldset
                      disabled={readOnly}
                      className="mt-3 grid gap-3 sm:grid-cols-3"
                    >
                      {Object.entries(mapping).map(([header, field]) => (
                        <label key={header} className="space-y-1 text-xs">
                          {header}
                          <select
                            aria-label={`Map ${header}`}
                            className={inputClass}
                            value={field}
                            onChange={(event) => {
                              setMapping({
                                ...mapping,
                                [header]: event.target
                                  .value as ImportMapping[string],
                              });
                              setEdits({});
                              setKept(new Set());
                              changed();
                            }}
                          >
                            <option value="custom">Keep as custom field</option>
                            <option value="ignore">Ignore</option>
                            {IMPORT_FIELDS.map((value) => (
                              <option key={value} value={value}>
                                {labels[value]}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </fieldset>
                  </details>
                  <div className="space-y-3">
                    {assessed.map(
                      ({ row, issues, allExact, exactCount, possible }) => {
                        const selectedRow = !excluded.has(row.id) && !allExact;
                        const edit = (
                          field: keyof ImportRow,
                          value: string,
                        ) => {
                          setEdits({
                            ...edits,
                            [row.id]: { ...row, [field]: value },
                          });
                          setKept(new Set());
                          changed();
                        };
                        return (
                          <article
                            key={row.id}
                            className={`rounded-xl border p-4 ${issues.errors.length ? "border-red-400/50" : possible || issues.warnings.length ? "border-amber-400/40" : "border-current/15"}`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                aria-label={`Import ${row.contentIdea || row.source.slice(0, 80)}`}
                                checked={selectedRow}
                                disabled={readOnly || allExact}
                                onChange={() => {
                                  setExcluded(toggle(excluded, row.id));
                                  changed();
                                }}
                                className="mt-1"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="break-words font-medium">
                                  {row.contentIdea ||
                                    row.caption.slice(0, 100) ||
                                    "Untitled content item"}
                                </p>
                                <p className="mt-1 text-xs opacity-70 whitespace-pre-wrap break-words">
                                  {row.source}
                                </p>
                                <p className="mt-2 text-sm">
                                  {issues.iso
                                    ? new Date(issues.iso).toLocaleString()
                                    : row.date || "Missing date"}{" "}
                                  · {row.platform || "Missing platform"} ·{" "}
                                  {row.postType || "Missing format"}
                                </p>
                                {row.caption && (
                                  <p className="mt-2 whitespace-pre-wrap text-sm opacity-80">
                                    {row.caption}
                                  </p>
                                )}
                                {issues.local && (
                                  <p className="mt-2 text-xs opacity-60">
                                    Import time:{" "}
                                    {issues.local.replace("T", " ")} (
                                    {options.timezone})
                                  </p>
                                )}
                                {!!exactCount && (
                                  <p className="mt-2 text-sm text-amber-500">
                                    {exactCount} exact platform duplicate
                                    {exactCount === 1 ? "" : "s"} will be
                                    skipped.
                                  </p>
                                )}
                                {issues.errors.map((message, index) => (
                                  <p
                                    key={`e${index}`}
                                    className="mt-1 text-sm text-red-500"
                                  >
                                    {message}
                                  </p>
                                ))}
                                {issues.warnings.map((message, index) => (
                                  <p
                                    key={`w${index}`}
                                    className="mt-1 text-xs text-amber-500"
                                  >
                                    {message}
                                  </p>
                                ))}
                                {possible && (
                                  <label className="mt-3 flex items-start gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      disabled={readOnly}
                                      checked={kept.has(row.id)}
                                      onChange={() => {
                                        setKept(toggle(kept, row.id));
                                        changed();
                                      }}
                                    />
                                    Similar content already exists on this date.
                                    Keep this as an additional post.
                                  </label>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() =>
                                  setExpanded(
                                    expanded === row.id ? null : row.id,
                                  )
                                }
                                className="rounded-lg border border-current/20 px-3 py-2 text-xs"
                              >
                                {expanded === row.id
                                  ? "Hide fields"
                                  : "Edit fields"}
                              </button>
                            </div>
                            {expanded === row.id && (
                              <fieldset
                                disabled={readOnly}
                                className="mt-4 grid gap-3 border-t border-current/15 pt-4 sm:grid-cols-2"
                              >
                                {IMPORT_FIELDS.map((field) => (
                                  <label
                                    key={field}
                                    className={`space-y-1 text-xs ${["caption", "script", "notes"].includes(field) ? "sm:col-span-2" : ""}`}
                                  >
                                    {labels[field]}
                                    {[
                                      "caption",
                                      "script",
                                      "notes",
                                      "hook",
                                    ].includes(field) ? (
                                      <textarea
                                        aria-label={labels[field]}
                                        rows={3}
                                        className={inputClass}
                                        value={row[field]}
                                        onChange={(event) =>
                                          edit(field, event.target.value)
                                        }
                                      />
                                    ) : (
                                      <input
                                        aria-label={labels[field]}
                                        className={inputClass}
                                        value={row[field]}
                                        placeholder={
                                          field === "date"
                                            ? "YYYY-MM-DD"
                                            : field === "platform"
                                              ? "Instagram, LinkedIn"
                                              : undefined
                                        }
                                        onChange={(event) =>
                                          edit(field, event.target.value)
                                        }
                                      />
                                    )}
                                  </label>
                                ))}
                                {row.customFields.map((field, index) => (
                                  <label
                                    key={index}
                                    className="space-y-1 text-xs"
                                  >
                                    {field.label}
                                    <textarea
                                      aria-label={field.label}
                                      className={inputClass}
                                      value={field.value}
                                      onChange={(event) => {
                                        const fields = [...row.customFields];
                                        fields[index] = {
                                          ...field,
                                          value: event.target.value,
                                        };
                                        setEdits({
                                          ...edits,
                                          [row.id]: {
                                            ...row,
                                            customFields: fields,
                                          },
                                        });
                                        changed();
                                      }}
                                    />
                                  </label>
                                ))}
                              </fieldset>
                            )}
                          </article>
                        );
                      },
                    )}
                  </div>
                  <fieldset
                    disabled={readOnly}
                    className="space-y-3 rounded-xl border border-current/15 p-4 text-sm"
                  >
                    {hasApprovals && (
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={confirmApprovals}
                          onChange={(event) =>
                            setConfirmApprovals(event.target.checked)
                          }
                        />
                        I confirm the mapped approvals. Approved posts will be
                        locked after import.
                      </label>
                    )}
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={reviewed}
                        onChange={(event) => setReviewed(event.target.checked)}
                      />
                      I reviewed the selected posts, dates, field mappings, and
                      warnings.
                    </label>
                    <p className="opacity-70">
                      {selected.length}<>{" selected content items "}<UiSymbol name="right" />{" "}</>{postCount} new
                      platform posts. Publishing starts off. Media files can be
                      attached through the existing post editor.
                    </p>
                  </fieldset>
                  {retryPending && (
                    <p className="text-sm">
                      Confirmation may already have been saved. Retry uses the
                      same request and cannot import it twice.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void confirm()}
                    disabled={
                      busy ||
                      (!retryPending &&
                        (!selected.length ||
                          invalid ||
                          !reviewed ||
                          (hasApprovals && !confirmApprovals) ||
                          postCount > 500))
                    }
                    className="sticky bottom-3 z-10 min-h-12 w-full rounded-xl bg-[#2478FF] px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-[#1768E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2478FF] disabled:opacity-40 sm:w-auto"
                  >
                    {retryPending
                      ? "Retry confirmation / refresh"
                      : `Confirm import (${postCount} ${postCount === 1 ? "post" : "posts"})`}
                  </button>
                  {invalid && (
                    <p className="text-sm text-amber-500">
                      Correct the selected rows or exclude them before
                      confirming.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
