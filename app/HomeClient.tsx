"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import FloatingStartButton from "@/components/FloatingStartButton";
import Navbar from "@/components/Navbar";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const COLOR = {
  black: "#07080A",
  ink: "#111317",
  white: "#FFFFFF",
  paper: "#F4F5F7",
  blue: "#2478FF",
  blueSoft: "#AFC9FF",
  muted: "rgba(17,19,23,0.55)",
  mutedDark: "rgba(255,255,255,0.58)",
  line: "rgba(17,19,23,0.1)",
  lineDark: "rgba(255,255,255,0.12)",
};

const COMMUNITY_URL =
  "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

/* ============================================================
   ICONS
============================================================ */

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 17 17 7M17 7H8M17 7v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8.5 5.5v13L19 12 8.5 5.5Z" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PortfolioIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <circle
        cx="8.5"
        cy="9"
        r="1.4"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="m3 16 5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeliveryIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="m15 16 2.5-2.5L20 16"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkspaceIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M3 9.5h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M7 13h3M14 13h3M7 16.5h3M14 16.5h3"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CommunityIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle
        cx="9"
        cy="9"
        r="3"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <circle
        cx="17"
        cy="10"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M3.5 19c.5-3.2 2.5-5 5.5-5s5 1.8 5.5 5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M15 15c2.8 0 4.6 1.4 5 4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ============================================================
   WORDMARK
============================================================ */

