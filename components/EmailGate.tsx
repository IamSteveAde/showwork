"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function EmailGate({
  projectId,
  clientName,
  primaryColor,
  logoUrl,
  onSubmitted,
}: {
  projectId: string;
  clientName: string;
  primaryColor: string;
  logoUrl: string | null;
  onSubmitted: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/viewer-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      onSubmitted(email);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
    >
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={clientName} className="mb-6 h-10 w-auto" />
      )}
      <p
        className="mb-2 text-xs font-medium uppercase"
        style={{ color: `${primaryColor}b3`, letterSpacing: "0.3em" }}
      >
        {clientName}
      </p>
      <h1 className="mb-6 text-2xl font-light text-white">
        Enter your email to view this content
      </h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={{ fontSize: "16px" }}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-center text-white outline-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl py-4 text-sm font-medium disabled:opacity-50"
          style={{ background: primaryColor, color: "#080808" }}
        >
          {loading ? "Continuing..." : "Continue"}
        </button>
      </form>
    </motion.div>
  );
}