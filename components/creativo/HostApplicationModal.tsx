"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BLUE = "#3350D8";
const LIME = "#CBEB6E";
const CATEGORIES = ["Photography", "Videography", "Motion design", "Editing", "Something else"];

export default function HostApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [proposedTopic, setProposedTopic] = useState("");
  const [whyThem, setWhyThem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setCategory(CATEGORIES[0]);
    setProposedTopic("");
    setWhyThem("");
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
      const res = await fetch("/api/creativo/webinar-host-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, proposedTopic, whyThem }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-black outline-none focus:border-black/25";
  const labelClass = "mb-1.5 block text-xs font-bold uppercase text-black/40";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-8"
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-black/40 hover:bg-black/5 hover:text-black"
            >
              ✕
            </button>

            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${BLUE}18` }}>
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" style={{ color: BLUE }}>
                    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-black">Application sent.</h3>
                <p className="mt-2 text-sm text-black/50">We'll be in touch if it's a fit for an upcoming session.</p>
              </div>
            ) : (
              <>
                <h3 className="mb-1 text-xl font-extrabold text-black">Apply to host</h3>
                <p className="mb-6 text-sm text-black/50">Five quick questions — goes straight to our team.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Your category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ fontSize: "16px" }} className={inputClass}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>What would you talk about?</label>
                    <textarea required rows={2} value={proposedTopic} onChange={(e) => setProposedTopic(e.target.value)} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
                  </div>
                  <div>
                    <label className={labelClass}>Why should Creativo have you as a host?</label>
                    <textarea required rows={3} value={whyThem} onChange={(e) => setWhyThem(e.target.value)} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
                  </div>

                  {error && <p className="text-xs text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 rounded-full py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: BLUE }}
                  >
                    {submitting ? "Sending..." : "Send application"}
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