function Wordmark({
  color = COLOR.black,
  size = "md",
}: {
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const heights = {
    sm: 20,
    md: 28,
    lg: 38,
  };

  const height = heights[size];

  return (
    <div
      role="img"
      aria-label="Showwork"
      style={{
        width: height * 2,
        height,
        backgroundColor: color,
        WebkitMaskImage: "url(/images/logo/sw.svg)",
        maskImage: "url(/images/logo/sw.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

/* ============================================================
   HERO
============================================================ */

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [mounted, setMounted] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, {
    stiffness: 70,
    damping: 22,
    mass: 0.8,
  });

  const smoothY = useSpring(mouseY, {
    stiffness: 70,
    damping: 22,
    mass: 0.8,
  });

  const orbX = useTransform(smoothX, [-1, 1], [-30, 30]);
  const orbY = useTransform(smoothY, [-1, 1], [-22, 22]);

  const ringX = useTransform(smoothX, [-1, 1], [-12, 12]);
  const ringY = useTransform(smoothY, [-1, 1], [-10, 10]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    mouseX.set(x * 2 - 1);
    mouseY.set(y * 2 - 1);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section
      className="relative min-h-[760px] overflow-hidden bg-white text-[#111317] md:min-h-[100svh]"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* ======================================================
          ATMOSPHERIC BACKGROUND
      ======================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Main blue atmosphere */}

        <motion.div
          className="absolute left-1/2 top-[43%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            x: orbX,
            y: orbY,
            background:
              "radial-gradient(circle, rgba(70,125,255,.15) 0%, rgba(70,125,255,.07) 28%, rgba(255,255,255,0) 68%)",
            filter: "blur(4px)",
          }}
          animate={
            mounted
              ? {
                  scale: [1, 1.045, 1],
                  opacity: [0.72, 0.92, 0.72],
                }
              : undefined
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Soft blue upper-right glow */}

        <motion.div
          className="absolute -right-[180px] top-[0%] h-[560px] w-[560px] rounded-full"
          animate={
            mounted
              ? {
                  x: [0, -20, 0],
                  y: [0, 25, 0],
                }
              : undefined
          }
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,.105), transparent 68%)",
            filter: "blur(18px)",
          }}
        />

        {/* Soft violet atmosphere */}

        <motion.div
          className="absolute -left-[220px] top-[18%] h-[500px] w-[500px] rounded-full"
          animate={
            mounted
              ? {
                  x: [0, 28, 0],
                  y: [0, 18, 0],
                }
              : undefined
          }
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background:
              "radial-gradient(circle, rgba(108,92,255,.075), transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* ====================================================
            FINE ARCHITECTURAL GRID
        ===================================================== */}

        <div
          className="absolute inset-0 opacity-[0.48]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(17,19,23,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,19,23,.045) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(circle at center, black 0%, black 30%, transparent 73%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 0%, black 30%, transparent 73%)",
          }}
        />

        {/* ====================================================
            DOT FIELD
        ===================================================== */}

        <div
          className="absolute left-1/2 top-1/2 h-[580px] w-[580px] -translate-x-1/2 -translate-y-1/2 opacity-[0.24]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(36,120,255,.4) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage:
              "radial-gradient(circle, black 0%, transparent 66%)",
            WebkitMaskImage:
              "radial-gradient(circle, black 0%, transparent 66%)",
          }}
        />

        {/* ====================================================
            ORBITAL RINGS
        ===================================================== */}

        <motion.div
          className="absolute left-1/2 top-[44%] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2478FF]/[0.10]"
          style={{
            x: ringX,
            y: ringY,
          }}
          animate={
            mounted
              ? {
                  rotate: 360,
                }
              : undefined
          }
          transition={{
            duration: 42,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div
            className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#2478FF]/50"
            animate={{
              boxShadow: [
                "0 0 0 rgba(36,120,255,0)",
                "0 0 22px rgba(36,120,255,.55)",
                "0 0 0 rgba(36,120,255,0)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        <motion.div
          className="absolute left-1/2 top-[44%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2478FF]/[0.055]"
          animate={
            mounted
              ? {
                  rotate: -360,
                }
              : undefined
          }
          transition={{
            duration: 58,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <span className="absolute left-[17%] top-[-3px] h-1.5 w-1.5 rounded-full bg-[#2478FF]/35" />
        </motion.div>

        <div className="absolute left-1/2 top-[44%] h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2478FF]/[0.035]" />

        {/* ====================================================
            HORIZONTAL LINES
        ===================================================== */}

        <div className="absolute left-0 right-0 top-[30%] h-px bg-gradient-to-r from-transparent via-[#2478FF]/[0.08] to-transparent" />

        <div className="absolute left-0 right-0 top-[70%] h-px bg-gradient-to-r from-transparent via-[#2478FF]/[0.06] to-transparent" />

        {/* ====================================================
            CORNER DETAILS
        ===================================================== */}

        <div className="absolute left-[6%] top-[27%] hidden h-16 w-16 border-l border-t border-[#2478FF]/[0.10] lg:block" />

        <div className="absolute bottom-[18%] right-[6%] hidden h-16 w-16 border-b border-r border-[#2478FF]/[0.10] lg:block" />

        {/* ====================================================
            COORDINATES
        ===================================================== */}

        <div className="absolute left-[8%] top-[43%] hidden items-center gap-2 lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]/50" />

          <span className="font-mono text-[8px] tracking-[0.18em] text-black/20">
            06 / 24 / 26
          </span>
        </div>

        <div className="absolute right-[8%] top-[56%] hidden items-center gap-2 lg:flex">
          <span className="font-mono text-[8px] tracking-[0.18em] text-black/20">
            SHOW / 001
          </span>

          <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]/50" />
        </div>
      </div>

      {/* ======================================================
          FLOATING PRODUCT SURFACES
      ======================================================= */}

      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        aria-hidden
      >
        {/* Portfolio */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={
            mounted
              ? {
                  opacity: 1,
                  y: [0, -8, 0],
                }
              : undefined
          }
          transition={{
            opacity: {
              duration: 0.8,
              delay: 0.15,
            },
            y: {
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className="absolute left-[7%] top-[31%] w-[205px] -rotate-[7deg] rounded-2xl border border-white/90 bg-white/65 p-3 shadow-[0_25px_70px_rgba(24,52,110,.10)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#2478FF]">
              Portfolio
            </span>

            <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
          </div>

          <div className="mt-3 overflow-hidden rounded-xl bg-[#EEF3FF]">
            <div className="h-24 bg-[linear-gradient(135deg,#dce8ff,#f8faff)]" />
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-20 rounded-full bg-black/10" />
            <div className="h-1.5 w-28 rounded-full bg-black/[0.06]" />
          </div>
        </motion.div>

        {/* Project delivery */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={
            mounted
              ? {
                  opacity: 1,
                  y: [0, -7, 0],
                }
              : undefined
          }
          transition={{
            opacity: {
              duration: 0.8,
              delay: 0.35,
            },
            y: {
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className="absolute right-[6%] top-[27%] w-[220px] rotate-[6deg] rounded-2xl border border-white/90 bg-white/65 p-4 shadow-[0_25px_70px_rgba(24,52,110,.10)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EEF3FF] text-[#2478FF]">
                <DeliveryIcon className="h-3.5 w-3.5" />
              </span>

              <span className="text-[9px] font-semibold text-black/70">
                Client delivery
              </span>
            </div>

            <span className="text-[8px] text-black/30">
              LIVE
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-black/[0.06] bg-white/75 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase tracking-[0.12em] text-black/30">
                Fashion Fest
              </span>

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>

            <div className="mt-3 h-1.5 w-24 rounded-full bg-black/10" />

            <div className="mt-2 h-1.5 w-32 rounded-full bg-black/[0.05]" />

            <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3">
              <span className="text-[8px] text-black/35">
                28 files
              </span>

              <span className="text-[8px] font-semibold text-[#2478FF]">
                Approved
              </span>
            </div>
          </div>
        </motion.div>

        {/* Content workspace */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={
            mounted
              ? {
                  opacity: 1,
                  y: [0, -8, 0],
                }
              : undefined
          }
          transition={{
            opacity: {
              duration: 0.8,
              delay: 0.55,
            },
            y: {
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className="absolute bottom-[17%] left-[11%] w-[185px] rotate-[5deg] rounded-2xl border border-white/90 bg-white/65 p-3 shadow-[0_25px_70px_rgba(24,52,110,.10)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F5FF] text-[#2478FF]">
              <WorkspaceIcon className="h-3.5 w-3.5" />
            </span>

            <div>
              <p className="text-[9px] font-semibold text-black/65">
                Client workspace
              </p>

              <p className="text-[7px] text-black/30">
                Planning · Approval
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="h-9 rounded-lg bg-[#EEF3FF]" />
            <div className="h-9 rounded-lg bg-[#F3F4F7]" />
            <div className="h-9 rounded-lg bg-[#E7EDFF]" />
          </div>
        </motion.div>

        {/* Approval */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={
            mounted
              ? {
                  opacity: 1,
                  y: [0, -7, 0],
                }
              : undefined
          }
          transition={{
            opacity: {
              duration: 0.8,
              delay: 0.75,
            },
            y: {
              duration: 6.2,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className="absolute bottom-[15%] right-[10%] w-[175px] -rotate-[5deg] rounded-2xl border border-white/90 bg-white/65 p-3 shadow-[0_25px_70px_rgba(24,52,110,.10)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF3FF] text-[#2478FF]">
              <CheckIcon className="h-3.5 w-3.5" />
            </div>

            <div>
              <p className="text-[9px] font-semibold text-black/70">
                Client approved
              </p>

              <p className="text-[7px] text-black/30">
                Project is ready
              </p>
            </div>
          </div>

          <div className="mt-3 h-1.5 w-full rounded-full bg-[#E9EDF4]" />

          <div className="mt-2 h-1.5 w-[72%] rounded-full bg-[#F0F2F6]" />
        </motion.div>
      </div>

      {/* ======================================================
          NAVIGATION
      ======================================================= */}

      <div className="relative z-40">
        <Navbar isLoggedIn={isLoggedIn} />
      </div>

      {/* ======================================================
          CENTRAL HERO CONTENT
      ======================================================= */}

      <div className="relative z-30 flex min-h-[760px] items-center justify-center px-5 pb-20 pt-24 sm:px-8 lg:min-h-[100svh] lg:px-10">
        <motion.div
          initial={{
            opacity: 0,
            y: 22,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.95,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mx-auto w-full max-w-[900px] text-center"
        >
          {/* ==================================================
              EYEBROW
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.15,
              duration: 0.7,
            }}
            className="mb-7 flex items-center justify-center gap-3"
          >
            <span className="h-px w-7 bg-[#2478FF]/25" />

            <span className="flex items-center gap-2 font-[var(--font-fraunces)] text-sm italic text-black/50">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-[#2478FF]/30 blur-sm" />

                <span className="relative h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
              </span>

              The workspace for creative work
            </span>

            <span className="h-px w-7 bg-[#2478FF]/25" />
          </motion.div>

          {/* ==================================================
              MAIN HEADLINE
          =================================================== */}

          <h1 className="font-[var(--font-fraunces)] text-[clamp(3.4rem,8.4vw,7.8rem)] font-normal leading-[0.87] tracking-[-0.055em] text-[#07080A]">
            <span className="block">Make the work.</span>

            <span className="relative mt-1 block">
              <span className="relative z-10">
                Move the{" "}
                <em className="relative font-normal not-italic text-[#2478FF]">
                  work.
                </em>
              </span>

              <motion.span
                initial={{
                  width: 0,
                  opacity: 0,
                }}
                animate={{
                  width: "32%",
                  opacity: 1,
                }}
                transition={{
                  delay: 0.9,
                  duration: 0.85,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute bottom-[-13px] left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-[#2478FF]/45"
              />
            </span>
          </h1>

          {/* ==================================================
              SUPPORTING COPY
          =================================================== */}

          <motion.p
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.38,
              duration: 0.75,
            }}
            className="mx-auto mt-10 max-w-[600px] text-[15px] leading-7 text-black/55 sm:text-[17px] sm:leading-8"
          >
            Create your portfolio, deliver projects, collaborate with
            clients and keep your creative business moving — all in one
            considered space built for people who make things.
          </motion.p>

          {/* ==================================================
              ACTIONS
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.52,
              duration: 0.75,
            }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            {/* Primary */}

            <div className="relative">
              <motion.div
                className="absolute -inset-2 rounded-full bg-[#2478FF]/10 blur-xl"
                animate={{
                  opacity: [0.35, 0.7, 0.35],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <Link
                href={isLoggedIn ? "/dashboard" : "/start"}
                className="group relative inline-flex items-center gap-3 rounded-full bg-[#2478FF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(36,120,255,.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#15309E] hover:shadow-[0_15px_40px_rgba(36,120,255,.24)]"
              >
                {isLoggedIn ? "Open Showwork" : "Get started"}

                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Secondary */}

            <Link
              href="/signup?next=/dashboard/portfolio"
              className="group inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/70 px-6 py-3.5 text-sm font-semibold text-black/65 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:bg-white hover:text-black"
            >
              Create your portfolio

              <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>

          {/* ==================================================
              APP STRIP
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.78,
              duration: 0.8,
            }}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-black/30"
          >
            <span>Portfolio</span>

            <span className="h-1 w-1 rounded-full bg-[#2478FF]/40" />

            <span>Project Delivery</span>

            <span className="h-1 w-1 rounded-full bg-[#2478FF]/40" />

            <span>Content Workspace</span>

            <span className="h-1 w-1 rounded-full bg-[#2478FF]/40" />

            <span>Creativo</span>
          </motion.div>
        </motion.div>
      </div>

      {/* ======================================================
          BOTTOM STATUS BAR
      ======================================================= */}

      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 1.2,
          duration: 1,
        }}
        className="absolute bottom-7 left-5 right-5 z-40 flex items-center justify-between sm:left-8 sm:right-8 lg:left-16 lg:right-16"
      >
        <div className="flex items-center gap-3">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[#2478FF]"
            animate={{
              boxShadow: [
                "0 0 0 rgba(36,120,255,0)",
                "0 0 14px rgba(36,120,255,.7)",
                "0 0 0 rgba(36,120,255,0)",
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/35">
            Built for modern creators
          </span>
        </div>

        <span className="hidden text-[9px] font-medium uppercase tracking-[0.18em] text-black/25 sm:block">
          Scroll to explore
        </span>
      </motion.div>

      {/* ======================================================
          MOBILE BACKGROUND DETAIL
      ======================================================= */}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/50 to-transparent" />
    </section>
  );
}
/* ============================================================
   FOUR WORLDS
============================================================ */

const WORLDS = [
  {
    number: "01",
    title: "Portfolio",
    label: "Show the work",
    body: "A considered home for the work you're proud to put your name on.",
    href: "/signup?next=/dashboard/portfolio",
    Icon: PortfolioIcon,
  },
  {
    number: "02",
    title: "Project Delivery",
    label: "Move the work",
    body: "Deliver beautifully, collect feedback and get projects across the line.",
    href: "/start",
    Icon: DeliveryIcon,
  },
  {
    number: "03",
    title: "Content Workspace",
    label: "Plan together",
    body: "An ongoing space for teams and clients to plan, present and approve.",
    href: "/signup?next=/dashboard/calendars",
    Icon: WorkspaceIcon,
  },
  {
    number: "04",
    title: "Creativo",
    label: "Grow together",
    body: "A community for creators building better businesses and better careers.",
    href: COMMUNITY_URL,
    Icon: CommunityIcon,
  },
];

function Worlds() {
  return (
    <section
      id="showwork"
      className="relative overflow-hidden bg-[#F4F5F7] px-5 py-24 sm:px-8 sm:py-32 lg:px-16 lg:py-40"
    >
      {/* background geometry */}
      <div
        className="pointer-events-none absolute right-[-160px] top-[-180px] h-[500px] w-[500px] rounded-full border border-[#2478FF]/[0.07]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute right-[-100px] top-[-120px] h-[380px] w-[380px] rounded-full border border-[#2478FF]/[0.05]"
        aria-hidden
      />

      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-[720px]">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-[#2478FF]" />

            <span className="font-[var(--font-fraunces)] text-sm italic text-[#6F7580]">
              One platform. Four ways to work.
            </span>
          </div>

          <h2 className="mt-6 font-[var(--font-fraunces)] text-[clamp(2.8rem,6vw,5.8rem)] font-normal leading-[0.94] tracking-[-0.045em] text-[#101216]">
            Everything around
            <br />
            <span className="text-[#2478FF]">the work.</span>
          </h2>

          <p className="mt-7 max-w-[540px] text-sm leading-7 text-[#737982] sm:text-base">
            Showwork gives the creative process a place to live —
            from the first impression to the final approval.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-[28px] border border-[#DDE0E5] bg-[#DDE0E5] md:grid-cols-2">
          {WORLDS.map((world, index) => {
            const external = world.href.startsWith("http");

            const card = (
              <motion.div
                whileHover={{ y: -3 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                }}
                className="group relative min-h-[320px] overflow-hidden bg-[#FAFAFB] p-7 transition-colors duration-300 hover:bg-white sm:p-9 lg:min-h-[370px] lg:p-11"
              >
                <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#2478FF]/[0.035] blur-3xl transition-all duration-500 group-hover:bg-[#2478FF]/[0.08]" />

                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#DDE1E7] bg-white text-[#2478FF] shadow-sm">
                      <world.Icon />
                    </div>

                    <span className="font-[var(--font-fraunces)] text-sm italic text-[#9CA2AB]">
                      {world.number}
                    </span>
                  </div>

                  <div className="mt-16">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                      {world.label}
                    </p>

                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#101216] sm:text-3xl">
                      {world.title}
                    </h3>

                    <p className="mt-4 max-w-[430px] text-sm leading-6 text-[#757B84]">
                      {world.body}
                    </p>

                    <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-[#101216]">
                      Explore

                      <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );

            if (external) {
              return (
                <a
                  key={world.number}
                  href={world.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {card}
                </a>
              );
            }

            return (
              <Link key={world.number} href={world.href}>
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PRODUCT MOMENT
============================================================ */

function ProductMoment({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <section className="relative overflow-hidden bg-[#07080A] px-5 py-24 sm:px-8 sm:py-32 lg:px-16 lg:py-40">
      {/* atmosphere */}
      <div
        className="pointer-events-none absolute -left-[250px] top-[10%] h-[650px] w-[650px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(36,120,255,.18), transparent 68%)",
        }}
      />

      <div
        className="pointer-events-none absolute right-[-220px] bottom-[-260px] h-[650px] w-[650px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(50,80,180,.15), transparent 68%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px]">
        <div className="grid gap-12 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-20">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-white/35" />

              <span className="font-[var(--font-fraunces)] text-sm italic text-white/50">
                The client experience
              </span>
            </div>

            <h2 className="mt-6 font-[var(--font-fraunces)] text-[clamp(2.8rem,5.5vw,5.4rem)] font-normal leading-[0.95] tracking-[-0.045em] text-white">
              Show the work
              <br />
              <span className="text-white/40">at its best.</span>
            </h2>

            <p className="mt-7 max-w-[480px] text-sm leading-7 text-white/50 sm:text-base">
              No generic folder. No awkward handover. A client
              experience that makes the work feel as valuable as
              the work itself.
            </p>

            <button
              type="button"
              onClick={onOpen}
              className="group mt-8 inline-flex items-center gap-3 text-sm font-semibold text-white"
            >
              See the experience

              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-all duration-300 group-hover:border-[#2478FF] group-hover:bg-[#2478FF]">
                <PlayIcon className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>

          {/* browser / delivery preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative"
          >
            <div className="absolute -inset-5 rounded-[32px] bg-[#2478FF]/[0.08] blur-3xl" />

            <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#111216] shadow-[0_40px_120px_rgba(0,0,0,.4)]">
              <div className="flex h-12 items-center gap-2 border-b border-white/10 px-4">
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />

                <div className="ml-4 flex h-7 flex-1 items-center rounded-md bg-white/[0.045] px-3">
                  <span className="truncate text-[9px] text-white/25">
                    client.showwork.com/project
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpen}
                className="group relative block w-full text-left"
              >
                <video
                  src="/images/motion.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.015] group-hover:opacity-100"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40">
                        Fashion campaign
                      </p>

                      <p className="mt-1 font-[var(--font-fraunces)] text-xl italic text-white sm:text-2xl">
                        The final collection
                      </p>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md">
                      <PlayIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PHILOSOPHY
============================================================ */

function Philosophy() {
  return (
    <section className="relative overflow-hidden bg-white px-5 py-28 sm:px-8 sm:py-36 lg:px-16 lg:py-44">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-14 lg:grid-cols-[0.35fr_1.65fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#2478FF]" />

              <span className="font-[var(--font-fraunces)] text-sm italic text-[#777D86]">
                Our philosophy
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-[1050px] font-[var(--font-fraunces)] text-[clamp(3rem,7vw,7.2rem)] font-normal leading-[0.91] tracking-[-0.055em] text-[#101216]">
              The work is
              <br />
              <span className="text-[#2478FF]">the point.</span>
            </h2>

            <p className="mt-10 max-w-[650px] text-base leading-8 text-[#737982] sm:text-lg">
              Everything else should make getting there easier.
              Showwork exists to remove the friction around creative
              work — presenting it, delivering it, collaborating on
              it and building a business around it.
            </p>

            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-5 border-t border-[#E5E7EB] pt-6">
              {[
                "Present beautifully",
                "Collaborate clearly",
                "Deliver confidently",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs font-semibold text-[#343840]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EEF4FF] text-[#2478FF]">
                    <CheckIcon className="h-3 w-3" />
                  </span>

                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FINAL CTA
============================================================ */

function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden bg-[#2478FF] px-5 py-28 text-white sm:px-8 sm:py-36 lg:px-16 lg:py-44">
      {/* giant geometry */}
      <div
        className="pointer-events-none absolute -right-[220px] -top-[280px] h-[700px] w-[700px] rounded-full border border-white/[0.13]"
        aria-hidden
      >
        <div className="absolute inset-[65px] rounded-full border border-white/[0.08]" />
        <div className="absolute inset-[135px] rounded-full border border-white/[0.06]" />
      </div>

      <div
        className="pointer-events-none absolute -left-[300px] bottom-[-400px] h-[700px] w-[700px] rounded-full border border-white/[0.08]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1000px] text-center">
        <p className="font-[var(--font-fraunces)] text-sm italic text-white/60">
          Ready when you are.
        </p>

        <h2 className="mt-6 font-[var(--font-fraunces)] text-[clamp(3.4rem,8vw,7.5rem)] font-normal leading-[0.88] tracking-[-0.055em]">
          Move the work.
        </h2>

        <p className="mx-auto mt-8 max-w-[520px] text-sm leading-7 text-white/70 sm:text-base">
          One place for your work, your clients and the business
          behind your craft.
        </p>

        <div className="mt-9 flex justify-center">
          <Link
            href={isLoggedIn ? "/dashboard" : "/start"}
            className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#101216] transition-all duration-300 hover:-translate-y-1 hover:bg-[#08090A] hover:text-white"
          >
            {isLoggedIn ? "Open Showwork" : "Start free"}

            <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
============================================================ */

function Footer() {
  return (
    <footer className="bg-[#07080A] px-5 py-12 text-white sm:px-8 sm:py-14 lg:px-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col justify-between gap-10 border-b border-white/10 pb-10 md:flex-row md:items-end">
          <div>
            <Wordmark color="#FFFFFF" size="md" />

            <p className="mt-4 max-w-sm text-sm leading-6 text-white/35">
              The workspace for people who take creative work
              seriously.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-sm">
            <div className="flex flex-col gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                Explore
              </p>

              <Link
                href="/start"
                className="text-white/60 transition hover:text-white"
              >
                Project delivery
              </Link>

              <Link
                href="/signup?next=/dashboard/portfolio"
                className="text-white/60 transition hover:text-white"
              >
                Portfolio
              </Link>

              <a
                href={COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 transition hover:text-white"
              >
                Creativo
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                Account
              </p>

              <Link
                href="/login"
                className="text-white/60 transition hover:text-white"
              >
                Log in
              </Link>

              <Link
                href="/start"
                className="text-white/60 transition hover:text-white"
              >
                Get started
              </Link>

              <a
                href="mailto:hello@useshowwork.com"
                className="text-white/60 transition hover:text-white"
              >
                Contact
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 pt-6 text-[10px] text-white/25 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Showwork. All rights reserved.
          </span>

          <span>
            Considered work, considered delivery.
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   VIDEO MODAL
============================================================ */

function VideoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 px-4 py-6 backdrop-blur-xl"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10"
      >
        ×
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
      >
        <video
          src="/images/motion.mp4"
          controls
          autoPlay
          playsInline
          className="max-h-[84vh] w-full object-contain"
        />
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function HomeClient({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <main
      className={`${jakarta.variable} ${fraunces.variable} overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-jakarta)",
        background: COLOR.paper,
      }}
    >
      <FloatingStartButton />

      <Hero isLoggedIn={isLoggedIn} />

      <Worlds />

      <ProductMoment onOpen={() => setShowVideo(true)} />

      <Philosophy />

      <FinalCTA isLoggedIn={isLoggedIn} />

      <Footer />

      {showVideo && (
        <VideoModal
          open={showVideo}
          onClose={() => setShowVideo(false)}
        />
      )}
    </main>
  );
}