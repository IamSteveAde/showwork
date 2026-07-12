"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus_Jakarta_Sans } from "next/font/google";

// Per brand guidelines: Plus Jakarta Sans is the ONLY typeface used across
// the brand. No secondary display face — personality comes from weight,
// structure, and spacing, not font variety.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-jakarta",
});

// ─────────────────────────────────────────────
// Brand color tokens (Brand Guidelines v1.0, Section 06)
// ─────────────────────────────────────────────
const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  warmWhite: "#F8F7F4",
  charcoal: "#1A1A1A",
  midGray: "#888786",
  lightGray: "#F2F1EE",
};

const SLIDES = [
  {
    image: "/images/hero1.png",
    eyebrow: "For content creators",
    headline: "Your work deserves a premiere, not a Dropbox link.",
    body: "Deliver photos and films to clients in a showcase built for them — not a folder full of files.",
  },
  {
    image: "/images/hero2.png",
    eyebrow: "Client experience",
    headline: "First impressions aren't a folder. They're a moment.",
    body: "Password-protected, on your branding, ready in minutes.",
  },
  {
    image: "/images/hero3.png",
    eyebrow: "Simple economics",
    headline: "₦5,000 a project. A priceless first impression.",
    body: "One flat fee. No subscription. Live the moment payment clears.",
  },
];

// Real pain points, phrased the way a creator would actually say them —
// not fabricated statistics, just recognizable, specific situations.
const PAIN_POINTS = [
  {
    title: "Underpriced, underappreciated",
    body: "A shoot you spent weeks on lands in a WeTransfer link. Clients price you by how the work arrives, not just what's inside it.",
  },
  {
    title: "No second look",
    body: "Most links get opened once. If the delivery isn't memorable, neither are you — until the next creator's is.",
  },
  {
    title: "Doing the agency's job for free",
    body: "You shot it, you edited it, and now you're also tech support for a client who can't find the download button.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Upload the work",
    body: "Add the photos and films for this delivery. Stored full quality, delivered the same way.",
  },
  {
    number: "02",
    title: "Set the access code",
    body: "One password per project. Only the client you share it with gets in.",
  },
  {
    number: "03",
    title: "Send the link",
    body: "They open it, enter the code, and see the work the way you made it.",
  },
];

const TESTIMONIALS = [
  {
    quote: "My client thought I'd hired an agency to build a microsite. It was just this link.",
    name: "Tolu A.",
    role: "Videographer",
  },
  {
    quote: "Took five minutes to set up. The client paid the invoice within the hour.",
    name: "Ada O.",
    role: "Photographer",
  },
  {
    quote: "Finally something that looks as good as the work I actually deliver.",
    name: "Chidi E.",
    role: "Content Studio",
  },
];

