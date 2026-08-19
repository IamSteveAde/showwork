"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BLUE = "#3350D8";
const PINK = "#F17FBE";

const CATEGORIES = ["Photography", "Videography", "Motion design", "Editing"];

export default function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [portfolioLink, setPortfolioLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setCategory(CATEGORIES[0]);
    setPortfolioLink("");
    setDone(false);
    setError(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Placeholder endpoint — needs to be wired to wherever waitlist
      // submissions should actually land (a database table, an email,
      // a WhatsApp form, etc.). Right now this just POSTs the form
      // data and expects a 200 back.
      const res = await fetch("/api/creativo/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, portfolioLink }),
      });
      if (!res.ok) throw new Error("Something went wrong. Try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl p-8"
            style={{ background: "#141414" }}
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
            >
              ✕
            </button>

            {done ? (
              <div className="py-6 text-center">
                <div
                  className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: `${PINK}22` }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" style={{ color: PINK }}>
                    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">You're on the list.</h3>
                <p className="mt-2 text-sm text-white/50">We'll be in touch when the next spots open up.</p>
              </div>
            ) : (
              <>
                <h3 className="mb-1 text-xl font-bold text-white">Join the waitlist</h3>
                <p className="mb-6 text-sm text-white/50">Tell us who you are and what you make.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ fontSize: "16px" }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ fontSize: "16px" }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ fontSize: "16px" }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} style={{ background: "#141414" }}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.06em" }}>
                      Portfolio link
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://"
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                      style={{ fontSize: "16px" }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25"
                    />
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 rounded-full py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: PINK }}
                  >
                    {submitting ? "Submitting..." : "Join the waitlist"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}