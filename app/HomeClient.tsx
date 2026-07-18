"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-jakarta",
});

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
    eyebrow: "Built to grow with you",
    headline: "One project or fifty — there's a plan that fits.",
    body: "Start free. Move up only when your studio actually needs to.",
  },
];

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

function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <div className="flex items-baseline gap-2">
      <span className={`${sizes[size]} font-bold text-white`}>
        Show<span style={{ color: COLOR.gold }}>work</span>
      </span>
      <span
        className="hidden text-xs font-medium uppercase text-white/40 sm:inline"
        style={{ letterSpacing: "0.1em" }}
      >
        by Spotlite Africa
      </span>
    </div>
  );
}

function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6000);
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

      <div className="relative z-10 flex items-center justify-between px-6 py-8 md:px-20">
        <Wordmark />
        <Link href="/login" className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
          Log in
        </Link>
      </div>

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
              <p className="mb-5 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
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
                href="/start"
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
                  style={{ width: i === active ? 24 : 8, background: i === active ? COLOR.gold : "rgba(255,255,255,0.25)" }}
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
  const [showFullVideo, setShowFullVideo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const heroVideoSrc = isMobile ? "/images/shm.mov" : "/images/sh.mp4";

  return (
    <main className={`${jakarta.variable}`} style={{ fontFamily: "var(--font-jakarta)" }}>
      <HeroSlider />

      {/* ── PAIN POINT ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}>
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
            Showwork fixes the part after the work is done — and grows with every project after that.
          </motion.p>
        </div>
      </section>

      {/* ── VIDEO — the moment they actually open it ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.charcoal }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
            The moment they open it
          </p>
          <h2 className="mb-6 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            This is what your client sees first.
          </h2>
          <p className="mb-12 max-w-lg text-base leading-relaxed text-white/50 md:text-lg">
            No loading spinner, no folder icon. The film you delivered, playing,
            the second the page opens.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl shadow-2xl"
            style={{ border: "1px solid rgba(245,200,66,0.15)" }}
          >
            {/* browser chrome */}
            <div className="flex items-center gap-1.5 bg-black px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="ml-3 text-[11px] text-white/25">showwork.spotliteafrica.com/fashion-fest</span>
            </div>

            <div
              onClick={() => setShowFullVideo(true)}
              className="group relative aspect-video w-full cursor-pointer bg-black"
            >
              {/* Real screen recording — desktop and mobile use different
                  files since a mobile screen recording is usually shot
                  vertically, and a desktop one horizontally. */}
              <video
                key={heroVideoSrc}
                src={heroVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 transition-colors duration-300 group-hover:bg-black/10"
              />

              <div className="absolute left-5 top-5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR.gold }} />
                <span className="text-[10px] font-semibold uppercase text-white/60" style={{ letterSpacing: "0.15em" }}>
                  Private preview
                </span>
              </div>

              {/* Subtle, always-visible click indicator — not hover-only,
                  since hover doesn't exist on mobile touch devices at all. */}
              <div
                className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 group-hover:scale-105"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
              >
                <div
                  className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent"
                  style={{ borderLeftColor: COLOR.gold }}
                />
                <span className="text-[10px] font-medium text-white/80">Click to watch</span>
              </div>
            </div>
          </motion.div>

          {/* copy moved below the video — the overlay text was competing
              with the footage itself */}
          <div className="mx-auto mt-6 max-w-4xl text-center">
            <p className="text-xl font-bold text-white md:text-2xl">Three months of work.</p>
            <p className="text-xl font-bold md:text-2xl" style={{ color: COLOR.gold }}>One night to remember.</p>
          </div>
        </div>
      </section>

      {/* ── IMAGE — real photography, the actual gallery treatment ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}>
            Every photo, presented properly
          </p>
          <h2 className="mb-6 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            A gallery, not a grid of thumbnails.
          </h2>
          <p className="mb-12 max-w-lg text-base leading-relaxed text-white/50 md:text-lg">
            Full quality, properly laid out — and your client can approve or
            flag each one right there, with a note, so nothing gets lost in a
            comment thread.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
          >
            {[
              { seed: 21, status: "approved" as const },
              { seed: 42, status: "none" as const },
              { seed: 63, status: "revision" as const },
              { seed: 84, status: "approved" as const },
              { seed: 105, status: "none" as const },
              { seed: 126, status: "approved" as const },
            ].map((tile, i) => (
              <motion.div
                key={tile.seed}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="relative aspect-[4/5] overflow-hidden rounded-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${tile.seed}/600/750`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {tile.status === "approved" && (
                  <span
                    className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: "#22C55E", color: "#080808" }}
                  >
                    ✓ Approved
                  </span>
                )}
                {tile.status === "revision" && (
                  <span
                    className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: "#F97316", color: "#080808" }}
                  >
                    ✎ Revision
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
          <p className="mt-6 text-center text-xs text-white/25">
            Placeholder photography — shown here purely to demonstrate the gallery and approval treatment.
          </p>
        </div>
      </section>

      {/* ── THREE STEPS ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.black }}>
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

      {/* ── TESTIMONIALS ── */}
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
                <p className="text-sm font-semibold" style={{ color: COLOR.black }}>{t.name}</p>
                <p className="text-xs font-normal" style={{ color: COLOR.midGray }}>{t.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="px-6 py-20 md:px-20 md:py-[120px]" style={{ background: COLOR.black }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-3 h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}>
            Pricing
          </p>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-white md:text-5xl">
            Your first delivery is free.
            <br />
            Everything after scales with your studio.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
            No contracts, no hidden fees, cancel anytime. Whether you deliver
            once a month or every week, there's a plan built for exactly that.
          </p>

          <div className="mt-16 grid gap-8 lg:grid-cols-4">
            <div className="rounded-2xl border p-8" style={{ borderColor: "rgba(255,255,255,.08)", background: COLOR.charcoal }}>
              <p className="text-sm font-semibold text-white/50">Free</p>
              <h3 className="mt-3 text-4xl font-bold text-white">₦0</h3>
              <p className="mt-2 text-sm text-white/50">The whole experience, on us.</p>
              <ul className="mt-8 space-y-3 text-sm text-white/70">
                <li>✓ 1 project a month</li>
                <li>✓ Password-protected delivery</li>
                <li>✓ Full quality uploads</li>
                <li>✓ Client approve/revision flow</li>
              </ul>
              <Link
                href="/start"
                className="mt-10 flex justify-center rounded-lg border py-3 font-semibold text-white transition hover:bg-white hover:text-black"
                style={{ borderColor: "rgba(255,255,255,.15)" }}
              >
                Start free
              </Link>
            </div>

            <div className="rounded-2xl border p-8" style={{ borderColor: "rgba(245,200,66,.2)", background: COLOR.charcoal }}>
              <p className="text-sm font-semibold" style={{ color: COLOR.gold }}>Starter</p>
              <h3 className="mt-3 text-4xl font-bold text-white">₦5,900</h3>
              <p className="mt-1 text-sm text-white/50">per month</p>
              <p className="mt-3 text-sm text-white/50">For the creator picking up steady, regular clients.</p>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                <li>✓ Up to 5 projects a month</li>
                <li>✓ Everything in Free</li>
                <li>✓ Priority delivery uptime</li>
              </ul>
              <Link
                href="/start"
                className="mt-10 flex justify-center rounded-lg py-3 font-semibold"
                style={{ background: COLOR.gold, color: COLOR.black }}
              >
                Choose Starter
              </Link>
            </div>

            <div
              className="relative rounded-2xl border p-8"
              style={{ borderColor: COLOR.gold, background: COLOR.charcoal, boxShadow: "0 20px 60px rgba(245,200,66,.18)" }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold"
                style={{ background: COLOR.gold, color: COLOR.black }}
              >
                MOST POPULAR
              </div>
              <p className="text-sm font-semibold" style={{ color: COLOR.gold }}>Growth</p>
              <h3 className="mt-3 text-4xl font-bold text-white">₦10,500</h3>
              <p className="mt-1 text-sm text-white/50">per month</p>
              <p className="mt-3 text-sm text-white/50">For studios booking multiple shoots a week.</p>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                <li>✓ Up to 20 projects a month</li>
                <li>✓ Everything in Starter</li>
                <li>✓ Priority support</li>
              </ul>
              <Link
                href="/start"
                className="mt-10 flex justify-center rounded-lg py-3 font-semibold"
                style={{ background: COLOR.gold, color: COLOR.black }}
              >
                Choose Growth
              </Link>
            </div>

            <div className="rounded-2xl border p-8" style={{ borderColor: "rgba(255,255,255,.08)", background: COLOR.charcoal }}>
              <p className="text-sm font-semibold" style={{ color: COLOR.gold }}>Unlimited</p>
              <h3 className="mt-3 text-4xl font-bold text-white">₦15,000</h3>
              <p className="mt-1 text-sm text-white/50">per month</p>
              <p className="mt-3 text-sm text-white/50">For teams who stopped counting projects a while ago.</p>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                <li>✓ Unlimited projects</li>
                <li>✓ Everything in Growth</li>
                <li>✓ Highest priority support</li>
              </ul>
              <Link
                href="/start"
                className="mt-10 flex justify-center rounded-lg py-3 font-semibold"
                style={{ background: COLOR.gold, color: COLOR.black }}
              >
                Go Unlimited
              </Link>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-white/40">
            All plans include secure hosting, password protection, and full-quality delivery. Cancel anytime.
          </p>
        </div>
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
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: "rgba(10,10,10,0.4)", letterSpacing: "0.1em" }}>
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
      <footer className="px-6 py-14 md:px-20" style={{ background: COLOR.black, borderTop: "1px solid rgba(248,247,244,0.08)" }}>
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-8 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div>
            <Wordmark size="sm" />
            <p className="mt-3 max-w-xs text-sm font-normal leading-relaxed" style={{ color: COLOR.midGray }}>
              Strategy-first. Execution-obsessed.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}>
              Contact
            </p>
            <a href="mailto:info@spotliteafrica.com" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
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
            <p className="text-xs font-semibold uppercase" style={{ color: "rgba(248,247,244,0.35)", letterSpacing: "0.1em" }}>
              Product
            </p>
            <Link href="/start" className="text-sm font-normal text-white/60 transition-colors hover:text-white">
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

      {/* full-video modal, opened by clicking the "moment they open it" video */}
      <AnimatePresence>
        {showFullVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4 py-8"
            onClick={() => setShowFullVideo(false)}
          >
            <button
              onClick={() => setShowFullVideo(false)}
              aria-label="Close"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
            >
              ✕
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-[92vw] overflow-hidden rounded-2xl bg-black"
            >
              <video
                key={heroVideoSrc}
                src={heroVideoSrc}
                controls
                autoPlay
                loop
                playsInline
                className="max-h-[85vh] max-w-[92vw] object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}