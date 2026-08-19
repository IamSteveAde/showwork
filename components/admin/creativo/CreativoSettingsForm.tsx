"use client";

import { useState } from "react";

const COLOR = { gold: "#F5C842", black: "#0A0A0A", charcoal: "#1A1A1A" };

export default function CreativoSettingsForm({ initialLabel }: { initialLabel: string | null }) {
  const [label, setLabel] = useState(initialLabel ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/creativo/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creativoMemberCountLabel: label }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
      <h2 className="mb-1 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
        Member count
      </h2>
      <p className="mb-4 text-xs text-white/30">
        Shown on the Creativo hero. A rough figure, not a live count — type whatever's currently honest, e.g. "50+ members."
      </p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. 50+ members"
          style={{ fontSize: "16px" }}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25"
        />
        <button
          onClick={save}
          disabled={saving}
          className="flex-shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: COLOR.gold, color: COLOR.black }}
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}