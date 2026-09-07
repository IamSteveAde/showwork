"use client";

import { useState } from "react";

type Role = "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";

const ROLES: { value: Role; label: string; description: string; color: string; icon: string }[] = [
  {
    value: "VIEW_ONLY",
    label: "View only",
    description: "Can see the calendar and its content, but can't make any changes.",
    color: "#888786",
    icon: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z",
  },
  {
    value: "ADD_CONTENT",
    label: "Add content",
    description: "Can also upload images and videos to planned posts — the usual role for a designer or content creator.",
    color: "#2478FF",
    icon: "M12 16V4M7.5 8.5 12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  },
  {
    value: "EDIT_CALENDAR",
    label: "Edit calendar",
    description: "Can also create, edit, and delete posts, and edit the calendar itself.",
    color: "#F97316",
    icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  },
];

export default function InviteCollaboratorForm({ calendarId }: { calendarId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("ADD_CONTENT");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/calendars/${calendarId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    if (res.ok) {
      setSent(true);
      setEmail("");
      setRole("ADD_CONTENT");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to send invite");
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold underline" style={{ color: "#2478FF" }}>
        + Invite a designer or content creator
      </button>
    );
  }

  const selectedMeta = ROLES.find((r) => r.value === role)!;

  return (
    <div className="flex flex-col gap-4 rounded-xl p-5" style={{ background: "#1A1A1A" }}>
      <p className="text-sm font-semibold text-white">Invite a collaborator</p>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          style={{ fontSize: "16px" }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Permission level
        </label>
        <div className="flex flex-col gap-2">
          {ROLES.map((r) => {
            const selected = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors"
                style={{
                  borderColor: selected ? r.color : "rgba(255,255,255,0.1)",
                  background: selected ? `${r.color}14` : "rgba(255,255,255,0.03)",
                }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${r.color}20`, color: r.color }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d={r.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{r.label}</span>
                    {selected && (
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
                        style={{ background: r.color, color: "#fff" }}
                      >
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">{r.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {role === "EDIT_CALENDAR" && (
          <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border p-3" style={{ background: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.2)" }}>
            <span className="mt-0.5 text-sm" style={{ color: "#F97316" }}>⚠</span>
            <p className="text-xs leading-relaxed text-orange-200/80">
              This is the highest permission level. This person will be able to delete posts and edit the calendar's own details — changes that can't be undone. Only give this to someone you fully trust.
            </p>
          </div>
        )}
      </div>

      {sent && <p className="text-xs" style={{ color: "#4ade80" }}>Invite sent as {selectedMeta.label}.</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={loading || !email.trim()}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
        >
          {loading ? "Sending..." : "Send invite"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-white/40 underline">
          Close
        </button>
      </div>
    </div>
  );
}