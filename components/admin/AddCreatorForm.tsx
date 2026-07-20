"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddCreatorForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create");
      setLoading(false);
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
      />
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ fontSize: "16px" }}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
      />
      <input
        type="tel"
        placeholder="Phone (optional) — +2348012345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ fontSize: "16px" }}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
      />
      <input
        type="text"
        required
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ fontSize: "16px" }}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md py-2 text-xs font-semibold disabled:opacity-50"
        style={{ background: "#F5C842", color: "#0A0A0A" }}
      >
        {loading ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}