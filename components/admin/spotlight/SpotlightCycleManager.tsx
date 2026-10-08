"use client";

import { IMAGE_FILE_ACCEPT, getFileContentType } from "@/lib/mediaFileTypes";

import { useState } from "react";
import { putFileWithProgress } from "@/lib/uploadClient";

const COLOR = { gold: "#2563EB", black: "#F6F8FB", charcoal: "#FFFFFF" };

interface Cycle {
  id: string;
  monthLabel: string;
  heroImageUrl: string | null;
  heroHeadline: string | null;
  heroDescription: string | null;
  submissionOpensAt: string;
  submissionDeadline: string;
  isActive: boolean;
  _count: { submissions: number };
}

function datetimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  monthLabel: "",
  heroImageUrl: "",
  heroHeadline: "",
  heroDescription: "",
  submissionOpensAt: "",
  submissionDeadline: "",
};

export default function SpotlightCycleManager({ initialCycles }: { initialCycles: Cycle[] }) {
  const [cycles, setCycles] = useState(initialCycles);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setAdding(true);
  };

  const startEdit = (cycle: Cycle) => {
    setForm({
      monthLabel: cycle.monthLabel,
      heroImageUrl: cycle.heroImageUrl ?? "",
      heroHeadline: cycle.heroHeadline ?? "",
      heroDescription: cycle.heroDescription ?? "",
      submissionOpensAt: datetimeInputValue(cycle.submissionOpensAt),
      submissionDeadline: datetimeInputValue(cycle.submissionDeadline),
    });
    setEditingId(cycle.id);
    setAdding(true);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const uploadHeroImage = async (file: File) => {
    setUploading(true);
    setUploadPercent(0);
    setError(null);
    try {
      const presignRes = await fetch("/api/admin/spotlight/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: getFileContentType(file) }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || "Upload failed");

      await putFileWithProgress(presignData.uploadUrl, file, { contentType: getFileContentType(file), onProgress: ({ percent }) => setUploadPercent(percent) });

      setForm((f) => ({ ...f, heroImageUrl: presignData.publicUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.monthLabel.trim() || !form.submissionOpensAt || !form.submissionDeadline) {
      setError("Month label, open date, and deadline are all required");
      return;
    }
    setSaving(true);
    setError(null);

    const res = editingId
      ? await fetch(`/api/admin/spotlight/cycles/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/admin/spotlight/cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

    const data = await res.json();
    if (res.ok) {
      if (editingId) {
        setCycles((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...data.cycle } : c)));
      } else {
        setCycles((prev) => [{ ...data.cycle, _count: { submissions: 0 } }, ...prev]);
      }
      cancel();
    } else {
      setError(data.error ?? "Couldn't save this cycle");
      setSaving(false);
    }
  };

  const toggleActive = async (cycle: Cycle) => {
    const res = await fetch(`/api/admin/spotlight/cycles/${cycle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cycle.isActive }),
    });
    if (res.ok) {
      // Activating one deactivates every other cycle on the server —
      // reflected here by marking every other cycle inactive locally
      // too, so the UI doesn't show two "Active" badges until the
      // next full reload.
      setCycles((prev) =>
        prev.map((c) => (c.id === cycle.id ? { ...c, isActive: !cycle.isActive } : { ...c, isActive: cycle.isActive ? c.isActive : false }))
      );
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this cycle and all its submissions? This can't be undone.")) return;
    await fetch(`/api/admin/spotlight/cycles/${id}`, { method: "DELETE" });
    setCycles((prev) => prev.filter((c) => c.id !== id));
  };

  const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-200";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-slate-500";

  return (
    <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal, border: "1px solid #E2E8F0" }}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500" style={{ letterSpacing: "0.08em" }}>
            Spotlight cycles
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Only one cycle can be active at a time — activating one automatically deactivates whichever was active before.
          </p>
        </div>
        {!adding && (
          <button onClick={startAdd} className="rounded-lg px-4 py-2 text-xs font-semibold" style={{ background: COLOR.gold, color: "#FFFFFF" }}>
            + New cycle
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-6 flex flex-col gap-4 rounded-xl p-5" style={{ background: "#F8FAFC" }}>
          <div>
            <label className={labelClass}>Month label</label>
            <input type="text" placeholder="e.g. August 2026" value={form.monthLabel} onChange={(e) => setForm({ ...form, monthLabel: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Submissions open</label>
              <input type="datetime-local" value={form.submissionOpensAt} onChange={(e) => setForm({ ...form, submissionOpensAt: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Submission deadline</label>
              <input type="datetime-local" value={form.submissionDeadline} onChange={(e) => setForm({ ...form, submissionDeadline: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Hero headline <span className="normal-case text-slate-500">(optional — leave blank to keep the default)</span></label>
            <input type="text" value={form.heroHeadline} onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Hero description <span className="normal-case text-slate-500">(optional)</span></label>
            <textarea rows={2} value={form.heroDescription} onChange={(e) => setForm({ ...form, heroDescription: e.target.value })} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>Hero background image <span className="normal-case text-slate-500">(optional)</span></label>
            <div className="flex items-center gap-3">
              {form.heroImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.heroImageUrl} alt="" className="h-14 w-24 flex-shrink-0 rounded-md object-cover" />
              )}
              <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-500 hover:border-slate-200">
                {uploading ? `Uploading ${uploadPercent}%` : form.heroImageUrl ? "Change image" : "Upload image"}
                <input
                  type="file"
                  accept={IMAGE_FILE_ACCEPT}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (file) uploadHeroImage(file);
                  }}
                />
              </label>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={saving} className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50" style={{ background: COLOR.gold, color: "#FFFFFF" }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create cycle"}
            </button>
            <button onClick={cancel} className="text-xs text-slate-500 hover:text-slate-900">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {cycles.length === 0 && <p className="text-sm text-slate-500">No cycles yet.</p>}
        {cycles.map((cycle) => (
          <div key={cycle.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "#F8FAFC" }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-900">{cycle.monthLabel}</p>
                {cycle.isActive && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(74,222,128,0.15)", color: "#15803D" }}>
                    Active
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-500">
                {cycle._count.submissions} submission{cycle._count.submissions === 1 ? "" : "s"} · closes {new Date(cycle.submissionDeadline).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <button onClick={() => toggleActive(cycle)} className="text-xs font-semibold" style={{ color: cycle.isActive ? "#F87171" : "#15803D" }}>
                {cycle.isActive ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => startEdit(cycle)} className="text-xs font-semibold" style={{ color: COLOR.gold }}>Edit</button>
              <button onClick={() => remove(cycle.id)} className="text-xs text-slate-500 hover:text-red-400">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
