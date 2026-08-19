"use client";

import { useState } from "react";

const COLOR = { gold: "#F5C842", black: "#0A0A0A", charcoal: "#1A1A1A" };
const CATEGORIES = ["Photography", "Videography", "Motion", "Editing"];

interface LeaderboardEntry {
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

function monthInputValue(periodDate: string): string {
  const d = new Date(periodDate);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const emptyForm = {
  name: "",
  profileImageUrl: "",
  category: CATEGORIES[0],
  whatTheyDo: "",
  contact: "",
  portfolioUrl: "",
  whatsappNumber: "",
  wonFor: "",
  points: 0,
  periodDate: monthInputValue(new Date().toISOString()) + "-01",
};

export default function CreativoLeaderboardManager({ initialEntries }: { initialEntries: LeaderboardEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setAdding(true);
  };

  const startEdit = (entry: LeaderboardEntry) => {
    setForm({
      name: entry.name,
      profileImageUrl: entry.profileImageUrl ?? "",
      category: entry.category,
      whatTheyDo: entry.whatTheyDo ?? "",
      contact: entry.contact ?? "",
      portfolioUrl: entry.portfolioUrl ?? "",
      whatsappNumber: entry.whatsappNumber ?? "",
      wonFor: entry.wonFor,
      points: entry.points,
      periodDate: monthInputValue(entry.periodDate) + "-01",
    });
    setEditingId(entry.id);
    setAdding(true);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
    setUploadError(null);
    setSaveError(null);
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const presignRes = await fetch("/api/admin/creativo/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || "Failed to start upload");

      const putRes = await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`);

      setForm((f) => ({ ...f, profileImageUrl: presignData.publicUrl }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed — try again");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setSaveError(null);
    const body = { ...form, points: Number(form.points) };
    let ok = false;
    if (editingId) {
      const res = await fetch(`/api/admin/creativo/leaderboard/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setEntries((prev) => prev.map((e) => (e.id === editingId ? data.entry : e)));
        ok = true;
      } else {
        setSaveError(data.error || `Save failed (${res.status})`);
      }
    } else {
      const res = await fetch("/api/admin/creativo/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setEntries((prev) => [data.entry, ...prev]);
        ok = true;
      } else {
        setSaveError(data.error || `Save failed (${res.status})`);
      }
    }
    setSaving(false);
    // Only clear the form on genuine success — a failed save keeps
    // whatever the admin typed on screen instead of silently
    // discarding it along with the error.
    if (ok) cancel();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this leaderboard entry?")) return;
    await fetch(`/api/admin/creativo/leaderboard/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-white/40";

  return (
    <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Leaderboard
          </h2>
          <p className="mt-1 text-xs text-white/30">
            A category with no entry for a given month just shows as empty on the public page — nothing needs to be filled in to keep it honest.
          </p>
        </div>
        {!adding && (
          <button onClick={startAdd} className="rounded-lg px-4 py-2 text-xs font-semibold" style={{ background: COLOR.gold, color: COLOR.black }}>
            + Add entry
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-6 flex flex-col gap-4 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ fontSize: "16px" }} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: COLOR.black }}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Won for</label>
              <input type="text" placeholder="e.g. Best wedding series" value={form.wonFor} onChange={(e) => setForm({ ...form, wonFor: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Points / votes</label>
              <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>What they do</label>
              <input type="text" placeholder="e.g. Wedding photographer" value={form.whatTheyDo} onChange={(e) => setForm({ ...form, whatTheyDo: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact</label>
              <input type="text" placeholder="Email, phone, or handle" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Portfolio link <span className="normal-case text-white/25">(shown on the public page)</span></label>
              <input type="url" placeholder="https://" value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>WhatsApp number <span className="normal-case text-white/25">(for the "work with them" button)</span></label>
              <input type="text" placeholder="e.g. 2348012345678" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Month this entry is for</label>
              <input type="month" value={form.periodDate.slice(0, 7)} onChange={(e) => setForm({ ...form, periodDate: e.target.value + "-01" })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Profile photo</label>
              <div className="flex items-center gap-3">
                {form.profileImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.profileImageUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                )}
                <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-center text-xs text-white/50 hover:border-white/25">
                  {uploading ? "Uploading..." : form.profileImageUrl ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(file);
                    }}
                  />
                </label>
              </div>
              {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
            </div>
          </div>
          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={saving} className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50" style={{ background: COLOR.gold, color: COLOR.black }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add entry"}
            </button>
            <button onClick={cancel} className="text-xs text-white/40 hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entries.length === 0 && <p className="text-sm text-white/30">No entries yet.</p>}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex min-w-0 items-center gap-3">
              {entry.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.profileImageUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 flex-shrink-0 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{entry.name}</p>
                <p className="truncate text-xs text-white/40">
                  {entry.category} · {entry.wonFor} · {entry.points} pts · {monthInputValue(entry.periodDate)}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <button onClick={() => startEdit(entry)} className="text-xs font-semibold" style={{ color: COLOR.gold }}>Edit</button>
              <button onClick={() => remove(entry.id)} className="text-xs text-white/30 hover:text-red-400">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}