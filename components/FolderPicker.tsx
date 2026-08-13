"use client";

import { useState, useEffect, useCallback } from "react";

interface FolderOption {
  id: string;
  name: string;
  _count?: { media?: number; assets?: number };
}

// A shared folder picker — used identically for delivery sections and
// task uploads, since both follow the same REST shape (GET to list,
// POST {name} to create). Shows "No folder" plus every existing
// folder, and an inline "+ New folder" flow that creates one and
// immediately selects it, without leaving the upload flow to do it
// somewhere else first.
export default function FolderPicker({
  listUrl,
  createUrl,
  selectedFolderId,
  onSelect,
  disabled,
}: {
  listUrl: string;
  createUrl: string;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  disabled?: boolean;
}) {
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(listUrl);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders);
      }
    } finally {
      setLoading(false);
    }
  }, [listUrl]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setError(null);
    try {
      const res = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create folder");
      setFolders((prev) => [...prev, data.folder]);
      onSelect(data.folder.id);
      setNewFolderName("");
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (loading) return null;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
        Folder <span className="normal-case text-white/25">(optional)</span>
      </label>

      {creating ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
            placeholder="e.g. Sonos Campaign"
            style={{ fontSize: "16px" }}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
          <button
            onClick={createFolder}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
          >
            Add
          </button>
          <button onClick={() => { setCreating(false); setNewFolderName(""); }} className="text-xs text-white/40 underline">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selectedFolderId ?? ""}
            onChange={(e) => onSelect(e.target.value || null)}
            disabled={disabled}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25 disabled:opacity-50"
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f._count?.media ?? f._count?.assets ?? 0})
              </option>
            ))}
          </select>
          <button
            onClick={() => setCreating(true)}
            disabled={disabled}
            className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            + New folder
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}