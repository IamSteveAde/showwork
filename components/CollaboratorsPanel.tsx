"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SearchResult {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
  avatarUrl: string | null;
}

interface InviteRow {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  createdAt: string;
}

interface CollaboratorRow {
  id: string;
  creator: { id: string; name: string | null; email: string; avatarUrl: string | null };
}

// The full collaboration panel — search-and-invite existing users,
// invite a raw email for anyone new, and manage everyone who's
// already on the project (pending invites and active collaborators).
// Self-contained: fetches its own data on mount, doesn't need
// anything passed in beyond the project id.
export default function CollaboratorsPanel({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invites`);
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites);
        setCollaborators(data.collaborators);
      }
    } finally {
      setLoadingList(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Debounced search — waits 300ms after typing stops before hitting
  // the API, so every keystroke doesn't fire its own request.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/creators/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const sendInvite = async (email: string) => {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      setSuccess(`Invite sent to ${email}`);
      setQuery("");
      setResults([]);
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/invites/${inviteId}`, { method: "DELETE" });
      if (res.ok) loadList();
    } catch {
      // silent — the list simply won't update, no need to alarm over a cancel failing
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!window.confirm("Remove this person from the project? They'll lose access, but their uploaded files stay.")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, { method: "DELETE" });
      if (res.ok) loadList();
    } catch {
      // silent, same reasoning as cancelInvite
    }
  };

  // A plain email typed in that doesn't look like it's selecting a
  // search result — lets someone invite an address with no account
  // at all, not just people search finds.
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
      <p className="mb-1 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
        Collaborators
      </p>
      <p className="mb-4 text-xs text-white/40">
        Invite someone to upload their own files on this project. They&apos;ll get their own email
        notified when a client leaves feedback on what they specifically uploaded.
      </p>

      {/* search / invite */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email, or type an email to invite"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
        />

        {(results.length > 0 || (looksLikeEmail && query.trim().length > 2)) && (
          <div
            className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-white/10"
            style={{ background: "#141414" }}
          >
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => sendInvite(r.email)}
                disabled={sending}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
                  style={{ background: "rgba(36,120,255,0.2)" }}
                >
                  {r.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (r.name || r.email)[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{r.name || r.email}</p>
                  <p className="truncate text-xs text-white/40">{r.companyName ? `${r.companyName} · ` : ""}{r.email}</p>
                </div>
              </button>
            ))}
            {looksLikeEmail && !results.some((r) => r.email.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                onClick={() => sendInvite(query.trim())}
                disabled={sending}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
                style={{ borderTop: results.length > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined }}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs" style={{ background: "rgba(255,255,255,0.06)" }}>
                  +
                </div>
                <p className="text-sm text-white/80">
                  Invite <strong className="text-white">{query.trim()}</strong> — no account yet
                </p>
              </button>
            )}
          </div>
        )}
        {searching && <p className="mt-1.5 text-xs text-white/30">Searching...</p>}
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
      {success && <p className="mb-3 text-xs" style={{ color: "#4ade80" }}>{success}</p>}

      {/* current collaborators + pending invites */}
      {loadingList ? (
        <p className="text-xs text-white/30">Loading...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {collaborators.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold text-white"
                  style={{ background: "rgba(36,120,255,0.2)" }}
                >
                  {c.creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.creator.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (c.creator.name || c.creator.email)[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-sm text-white/80">{c.creator.name || c.creator.email}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                  Active
                </span>
              </div>
              <button onClick={() => removeCollaborator(c.id)} className="text-xs text-white/30 transition-colors hover:text-red-400">
                Remove
              </button>
            </div>
          ))}
          {invites.filter((i) => i.status === "PENDING").map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-white/60">{i.email}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842" }}>
                  Pending
                </span>
              </div>
              <button onClick={() => cancelInvite(i.id)} className="text-xs text-white/30 transition-colors hover:text-red-400">
                Cancel
              </button>
            </div>
          ))}
          {collaborators.length === 0 && invites.filter((i) => i.status === "PENDING").length === 0 && (
            <p className="text-xs text-white/30">No collaborators yet — search or invite someone above.</p>
          )}
        </div>
      )}
    </div>
  );
}