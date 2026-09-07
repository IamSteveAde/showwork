"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CalendarPasswordDisplay({
  calendarId,
  accessCode,
}: {
  calendarId: string;
  accessCode: string;
}) {
  const router = useRouter();
  const [showChange, setShowChange] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/calendars/${calendarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate_password" }),
    });
    if (res.ok) {
      router.refresh();
      setShowChange(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to generate a new password");
    }
    setLoading(false);
  };

  const setCustom = async () => {
    if (!customPassword) {
      setError("Enter a password first");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/calendars/${calendarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_password", password: customPassword }),
    });
    if (res.ok) {
      router.refresh();
      setShowChange(false);
      setCustomPassword("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to set password");
    }
    setLoading(false);
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="rounded-lg px-3 py-2 font-mono text-sm text-white" style={{ background: "rgba(255,255,255,0.06)" }}>
          {accessCode}
        </span>
        <button onClick={copy} className="text-xs font-semibold underline" style={{ color: "#2478FF" }}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button onClick={() => setShowChange((prev) => !prev)} className="text-xs text-white/40 underline">
          {showChange ? "Cancel" : "Change password"}
        </button>
      </div>

      {showChange && (
        <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              placeholder="Type your own password — no rules, anything goes"
              style={{ fontSize: "16px" }}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
            />
            <button
              onClick={setCustom}
              disabled={loading}
              className="flex-shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
            >
              Set
            </button>
          </div>
          <button onClick={regenerate} disabled={loading} className="self-start text-xs text-white/40 underline disabled:opacity-50">
            {loading ? "Working..." : "Or generate a random one instead"}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}