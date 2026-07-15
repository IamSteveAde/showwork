"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function PasswordGate({
  projectId,
  clientName,
  primaryColor,
  logoUrl,
  viewerEmail,
  onUnlock,
}: {
  projectId: string;
  clientName: string;
  primaryColor: string;
  logoUrl: string | null;
  viewerEmail: string;
  onUnlock: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/verify-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: value, viewerEmail }),
    });
    const { valid } = await res.json();

    if (valid) {
      inputRef.current?.blur(); // closes keyboard, resets iOS zoom before transition
      setTimeout(() => onUnlock(), 400);
    } else {
      setError(true);
      setShaking(true);
      setLoading(false);
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 2500);
      setValue("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
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
        Enter your access code
      </h1>

      <motion.div
        animate={shaking ? { x: [-10, 10, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Access code"
          style={{
            fontSize: "16px",
            border: error
              ? "1px solid rgba(220,60,60,0.55)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
          className="w-full rounded-xl bg-white/5 px-5 py-4 text-center text-white outline-none"
        />
      </motion.div>

      {error && (
        <p className="mt-3 text-xs text-red-400">
          Incorrect access code. Please try again.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !value.trim()}
        className="mt-4 w-full max-w-sm rounded-xl py-4 text-sm font-medium disabled:opacity-40"
        style={{ background: primaryColor, color: "#080808" }}
      >
        {loading ? "Unlocking..." : "Enter"}
      </button>
    </motion.div>
  );
}