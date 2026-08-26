"use client";

import { useState } from "react";

const COLOR = { gold: "#F5C842", black: "#0A0A0A", charcoal: "#1A1A1A" };

interface Webinar {
  id: string;
  slug: string;
  flyerImageUrl: string | null;
  topic: string;
  description: string | null;
  whatToExpect: string | null;
  guests: string | null;
  startsAt: string;
  venue: string | null;
  applyUrl: string | null;
  replayUrl: string | null;
}

interface Rsvp {
  id: string;
  name: string;
  email: string;
  whatsappNumber: string;
  field: string;
  joinedCommunity: boolean;
  createdAt: string;
}

function datetimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  flyerImageUrl: "",
  topic: "",
  description: "",
  whatToExpect: "",
  guests: "",
  startsAt: "",
  venue: "",
  applyUrl: "",
  replayUrl: "",
};

export default function CreativoWebinarManager({ initialWebinars }: { initialWebinars: Webinar[] }) {
  const [webinars, setWebinars] = useState(initialWebinars);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expandedWebinarId, setExpandedWebinarId] = useState<string | null>(null);
  const [rsvpsByWebinar, setRsvpsByWebinar] = useState<Record<string, Rsvp[]>>({});
  const [loadingRsvps, setLoadingRsvps] = useState(false);

  const startAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setAdding(true);
  };

  const startEdit = (w: Webinar) => {
    setForm({
      flyerImageUrl: w.flyerImageUrl ?? "",
      topic: w.topic,
      description: w.description ?? "",
      whatToExpect: w.whatToExpect ?? "",
      guests: w.guests ?? "",
      startsAt: datetimeInputValue(w.startsAt),
      venue: w.venue ?? "",
      applyUrl: w.applyUrl ?? "",
      replayUrl: w.replayUrl ?? "",
    });
    setEditingId(w.id);
    setAdding(true);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const uploadFlyer = async (file: File) => {
    setUploading(true);
    try {
      const presignRes = await fetch("/api/admin/creativo/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error);
      await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setForm((f) => ({ ...f, flyerImageUrl: presignData.publicUrl }));
    } catch {
      // upload failures leave the field blank — the admin can retry
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    if (editingId) {
      const res = await fetch(`/api/admin/creativo/webinars/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) setWebinars((prev) => prev.map((w) => (w.id === editingId ? data.webinar : w)));
    } else {
      const res = await fetch("/api/admin/creativo/webinars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) setWebinars((prev) => [data.webinar, ...prev]);
    }
    setSaving(false);
    cancel();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this webinar?")) return;
    await fetch(`/api/admin/creativo/webinars/${id}`, { method: "DELETE" });
    setWebinars((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleRsvps = async (id: string) => {
    if (expandedWebinarId === id) {
      setExpandedWebinarId(null);
      return;
    }
    setExpandedWebinarId(id);
    if (!rsvpsByWebinar[id]) {
      setLoadingRsvps(true);
      const res = await fetch(`/api/admin/creativo/webinars/${id}/rsvps`);
      const data = await res.json();
      if (res.ok) setRsvpsByWebinar((prev) => ({ ...prev, [id]: data.rsvps }));
      setLoadingRsvps(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-white/40";

  return (
    <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Webinars
          </h2>
          <p className="mt-1 text-xs text-white/30">
            Upcoming / past is never set by hand — the public page computes it from the date and time below, automatically, the moment it passes.
          </p>
        </div>
        {!adding && (
          <button onClick={startAdd} className="rounded-lg px-4 py-2 text-xs font-semibold" style={{ background: COLOR.gold, color: COLOR.black }}>
            + Add webinar
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-6 flex flex-col gap-4 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div>
            <label className={labelClass}>Flyer <span className="normal-case text-white/25">(recommended 1080×1350px, portrait)</span></label>
            <div className="flex items-center gap-3">
              {form.flyerImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.flyerImageUrl} alt="" className="h-16 w-12 flex-shrink-0 rounded-md object-cover" />
              )}
              <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-center text-xs text-white/50 hover:border-white/25">
                {uploading ? "Uploading..." : form.flyerImageUrl ? "Change flyer" : "Upload flyer"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFlyer(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Topic</label>
              <input type="text" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description <span className="normal-case text-white/25">(shown on the webinar's own landing page)</span></label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>What to expect <span className="normal-case text-white/25">(one point per line — shown as a bullet list)</span></label>
              <textarea rows={4} value={form.whatToExpect} onChange={(e) => setForm({ ...form, whatToExpect: e.target.value })} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} placeholder={"e.g.\nHow to price your first client project\nLive Q&A with the panel"} />
            </div>
            <div>
              <label className={labelClass}>Guests</label>
              <input type="text" placeholder="One or more names" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date & time</label>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Venue</label>
              <input type="text" placeholder="Physical location, or Online" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Meeting link <span className="normal-case text-white/25">(emailed to everyone who RSVPs)</span></label>
              <input type="url" placeholder="https://" value={form.applyUrl} onChange={(e) => setForm({ ...form, applyUrl: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Replay link <span className="normal-case text-white/25">(add once available, after it's happened)</span></label>
              <input type="url" placeholder="https://" value={form.replayUrl} onChange={(e) => setForm({ ...form, replayUrl: e.target.value })} style={{ fontSize: "16px" }} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={saving} className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50" style={{ background: COLOR.gold, color: COLOR.black }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add webinar"}
            </button>
            <button onClick={cancel} className="text-xs text-white/40 hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {webinars.length === 0 && <p className="text-sm text-white/30">No webinars yet.</p>}
        {webinars.map((w) => {
          const isPast = new Date(w.startsAt) < new Date();
          const isExpanded = expandedWebinarId === w.id;
          const rsvps = rsvpsByWebinar[w.id];

          return (
            <div key={w.id} className="rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {w.flyerImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.flyerImageUrl} alt="" className="h-11 w-9 flex-shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-11 w-9 flex-shrink-0 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{w.topic}</p>
                    <p className="truncate text-xs text-white/40">
                      {new Date(w.startsAt).toLocaleString()} · {isPast ? "Past" : "Upcoming"}
                    </p>
                    <a href={`/webinars/${w.slug}`} target="_blank" rel="noopener noreferrer" className="truncate text-xs underline" style={{ color: "#68B2FF" }}>
                      /webinars/{w.slug}
                    </a>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <button onClick={() => toggleRsvps(w.id)} className="text-xs font-semibold" style={{ color: "#68B2FF" }}>
                    {isExpanded ? "Hide RSVPs" : "View RSVPs"}
                  </button>
                  <button onClick={() => startEdit(w)} className="text-xs font-semibold" style={{ color: COLOR.gold }}>Edit</button>
                  <button onClick={() => remove(w.id)} className="text-xs text-white/30 hover:text-red-400">Remove</button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-white/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-white/50">
                      {rsvps ? `${rsvps.length} RSVP${rsvps.length === 1 ? "" : "s"}` : "Loading..."}
                    </p>
                    {rsvps && rsvps.length > 0 && (
                      <a
                        href={`/api/admin/creativo/webinars/${w.id}/rsvps/export`}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
                      >
                        Export CSV
                      </a>
                    )}
                  </div>

                  {loadingRsvps && !rsvps ? (
                    <p className="text-xs text-white/30">Loading RSVPs...</p>
                  ) : rsvps && rsvps.length === 0 ? (
                    <p className="text-xs text-white/30">No RSVPs yet for this webinar.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {rsvps?.map((r) => (
                        <div key={r.id} className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white">{r.name}</span>
                            <span className="text-white/30">·</span>
                            <span className="text-white/50">{r.field}</span>
                            {r.joinedCommunity && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80" }}>
                                In community
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-white/40">{r.email} · {r.whatsappNumber}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}