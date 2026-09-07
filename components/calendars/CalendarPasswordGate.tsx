"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR = { blue: "#2478FF", black: "#0A0A0A" };

export default function CalendarPasswordGate({ slug, clientName }: { slug: string; clientName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/social-calendar/${slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, email, name }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: COLOR.black }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl p-8" style={{ background: "#1A1A1A" }}>
        <p className="mb-1 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
          Content calendar
        </p>
        <h1 className="mb-6 text-2xl font-bold text-white">{clientName}</h1>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Your name <span className="normal-case text-white/25">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Your email <span className="normal-case text-white/25">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
          />
        </div>

        {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
        >
          {loading ? "Checking..." : "View calendar"}
        </button>
      </form>
    </main>
  );
}