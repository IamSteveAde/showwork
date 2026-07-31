"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  midGray: "#888786",
};

const COMMUNITY_URL = "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

const ROUTES = [
  {
    key: "portfolio",
    icon: "🖼️",
    title: "Create a portfolio",
    description: "One link, always on. Showcase your best work and let clients reach you directly — free, forever.",
    href: "/dashboard/portfolio",
    external: false,
  },
  {
    key: "project",
    icon: "📦",
    title: "Create a project",
    description: "Deliver photos and films to a client the right way — password-protected, on your branding, ready in minutes.",
    href: "/dashboard/new",
    external: false,
  },
  {
    key: "community",
    icon: "💬",
    title: "Join our community",
    description: "Connect with other creators using Showwork — swap tips, get support, see what's new first.",
    href: COMMUNITY_URL,
    external: true,
  },
];

export default function WelcomePage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16"
      style={{ background: COLOR.black }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero1.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.25 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.92) 75%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 text-center"
        >
          <p className="mb-4 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.25em" }}>
            You're in
          </p>
          <h1 className="text-3xl font-bold text-white md:text-5xl">Welcome to Showwork.</h1>
          <p className="mx-auto mt-4 max-w-md text-base font-normal text-white/50 md:text-lg">
            Let's get you started — what would you like to do first?
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-3">
          {ROUTES.map((route, i) => {
            const CardInner = (
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group flex h-full cursor-pointer flex-col gap-4 rounded-2xl p-7 text-left transition-colors duration-300 hover:border-white/20"
                style={{
                  background: "rgba(26,26,26,0.7)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(248,247,244,0.1)",
                }}
              >
                <div className="mb-1 h-[3px] w-8 transition-all duration-300 group-hover:w-14" style={{ background: COLOR.orange }} aria-hidden />
                <span className="text-4xl">{route.icon}</span>
                <h2 className="text-lg font-semibold text-white">{route.title}</h2>
                <p className="text-sm leading-relaxed text-white/50">{route.description}</p>
                <span
                  className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold transition-transform duration-300 group-hover:translate-x-1"
                  style={{ color: COLOR.gold }}
                >
                  {route.external ? "Join now" : "Get started"}
                  <span aria-hidden>→</span>
                </span>
              </motion.div>
            );

            return route.external ? (
              <a key={route.key} href={route.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                {CardInner}
              </a>
            ) : (
              <Link key={route.key} href={route.href} className="block h-full">
                {CardInner}
              </Link>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-10 text-center text-xs" style={{ color: COLOR.midGray }}
        >
          Don't worry — you can do all of this later too. Head to your{" "}
          <Link href="/dashboard" className="underline transition-colors hover:text-white">
            dashboard
          </Link>{" "}
          anytime.
        </motion.p>
      </div>
    </main>
  );
}