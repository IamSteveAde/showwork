"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Testimonial {
  id: string;
  clientName: string;
  clientRole: string | null;
  quote: string;
  rating: number | null;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="text-xl leading-none transition-transform hover:scale-110"
          style={{ color: n <= value ? "#F5C842" : "rgba(255,255,255,0.15)" }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function PortfolioTestimonialsManager({ testimonials }: { testimonials: Testimonial[] }) {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!clientName.trim() || !quote.trim()) {
      setError("Client name and the testimonial itself are both required");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/portfolio/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        clientRole: clientRole || null,
        quote,
        rating: rating > 0 ? rating : null,
      }),
    });

    if (res.ok) {
      setClientName("");
      setClientRole("");
      setQuote("");
      setRating(0);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Couldn't save this testimonial");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/portfolio/testimonials/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {testimonials.length > 0 && (
        <div className="flex flex-col gap-3">
          {testimonials.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-4 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex-1">
                {t.rating && (
                  <p className="mb-1 text-sm" style={{ color: "#F5C842" }}>
                    {"★".repeat(t.rating)}
                    <span style={{ color: "rgba(255,255,255,0.15)" }}>{"★".repeat(5 - t.rating)}</span>
                  </p>
                )}
                <p className="text-sm text-white/70">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-1.5 text-xs font-semibold text-white">
                  {t.clientName}
                  {t.clientRole && <span className="font-normal text-white/40"> · {t.clientRole}</span>}
                </p>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                className="flex-shrink-0 text-xs text-red-400/70 underline hover:text-red-400 disabled:opacity-50"
              >
                {deletingId === t.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
        <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
          Add a testimonial
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name"
            style={{ fontSize: "16px" }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
          />
          <input
            type="text"
            value={clientRole}
            onChange={(e) => setClientRole(e.target.value)}
            placeholder="Role or context (optional) — e.g. Bride, Marketing Director"
            style={{ fontSize: "16px" }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
          />
        </div>

        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="What did they say about working with you?"
          rows={3}
          style={{ fontSize: "16px" }}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
        />

        <div className="flex items-center justify-between">
          <StarPicker value={rating} onChange={setRating} />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: "#F5C842", color: "#0A0A0A" }}
          >
            {saving ? "Adding..." : "Add testimonial"}
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}