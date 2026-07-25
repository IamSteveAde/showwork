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
  const [visible, setVisible] = useState(false);
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
        className="relative w-full max-w-sm"
      >
        <input
          ref={inputRef}
          type={visible ? "text" : "password"}
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
          className="w-full rounded-xl bg-white/5 px-5 py-4 pr-12 text-center text-white outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide access code" : "Show access code"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/80"
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 2l14 14M6.6 6.7A3 3 0 0 0 9 12a3 3 0 0 0 2.7-1.7M4.3 4.5C2.6 5.7 1.3 7.3 1 9c.7 3 3.9 6 8 6 1.4 0 2.7-.35 3.8-.95M13.7 13.5c1.3-1 2.3-2.4 3-4.5-1-3-4.2-6-8-6-.65 0-1.28.08-1.9.24"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M1 9s2.8-6 8-6 8 6 8 6-2.8 6-8 6-8-6-8-6Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </button>
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