// ─────────────────────────────────────────────
// WORDMARK — text only, no logo image. "Showwork" carries the weight,
// "by Spotlite Africa" trails smaller, keeping the lineage visible
// without competing with the product name itself.
// ─────────────────────────────────────────────
function Wordmark({ size = "md", dark = false }: { size?: "sm" | "md" | "lg"; dark?: boolean }) {
  const sizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };
  const textColor = dark ? COLOR.black : "white";
  return (
    <div className="flex items-baseline gap-2">
      <span className={`${sizes[size]} font-bold`} style={{ color: textColor }}>
        Show<span style={{ color: COLOR.gold }}>work</span>
      </span>
      <span
        className="hidden text-xs font-medium uppercase sm:inline"
        style={{ color: dark ? "rgba(10,10,10,0.4)" : "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
      >
        by Spotlite Africa
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// HERO SLIDER
// ─────────────────────────────────────────────
function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <section
      className="relative h-[92vh] min-h-[640px] w-full overflow-hidden"
      style={{ background: COLOR.black }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image} alt="" className="h-full w-full object-cover" style={{ opacity: 0.55 }} />
        </motion.div>
      </AnimatePresence>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.25) 45%, rgba(10,10,10,0.95) 100%)",
        }}
      />

      {/* nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-8 md:px-20">
        <Wordmark />
        <Link href="/login" className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
          Log in
        </Link>
      </div>

      {/* copy */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-20 md:px-20 md:pb-28">
        <div className="mx-auto max-w-[1280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              <p
                className="mb-5 text-xs font-semibold uppercase"
                style={{ color: COLOR.gold, letterSpacing: "0.1em" }}
              >
                {slide.eyebrow}
              </p>
              <h1 className="max-w-2xl text-[2.25rem] font-bold leading-[1.12] tracking-tight text-white md:text-6xl">
                {slide.headline}
              </h1>
              <p className="mt-5 max-w-lg text-base font-normal leading-relaxed text-white/60 md:text-lg">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <div className="flex gap-3">
              <Link
                href="/signup"
                className="rounded-lg px-7 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
                style={{ background: COLOR.gold, color: COLOR.black }}
              >
                Start a delivery
              </Link>
              <Link
                href="/login"
                className="rounded-lg border px-7 py-3.5 text-sm font-semibold text-white/70 transition-colors hover:text-white"
                style={{ borderColor: "rgba(248,247,244,0.15)" }}
              >
                Log in
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === active ? 24 : 8,
                    background: i === active ? COLOR.gold : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeClient() {
  return (
    <main className={`${jakarta.variable}`} style={{ fontFamily: "var(--font-jakarta)" }}>
      <HeroSlider />

      {/* ── PAIN POINT — the cost of not doing this ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <p
            className="mb-4 text-xs font-semibold uppercase"
            style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}
          >
            The part nobody talks about
          </p>
          <h2 className="mb-16 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            Great work still loses to a bad handover.
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {PAIN_POINTS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-xl p-6"
                style={{ background: "rgba(248,247,244,0.03)", border: "1px solid rgba(248,247,244,0.08)" }}
              >
                <h3 className="mb-3 text-lg font-semibold text-white">{p.title}</h3>
                <p className="text-sm font-normal leading-relaxed text-white/50">{p.body}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-14 text-lg font-semibold md:text-xl"
            style={{ color: COLOR.gold }}
          >
            Showwork fixes the part after the work is done.
          </motion.p>
        </div>
      </section>

      {/* ── THREE STEPS — charcoal ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.charcoal }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <h2 className="mb-16 max-w-lg text-3xl font-semibold leading-tight text-white md:text-4xl">
            How a delivery works
          </h2>

          <div className="grid gap-12 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-start gap-3 text-left"
              >
                <span className="text-5xl font-light md:text-6xl" style={{ color: COLOR.gold }}>
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                <p className="text-base font-normal leading-relaxed text-white/50">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — warm white ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.warmWhite }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <h2 className="mb-16 max-w-lg text-3xl font-semibold leading-tight md:text-4xl" style={{ color: COLOR.black }}>
            Creators are already using it this way.
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-xl p-7"
                style={{ background: COLOR.lightGray }}
              >
                <p className="mb-6 text-base font-normal leading-relaxed" style={{ color: "rgba(10,10,10,0.75)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-sm font-semibold" style={{ color: COLOR.black }}>
                  {t.name}
                </p>
                <p className="text-xs font-normal" style={{ color: COLOR.midGray }}>
                  {t.role}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RATE CARD — black, framed as ROI not just a price ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.black }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl rounded-xl p-8 md:p-12"
          style={{ background: COLOR.charcoal }}
        >
          <div className="mb-2 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <p className="mb-2 text-sm font-normal text-white/40">
            ₦5,000 to look like the agency your client already assumed you were.
          </p>
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-semibold text-white">Pricing</h2>
            <span className="text-4xl font-bold text-white">₦5,000</span>
          </div>

          <div className="mb-8 h-px w-full" style={{ background: "rgba(245,200,66,0.3)" }} aria-hidden />

          <dl className="flex flex-col gap-5 text-left">
            {[
              ["Billing", "Per project, one time. No subscription."],
              ["Includes", "Password protection, viewer email capture, full-quality delivery."],
              ["Goes live", "As soon as payment is confirmed."],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-8">
                <dt className="w-32 flex-shrink-0 text-sm font-semibold text-white/40">{label}</dt>
                <dd className="text-sm font-normal leading-relaxed text-white/70">{value}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/signup"
            className="mt-8 flex w-full items-center justify-center rounded-lg py-3.5 text-sm font-semibold transition-transform hover:scale-[1.01]"
            style={{ background: COLOR.gold, color: COLOR.black }}
          >
            Start a delivery
          </Link>
        </motion.div>
      </section>

      {/* ── RELATIONSHIP TO SPOTLITE AFRICA ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.warmWhite }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-[1280px]"
        >
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <p
            className="mb-4 text-xs font-semibold uppercase"
            style={{ color: "rgba(10,10,10,0.4)", letterSpacing: "0.1em" }}
          >
            Built by Spotlite Africa
          </p>
          <h2 className="mb-6 max-w-2xl text-3xl font-semibold leading-tight md:text-4xl" style={{ color: COLOR.black }}>
            A 360° brand agency, making one job easier for creators.
          </h2>
          <p className="max-w-2xl text-base font-normal leading-relaxed md:text-lg" style={{ color: "rgba(10,10,10,0.65)" }}>
            Spotlite Africa is a strategy-first brand and marketing agency
            based in Lagos, building African businesses to global standard.
            We work with creators and production teams on our own client
            campaigns every week, and we kept seeing the same gap: excellent
            work, arriving badly. Showwork is how we close that gap — not
            just for our own clients, but for every creator doing the work.
          </p>
          <a
            href="https://spotliteafrica.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{ background: COLOR.black, color: "white" }}
          >
            Visit spotliteafrica.com
            <span aria-hidden>→</span>
          </a>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="px-6 py-14 md:px-20"
        style={{ background: COLOR.black, borderTop: "1px solid rgba(248,247,244,0.08)" }}
      >
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-8 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div>
            <Wordmark size="sm" />
            <p className="mt-3 max-w-xs text-sm font-normal leading-relaxed" style={{ color: COLOR.midGray }}>
              Strategy-first. Execution-obsessed.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p
              className="text-xs font-semibold uppercase"
              style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}
            >
              Contact
            </p>
            <a
              href="mailto:info@spotliteafrica.com"
              className="text-sm font-normal text-white/60 transition-colors hover:text-white"
            >
              info@spotliteafrica.com
            </a>
            <a
              href="https://spotliteafrica.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-normal text-white/60 transition-colors hover:text-white"
            >
              spotliteafrica.com
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <p
              className="text-xs font-semibold uppercase"
              style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}
            >
              Product
            </p>
            <Link href="/signup" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
              Start a delivery
            </Link>
            <Link href="/login" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
              Log in
            </Link>
          </div>
        </div>

        <p className="mt-12 text-center text-xs font-normal" style={{ color: "rgba(248,247,244,0.2)" }}>
          © {new Date().getFullYear()} Spotlite Africa Agency. Showwork is a Spotlite Africa product.
        </p>
      </footer>
    </main>
  );
}