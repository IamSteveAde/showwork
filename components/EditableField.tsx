"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// A click-to-edit field for a single project property (name, access
// code) — shown as plain text/pill until clicked, then swaps to an
// input with save/cancel. Saves via PATCH /api/projects/[id] and
// refreshes the page on success so every other place that reads this
// value (client-facing delivery, admin, etc.) reflects the change
// immediately rather than needing a manual reload.
export default function EditableField({
  projectId,
  field,
  value,
  displayClassName,
  displayStyle,
  inputClassName,
  monospace = false,
}: {
  projectId: string;
  field: "clientName" | "accessCode";
  value: string;
  displayClassName?: string;
  displayStyle?: React.CSSProperties;
  inputClassName?: string;
  monospace?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Can't be empty");
      return;
    }
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className={`group inline-flex items-center gap-2 text-left ${displayClassName ?? ""}`}
        style={displayStyle}
      >
        <span>{value}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="opacity-0 transition-opacity group-hover:opacity-50"
        >
          <path d="M9.5 1.5l3 3L4 13H1v-3l8.5-8.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1.5">
      <div className="inline-flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          disabled={saving}
          className={inputClassName ?? "rounded-md px-3 py-1.5 text-sm text-white"}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            fontFamily: monospace ? "monospace" : undefined,
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: "#F5C842", color: "#0A0A0A" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-white/50 transition-colors hover:text-white"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}