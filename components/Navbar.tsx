"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Menu,
  X,
  Home,
  UsersRound,
  LogIn,
  Sparkles,
  Newspaper,
  Trophy,
  Star,
  BriefcaseBusiness,
  Layers3,
  Workflow,
  ChevronDown,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                               BRAND SYSTEM                                 */
/* -------------------------------------------------------------------------- */

const COLOR = {
  ink: "#0B0D10",
  black: "#080808",
  muted: "#667085",
  blue: "#2478FF",
  blueDark: "#0052FF",
  blueSoft: "#DCE9FF",
  bluePale: "#F1F6FF",
  line: "rgba(11,13,16,0.09)",
  paper: "#F8FAFD",
  white: "#FFFFFF",
};

/* -------------------------------------------------------------------------- */
/*                                   LOGO                                     */
/* -------------------------------------------------------------------------- */

function Logo() {
  return (
    <Link
      href="/"
      aria-label="Showwork home"
      className="group relative flex shrink-0 items-center"
    >
      <div
        role="img"
        aria-label="Showwork"
        className="relative z-10 transition-transform duration-300 group-hover:scale-[1.035]"
        style={{
          height: 24,
          width: 112,
          background:
            "linear-gradient(90deg, #080808 0%, #080808 68%, #2478FF 100%)",

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

      <motion.span
        className="absolute -bottom-2 left-0 h-[2px] rounded-full"
        initial={{ width: 0 }}
        whileHover={{ width: "100%" }}
        transition={{
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          background: COLOR.blue,
        }}
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SOLUTIONS DATA                                */
/* -------------------------------------------------------------------------- */

const SOLUTIONS = [
  {
    label: "Portfolio",
    eyebrow: "PRESENT YOUR WORK",
    description:
      "Create a portfolio that makes your work easier to discover, understand and remember.",
    href: "/portfolio",
    icon: BriefcaseBusiness,
    number: "01",
    accent: "#2478FF",
    visual: "portfolio",
  },
  {
    label: "Project Delivery",
    eyebrow: "DELIVER THE WORK",
    description:
      "Present projects, collect feedback, get approvals and move work to completion.",
    href: "/delivery",
    icon: Workflow,
    number: "02",
    accent: "#0052FF",
    visual: "delivery",
  },
  {
    label: "Content Workspace",
    eyebrow: "MANAGE THE WORK",
    description:
      "Plan, present and approve content with clients and teams in one living workspace.",
    href: "/content-workspace",
    icon: Layers3,
    number: "03",
    accent: "#2478FF",
    visual: "workspace",
  },
];

/* -------------------------------------------------------------------------- */
/*                                NAVIGATION                                  */
/* -------------------------------------------------------------------------- */

const NAV_LINKS = [
  {
    label: "Creativo",
    href: "/creativo",
    icon: UsersRound,
    badge: "COMMUNITY",
  },
  {
    label: "Spotlight",
    href: "/spotlight",
    icon: Star,
  },
  {
    label: "Webinars",
    href: "/webinars",
    icon: Star,
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
  {
    label: "Blog",
    href: "/blog",
    icon: Newspaper,
  },
];

/* -------------------------------------------------------------------------- */
/*                              SOLUTION VISUAL                               */
/* -------------------------------------------------------------------------- */

function SolutionVisual({
  type,
}: {
  type: "portfolio" | "delivery" | "workspace";
}) {
  if (type === "portfolio") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-[#F2F6FC]">
        {/* architectural glow */}
        <div
          className="absolute -right-8 -top-10 h-32 w-32 rounded-full blur-3xl"
          style={{
            background: "rgba(36,120,255,0.18)",
          }}
        />

        {/* grid */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(11,13,16,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(11,13,16,0.055) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* portfolio card */}
        <div className="absolute left-5 top-5 w-[78%] rounded-xl border border-black/[0.08] bg-white p-3 shadow-[0_16px_40px_-20px_rgba(11,13,16,0.28)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-1.5 w-14 rounded-full bg-black/80" />
              <div className="mt-1.5 h-1 w-9 rounded-full bg-black/10" />
            </div>

            <div className="h-5 w-5 rounded-full bg-[#DCE9FF]" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            <div className="aspect-square rounded-md bg-[#DCE9FF]" />
            <div className="aspect-square rounded-md bg-[#E9EDF3]" />
            <div className="aspect-square rounded-md bg-[#C8D8F5]" />
          </div>
        </div>

        <div className="absolute bottom-4 right-4 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
            <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-black/45">
              Live portfolio
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "delivery") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-[#0B0D10]">
        <div
          className="absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl"
          style={{
            background: "rgba(36,120,255,0.3)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="absolute left-5 top-5 right-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-1.5 w-20 rounded-full bg-white/85" />
              <div className="mt-1.5 h-1 w-12 rounded-full bg-white/20" />
            </div>

            <div className="rounded-full bg-[#2478FF] px-2 py-1">
              <span className="text-[6px] font-bold uppercase tracking-[0.1em] text-white">
                Review
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-md">
            <div className="h-2 w-[72%] rounded-full bg-white/15" />

            <div className="mt-4 grid grid-cols-4 gap-1">
              <div className="h-1.5 rounded-full bg-[#2478FF]" />
              <div className="h-1.5 rounded-full bg-white/15" />
              <div className="h-1.5 rounded-full bg-white/15" />
              <div className="h-1.5 rounded-full bg-white/15" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="h-1 w-14 rounded-full bg-white/15" />
              <div className="h-5 w-14 rounded-full bg-white/90" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-5">
          <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-white/35">
            Project delivery
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-[#EFF5FF]">
      <div
        className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: "rgba(36,120,255,0.16)",
        }}
      />

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(11,13,16,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(11,13,16,0.045) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="absolute left-5 right-5 top-5">
        <div className="rounded-xl border border-black/[0.08] bg-white p-3 shadow-[0_16px_40px_-24px_rgba(11,13,16,0.25)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-1.5 w-20 rounded-full bg-black/75" />
              <div className="mt-1.5 h-1 w-12 rounded-full bg-black/10" />
            </div>

            <div className="flex -space-x-1">
              <span className="h-5 w-5 rounded-full border-2 border-white bg-[#DCE9FF]" />
              <span className="h-5 w-5 rounded-full border-2 border-white bg-[#B7CFFF]" />
              <span className="h-5 w-5 rounded-full border-2 border-white bg-[#2478FF]" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2478FF]" />
              <span className="h-1.5 w-24 rounded-full bg-black/10" />
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#AFC8F8]" />
              <span className="h-1.5 w-20 rounded-full bg-black/10" />
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-black/10" />
              <span className="h-1.5 w-28 rounded-full bg-black/10" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 shadow-sm">
        <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#2478FF]">
          Client workspace
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            SOLUTIONS DROPDOWN                              */
/* -------------------------------------------------------------------------- */

function SolutionsDropdown({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Desktop backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[-1] hidden bg-black/[0.02] lg:block"
            onClick={onClose}
          />

          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.98,
            }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute left-1/2 top-[calc(100%+12px)] hidden w-[min(900px,calc(100vw-40px))] -translate-x-1/2 lg:block"
          >
            <div
              className="relative overflow-hidden rounded-[28px] border bg-white/95 p-4 shadow-[0_35px_100px_-35px_rgba(11,13,16,0.28)] backdrop-blur-2xl"
              style={{
                borderColor: "rgba(11,13,16,0.09)",
              }}
            >
              {/* Background architecture */}

              <div
                className="pointer-events-none absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(11,13,16,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(11,13,16,0.035) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />

              <div
                className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full blur-3xl"
                style={{
                  background: "rgba(36,120,255,0.10)",
                }}
              />

              {/* Header */}

              <div className="relative flex items-end justify-between px-4 pb-4 pt-2">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: COLOR.blue,
                      }}
                    />

                    <span
                      className="text-[9px] font-bold uppercase text-[#2478FF]"
                      style={{
                        letterSpacing: "0.18em",
                      }}
                    >
                      Solutions
                    </span>
                  </div>

                  <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-[#0B0D10]">
                    Everything you need to move creative work forward.
                  </h3>
                </div>

                <div className="hidden text-right md:block">
                  <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-black/25">
                    Showwork
                  </p>
                  <p className="mt-1 text-[9px] text-black/35">
                    One workspace. Three ways to work.
                  </p>
                </div>
              </div>

              {/* Solution cards */}

              <div className="relative grid gap-3 md:grid-cols-3">
                {SOLUTIONS.map((solution, index) => {
                  const Icon = solution.icon;

                  return (
                    <Link
                      key={solution.href}
                      href={solution.href}
                      onClick={onClose}
                      className="group relative overflow-hidden rounded-[22px] border border-black/[0.07] bg-white transition-all duration-500 hover:-translate-y-1 hover:border-black/[0.12] hover:shadow-[0_24px_50px_-28px_rgba(11,13,16,0.35)]"
                    >
                      {/* hover glow */}

                      <div
                        className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                        style={{
                          background: `${solution.accent}30`,
                        }}
                      />

                      {/* Visual */}

                      <div className="relative p-2">
                        <div className="h-[138px]">
                          <SolutionVisual type={solution.visual as any} />
                        </div>
                      </div>

                      {/* Content */}

                      <div className="relative px-5 pb-5 pt-3">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-xl"
                            style={{
                              background: `${solution.accent}10`,
                              border: `1px solid ${solution.accent}18`,
                            }}
                          >
                            <Icon
                              size={14}
                              strokeWidth={2}
                              style={{
                                color: solution.accent,
                              }}
                            />
                          </div>

                          <span className="text-[9px] font-bold tracking-[0.08em] text-black/20">
                            {solution.number}
                          </span>
                        </div>

                        <p
                          className="mt-4 text-[8px] font-bold uppercase"
                          style={{
                            color: solution.accent,
                            letterSpacing: "0.14em",
                          }}
                        >
                          {solution.eyebrow}
                        </p>

                        <h4 className="mt-1.5 text-[17px] font-semibold tracking-[-0.04em] text-[#0B0D10]">
                          {solution.label}
                        </h4>

                        <p className="mt-2 min-h-[48px] text-[11px] leading-[1.6] text-black/45">
                          {solution.description}
                        </p>

                        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-[#0B0D10] transition-colors duration-300 group-hover:text-[#2478FF]">
                          Explore
                          <ArrowUpRight
                            size={12}
                            strokeWidth={2.5}
                            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Bottom line */}

              <div className="relative mt-3 flex items-center justify-between rounded-[18px] bg-[#F7F9FC] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-1.5">
                    <span className="h-5 w-5 rounded-full border-2 border-[#F7F9FC] bg-[#DCE9FF]" />
                    <span className="h-5 w-5 rounded-full border-2 border-[#F7F9FC] bg-[#AFC8F8]" />
                    <span className="h-5 w-5 rounded-full border-2 border-[#F7F9FC] bg-[#2478FF]" />
                  </div>

                  <span className="text-[9px] font-medium text-black/40">
                    Built for people who make things.
                  </span>
                </div>

                <Link
                  href="/signup"
                  onClick={onClose}
                  className="group flex items-center gap-1.5 text-[10px] font-bold text-[#2478FF]"
                >
                  Get started
                  <ArrowUpRight
                    size={12}
                    strokeWidth={2.5}
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*                                NAV LINK                                    */
/* -------------------------------------------------------------------------- */

function NavLink({
  label,
  href,
  icon: Icon,
  badge,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-2 py-2 text-[12px] font-semibold tracking-[-0.01em] text-black/50 transition-colors duration-300 hover:text-black"
    >
      <Icon
        size={13}
        strokeWidth={2}
        className="transition-transform duration-300 group-hover:-translate-y-px"
        style={{
          color: badge ? COLOR.blue : COLOR.muted,
        }}
      />

      <span>{label}</span>

      {badge && (
        <span
          className="rounded-full px-1.5 py-[2px] text-[7px] font-bold"
          style={{
            background: COLOR.blueSoft,
            color: COLOR.blueDark,
            letterSpacing: "0.08em",
          }}
        >
          {badge}
        </span>
      )}

      <motion.span
        className="absolute -bottom-1 left-0 h-[1.5px] rounded-full"
        initial={{ width: 0 }}
        whileHover={{ width: "100%" }}
        transition={{
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          background: COLOR.blue,
        }}
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                              PRIMARY BUTTON                                */
/* -------------------------------------------------------------------------- */

function PrimaryButton({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative overflow-hidden rounded-full"
    >
      <span
        className="pointer-events-none absolute -inset-3 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60"
        style={{
          background: "rgba(36,120,255,0.28)",
        }}
      />

      <span
        className="relative flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-bold text-white transition-all duration-300 group-hover:-translate-y-px"
        style={{
          background:
            "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
          boxShadow:
            "0 10px 30px -14px rgba(36,120,255,0.75)",
        }}
      >
        {children}

        <ArrowUpRight
          size={14}
          strokeWidth={2.5}
          className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  NAVBAR                                    */
/* -------------------------------------------------------------------------- */

export default function Navbar({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      setSolutionsOpen(false);
    }
  }, [mobileOpen]);

  return (
    <motion.header
      initial={{
        opacity: 0,
        y: -16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5"
    >
      <div
        className="relative mx-auto max-w-[1480px] transition-all duration-500"
        style={{
          borderRadius: mobileOpen
            ? "26px"
            : scrolled
              ? "999px"
              : "24px",

          background: mobileOpen
            ? "rgba(255,255,255,0.98)"
            : scrolled
              ? "rgba(255,255,255,0.88)"
              : "rgba(255,255,255,0.58)",

          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",

          border: `1px solid ${
            scrolled || mobileOpen
              ? "rgba(11,13,16,0.10)"
              : "rgba(11,13,16,0.07)"
          }`,

          boxShadow:
            scrolled || mobileOpen
              ? "0 18px 60px -30px rgba(11,13,16,0.22)"
              : "0 10px 40px -30px rgba(11,13,16,0.12)",
        }}
      >
        {/* ------------------------------------------------------------------ */}
        {/*                         AMBIENT LIGHT                              */}
        {/* ------------------------------------------------------------------ */}

        <div
          className="pointer-events-none absolute left-[10%] top-0 h-full w-40 opacity-[0.10] blur-[45px]"
          style={{
            background: COLOR.blue,
          }}
        />

        <div
          className="pointer-events-none absolute right-[18%] top-0 h-full w-24 opacity-[0.06] blur-[40px]"
          style={{
            background: "#8AB6FF",
          }}
        />

        {/* ------------------------------------------------------------------ */}
        {/*                              GRAIN                                 */}
        {/* ------------------------------------------------------------------ */}

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025]"
          aria-hidden
        >
          <filter id="showworkNavGrain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              stitchTiles="stitch"
            />
          </filter>

          <rect
            width="100%"
            height="100%"
            filter="url(#showworkNavGrain)"
          />
        </svg>

        {/* ------------------------------------------------------------------ */}
        {/*                               NAV                                  */}
        {/* ------------------------------------------------------------------ */}

        <nav className="relative z-20 flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 md:px-7 md:py-3.5">
          {/* Logo + desktop navigation */}

          <div className="flex items-center gap-12">
            <Logo />

            <div className="hidden items-center gap-7 lg:flex">
              {/* ------------------------------------------------------------ */}
              {/*                         SOLUTIONS                             */}
              {/* ------------------------------------------------------------ */}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSolutionsOpen((v) => !v)}
                  aria-expanded={solutionsOpen}
                  aria-haspopup="true"
                  className="group relative flex items-center gap-1.5 py-2 text-[12px] font-semibold tracking-[-0.01em] text-black/55 transition-colors duration-300 hover:text-black"
                >
                  <Layers3
                    size={13}
                    strokeWidth={2}
                    className="transition-transform duration-300 group-hover:-translate-y-px"
                    style={{
                      color: COLOR.blue,
                    }}
                  />

                  <span>Solutions</span>

                  <ChevronDown
                    size={12}
                    strokeWidth={2}
                    className={`transition-transform duration-300 ${
                      solutionsOpen ? "rotate-180" : ""
                    }`}
                    style={{
                      color: COLOR.muted,
                    }}
                  />

                  <motion.span
                    className="absolute -bottom-1 left-0 h-[1.5px] rounded-full"
                    animate={{
                      width: solutionsOpen ? "100%" : 0,
                    }}
                    transition={{
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      background: COLOR.blue,
                    }}
                  />
                </button>

                <SolutionsDropdown
                  open={solutionsOpen}
                  onClose={() => setSolutionsOpen(false)}
                />
              </div>

              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  label={link.label}
                  href={link.href}
                  icon={link.icon}
                  badge={link.badge}
                />
              ))}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/*                         DESKTOP ACTIONS                           */}
          {/* ---------------------------------------------------------------- */}

          <div className="hidden items-center gap-5 sm:flex">
            {isLoggedIn ? (
              <PrimaryButton href="/dashboard">
                Go to dashboard
              </PrimaryButton>
            ) : (
              <>
                <Link
                  href="/login"
                  className="group flex items-center gap-2 text-[12px] font-semibold text-black/55 transition-colors duration-300 hover:text-black"
                >
                  <LogIn
                    size={14}
                    strokeWidth={2}
                    className="transition-transform duration-300 group-hover:-translate-x-0.5"
                  />

                  <span>Log in</span>
                </Link>

                <PrimaryButton href="/signup">
                  Get started
                </PrimaryButton>
              </>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/*                           MOBILE BUTTON                           */}
          {/* ---------------------------------------------------------------- */}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 sm:hidden"
            style={{
              borderColor: mobileOpen
                ? "rgba(36,120,255,0.22)"
                : "rgba(11,13,16,0.10)",
              background: mobileOpen
                ? "rgba(36,120,255,0.08)"
                : "rgba(255,255,255,0.7)",
            }}
          >
            <motion.div
              animate={{
                rotate: mobileOpen ? 90 : 0,
              }}
              transition={{
                duration: 0.25,
              }}
            >
              {mobileOpen ? (
                <X
                  size={18}
                  strokeWidth={2}
                  style={{
                    color: COLOR.blue,
                  }}
                />
              ) : (
                <Menu
                  size={19}
                  strokeWidth={2}
                  style={{
                    color: COLOR.ink,
                  }}
                />
              )}
            </motion.div>
          </button>
        </nav>

        {/* ------------------------------------------------------------------ */}
        {/*                          MOBILE MENU                               */}
        {/* ------------------------------------------------------------------ */}

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              transition={{
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative z-10 overflow-hidden lg:hidden"
            >
              <div
                className="border-t px-4 pb-4 pt-4 sm:px-5 sm:pb-5"
                style={{
                  borderColor: COLOR.line,
                }}
              >
                {/* ---------------------------------------------------------- */}
                {/*                         SOLUTIONS                           */}
                {/* ---------------------------------------------------------- */}

                <div>
                  <button
                    type="button"
                    onClick={() => setSolutionsOpen((v) => !v)}
                    aria-expanded={solutionsOpen}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-3.5 text-left transition-colors duration-300 hover:bg-black/[0.035]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{
                          background: "rgba(36,120,255,0.08)",
                          border: "1px solid rgba(36,120,255,0.12)",
                        }}
                      >
                        <Layers3
                          size={15}
                          strokeWidth={2}
                          style={{
                            color: COLOR.blue,
                          }}
                        />
                      </div>

                      <div>
                        <span className="block text-[13px] font-semibold text-black">
                          Solutions
                        </span>

                        <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.13em] text-[#2478FF]">
                          Explore Showwork
                        </span>
                      </div>
                    </div>

                    <ChevronDown
                      size={17}
                      strokeWidth={2}
                      className={`transition-transform duration-300 ${
                        solutionsOpen ? "rotate-180" : ""
                      }`}
                      style={{
                        color: COLOR.muted,
                      }}
                    />
                  </button>

                  <AnimatePresence>
                    {solutionsOpen && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          height: 0,
                        }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                        }}
                        transition={{
                          duration: 0.3,
                        }}
                        className="overflow-hidden"
                      >
                        <div className="ml-3 space-y-1 border-l border-black/[0.08] pb-2 pl-3">
                          {SOLUTIONS.map((solution, index) => {
                            const Icon = solution.icon;

                            return (
                              <motion.div
                                key={solution.href}
                                initial={{
                                  opacity: 0,
                                  x: -8,
                                }}
                                animate={{
                                  opacity: 1,
                                  x: 0,
                                }}
                                transition={{
                                  delay: index * 0.05,
                                }}
                              >
                                <Link
                                  href={solution.href}
                                  onClick={() => {
                                    setMobileOpen(false);
                                    setSolutionsOpen(false);
                                  }}
                                  className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-300 hover:bg-black/[0.035]"
                                >
                                  <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                                    style={{
                                      background: `${solution.accent}0D`,
                                      border: `1px solid ${solution.accent}16`,
                                    }}
                                  >
                                    <Icon
                                      size={14}
                                      strokeWidth={2}
                                      style={{
                                        color: solution.accent,
                                      }}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-semibold text-black">
                                        {solution.label}
                                      </span>

                                      <span className="text-[7px] font-bold tracking-[0.08em] text-black/20">
                                        {solution.number}
                                      </span>
                                    </div>

                                    <p className="mt-0.5 truncate text-[9px] text-black/40">
                                      {solution.description}
                                    </p>
                                  </div>

                                  <ArrowUpRight
                                    size={14}
                                    strokeWidth={2}
                                    className="shrink-0 text-black/25 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2478FF]"
                                  />
                                </Link>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ---------------------------------------------------------- */}
                {/*                      MAIN NAVIGATION                        */}
                {/* ---------------------------------------------------------- */}

                <div className="mt-2 grid gap-1">
                  {NAV_LINKS.map((link, index) => {
                    const Icon = link.icon;

                    return (
                      <motion.div
                        key={link.href}
                        initial={{
                          opacity: 0,
                          x: -12,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: 0.04 + index * 0.045,
                          duration: 0.3,
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="group flex items-center justify-between rounded-2xl px-3 py-3.5 transition-all duration-300 hover:bg-black/[0.035]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-xl"
                              style={{
                                background: link.badge
                                  ? "rgba(36,120,255,0.08)"
                                  : "rgba(11,13,16,0.045)",
                                border: `1px solid ${
                                  link.badge
                                    ? "rgba(36,120,255,0.12)"
                                    : "rgba(11,13,16,0.07)"
                                }`,
                              }}
                            >
                              <Icon
                                size={15}
                                strokeWidth={2}
                                style={{
                                  color: link.badge
                                    ? COLOR.blue
                                    : COLOR.ink,
                                }}
                              />
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-black">
                                {link.label}
                              </span>

                              {link.badge && (
                                <span
                                  className="mt-0.5 text-[7px] font-bold uppercase"
                                  style={{
                                    color: COLOR.blue,
                                    letterSpacing: "0.13em",
                                  }}
                                >
                                  {link.badge}
                                </span>
                              )}
                            </div>
                          </div>

                          <ArrowUpRight
                            size={16}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            style={{
                              color: COLOR.muted,
                            }}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* ---------------------------------------------------------- */}
                {/*                       ACCOUNT ACTIONS                      */}
                {/* ---------------------------------------------------------- */}

                <div
                  className="mt-4 grid gap-2.5 border-t pt-4"
                  style={{
                    borderColor: COLOR.line,
                  }}
                >
                  {isLoggedIn ? (
                    <PrimaryButton
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                    >
                      Go to dashboard
                    </PrimaryButton>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-center text-[12px] font-bold text-black/65 transition-all duration-300 hover:bg-black/[0.035] hover:text-black"
                        style={{
                          borderColor: "rgba(11,13,16,0.10)",
                        }}
                      >
                        <LogIn size={14} strokeWidth={2} />

                        Log in
                      </Link>

                      <Link
                        href="/signup"
                        onClick={() => setMobileOpen(false)}
                        className="group relative overflow-hidden rounded-full px-5 py-3.5 text-center text-[12px] font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
                          boxShadow:
                            "0 12px 30px -15px rgba(36,120,255,0.65)",
                        }}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <Sparkles
                            size={14}
                            strokeWidth={2.2}
                          />

                          Start creating

                          <ArrowUpRight
                            size={14}
                            strokeWidth={2.5}
                            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </span>
                      </Link>
                    </>
                  )}
                </div>

                {/* ---------------------------------------------------------- */}
                {/*                         BRAND SIGNATURE                     */}
                {/* ---------------------------------------------------------- */}

                <div className="mt-5 flex items-center gap-3 px-1">
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(36,120,255,0.65), rgba(36,120,255,0.05))",
                    }}
                  />

                  <span
                    className="whitespace-nowrap text-[7px] font-bold uppercase text-black/20"
                    style={{
                      letterSpacing: "0.17em",
                    }}
                  >
                    SHOW YOUR WORK
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}