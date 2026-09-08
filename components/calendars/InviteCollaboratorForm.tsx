"use client";

import { useState, useEffect, useCallback } from "react";

type Role = "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";

interface CollaboratorRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
}

interface PendingInviteRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
}

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

function roleLabel(role: Role): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}
function roleColor(role: Role): string {
  return ROLES.find((r) => r.value === role)?.color ?? "#888786";
}

export default function InviteCollaboratorForm({ calendarId }: { calendarId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("ADD_CONTENT");
  const [loading, setLoading] = useState(false);
  // Captures the role actually sent with the invite that just
  // succeeded — kept separate from the form's own `role` state so
  // resetting the form for the next invite can't ever change what
  // this confirmation message says. This is the fix for the bug
  // where every confirmation showed "Add content" regardless of what
  // was actually selected.
  const [sentRole, setSentRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInviteRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/invites`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators ?? []);
        setPendingInvites(data.pendingInvites ?? []);
      }
    } finally {
      setLoadingList(false);
    }
  }, [calendarId]);

  useEffect(() => {
    if (open) loadPeople();
  }, [open, loadPeople]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setSentRole(null);
    const res = await fetch(`/api/calendars/${calendarId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    if (res.ok) {
      const data = await res.json();
      // Uses the server's confirmed role for the message, not just
      // the local `role` value, so what's shown always matches what
      // was actually saved.
      setSentRole((data.role as Role) ?? role);
      setEmail("");
      setRole("ADD_CONTENT");
      loadPeople();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to send invite");
    }
    setLoading(false);
  };

  const revokeInvite = async (inviteId: string) => {
    setRemovingId(inviteId);
    const res = await fetch(`/api/calendars/${calendarId}/invites/${inviteId}`, { method: "DELETE" });
    if (res.ok) {
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
    setRemovingId(null);
  };

  const removeCollaborator = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);
    const res = await fetch(`/api/calendars/${calendarId}/collaborators/${collaboratorId}`, { method: "DELETE" });
    if (res.ok) {
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
    }
    setRemovingId(null);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold underline" style={{ color: "#2478FF" }}>
        + Invite a designer or content creator
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl p-5" style={{ background: "#1A1A1A" }}>
      <div>
        <p className="mb-3 text-sm font-semibold text-white">Invite a collaborator</p>

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

        <div className="mt-4">
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
                This is the highest permission level. This person will be able to delete posts and edit the calendar&apos;s own details — changes that can&apos;t be undone. Only give this to someone you fully trust.
              </p>
            </div>
          )}
        </div>

        {sentRole && (
          <p className="mt-3 text-xs" style={{ color: "#4ade80" }}>
            Invite sent as {roleLabel(sentRole)}.
          </p>
        )}
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
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

      {/* People already added — accepted collaborators and anyone
          still waiting on an invite they haven't opened yet. */}
      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          People on this calendar
        </p>

        {loadingList ? (
          <p className="text-xs text-white/30">Loading...</p>
        ) : collaborators.length === 0 && pendingInvites.length === 0 ? (
          <p className="text-xs text-white/30">Nobody&apos;s been added yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {collaborators.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{c.name || c.email}</p>
                  <p className="truncate text-xs text-white/40">{c.email}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${roleColor(c.role)}20`, color: roleColor(c.role) }}
                  >
                    {roleLabel(c.role)}
                  </span>
                  <button
                    onClick={() => removeCollaborator(c.id)}
                    disabled={removingId === c.id}
                    className="text-xs text-red-400 underline disabled:opacity-50"
                  >
                    {removingId === c.id ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}

            {pendingInvites.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{i.email}</p>
                  <p className="text-xs text-white/40">Invite pending — not accepted yet</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${roleColor(i.role)}20`, color: roleColor(i.role) }}
                  >
                    {roleLabel(i.role)}
                  </span>
                  <button
                    onClick={() => revokeInvite(i.id)}
                    disabled={removingId === i.id}
                    className="text-xs text-red-400 underline disabled:opacity-50"
                  >
                    {removingId === i.id ? "..." : "Revoke"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}