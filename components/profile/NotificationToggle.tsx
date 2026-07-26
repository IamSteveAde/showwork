"use client";

import { useState } from "react";

const COLOR = { gold: "#F5C842" };

export default function NotificationToggle({ initialValue }: { initialValue: boolean }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    const next = !value;
    setValue(next);
    setSaving(true);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyOnView: next }),
    });
    setSaving(false);
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">Notify me when a client views a delivery</p>
        <p className="mt-1 text-xs text-white/40">
          This preference is saved, but the actual email isn&apos;t sending yet — a popular delivery could get
          viewed many times a day, so this needs rate-limiting before it's safe to turn on for real.
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={saving}
        aria-label="Toggle notification"
        className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50"
        style={{ background: value ? COLOR.gold : "rgba(255,255,255,0.15)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}