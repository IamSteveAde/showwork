"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, Flame, Plus, RefreshCw, Search, Users, X } from "lucide-react";

type Lead = {
  id: string; name: string; username: string | null; email: string | null; phone: string | null; company: string | null;
  socialUserId?: string | null; socialPlatform?: string | null;
  temperature: "COLD" | "WARM" | "HOT"; status: "NEW" | "CONTACTED" | "QUALIFIED" | "CUSTOMER" | "LOST";
  source: "SOCIAL" | "MANUAL" | "IMPORT"; notes: string | null; createdAt: string; updatedAt: string;
};
type FormValues = Pick<Lead, "name" | "username" | "email" | "phone" | "company" | "temperature" | "status" | "notes">;
const EMPTY: FormValues = { name: "", username: "", email: "", phone: "", company: "", temperature: "WARM", status: "NEW", notes: "" };
const TEMPERATURES: Lead["temperature"][] = ["HOT", "WARM", "COLD"];
const STATUSES: Lead["status"][] = ["NEW", "CONTACTED", "QUALIFIED", "CUSTOMER", "LOST"];
const title = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export default function CalendarLeadsPanel({ calendarId, canEdit }: { calendarId: string; canEdit: boolean }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [temperatureFilter, setTemperatureFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);
  const endpoint = `/api/calendars/${encodeURIComponent(calendarId)}/leads`;

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load leads.");
      setLeads(result.leads);
      if (!quiet) setError("");
    } catch (err) { if (!quiet) setError(err instanceof Error ? err.message : "Could not load leads."); }
    finally { if (!quiet) setLoading(false); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const searchMatch = !query.trim() || [lead.name, lead.username, lead.socialPlatform, lead.email, lead.phone, lead.company].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()));
    return searchMatch && (!statusFilter || lead.status === statusFilter) && (!temperatureFilter || lead.temperature === temperatureFilter);
  }), [leads, query, statusFilter, temperatureFilter]);
  const hotCount = leads.filter((lead) => lead.temperature === "HOT" && lead.status !== "LOST" && lead.status !== "CUSTOMER").length;
  const activeCount = leads.filter((lead) => lead.status !== "LOST" && lead.status !== "CUSTOMER").length;
  const customers = leads.filter((lead) => lead.status === "CUSTOMER").length;
  const conversionRate = leads.length ? Math.round((customers / leads.length) * 100) : 0;

  function openForm(lead?: Lead) {
    setEditing(lead ?? null);
    setForm(lead ? { name: lead.name, username: lead.username || "", email: lead.email || "", phone: lead.phone || "", company: lead.company || "", temperature: lead.temperature, status: lead.status, notes: lead.notes || "" } : EMPTY);
    setError(""); setModalOpen(true);
  }

  async function saveLead(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(editing ? `${endpoint}/${encodeURIComponent(editing.id)}` : endpoint, {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this lead.");
      if (editing) setLeads((current) => current.map((lead) => lead.id === editing.id ? result.lead : lead));
      else { setNotice("Lead added."); await load(true); }
      setModalOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this lead."); }
    finally { setSaving(false); }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setSaving(true); setError(""); setNotice("");
    try {
      if (file.size > 2_000_000) throw new Error("CSV files must be under 2 MB.");
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("Add a header row and at least one lead to your CSV.");
      const headers = rows[0].map((value) => value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim());
      const column = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const nameIndex = column("name", "full name", "contact name");
      if (nameIndex < 0) throw new Error("The CSV needs a Name or Full Name column.");
      const usernameIndex = column("username", "social username", "handle", "social handle");
      const emailIndex = column("email", "email address");
      const phoneIndex = column("phone", "phone number", "mobile");
      const companyIndex = column("company", "organization", "organisation");
      const temperatureIndex = column("temperature", "lead temperature", "priority");
      const statusIndex = column("status", "lead status", "stage");
      const notesIndex = column("notes", "description");
      if (rows.length - 1 > 500) throw new Error("Import up to 500 leads per CSV.");
      const get = (row: string[], index: number) => index < 0 ? "" : row[index]?.trim() || "";
      const imported = rows.slice(1).map((row) => {
        const temperature = get(row, temperatureIndex).toUpperCase();
        const rawStatus = get(row, statusIndex).toUpperCase().replace(/[\s-]+/g, "_");
        const status = rawStatus === "CLOSED_WON" || rawStatus === "WON" ? "CUSTOMER" : rawStatus === "CLOSED_LOST" || rawStatus === "NOT_A_LEAD" ? "LOST" : rawStatus;
        return {
          name: get(row, nameIndex), username: get(row, usernameIndex), email: get(row, emailIndex), phone: get(row, phoneIndex), company: get(row, companyIndex), notes: get(row, notesIndex),
          temperature: temperature || "WARM",
          status: status || "NEW",
        };
      }).filter((lead) => lead.name);
      if (!imported.length) throw new Error("No rows with a name were found.");
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "IMPORT", leads: imported }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not import leads.");
      setNotice(`${result.created} lead${result.created === 1 ? "" : "s"} imported${result.skipped ? `; ${result.skipped} duplicate email${result.skipped === 1 ? "" : "s"} skipped` : ""}.`);
      await load(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not import this CSV."); }
    finally { setSaving(false); }
  }

  function exportCsv() {
    const header = ["Name", "Username", "Email", "Phone", "Company", "Temperature", "Status", "Source", "Notes", "Created", "Updated"];
    const rows = visibleLeads.map((lead) => [lead.name, lead.username, lead.email, lead.phone, lead.company, title(lead.temperature), title(lead.status), title(lead.source), lead.notes, lead.createdAt, lead.updatedAt]);
    const blob = new Blob([[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "showwork-leads.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <section className="space-y-5" aria-label="Leads">
    <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E3E8EF] bg-white p-5 sm:flex-row sm:items-center sm:p-6">
      <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#1768E8]">Lead management</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-[#101828]">Leads</h2><p className="mt-1 text-sm text-[#667085]">Organize contacts, qualify opportunities, and keep follow-up details in one place.</p></div>
      <div className="flex flex-wrap gap-2">{canEdit && <><button type="button" onClick={() => fileRef.current?.click()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#344054] disabled:opacity-60"><FileUp className="h-4 w-4" />Import CSV</button><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" /><button type="button" onClick={() => openForm()} className="inline-flex items-center gap-2 rounded-lg bg-[#1768E8] px-3.5 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Add lead</button></>}</div>
    </header>

    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{notice}</p>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Users} label="Active leads" value={activeCount} /><Metric icon={Flame} label="Hot opportunities" value={hotCount} accent /><Metric icon={Users} label="Converted customers" value={customers} /><Metric icon={Users} label="Lead conversion" value={`${conversionRate}%`} detail={`${customers} of ${leads.length} leads`} /></div>

    <div className="overflow-hidden rounded-2xl border border-[#DFE6EF] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#E9EDF3] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-1 flex-wrap gap-2"><label className="relative min-w-[210px] flex-1 sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, company" className="w-full rounded-lg border border-[#D0D5DD] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-400" /></label><select aria-label="Filter leads by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-xs"><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select><select aria-label="Filter leads by temperature" value={temperatureFilter} onChange={(event) => setTemperatureFilter(event.target.value)} className="rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-xs"><option value="">All temperatures</option>{TEMPERATURES.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></div><div className="flex items-center gap-2"><span className="text-[11px] text-[#667085]">{visibleLeads.length} lead{visibleLeads.length === 1 ? "" : "s"}</span><button type="button" onClick={exportCsv} disabled={!visibleLeads.length} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] px-3 py-2 text-xs font-semibold text-[#344054] disabled:opacity-50"><Download className="h-3.5 w-3.5" />Export CSV</button><button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh leads" className="rounded-lg border border-[#D0D5DD] p-2 text-[#667085] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div></div>
      {loading && !leads.length ? <div className="p-12 text-center text-sm text-[#667085]">Loading leads…</div> : visibleLeads.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-[#F8FAFC] text-[10px] font-bold uppercase tracking-wide text-[#667085]"><tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Temperature</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-[#EEF1F5]">{visibleLeads.map((lead) => { const platformName = lead.socialPlatform === "WHATSAPP" ? "WhatsApp" : lead.socialPlatform ? lead.socialPlatform.charAt(0) + lead.socialPlatform.slice(1).toLowerCase() : null; const socialLabel = lead.username ? `${platformName ? `${platformName} · ` : ""}${lead.socialPlatform === "WHATSAPP" ? "" : "@"}${lead.username}` : lead.socialUserId ? `${platformName || "Social"} ID: ${lead.socialUserId}` : null; return <tr key={lead.id} className="text-xs hover:bg-[#FBFCFE]"><td className="px-4 py-3"><p className="font-semibold text-[#101828]">{lead.name}</p><p className="mt-1 text-[10px] text-[#667085]">{[socialLabel, lead.email, lead.phone].filter(Boolean).join(" · ") || "No username, email, or phone added"}</p></td><td className="px-4 py-3 text-[#475467]">{lead.company || "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${lead.temperature === "HOT" ? "bg-rose-50 text-rose-700" : lead.temperature === "WARM" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{title(lead.temperature)}</span></td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{title(lead.status)}</span></td><td className="px-4 py-3 text-[#667085]">{title(lead.source)}</td><td className="px-4 py-3 text-[#667085]">{new Date(lead.updatedAt).toLocaleDateString()}</td><td className="px-4 py-3 text-right">{canEdit && <button type="button" onClick={() => openForm(lead)} className="rounded-lg border border-[#D0D5DD] px-3 py-1.5 text-[10px] font-semibold text-[#344054] hover:bg-slate-50">Edit</button>}</td></tr>; })}</tbody></table></div> : <div className="px-6 py-14 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-[#344054]">{leads.length ? "No leads match these filters" : "No leads yet"}</p><p className="mt-1 text-xs text-[#667085]">Add a contact, import a CSV, or capture a social conversation in Inbox.</p>{canEdit && !leads.length && <button type="button" onClick={() => openForm()} className="mt-4 rounded-lg bg-[#1768E8] px-4 py-2 text-xs font-semibold text-white">Add your first lead</button>}</div>}
    </div>

    {modalOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#101828]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form role="dialog" aria-modal="true" aria-labelledby="lead-dialog-title" onSubmit={saveLead} className="my-6 w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h3 id="lead-dialog-title" className="text-lg font-semibold text-[#101828]">{editing ? "Edit lead" : "Add a lead"}</h3><p className="mt-1 text-xs text-[#667085]">Contact details, qualification, and pipeline stage.</p></div><button type="button" aria-label="Close" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-[#667085] hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Name *" value={form.name} onChange={(name) => setForm({ ...form, name })} required /><Field label="Username or social handle" value={form.username || ""} onChange={(username) => setForm({ ...form, username })} /><Field label="Email" type="email" value={form.email || ""} onChange={(email) => setForm({ ...form, email })} /><Field label="Phone" type="tel" value={form.phone || ""} onChange={(phone) => setForm({ ...form, phone })} /><Field label="Company" value={form.company || ""} onChange={(company) => setForm({ ...form, company })} /><label className="text-[11px] font-semibold text-[#475467]">Temperature<select value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value as Lead["temperature"] })} className="mt-1.5 block w-full rounded-lg border border-[#D0D5DD] bg-white px-3 py-2.5 text-xs">{TEMPERATURES.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label><label className="text-[11px] font-semibold text-[#475467]">Pipeline status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Lead["status"] })} className="mt-1.5 block w-full rounded-lg border border-[#D0D5DD] bg-white px-3 py-2.5 text-xs">{STATUSES.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label><label className="text-[11px] font-semibold text-[#475467] sm:col-span-2">Notes<textarea rows={3} value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-xs" /></label></div>{error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-[#D0D5DD] px-4 py-2.5 text-xs font-semibold text-[#344054]">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-[#1768E8] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editing ? "Save changes" : "Add lead"}</button></div></form></div>}
  </section>;
}

function Metric({ icon: Icon, label, value, accent = false, detail }: { icon: typeof Users; label: string; value: number | string; accent?: boolean; detail?: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-[#E5EAF1] bg-white p-4"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-700"}`}><Icon className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold text-[#667085]">{label}</p><p className="mt-0.5 text-xl font-semibold text-[#101828]">{value}</p>{detail && <p className="text-[9px] text-[#98A2B3]">{detail}</p>}</div></div>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-[11px] font-semibold text-[#475467]">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-xs outline-none focus:border-blue-400" /></label>;
}
