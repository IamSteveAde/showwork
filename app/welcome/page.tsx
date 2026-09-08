"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Layers3,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

const COLOR = {
  black: "#07080A",
  white: "#FFFFFF",
  blue: "#2478FF",
  blueSoft: "#AFC9FF",
  orange: "#E8881A",
};

const COMMUNITY_URL =
  "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

const ROUTES = [
  {
    key: "portfolio",
    number: "01",
    eyebrow: "YOUR PRESENCE",
    title: "Build your portfolio.",
    description:
      "Create one beautiful link for your work, your story and the clients you want to reach.",
    href: "/dashboard/portfolio",
    icon: BriefcaseBusiness,
    accent: "blue",
    meta: "Free forever",
  },
  {
    key: "delivery",
    number: "02",
    eyebrow: "YOUR PROJECTS",
    title: "Deliver a project.",
    description:
      "Give every client a professional place to receive work, review files, give feedback and approve.",
    href: "/dashboard/new",
    icon: Workflow,
    accent: "dark",
    meta: "For project delivery",
  },
  {
    key: "workspace",
    number: "03",
    eyebrow: "YOUR SOCIAL MEDIA CALENDAR",
    title: "Create a client content calendar.",
    description:
      "Build an ongoing space where you and your client can plan, present and approve content together.",
    href: "/dashboard/calendars",
    icon: Layers3,
    accent: "light",
    meta: "For ongoing work",
  },
];

export default function WelcomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080A] text-white">
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      {/* Base image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero1.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: 0.14,
          filter: "saturate(0.7)",
        }}
      />

      {/* Main atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, rgba(36,120,255,0.16), transparent 34%), radial-gradient(circle at 85% 75%, rgba(36,120,255,0.08), transparent 28%), linear-gradient(180deg, rgba(7,8,10,0.72) 0%, rgba(7,8,10,0.94) 55%, #07080A 100%)",
        }}
      />

      {/* Fine grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 72%)",
        }}
      />

      {/* Architectural rings */}
      <div className="pointer-events-none absolute left-1/2 top-[38%] h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute left-1/2 top-[38%] h-[570px] w-[570px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute left-1/2 top-[38%] h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/[0.08]" />

      {/* Small blue light */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.25, 0.4, 0.25],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute left-1/2 top-[30%] h-40 w-40 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl"
      />

      {/* =========================================================
          CONTENT
      ========================================================== */}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
        {/* TOP BAR */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <Link href="/dashboard" className="group flex items-center">
  <img
    src="/images/logo/swwhite.svg"
    alt="Showwork"
    className="h-8 w-auto transition-opacity duration-300 group-hover:opacity-80"
  />
</Link>

          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium text-white/50 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            Skip for now
            <ArrowRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </motion.header>

        {/* HERO COPY */}
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-center"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
              <Sparkles size={11} />
              Welcome to Showwork
            </div>

            <h1 className="text-[clamp(3rem,7vw,5.8rem)] font-semibold leading-[0.91] tracking-[-0.075em] text-white">
              Your work has
              <br />
              <span className="text-blue-400">a new home.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-white/45 sm:text-base">
              Showwork gives you the tools to present your work, deliver
              projects and work with clients — all in one place.
            </p>

            <div className="mt-7 flex items-center justify-center gap-5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/25">
              <span>Portfolio</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Delivery</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Workspace</span>
            </div>
          </motion.div>

          {/* =====================================================
              OPTIONS
          ====================================================== */}

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {ROUTES.map((route, index) => {
              const Icon = route.icon;

              return (
                <Link
                  key={route.key}
                  href={route.href}
                  className="group block h-full"
                >
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 30,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.65,
                      delay: 0.25 + index * 0.1,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{
                      y: -7,
                    }}
                    className="relative flex h-full min-h-[335px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.055] p-6 text-left backdrop-blur-xl transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/[0.08] sm:p-7"
                  >
                    {/* Card glow */}
                    <div
                      className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl transition-opacity duration-500 ${
                        route.accent === "blue"
                          ? "bg-blue-500/20 opacity-50 group-hover:opacity-100"
                          : route.accent === "dark"
                          ? "bg-white/10 opacity-20 group-hover:opacity-50"
                          : "bg-blue-300/10 opacity-30 group-hover:opacity-80"
                      }`}
                    />

                    {/* Number */}
                    <div className="relative flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-[0.18em] text-white/20">
                        {route.number}
                      </span>

                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                        {route.meta}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="relative mt-9 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] transition duration-300 group-hover:border-blue-400/30 group-hover:bg-blue-400/10">
                      <Icon
                        size={19}
                        className="text-white/60 transition group-hover:text-blue-300"
                      />
                    </div>

                    {/* Text */}
                    <div className="relative mt-7">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300/70">
                        {route.eyebrow}
                      </p>

                      <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
                        {route.title}
                      </h2>

                      <p className="mt-3 text-[13px] leading-6 text-white/40">
                        {route.description}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="relative mt-auto flex items-center justify-between pt-7">
                      <span className="text-xs font-semibold text-white/70 transition group-hover:text-white">
                        Get started
                      </span>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition duration-300 group-hover:border-blue-400/30 group-hover:bg-blue-500 group-hover:text-white">
                        <ArrowRight
                          size={13}
                          className="text-white/40 transition group-hover:text-white"
                        />
                      </div>
                    </div>

                    {/* Bottom accent */}
                    <div
                      className="absolute bottom-0 left-7 right-7 h-px origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                      style={{
                        background:
                          "linear-gradient(90deg, #2478FF, transparent)",
                      }}
                    />
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* =====================================================
              COMMUNITY
          ====================================================== */}

          <motion.a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.7 }}
            className="group mx-auto mt-5 flex w-full max-w-md items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 transition hover:border-white/15 hover:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
                <Users size={15} className="text-emerald-400" />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-white/80">
                  Join Creativo Community
                </p>

                <p className="mt-0.5 text-[9px] text-white/30">
                  Meet other people building creative businesses.
                </p>
              </div>
            </div>

            <ArrowRight
              size={14}
              className="text-white/25 transition-transform group-hover:translate-x-1 group-hover:text-white/70"
            />
          </motion.a>
        </div>

        {/* =========================================================
            FOOTER
        ========================================================== */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-5 text-[10px] text-white/25 sm:flex-row"
        >
          <p>
            You can change your mind anytime. Everything is available from
            your dashboard.
          </p>

          <Link
            href="/dashboard"
            className="font-medium text-white/40 underline underline-offset-4 transition hover:text-white"
          >
            Go to dashboard
          </Link>
        </motion.div>
      </div>
    </main>
  );
}