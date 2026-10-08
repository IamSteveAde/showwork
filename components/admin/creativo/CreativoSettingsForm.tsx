"use client";

import UiSymbol from "@/components/ui/UiSymbol";
import { useState } from "react";

const COLOR = { gold: "#2563EB", black: "#F6F8FB", charcoal: "#FFFFFF" };

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
    <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal, border: "1px solid #E2E8F0" }}>
      <h2 className="mb-1 text-sm font-semibold uppercase text-slate-500" style={{ letterSpacing: "0.08em" }}>
        Member count
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Shown on the Creativo hero. A rough figure, not a live count — type whatever's currently honest, e.g. "50+ members."
      </p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. 50+ members"
          style={{ fontSize: "16px" }}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-200"
        />
        <button
          onClick={save}
          disabled={saving}
          className="flex-shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: COLOR.gold, color: "#FFFFFF" }}
        >
          {saving ? "Saving..." : saved ? <>{"Saved "}<UiSymbol name="check" /></> : "Save"}
        </button>
      </div>
    </div>
  );
}