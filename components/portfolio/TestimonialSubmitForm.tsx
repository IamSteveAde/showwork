"use client";

import { useState } from "react";

function StarPicker({ value, onChange, accentColor }: { value: number; onChange: (n: number) => void; accentColor: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="text-2xl leading-none transition-transform hover:scale-110"
          style={{ color: n <= value ? accentColor : "rgba(255,255,255,0.15)" }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function TestimonialSubmitForm({ portfolioSlug, accentColor }: { portfolioSlug: string; accentColor: string }) {
  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !quote.trim()) {
      setError("Your name and the testimonial itself are both required");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/testimonials/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioSlug, clientName, clientRole: clientRole || null, quote, rating: rating > 0 ? rating : null }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't submit this — try again");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${accentColor}22` }}>
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" style={{ color: accentColor }}>
            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white">Thank you.</h3>
        <p className="mt-2 text-sm text-white/50">Your testimonial has been sent.</p>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-white/40";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={labelClass}>Your name</label>
        <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Role or context <span className="normal-case text-white/25">(optional)</span></label>
        <input type="text" placeholder="e.g. Bride, Marketing Director" value={clientRole} onChange={(e) => setClientRole(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Your testimonial</label>
        <textarea rows={4} placeholder="What was it like working together?" value={quote} onChange={(e) => setQuote(e.target.value)} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
      </div>
      <div>
        <label className={labelClass}>Rating <span className="normal-case text-white/25">(optional)</span></label>
        <StarPicker value={rating} onChange={setRating} accentColor={accentColor} />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
        style={{ background: accentColor, color: "#0A0A0A" }}
      >
        {submitting ? "Sending..." : "Submit testimonial"}
      </button>
    </form>
  );
}