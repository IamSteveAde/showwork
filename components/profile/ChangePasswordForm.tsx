"use client";

import { useState } from "react";

const COLOR = { gold: "#F5C842", black: "#0A0A0A" };

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.ok) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to update password");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
        Change password
      </p>
      <input
        type="password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current password"
        style={{ fontSize: "16px" }}
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        type="password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password (min 8 characters)"
        style={{ fontSize: "16px" }}
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        type="password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        style={{ fontSize: "16px" }}
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: COLOR.gold, color: COLOR.black }}
      >
        {loading ? "Updating..." : success ? "Updated ✓" : "Update password"}
      </button>
    </form>
  );
}