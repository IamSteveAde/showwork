"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Link2,
  Mail,
  Phone,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";

const COLOR = {
  blue: "#2478FF",
  blueDark: "#0052FF",
  black: "#0A0A0A",
  yellow: "#FFCC00",
};

const CATEGORIES = ["Video/Motion", "Graphics Design", "Photography", "Branding/Illustration"];
const MAX_DESCRIPTION_LENGTH = 150;

// Lets TypeScript know fbq exists on window (loaded by the Meta Pixel base
// code script elsewhere in the app, e.g. root layout).
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function SpotlightSubmissionForm({
  isOpen,
  defaultName,
  defaultEmail,
}: {
  isOpen: boolean;
  defaultName: string;
  defaultEmail: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [manualLink, setManualLink] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectLink = manualLink;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !projectLink.trim() ||
      !description.trim()
    ) {
      setError(
        "Please fill in your name, email, WhatsApp number, project link, and description."
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    // Shared ID so the browser pixel event and the server-side Conversions
    // API event get deduped by Meta as a single event instead of two.
    const eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `spotlight-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const res = await fetch("/api/spotlight/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          category,
          projectLink,
          description,
          note,
          eventId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setDone(true);

        // Fire the browser-side Pixel event now that submission is confirmed.
        // "Lead" is a standard Meta event, which gets better optimization
        // and match quality than a fully custom event name.
        if (typeof window !== "undefined" && window.fbq) {
          window.fbq(
            "track",
            "Lead",
            {
              content_name: "Spotlight Submission",
              content_category: category,
            },
            { eventID: eventId }
          );
        }
      } else {
        setError(data.error ?? "Something went wrong — try again.");
      }
    } catch {
      setError("Something went wrong — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-[15px] border border-black/[0.08] bg-[#F7F9FC] px-4 py-4 text-sm text-black outline-none transition-all duration-300 placeholder:text-black/25 hover:border-black/[0.14] focus:border-[#2478FF]/50 focus:bg-white focus:ring-4 focus:ring-[#2478FF]/[0.07]";

  const labelClass =
    "mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-black/45";

  if (!isOpen) {
    return (
      <section
        id="submit"
        className="relative overflow-hidden bg-[#F7F9FC] px-4 py-10 sm:px-6 sm:py-16 md:px-16 md:py-24"
      >
        <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-black/[0.07] bg-white p-6 text-center sm:rounded-[32px] sm:p-8 shadow-[0_30px_90px_-55px_rgba(0,0,0,0.35)] md:p-12">
          <div
            className="absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl"
            style={{ background: `${COLOR.blue}15` }}
          />

          <div className="relative">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.04]">
              <X size={19} strokeWidth={2} className="text-black/45" />
            </div>

            <p className="text-xl font-extrabold tracking-[-0.03em] text-black">
              Submissions are closed.
            </p>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/45">
              Submissions for this month&apos;s Spotlight are closed.
              Check back next month to apply.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (done) {
    return (
      <section
        id="submit"
        className="relative overflow-hidden bg-[#F7F9FC] px-4 py-10 sm:px-6 sm:py-16 md:px-16 md:py-24"
      >
        <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-black/[0.07] bg-white p-6 text-center sm:rounded-[32px] sm:p-8 shadow-[0_30px_90px_-55px_rgba(0,0,0,0.35)] md:p-14">
          <div
            className="absolute left-1/2 top-[-130px] h-[280px] w-[420px] -translate-x-1/2 rounded-full blur-[100px]"
            style={{ background: `${COLOR.blue}20` }}
          />

          <div className="relative">
            <div
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[22px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(36,120,255,0.14), rgba(36,120,255,0.05))",
                border: `1px solid ${COLOR.blue}25`,
              }}
            >
              <Check
                size={28}
                strokeWidth={2.4}
                style={{ color: COLOR.blue }}
              />
            </div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#FFCC00]/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#8A7000]">
              <Sparkles size={11} />
              Spotlight submission
            </div>

            <p className="text-2xl font-extrabold tracking-[-0.04em] text-black md:text-3xl">
              Submission received.
            </p>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">
              We&apos;ll be in touch if your work makes the shortlist.
              Keep creating — your next piece could be the one.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="submit"
      className="relative overflow-hidden bg-[#F7F9FC] px-0 py-0"
    >
      <div className="relative mx-auto w-full max-w-[1500px]">
        <div className="flex w-full flex-col overflow-hidden rounded-none border-y border-black/[0.07] bg-white shadow-none sm:rounded-[26px] lg:grid lg:grid-cols-[0.72fr_1.28fr] lg:rounded-[32px]">

          {/* ============================================================
              LEFT BRAND PANEL
              ============================================================ */}
          <div className="relative order-2 overflow-hidden bg-[#050A16] px-5 py-7 sm:p-10 md:p-12 lg:order-1 lg:p-14">
            <div
              className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-[90px]"
              style={{ background: `${COLOR.blue}35` }}
            />

            <div
              className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-[90px]"
              style={{ background: `${COLOR.yellow}12` }}
            />

            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                backgroundSize: "70px 70px",
              }}
            />

            <div className="relative flex h-full flex-col">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 backdrop-blur-xl">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, #2478FF, #0052FF)",
                  }}
                >
                  <Sparkles
                    size={10}
                    strokeWidth={2.5}
                    className="text-white"
                  />
                </span>

                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/60">
                  Creativo · Monthly Spotlight
                </span>
              </div>

              <div className="mt-8 max-w-md sm:mt-14 lg:mt-auto">
                <h2 className="text-[2.25rem] font-extrabold leading-[0.95] tracking-[-0.055em] text-white sm:text-5xl">
                  Put your best
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(100deg, #2478FF, #68B2FF, #FFCC00)",
                    }}
                  >
                    work forward.
                  </span>
                </h2>

                <p className="mt-4 max-w-sm text-[13px] leading-6 text-white/45 sm:mt-6 sm:text-sm sm:leading-7">
                  Submit the work you&apos;re proud of. The Creativo
                  Spotlight is where exceptional creative work gets
                  recognised and discovered.
                </p>

                <div className="mt-8 hidden space-y-4 sm:block lg:mt-10">
                  {[
                    {
                      icon: FileText,
                      title: "One project",
                      text: "Submit a project that represents your best work.",
                    },
                    {
                      icon: Sparkles,
                      title: "Get recognised",
                      text: "Stand alongside standout creators in the community.",
                    },
                    {
                      icon: Link2,
                      title: "Build visibility",
                      text: "Give more people a reason to discover your work.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                        <item.icon
                          size={14}
                          strokeWidth={2}
                          className="text-[#68B2FF]"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-extrabold text-white/80">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-5 text-white/30">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 hidden items-center gap-3 border-t border-white/10 pt-5 sm:flex lg:mt-12">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFCC00] shadow-[0_0_12px_rgba(255,204,0,0.7)]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                    Submissions currently open
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================
              FORM
              ============================================================ */}
          <div className="order-1 p-4 sm:p-7 md:p-9 lg:order-2 lg:px-10 lg:py-11 xl:px-12">
            <div className="mb-5 w-full sm:mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#2478FF]/[0.07] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#0052FF] sm:hidden">
                <Sparkles size={10} />
                Spotlight submission
              </div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#2478FF]">
                Submit your work
              </p>

              <h3 className="text-[1.7rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-black sm:text-3xl">
                Submit your best work.
              </h3>

              <p className="mt-2 max-w-lg text-[13px] leading-5 text-black/40 sm:text-sm sm:leading-6">
                A few details is all we need. Keep it clear, make it yours.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-4 sm:gap-5"
            >
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    <UserRound size={12} />
                    Name
                  </label>

                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ fontSize: "16px" }}
                    className={inputClass}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <Mail size={12} />
                    Email
                  </label>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ fontSize: "16px" }}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <Phone size={12} />
                  WhatsApp number
                </label>

                <input
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className={inputClass}
                  placeholder="+234 800 000 0000"
                />

                <p className="mt-2 text-[10px] leading-4 text-black/30">
                  Use the number clients can reach you on WhatsApp.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  <Sparkles size={12} />
                  Category
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-2.5">
                  {CATEGORIES.map((c) => {
                    const selected = category === c;

                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className="min-h-[44px] rounded-[13px] border px-2.5 py-2.5 text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 sm:px-3 sm:py-3 sm:text-xs"
                        style={{
                          borderColor: selected
                            ? COLOR.blue
                            : "rgba(0,0,0,0.07)",
                          background: selected
                            ? "rgba(36,120,255,0.08)"
                            : "#F7F9FC",
                          color: selected
                            ? COLOR.blueDark
                            : "rgba(0,0,0,0.48)",
                          boxShadow: selected
                            ? "0 10px 25px -18px #2478FF"
                            : undefined,
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>

                {/* Keep the native select semantics/data source out of the
                    visible UI while preserving the existing category value. */}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  <Link2 size={12} />
                  Link to your best project
                </label>

                <p className="mb-2.5 text-[11px] leading-5 text-black/35">
                  Paste the link to the project you&apos;re most proud of this month.
                </p>

                <input
                  type="url"
                  required
                  placeholder="https://your-project.com"
                  value={manualLink}
                  onChange={(e) => setManualLink(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={labelClass}>
                    <FileText size={12} />
                    One-line description
                  </label>

                  <span
                    className={`mb-2 text-[9px] font-bold ${
                      description.length >=
                      MAX_DESCRIPTION_LENGTH
                        ? "text-[#2478FF]"
                        : "text-black/25"
                    }`}
                  >
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>

                <input
                  type="text"
                  required
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  style={{ fontSize: "16px" }}
                  className={inputClass}
                  placeholder="What did you create?"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <FileText size={12} />
                  Note for the panel
                  <span className="font-medium normal-case tracking-normal text-black/20">
                    optional
                  </span>
                </label>

                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className={`${inputClass} resize-none`}
                  placeholder="Anything you'd like the panel to know?"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-[15px] border border-red-500/10 bg-red-500/[0.05] px-4 py-3 text-xs leading-5 text-red-500">
                  <X
                    size={14}
                    strokeWidth={2}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group mt-1 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full py-3.5 text-sm font-extrabold text-white shadow-[0_18px_45px_-18px_rgba(36,120,255,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-18px_rgba(36,120,255,0.9)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                style={{
                  background:
                    "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
                }}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit your project
                    <ArrowRight
                      size={16}
                      strokeWidth={2.5}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 pt-1">
                <Upload
                  size={11}
                  strokeWidth={2}
                  className="text-black/25"
                />
                <p className="text-center text-[9px] font-medium text-black/30">
                  Submit one project that represents your best work.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}