"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SectionHeader({
  sectionId,
  name,
  fileCount,
}: {
  sectionId: string;
  name: string;
  fileCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!value.trim() || value.trim() === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    await fetch(`/api/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  if (editing) {
    return (
      <div className="mb-4 flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          style={{ fontSize: "16px" }}
          className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white outline-none"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: "#F5C842", color: "#0A0A0A" }}
        >
          {saving ? "..." : "Save"}
        </button>
        <button onClick={() => { setEditing(false); setValue(name); }} className="text-xs text-white/40 underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.05em" }}>
        {name} ({fileCount})
      </h2>
      <button
        onClick={() => setEditing(true)}
        aria-label="Rename section"
        className="text-xs text-white/30 underline hover:text-white/60"
      >
        Rename
      </button>
    </div>
  );
}