"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELD =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#2478FF] focus:ring-4 focus:ring-blue-500/10";

const LABEL =
  "mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500";

function SectionNumber({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-[10px] font-bold text-white">
        {number}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function CreatePortfolioForm() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [heroTagline, setHeroTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [ctaText, setCtaText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          heroTagline: heroTagline.trim(),
          contactEmail: contactEmail.trim(),
          whatsappNumber: whatsappNumber.trim(),
          ctaText: ctaText.trim(),
        }),
      });

      if (res.ok) {
        router.refresh();
        return;
      }

      const data = await res.json();

      setError(
        data.error ?? "Something went wrong. Please try again."
      );
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Intro */}
      <div className="mb-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2478FF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
            Free portfolio
          </span>

          <span className="text-[11px] text-slate-400">
            No expiry
          </span>
        </div>

        <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">
          Turn your work into a destination.
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
          One permanent link for your best work. Build it once, then keep
          adding new work whenever you create something worth showing.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.08)]"
      >
        <div className="h-1 bg-gradient-to-r from-[#2478FF] via-blue-400 to-[#F5C842]" />

        <div className="space-y-9 p-6 md:p-8">
          {/* Identity */}
          <section>
            <SectionNumber
              number="01"
              title="Start with the identity"
              description="This is what visitors will recognise when they land on your portfolio."
            />

            <div>
              <label htmlFor="portfolio-company" className={LABEL}>
                Company / brand name
              </label>

              <input
                id="portfolio-company"
                type="text"
                required
                value={companyName}
                onChange={(event) =>
                  setCompanyName(event.target.value)
                }
                placeholder="e.g. Ada Obi Photography"
                className={FIELD}
                style={{ fontSize: "16px" }}
              />

              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
                This becomes the name visitors associate with your work.
              </div>
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          {/* Hero */}
          <section>
            <SectionNumber
              number="02"
              title="Give the portfolio a point of view"
              description="A short headline can immediately tell people what makes your work different."
            />

            <label htmlFor="portfolio-tagline" className={LABEL}>
              Banner headline
              <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                optional
              </span>
            </label>

            <input
              id="portfolio-tagline"
              type="text"
              value={heroTagline}
              onChange={(event) =>
                setHeroTagline(event.target.value)
              }
              maxLength={80}
              placeholder="Photography that remembers the moment."
              className={FIELD}
              style={{ fontSize: "16px" }}
            />

            <div className="mt-2 flex justify-between gap-4 text-[11px] text-slate-400">
              <span>Keep it short, memorable and human.</span>
              <span>{heroTagline.length}/80</span>
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          {/* Contact */}
          <section>
            <SectionNumber
              number="03"
              title="Make it easy to reach you"
              description="Give potential clients a direct route from admiration to conversation."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="portfolio-email" className={LABEL}>
                  Contact email
                  <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                    optional
                  </span>
                </label>

                <input
                  id="portfolio-email"
                  type="email"
                  value={contactEmail}
                  onChange={(event) =>
                    setContactEmail(event.target.value)
                  }
                  placeholder="hello@yourstudio.com"
                  className={FIELD}
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div>
                <label htmlFor="portfolio-whatsapp" className={LABEL}>
                  WhatsApp number
                  <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                    optional
                  </span>
                </label>

                <input
                  id="portfolio-whatsapp"
                  type="tel"
                  value={whatsappNumber}
                  onChange={(event) =>
                    setWhatsappNumber(event.target.value)
                  }
                  placeholder="+2348012345678"
                  className={FIELD}
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-amber-50/50 p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2478FF] text-white">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 10h11M11 6l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  End with an invitation
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Give visitors a reason to take the next step.
                </p>
              </div>
            </div>

            <label htmlFor="portfolio-cta" className={LABEL}>
              Call-to-action text
              <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                optional
              </span>
            </label>

            <textarea
              id="portfolio-cta"
              value={ctaText}
              onChange={(event) =>
                setCtaText(event.target.value)
              }
              maxLength={140}
              rows={3}
              placeholder="Let's create something worth remembering."
              className={`${FIELD} resize-none`}
              style={{ fontSize: "16px" }}
            />

            <div className="mt-2 flex justify-between gap-4 text-[11px] text-slate-400">
              <span>Leave blank to use Showwork's default CTA.</span>
              <span>{ctaText.length}/140</span>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-xs font-medium text-red-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold">
                !
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(15,23,42,0.12)] transition hover:bg-[#2478FF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeOpacity="0.25"
                      strokeWidth="2"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Creating your portfolio…
                </>
              ) : (
                <>
                  Create my portfolio
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
              Your portfolio is free and can be updated whenever your work
              evolves.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}