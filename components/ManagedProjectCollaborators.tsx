"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
  avatarUrl: string | null;
}
interface CollaboratorRow {
  id: string;
  creator: { id: string; name: string | null; email: string; avatarUrl: string | null };
}

// Search-and-add for existing Showwork accounts — no email-invite
// step here, unlike the delivery collaboration system, since managed-
// project collaborators are expected to already have accounts.
export default function ManagedProjectCollaborators({
  managedProjectId,
  isOwner,
  onCollaboratorsChange,
}: {
  managedProjectId: string;
  isOwner: boolean;
  onCollaboratorsChange?: (collaborators: CollaboratorRow[]) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/managed-projects/${managedProjectId}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators);
        onCollaboratorsChange?.(data.collaborators);
      }
    } finally {
      setLoadingList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedProjectId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/creators/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addCollaborator = async (creatorId: string) => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/managed-projects/${managedProjectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setQuery("");
      setResults([]);
      loadList();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!window.confirm("Remove this person from the project? Tasks already assigned to them stay assigned.")) return;
    const res = await fetch(`/api/managed-projects/${managedProjectId}/collaborators/${collaboratorId}`, { method: "DELETE" });
    if (res.ok) {
      loadList();
      router.refresh();
    }
  };

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
      <p className="mb-4 text-sm font-semibold text-white">Collaborators</p>

      {isOwner && (
        <div className="relative mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email to add someone"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/25"
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-white/10" style={{ background: "#141414" }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addCollaborator(r.id)}
                  disabled={adding}
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
                    <p className="truncate text-xs text-white/40">{r.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {loadingList ? (
        <p className="text-xs text-white/30">Loading...</p>
      ) : collaborators.length === 0 ? (
        <p className="text-xs text-white/30">No collaborators yet.</p>
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
              </div>
              {isOwner && (
                <button onClick={() => removeCollaborator(c.id)} className="text-xs text-white/30 transition-colors hover:text-red-400">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}