"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Testimonial {
  id: string;
  clientName: string;
  clientRole: string | null;
  quote: string;
  rating: number | null;
  isApproved: boolean;
}

/* ─────────────────────────────────────────────────────────────
   Star picker
───────────────────────────────────────────────────────────── */

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
      aria-label="Choose rating"
    >
      <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        Rating
      </span>

      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? 0 : n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none transition-all duration-200 hover:scale-110"
            style={{
              color: active ? "#F59E0B" : "#CBD5E1",
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Static stars
───────────────────────────────────────────────────────────── */

function RatingStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="text-sm leading-none"
          style={{
            color: n <= rating ? "#F59E0B" : "#E2E8F0",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Testimonial row
───────────────────────────────────────────────────────────── */

function TestimonialRow({
  t,
  onToggleApproval,
  onDelete,
  deletingId,
  togglingId,
}: {
  t: Testimonial;
  onToggleApproval: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  togglingId: string | null;
}) {
  const isToggling = togglingId === t.id;
  const isDeleting = deletingId === t.id;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      {/* Decorative quote mark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-1 select-none font-serif text-[90px] font-bold leading-none"
        style={{ color: "rgba(36,120,255,0.055)" }}
      >
        “
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold uppercase text-white">
                {t.clientName.trim().slice(0, 1) || "C"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {t.clientName}
                </p>

                {t.clientRole && (
                  <p className="truncate text-xs text-slate-400">
                    {t.clientRole}
                  </p>
                )}
              </div>
            </div>

            {t.rating ? (
              <div className="mb-3">
                <RatingStars rating={t.rating} />
              </div>
            ) : null}

            <blockquote className="max-w-2xl text-[14px] leading-7 text-slate-600">
              “{t.quote}”
            </blockquote>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={() =>
                onToggleApproval(t.id, !t.isApproved)
              }
              disabled={isToggling}
              className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                t.isApproved
                  ? "border border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100"
                  : "border border-blue-200 bg-blue-50 text-[#2478FF] hover:border-blue-300 hover:bg-blue-100"
              }`}
            >
              {isToggling
                ? "Updating..."
                : t.isApproved
                  ? "Hide"
                  : "Approve"}
            </button>

            <button
              type="button"
              onClick={() => onDelete(t.id)}
              disabled={isDeleting}
              className="rounded-lg px-3 py-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>

        {/* Status footer */}
        <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              t.isApproved ? "bg-emerald-500" : "bg-amber-400"
            }`}
          />

          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {t.isApproved ? "Published on portfolio" : "Waiting for approval"}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────
   Empty state
───────────────────────────────────────────────────────────── */

function EmptyTestimonials() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl"
      />

      <div className="relative">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-300 shadow-sm">
          “
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-900">
          No testimonials yet
        </p>

        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
          Add your first client testimonial below to start building
          social proof for your portfolio.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export default function PortfolioTestimonialsManager({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const pending = testimonials.filter((t) => !t.isApproved);
  const approved = testimonials.filter((t) => t.isApproved);

  const handleAdd = async () => {
    if (!clientName.trim() || !quote.trim()) {
      setError(
        "Client name and the testimonial itself are both required"
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio/testimonials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientRole: clientRole.trim() || null,
          quote: quote.trim(),
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
        let data: { error?: string } = {};

        try {
          data = await res.json();
        } catch {
          // Ignore malformed error responses.
        }

        setError(
          data.error ?? "Couldn't save this testimonial"
        );
      }
    } catch {
      setError(
        "Something went wrong while saving this testimonial"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      await fetch(`/api/portfolio/testimonials/${id}`, {
        method: "DELETE",
      });

      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleApproval = async (
    id: string,
    next: boolean
  ) => {
    setTogglingId(id);

    try {
      await fetch(
        `/api/portfolio/testimonials/${id}/approval`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isApproved: next,
          }),
        }
      );

      router.refresh();
    } finally {
      setTogglingId(null);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 transition-all focus:border-[#2478FF] focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#F8FAFC] shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
      {/* ─────────────────────────────────────────────────────
          Background treatment
      ────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-blue-500/[0.055] blur-3xl" />

        <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-indigo-500/[0.035] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.025) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative">
        {/* ─────────────────────────────────────────────────
            Header
        ────────────────────────────────────────────────── */}
        <div className="border-b border-slate-200 bg-white/80 px-5 py-6 backdrop-blur-xl sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 font-serif text-sm text-white">
                  “
                </span>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                  Social proof
                </p>
              </div>

              <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-slate-950">
                Client testimonials
              </h3>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Collect the words that make your work easier to trust.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Total
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-950">
                  {testimonials.length}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                  Live
                </p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-800">
                  {approved.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────
            Testimonials
        ────────────────────────────────────────────────── */}
        <div className="space-y-8 p-5 sm:p-7">
          {pending.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />

                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
                      Needs review
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Approve testimonials when you're ready to show them
                    publicly.
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                  {pending.length}
                </span>
              </div>

              <div className="space-y-3">
                {pending.map((t) => (
                  <TestimonialRow
                    key={t.id}
                    t={t}
                    onToggleApproval={handleToggleApproval}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    togglingId={togglingId}
                  />
                ))}
              </div>
            </section>
          )}

          {approved.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                      Published
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    These testimonials are currently visible on your
                    portfolio.
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  {approved.length}
                </span>
              </div>

              <div className="space-y-3">
                {approved.map((t) => (
                  <TestimonialRow
                    key={t.id}
                    t={t}
                    onToggleApproval={handleToggleApproval}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    togglingId={togglingId}
                  />
                ))}
              </div>
            </section>
          )}

          {testimonials.length === 0 && <EmptyTestimonials />}

          {/* ─────────────────────────────────────────────────
              Add testimonial
          ────────────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.045)]">
            {/* Accent */}
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/[0.07] blur-3xl"
            />

            <div className="relative border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-lg font-serif text-white">
                  +
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Add a testimonial
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Add a client's words and decide when they should
                    appear on your portfolio.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Client name
                  </span>

                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    style={{ fontSize: "16px" }}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Role or context
                  </span>

                  <input
                    type="text"
                    value={clientRole}
                    onChange={(e) => setClientRole(e.target.value)}
                    placeholder="e.g. Marketing Director"
                    style={{ fontSize: "16px" }}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Testimonial
                  </span>

                  <span className="text-[10px] text-slate-400">
                    Client's own words
                  </span>
                </div>

                <textarea
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="What did they say about working with you?"
                  rows={5}
                  style={{ fontSize: "16px" }}
                  className={`${inputClass} resize-none leading-6`}
                />
              </label>

              <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <StarPicker
                  value={rating}
                  onChange={setRating}
                />

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2478FF] hover:shadow-[0_10px_28px_rgba(36,120,255,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Adding testimonial...
                    </span>
                  ) : (
                    "Add testimonial"
                  )}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <span className="mt-0.5 text-xs text-red-500">
                    !
                  </span>

                  <p className="text-xs font-medium leading-5 text-red-600">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}