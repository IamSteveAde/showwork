"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Plus_Jakarta_Sans } from "next/font/google";
import HostApplicationModal from "@/components/creativo/HostApplicationModal";
import {
  Send,
  BadgeDollarSign,
  UsersRound,
  Eye,
} from "lucide-react";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

/* -------------------------------------------------------------------------- */
/*                               BRAND SYSTEM                                 */
/* -------------------------------------------------------------------------- */

const COLOR = {
  black: "#080808",
  charcoal: "#121212",
  white: "#FFFFFF",
  cream: "#F7F4EC",

  blue: "#2478FF",
  blueDark: "#0052FF",

  lime: "#B8FF35",
  orange: "#FF8A1F",
  yellow: "#FFCC00",

  coral: "#FF5A5F",
  magenta: "#FF2E88",
};

const GRADIENT = {
  creativo:
    "linear-gradient(135deg, #FF5A5F 0%, #FF2E88 45%, #FF8A1F 100%)",

  showwork:
    "linear-gradient(135deg, #2478FF 0%, #0052FF 45%, #B8FF35 100%)",

  energy:
    "linear-gradient(135deg, #2478FF 0%, #B8FF35 45%, #FFCC00 70%, #FF8A1F 100%)",
};

type Category =
  | "Photography"
  | "Videography"
  | "Motion"
  | "Editing";

const CATEGORIES: Category[] = [
  "Photography",
  "Videography",
  "Motion",
  "Editing",
];

export interface LeaderboardEntryData {
  id: string;
  name: string;
  profileImageUrl: string | null;
  category: string;
  whatTheyDo: string | null;
  contact: string | null;
  portfolioUrl: string | null;
  whatsappNumber: string | null;
  wonFor: string;
  points: number;
  periodDate: string;
}

export interface WebinarData {
  id: string;
  flyerImageUrl: string | null;
  topic: string;
  guests: string | null;
  startsAt: string;
  venue: string | null;
  applyUrl: string | null;
  replayUrl: string | null;
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function periodKey(iso: string): string {
  const d = new Date(iso);

  return `${d.getUTCFullYear()}-${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function periodLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function spotlightWhatsappHref(
  whatsappNumber: string,
  name: string
): string {
  const message = `Hi ${name}, I saw your work on Creativo and would love to work with you on a project.`;

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}

const RANK_COLOR = [
  COLOR.yellow,
  COLOR.lime,
  COLOR.orange,
];

/* -------------------------------------------------------------------------- */
/*                                ATMOSPHERE                                  */
/* -------------------------------------------------------------------------- */

function Orb({
  color,
  size,
  left,
  top,
  opacity = 0.3,
  duration = 20,
}: {
  color: string;
  size: number;
  left: string;
  top: string;
  opacity?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        left,
        top,
        background: color,
        opacity,
        filter: "blur(100px)",
      }}
      animate={{
        x: [0, 40, -20, 0],
        y: [0, -30, 30, 0],
        scale: [1, 1.1, 0.96, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function SectionLabel({
  children,
  color = COLOR.magenta,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 18px ${color}`,
        }}
      />

      <span
        className="text-[10px] font-extrabold uppercase"
        style={{
          color,
          letterSpacing: "0.22em",
        }}
      >
        {children}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAGNETIC BUTTON                               */
/* -------------------------------------------------------------------------- */

function MagneticButton({
  children,
  className,
  style,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const [offset, setOffset] = useState({
    x: 0,
    y: 0,
  });

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={(e) => {
        const el = ref.current;

        if (!el) return;

        const rect = el.getBoundingClientRect();

        setOffset({
          x:
            (e.clientX -
              (rect.left + rect.width / 2)) *
            0.18,

          y:
            (e.clientY -
              (rect.top + rect.height / 2)) *
            0.18,
        });
      }}
      onMouseLeave={() =>
        setOffset({
          x: 0,
          y: 0,
        })
      }
      animate={{
        x: offset.x,
        y: offset.y,
      }}
      transition={{
        type: "spring",
        stiffness: 180,
        damping: 14,
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.a>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MAIN PAGE                                   */
/* -------------------------------------------------------------------------- */

export default function CreativoContent({
  memberCountLabel,
  entries,
  webinars,
}: {
  memberCountLabel: string | null;
  entries: LeaderboardEntryData[];
  webinars: WebinarData[];
}) {
  const [filterCategory, setFilterCategory] =
    useState<Category | "All">("All");

  const [hostModalOpen, setHostModalOpen] =
    useState(false);

  const [mobileNavOpen, setMobileNavOpen] =
    useState(false);

  const [scrolled, setScrolled] =
    useState(false);

  const heroRef =
    useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(
    scrollYProgress,
    [0, 0.8],
    [1, 0]
  );

  const heroScale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, 1.08]
  );

  useEffect(() => {
    const onScroll = () =>
      setScrolled(window.scrollY > 40);

    onScroll();

    window.addEventListener(
      "scroll",
      onScroll,
      {
        passive: true,
      }
    );

    return () =>
      window.removeEventListener(
        "scroll",
        onScroll
      );
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      mobileNavOpen
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  /* ---------------------------------------------------------------------- */
  /*                              DATA LOGIC                                */
  /* ---------------------------------------------------------------------- */

  const availablePeriods = useMemo(() => {
    const seen = new Map<
      string,
      string
    >();

    for (const e of entries) {
      const key = periodKey(
        e.periodDate
      );

      if (!seen.has(key)) {
        seen.set(
          key,
          e.periodDate
        );
      }
    }

    return [
      ...seen.entries(),
    ].sort((a, b) =>
      a[0] < b[0] ? 1 : -1
    );
  }, [entries]);

  const [
    filterPeriodKey,
    setFilterPeriodKey,
  ] = useState<string | null>(
    null
  );

  const effectivePeriodKey =
    filterPeriodKey ??
    availablePeriods[0]?.[0] ??
    null;

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const matchesCategory =
          filterCategory === "All" ||
          e.category ===
            filterCategory;

        const matchesPeriod =
          effectivePeriodKey ===
            null ||
          periodKey(
            e.periodDate
          ) ===
            effectivePeriodKey;

        return (
          matchesCategory &&
          matchesPeriod
        );
      })
      .sort(
        (a, b) =>
          b.points -
          a.points
      );
  }, [
    entries,
    filterCategory,
    effectivePeriodKey,
  ]);

  const heroTopEntries =
    useMemo(() => {
      const mostRecentKey =
        availablePeriods[0]?.[0];

      if (!mostRecentKey)
        return [];

      return entries
        .filter(
          (e) =>
            periodKey(
              e.periodDate
            ) === mostRecentKey
        )
        .sort(
          (a, b) =>
            b.points -
            a.points
        )
        .slice(0, 3);
    }, [
      entries,
      availablePeriods,
    ]);

  const now = new Date();

  const upcomingWebinars =
    webinars
      .filter(
        (w) =>
          new Date(
            w.startsAt
          ) >= now
      )
      .sort(
        (a, b) =>
          +new Date(
            a.startsAt
          ) -
          +new Date(
            b.startsAt
          )
      );

  const pastWebinars =
    webinars.filter(
      (w) =>
        new Date(
          w.startsAt
        ) < now
    );

  return (
    <main
      className={`${jakarta.variable} min-h-screen overflow-hidden`}
      style={{
        fontFamily:
          "var(--font-jakarta)",
        background: COLOR.cream,
      }}
    >

      {/* ================================================================ */}
      {/* NAVIGATION                                                       */}
      {/* ================================================================ */}

      <header
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-all duration-500 sm:px-5 sm:pt-5"
      >
        <div
          className="relative mx-auto max-w-[1450px] overflow-hidden transition-all duration-500"
          style={{
            background: scrolled
              ? "rgba(8,8,8,0.82)"
              : "rgba(8,8,8,0.28)",

            backdropFilter:
              "blur(22px)",

            border:
              "1px solid rgba(255,255,255,0.1)",

            borderRadius: scrolled
  ? "28px"
  : scrolled
  ? "999px"
  : "28px",

            boxShadow: scrolled
              ? "0 20px 70px -30px rgba(0,0,0,0.8)"
              : "none",
          }}
        >

          <div
            className="pointer-events-none absolute left-[10%] top-0 h-full w-40 blur-[50px]"
            style={{
              background:
                COLOR.magenta,
              opacity: 0.16,
            }}
          />

          <div
            className="pointer-events-none absolute right-[10%] top-0 h-full w-40 blur-[50px]"
            style={{
              background:
                COLOR.orange,
              opacity: 0.12,
            }}
          />

          <nav className="relative z-10 flex items-center justify-between px-5 py-3.5 md:px-7">

            <Link
              href="/creativo"
              className="group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}

              <img
                src="/images/logo/creativo.svg"
                alt="Creativo"
                className="h-7 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </Link>

            <div className="hidden items-center gap-7 sm:flex">

              <Link
                href="/"
                className="text-[13px] font-semibold text-white/55 transition-colors hover:text-white"
              >
                Showwork
              </Link>

              <Link
                href="/login"
                className="text-[13px] font-semibold text-white/55 transition-colors hover:text-white"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="text-[13px] font-semibold text-white/55 transition-colors hover:text-white"
              >
                Sign up
              </Link>

              <MagneticButton
                href="https://tinyurl.com/creativocommunity"
                className="relative overflow-hidden rounded-full px-6 py-3 text-[13px] font-extrabold text-white"
                style={{
                  background:
                    GRADIENT.creativo,

                  boxShadow:
                    "0 12px 35px -14px rgba(255,46,136,0.8)",
                }}
              >
                Join community ↗
              </MagneticButton>

            </div>

            <button
              onClick={() =>
                setMobileNavOpen(
                  (v) => !v
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 sm:hidden"
              style={{
                background:
                  mobileNavOpen
                    ? COLOR.lime
                    : "rgba(255,255,255,0.08)",
              }}
            >

              {mobileNavOpen ? (
                <span className="text-lg font-bold text-black">
                  ×
                </span>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-white"
                >
                  <path
                    d="M4 7H20M4 12H20M4 17H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}

            </button>

          </nav>

          <AnimatePresence>

            {mobileNavOpen && (

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
                }}
                className="overflow-hidden sm:hidden"
              >

                <div className="border-t border-white/10 px-5 pb-5 pt-4">

                  {[
                    {
                      label:
                        "Showwork",
                      href: "/",
                    },
                    {
                      label:
                        "Log in",
                      href: "/login",
                    },
                    {
                      label:
                        "Sign up",
                      href: "/signup",
                    },
                  ].map(
                    (item) => (

                      <Link
                        key={
                          item.href
                        }
                        href={
                          item.href
                        }
                        onClick={() =>
                          setMobileNavOpen(
                            false
                          )
                        }
                        className="flex items-center justify-between rounded-2xl px-4 py-4 text-sm font-bold text-white/75 hover:bg-white/5"
                      >

                        {
                          item.label
                        }

                        <span
                          style={{
                            color:
                              COLOR.lime,
                          }}
                        >
                          ↗
                        </span>

                      </Link>

                    )
                  )}

                </div>

              </motion.div>

            )}

          </AnimatePresence>

        </div>
      </header>


      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}

      <section
        ref={heroRef}
        className="relative flex min-h-[100svh] items-end overflow-hidden px-6 pb-20 pt-36 md:px-12 md:pb-28"
        style={{
          background:
            COLOR.black,
        }}
      >

        <Orb
          color={COLOR.magenta}
          size={650}
          left="-18%"
          top="-20%"
          opacity={0.35}
          duration={24}
        />

        <Orb
          color={COLOR.orange}
          size={500}
          left="62%"
          top="-10%"
          opacity={0.22}
          duration={20}
        />

        <Orb
          color={COLOR.blue}
          size={500}
          left="70%"
          top="55%"
          opacity={0.2}
          duration={26}
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(#FFFFFF 1px, transparent 1px)",

            backgroundSize:
              "30px 30px",
          }}
        />

        <motion.div
          style={{
            opacity:
              heroOpacity,

            scale:
              heroScale,
          }}
          className="relative mx-auto w-full max-w-[1350px]"
        >

          <div className="grid items-end gap-14 lg:grid-cols-[1.15fr_.85fr]">

            {/* HERO COPY */}

            <div>

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.7,
                }}
                className="mb-7 flex items-center gap-3"
              >

                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background:
                      COLOR.lime,

                    boxShadow:
                      `0 0 20px ${COLOR.lime}`,
                  }}
                />

                <span
                  className="text-[10px] font-extrabold uppercase text-white/50"
                  style={{
                    letterSpacing:
                      "0.24em",
                  }}
                >
                  {memberCountLabel ||
                    "A growing community"}
                </span>

              </motion.div>


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
                  duration: 0.9,
                  delay: 0.1,
                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }}
              >

                <h1 className="max-w-5xl text-[clamp(3.5rem,8vw,8rem)] font-extrabold leading-[0.86] tracking-[-0.075em] text-white">

                  Your work
                  <br />

                  deserves
                  <br />

                  <span
                    style={{
                      background:
                        GRADIENT.creativo,

                      WebkitBackgroundClip:
                        "text",

                      backgroundClip:
                        "text",

                      color:
                        "transparent",
                    }}
                  >
                    a room.
                  </span>

                </h1>

              </motion.div>


              <motion.p
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.3,
                }}
                className="mt-9 max-w-xl text-base leading-relaxed text-white/55 md:text-lg"
              >
                Creativo is where photographers,
                videographers, editors and motion
                designers meet the people, feedback
                and opportunities that move their
                work forward.
              </motion.p>


              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.45,
                }}
                className="mt-10 flex flex-wrap items-center gap-5"
              >

                <MagneticButton
                  href="https://tinyurl.com/creativocommunity"
                  className="rounded-full px-8 py-4 text-sm font-extrabold text-white"
                  style={{
                    background:
                      GRADIENT.creativo,

                    boxShadow:
                      "0 20px 60px -20px rgba(255,46,136,0.8)",
                  }}
                >
                  Join the community ↗
                </MagneticButton>


                <a
                  href="#spotlight"
                  className="group flex items-center gap-3 text-sm font-bold text-white/60 transition-colors hover:text-white"
                >

                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-all group-hover:border-white/40 group-hover:bg-white/5">
                    ↓
                  </span>

                  See the spotlight

                </a>

              </motion.div>

            </div>


            {/* HERO FEATURED SPOTLIGHT */}

            <motion.div
              initial={{
                opacity: 0,
                y: 40,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.9,
                delay: 0.25,
              }}
              className="relative"
            >

              <div
                className="absolute -inset-1 rounded-[2rem] opacity-50 blur-xl"
                style={{
                  background:
                    GRADIENT.creativo,
                }}
              />

              <div
                className="relative overflow-hidden rounded-[2rem] border border-white/10 p-6 md:p-8"
                style={{
                  background:
                    "rgba(255,255,255,0.06)",

                  backdropFilter:
                    "blur(30px)",
                }}
              >

                <div className="mb-8 flex items-center justify-between">

                  <div>

                    <p
                      className="text-[9px] font-extrabold uppercase text-white/35"
                      style={{
                        letterSpacing:
                          "0.2em",
                      }}
                    >
                      Current spotlight
                    </p>

                    <p className="mt-2 text-lg font-bold text-white">
                      Creators to know
                    </p>

                  </div>

                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-black"
                    style={{
                      background:
                        COLOR.lime,
                    }}
                  >
                    ✦
                  </span>

                </div>


                {heroTopEntries.length >
                0 ? (

                  <div className="space-y-3">

                    {heroTopEntries.map(
                      (
                        entry,
                        index
                      ) => (

                        <motion.div
                          key={
                            entry.id
                          }
                          whileHover={{
                            x: 5,
                          }}
                          className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5"
                        >

                          <span
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-black"
                            style={{
                              background:
                                RANK_COLOR[
                                  index
                                ],
                            }}
                          >
                            0
                            {
                              index +
                                1
                            }
                          </span>


                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white/10">

                            {entry.profileImageUrl ? (

                              // eslint-disable-next-line @next/next/no-img-element

                              <img
                                src={
                                  entry.profileImageUrl
                                }
                                alt={
                                  entry.name
                                }
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />

                            ) : null}

                          </div>


                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-bold text-white">
                              {
                                entry.name
                              }
                            </p>

                            <p className="truncate text-xs text-white/40">
                              {
                                entry.category
                              }
                            </p>

                          </div>


                          <span
                            className="text-sm opacity-0 transition-opacity group-hover:opacity-100"
                            style={{
                              color:
                                RANK_COLOR[
                                  index
                                ],
                            }}
                          >
                            ↗
                          </span>

                        </motion.div>

                      )
                    )}

                  </div>

                ) : (

                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/35">

                    The next creator on
                    the spotlight could be
                    you.

                  </div>

                )}

              </div>

            </motion.div>

          </div>

        </motion.div>

      </section>


      {/* ================================================================ */}
      {/* INTRO VIDEO                                                      */}
      {/* ================================================================ */}

      <section
        id="video"
        className="relative px-6 py-20 md:px-12 md:py-32"
        style={{
          background:
            COLOR.black,
        }}
      >

        <div className="mx-auto max-w-[1350px]">

          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">

            <div>

              <SectionLabel
                color={
                  COLOR.lime
                }
              >
                Step inside
              </SectionLabel>

              <h2 className="max-w-2xl text-4xl font-extrabold leading-[0.95] tracking-[-0.055em] text-white md:text-6xl">

                More than a
                community.
                <br />

                <span className="text-white/40">
                  A creative room.
                </span>

              </h2>

            </div>


            <p className="max-w-sm text-sm leading-relaxed text-white/45">

              See what Creativo is
              about and why the best
              opportunities often
              start with simply being
              in the room.

            </p>

          </div>


          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.8,
            }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black"
          >

            <video
              src="/images/intro.mp4"
              autoPlay
              muted
              loop
              controls
              playsInline
              className="aspect-video w-full object-cover"
            />

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
              }}
            />

          </motion.div>

        </div>

      </section>


      {/* ================================================================ */}
      {/* LEADERBOARD                                                      */}
      {/* ================================================================ */}

      <section
        id="spotlight"
        className="relative overflow-hidden px-6 py-24 md:px-12 md:py-36"
        style={{
          background:
            COLOR.cream,
        }}
      >

        <div
          className="pointer-events-none absolute right-[-10%] top-[10%] h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{
            background:
              COLOR.yellow,

            opacity: 0.12,
          }}
        />

        <div className="relative mx-auto max-w-[1350px]">

          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">

            <div>

              <SectionLabel
                color={
                  COLOR.blue
                }
              >
                Monthly spotlight
              </SectionLabel>

              <h2 className="text-4xl font-extrabold leading-[0.95] tracking-[-0.055em] text-black md:text-6xl">

                Great work
                <br />

                should be
                <br />

                <span
                  style={{
                    color:
                      COLOR.blue,
                  }}
                >
                  discoverable.
                </span>

              </h2>

            </div>


            <div>

              <p className="max-w-xl text-base leading-relaxed text-black/55 md:text-lg">

                Every month, members
                submit real client work.
                The community helps put
                the strongest work in
                front of the people who
                should see it.

              </p>


              <a
                href="https://tinyurl.com/creativocommunity"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-bold text-black transition-transform hover:scale-[1.03]"
                style={{
                  background:
                    COLOR.lime,

                  boxShadow:
                    "0 18px 45px -18px rgba(184,255,53,0.9)",
                }}
              >

                Want your work here?

                <span>
                  ↗
                </span>

              </a>

            </div>

          </div>


          {/* FILTERS */}

          {availablePeriods.length >
          0 && (

            <div className="mt-16 flex flex-col gap-5 border-y border-black/10 py-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex flex-wrap gap-2">

                {(
                  [
                    "All",
                    ...CATEGORIES,
                  ] as const
                ).map(
                  (category) => (

                    <button
                      key={
                        category
                      }
                      onClick={() =>
                        setFilterCategory(
                          category
                        )
                      }
                      className="rounded-full px-4 py-2.5 text-xs font-bold transition-all duration-300"
                      style={
                        filterCategory ===
                        category
                          ? {
                              background:
                                COLOR.black,

                              color:
                                COLOR.white,
                            }
                          : {
                              background:
                                "rgba(0,0,0,0.05)",

                              color:
                                "rgba(0,0,0,0.55)",
                            }
                      }
                    >

                      {
                        category
                      }

                    </button>

                  )
                )}

              </div>


              <div className="flex flex-wrap gap-2">

                {availablePeriods.map(
                  (
                    [
                      key,
                      iso,
                    ]
                  ) => (

                    <button
                      key={
                        key
                      }
                      onClick={() =>
                        setFilterPeriodKey(
                          key
                        )
                      }
                      className="rounded-full px-4 py-2.5 text-xs font-bold transition-all duration-300"
                      style={
                        effectivePeriodKey ===
                        key
                          ? {
                              background:
                                COLOR.blue,

                              color:
                                COLOR.white,
                            }
                          : {
                              background:
                                "rgba(0,0,0,0.05)",

                              color:
                                "rgba(0,0,0,0.55)",
                            }
                      }
                    >

                      {
                        periodLabel(
                          iso
                        )
                      }

                    </button>

                  )
                )}

              </div>

            </div>

          )}


          {/* LEADERBOARD GRID */}

          <div className="mt-10">

            {filteredEntries.length ===
            0 ? (

              <div className="rounded-[2rem] border border-dashed border-black/15 p-16 text-center text-sm text-black/40">

                No spotlight entries
                yet for this selection.

              </div>

            ) : (

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

                {filteredEntries.map(
                  (
                    entry,
                    index
                  ) => {

                    const accent =
                      RANK_COLOR[
                        index
                      ] ??
                      COLOR.blue;

                    return (

                      <motion.div
                        key={
                          entry.id
                        }
                        initial={{
                          opacity: 0,
                          y: 25,
                        }}
                        whileInView={{
                          opacity: 1,
                          y: 0,
                        }}
                        viewport={{
                          once: true,
                        }}
                        transition={{
                          duration: 0.5,
                          delay:
                            (index %
                              6) *
                            0.05,
                        }}
                        whileHover={{
                          y: -7,
                        }}
                        className="group relative overflow-hidden rounded-[1.75rem] border border-black/[0.07] bg-white p-5"
                      >

                        <div
                          className="absolute inset-x-0 top-0 h-1"
                          style={{
                            background:
                              index < 3
                                ? accent
                                : "transparent",
                          }}
                        />

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex items-center gap-4">

                            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-black/5">

                              {entry.profileImageUrl && (

                                // eslint-disable-next-line @next/next/no-img-element

                                <img
                                  src={
                                    entry.profileImageUrl
                                  }
                                  alt={
                                    entry.name
                                  }
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />

                              )}

                            </div>


                            <div>

                              <p className="text-base font-extrabold text-black">
                                {
                                  entry.name
                                }
                              </p>

                              <p className="mt-1 text-xs font-semibold text-black/40">
                                {
                                  entry.category
                                }
                              </p>

                            </div>

                          </div>


                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold text-black"
                            style={{
                              background:
                                index < 3
                                  ? accent
                                  : "rgba(0,0,0,0.06)",
                            }}
                          >

                            0
                            {
                              index +
                                1
                            }

                          </span>

                        </div>


                        <div className="mt-7 border-t border-black/5 pt-5">

                          <p
                            className="text-[9px] font-extrabold uppercase text-black/35"
                            style={{
                              letterSpacing:
                                "0.16em",
                            }}
                          >
                            Spotlighted for
                          </p>

                          <p className="mt-2 text-sm font-bold leading-relaxed text-black">

                            {
                              entry.wonFor
                            }

                          </p>

                        </div>


                        <div className="mt-5 flex items-center justify-between">

                          <span
                            className="text-xs font-extrabold"
                            style={{
                              color:
                                COLOR.blue,
                            }}
                          >

                            {
                              entry.points
                            }{" "}
                            points

                          </span>


                          <div className="flex gap-3 text-xs font-bold">

                            {entry.portfolioUrl && (

                              <a
                                href={
                                  entry.portfolioUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-black/50 transition-colors hover:text-black"
                              >
                                Portfolio
                              </a>

                            )}

                            {entry.whatsappNumber && (

                              <a
                                href={spotlightWhatsappHref(
                                  entry.whatsappNumber,
                                  entry.name
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color:
                                    COLOR.magenta,
                                }}
                              >
                                Work together ↗
                              </a>

                            )}

                          </div>

                        </div>

                      </motion.div>

                    );

                  }
                )}

              </div>

            )}

          </div>

        </div>

      </section>


      {/* ================================================================ */}
{/* WHY CREATIVO                                                     */}
{/* ================================================================ */}

<section
  className="relative overflow-hidden px-6 py-24 md:px-12 md:py-36"
  style={{
    background: COLOR.black,
  }}
>
  <Orb
    color={COLOR.magenta}
    size={550}
    left="-15%"
    top="35%"
    opacity={0.2}
  />

  <Orb
    color={COLOR.blue}
    size={450}
    left="75%"
    top="-10%"
    opacity={0.18}
  />

  <div className="relative mx-auto max-w-[1350px]">
    {/* HEADING */}

    <div className="max-w-3xl">
      <SectionLabel color={COLOR.lime}>
        Why be here?
      </SectionLabel>

      <h2 className="text-4xl font-extrabold leading-[0.94] tracking-[-0.055em] text-white md:text-7xl">
        The things you
        <br />
        cannot build
        <br />

        <span className="text-white/35">
          alone.
        </span>
      </h2>
    </div>

    {/* CARDS */}

    <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
      {[
        {
          number: "01",
          title: "Referrals",
          body:
            "Opportunities that start inside the community before they ever reach a public job board.",
          color: COLOR.coral,
          Icon: Send,
        },
        {
          number: "02",
          title: "Better pricing",
          body:
            "Learn how other creators position their work, handle clients and charge with confidence.",
          color: COLOR.magenta,
          Icon: BadgeDollarSign,
        },
        {
          number: "03",
          title: "Real people",
          body:
            "A network of creators working in the same industries and dealing with the same challenges.",
          color: COLOR.blue,
          Icon: UsersRound,
        },
        {
          number: "04",
          title: "Visibility",
          body:
            "Your strongest work gets a chance to be discovered, celebrated and remembered.",
          color: COLOR.lime,
          Icon: Eye,
        },
      ].map((item, index) => {
        const Icon = item.Icon;

        return (
          <motion.div
            key={item.title}
            initial={{
              opacity: 0,
              y: 25,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.25,
            }}
            transition={{
              duration: 0.6,
              delay: index * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{
              y: -8,
            }}
            className="group relative min-h-[320px] overflow-hidden rounded-[2rem] border border-white/10 p-6 transition-colors duration-500 md:p-7"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)",
            }}
          >
            {/* AMBIENT GLOW */}

            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-transform duration-700 ease-out group-hover:scale-[1.7]"
              style={{
                background: item.color,
                opacity: 0.2,
              }}
            />

            {/* BOTTOM ACCENT */}

            <div
              className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 ease-out group-hover:w-full"
              style={{
                background: `linear-gradient(
                  90deg,
                  transparent,
                  ${item.color},
                  transparent
                )`,
              }}
            />

            <div className="relative flex h-full min-h-[272px] flex-col justify-between">
              {/* TOP */}

              <div className="flex items-start justify-between">
                {/* ICON */}

                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-110"
                  style={{
                    background: `${item.color}18`,
                    borderColor: `${item.color}35`,
                    boxShadow: `0 12px 30px -14px ${item.color}`,
                  }}
                >
                  <Icon
                    size={21}
                    strokeWidth={1.8}
                    style={{
                      color: item.color,
                    }}
                  />
                </div>

                {/* NUMBER */}

                <span
                  className="text-xs font-extrabold tracking-[0.12em]"
                  style={{
                    color: item.color,
                  }}
                >
                  {item.number}
                </span>
              </div>

              {/* CONTENT */}

              <div>
                <h3 className="text-xl font-extrabold tracking-[-0.03em] text-white md:text-2xl">
                  {item.title}
                </h3>

                <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-white/45">
                  {item.body}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
</section>
      {/* ================================================================ */}
      {/* WEBINARS                                                         */}
      {/* ================================================================ */}

      <section
        className="relative overflow-hidden px-6 py-24 md:px-12 md:py-36"
        style={{
          background:
            `linear-gradient(135deg, ${COLOR.blueDark} 0%, ${COLOR.blue} 55%, #426CFF 100%)`,
        }}
      >

        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{
            background:
              COLOR.lime,

            opacity:
              0.25,
          }}
        />

        <div className="relative mx-auto max-w-[1350px]">

          <div className="grid gap-10 lg:grid-cols-[1fr_.7fr] lg:items-end">

            <div>

              <SectionLabel
                color={
                  COLOR.lime
                }
              >
                Learn from the room
              </SectionLabel>

              <h2 className="max-w-3xl text-4xl font-extrabold leading-[0.94] tracking-[-0.055em] text-white md:text-6xl">

                Conversations
                that make your
                next move
                <span
                  style={{
                    color:
                      COLOR.lime,
                  }}
                >
                  {" "}
                  smarter.
                </span>

              </h2>

            </div>


            <div>

              <p className="text-base leading-relaxed text-white/60">

                Creativo sessions
                bring experienced
                people into the room
                to talk about the
                things creators
                actually need help
                figuring out.

              </p>


              <button
                onClick={() =>
                  setHostModalOpen(
                    true
                  )
                }
                className="mt-7 rounded-full px-6 py-3.5 text-sm font-extrabold text-black transition-transform hover:scale-[1.03]"
                style={{
                  background:
                    COLOR.lime,
                }}
              >

                Apply to host ↗

              </button>

            </div>

          </div>


          {(upcomingWebinars.length >
            0 ||
            pastWebinars.length >
              0) && (

            <div className="mt-16 grid gap-5 md:grid-cols-2">

              {upcomingWebinars.map(
                (
                  webinar,
                  index
                ) => (

                  <motion.div
                    key={
                      webinar.id
                    }
                    initial={{
                      opacity: 0,
                      y: 25,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{
                      once: true,
                    }}
                    transition={{
                      duration: 0.6,
                      delay:
                        index * 0.08,
                    }}
                    className="group overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 backdrop-blur-xl"
                  >

                    {webinar.flyerImageUrl && (

                      // eslint-disable-next-line @next/next/no-img-element

                      <img
                        src={
                          webinar.flyerImageUrl
                        }
                        alt={
                          webinar.topic
                        }
                        className="aspect-[16/9] w-full rounded-[1.3rem] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />

                    )}


                    <div className="px-2 pb-2 pt-6">

                      <span
                        className="inline-flex rounded-full px-3 py-1 text-[9px] font-extrabold uppercase text-black"
                        style={{
                          background:
                            COLOR.lime,

                          letterSpacing:
                            "0.12em",
                        }}
                      >
                        Upcoming
                      </span>


                      <h3 className="mt-5 text-2xl font-extrabold leading-tight text-white">

                        {
                          webinar.topic
                        }

                      </h3>


                      <p className="mt-3 text-sm leading-relaxed text-white/50">

                        {
                          webinar.guests
                        }

                        {webinar.guests &&
                          " · "}

                        {new Date(
                          webinar.startsAt
                        ).toLocaleString()}

                      </p>


                      {webinar.applyUrl && (

                        <a
                          href={
                            webinar.applyUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-7 inline-flex items-center gap-2 text-sm font-bold"
                          style={{
                            color:
                              COLOR.lime,
                          }}
                        >

                          Reserve your spot ↗

                        </a>

                      )}

                    </div>

                  </motion.div>

                )
              )}


              {pastWebinars.map(
                (
                  webinar
                ) => (

                  <motion.div
                    key={
                      webinar.id
                    }
                    whileHover={{
                      y: -5,
                    }}
                    className="flex gap-5 rounded-[1.75rem] border border-white/10 bg-black/10 p-5"
                  >

                    {webinar.flyerImageUrl && (

                      // eslint-disable-next-line @next/next/no-img-element

                      <img
                        src={
                          webinar.flyerImageUrl
                        }
                        alt=""
                        className="h-28 w-24 rounded-2xl object-cover opacity-80"
                      />

                    )}


                    <div className="flex min-w-0 flex-1 flex-col justify-between">

                      <div>

                        <span className="text-[9px] font-bold uppercase text-white/35">

                          Past session

                        </span>

                        <h3 className="mt-2 text-lg font-extrabold text-white">

                          {
                            webinar.topic
                          }

                        </h3>

                      </div>


                      {webinar.replayUrl && (

                        <a
                          href={
                            webinar.replayUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold"
                          style={{
                            color:
                              COLOR.lime,
                          }}
                        >

                          Watch replay ↗

                        </a>

                      )}

                    </div>

                  </motion.div>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* ================================================================ */}
      {/* SHOWWORK BRIDGE                                                  */}
      {/* ================================================================ */}

      <section
        className="relative overflow-hidden px-6 py-24 md:px-12 md:py-36"
        style={{
          background:
            COLOR.cream,
        }}
      >

        <div className="mx-auto grid max-w-[1350px] gap-16 lg:grid-cols-2 lg:items-center">

          <div>

            <SectionLabel
              color={
                COLOR.blue
              }
            >
              Powered by Showwork
            </SectionLabel>

            <h2 className="text-4xl font-extrabold leading-[0.95] tracking-[-0.055em] text-black md:text-6xl">

              The community
              meets the
              <span
                style={{
                  color:
                    COLOR.blue,
                }}
              >
                {" "}
                work.
              </span>

            </h2>


            <p className="mt-8 max-w-xl text-base leading-relaxed text-black/55 md:text-lg">

              Creativo gives creators
              the room. Showwork helps
              them run the work that
              comes from it — from
              delivery and approval to
              getting paid.

            </p>


            <Link
              href="/"
              className="mt-9 inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-extrabold text-white transition-transform hover:scale-[1.03]"
              style={{
                background:
                  GRADIENT.showwork,

                boxShadow:
                  "0 18px 45px -18px rgba(36,120,255,0.6)",
              }}
            >

              Explore Showwork ↗

            </Link>

          </div>


          <div className="relative">

            <div
              className="absolute -inset-6 rounded-[3rem] opacity-30 blur-3xl"
              style={{
                background:
                  GRADIENT.energy,
              }}
            />

            <div className="relative overflow-hidden rounded-[2.5rem] bg-black p-8 md:p-12">

              <div className="flex items-center gap-6">

                <div
                  className="h-16 flex-1"
                  style={{
                    background:
                      COLOR.white,

                    WebkitMaskImage:
                      "url(/images/logo/sw.svg)",

                    maskImage:
                      "url(/images/logo/sw.svg)",

                    WebkitMaskRepeat:
                      "no-repeat",

                    maskRepeat:
                      "no-repeat",

                    WebkitMaskSize:
                      "contain",

                    maskSize:
                      "contain",

                    WebkitMaskPosition:
                      "left center",

                    maskPosition:
                      "left center",
                  }}
                />

              </div>


              <div className="mt-12 space-y-3">

                {[
                  "Deliver your work beautifully",
                  "Get client approvals",
                  "Keep projects organised",
                  "Turn great work into momentum",
                ].map(
                  (
                    item,
                    index
                  ) => (

                    <motion.div
                      key={
                        item
                      }
                      initial={{
                        opacity: 0,
                        x: 20,
                      }}
                      whileInView={{
                        opacity: 1,
                        x: 0,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay:
                          index *
                          0.08,
                      }}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >

                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-black"
                        style={{
                          background:
                            index % 2 ===
                            0
                              ? COLOR.lime
                              : COLOR.yellow,
                        }}
                      >

                        ✓

                      </span>


                      <span className="text-sm font-bold text-white/75">

                        {
                          item
                        }

                      </span>

                    </motion.div>

                  )
                )}

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================================ */}
      {/* FAQ                                                              */}
      {/* ================================================================ */}

      <section
        className="px-6 py-24 md:px-12 md:py-36"
        style={{
          background:
            COLOR.white,
        }}
      >

        <div className="mx-auto grid max-w-[1350px] gap-16 lg:grid-cols-[.7fr_1.3fr]">

          <div>

            <SectionLabel
              color={
                COLOR.magenta
              }
            >
              Questions
            </SectionLabel>

            <h2 className="text-4xl font-extrabold leading-[0.95] tracking-[-0.055em] text-black md:text-6xl">

              Everything
              you need to
              <span className="text-black/30">
                {" "}
                know.
              </span>

            </h2>

          </div>


          <div className="border-t border-black/10">

            {[
              {
                q:
                  "Does it cost anything?",
                a:
                  "No. Creativo is free to join.",
              },
              {
                q:
                  "Who's eligible?",
                a:
                  "Creativo is open to creators. Active Showwork users with submitted work can participate in eligible community challenges and spotlights.",
              },
              {
                q:
                  "How does the challenge work?",
                a:
                  "Creators submit their work, the community engages with it, and standout entries earn visibility on the monthly spotlight.",
              },
              {
                q:
                  "How do I join?",
                a:
                  "Tap Join community. You will be taken directly to the Creativo community.",
              },
            ].map(
              (
                item,
                index
              ) => (

                <motion.details
                  key={
                    item.q
                  }
                  initial={{
                    opacity: 0,
                    y: 15,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    delay:
                      index *
                      0.06,
                  }}
                  className="group border-b border-black/10 py-7"
                >

                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-extrabold text-black">

                    {
                      item.q
                    }

                    <span
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl transition-all duration-300 group-open:rotate-45"
                      style={{
                        background:
                          "rgba(0,0,0,0.05)",
                      }}
                    >
                      +
                    </span>

                  </summary>


                  <p className="max-w-2xl pt-5 text-sm leading-relaxed text-black/55 md:text-base">

                    {
                      item.a
                    }

                  </p>

                </motion.details>

              )
            )}

          </div>

        </div>

      </section>


      {/* ================================================================ */}
      {/* FINAL CTA                                                        */}
      {/* ================================================================ */}

      <section
        className="relative overflow-hidden px-6 py-28 md:px-12 md:py-40"
        style={{
          background:
            COLOR.black,
        }}
      >

        <Orb
          color={COLOR.magenta}
          size={600}
          left="-10%"
          top="10%"
          opacity={0.28}
        />

        <Orb
          color={COLOR.orange}
          size={500}
          left="65%"
          top="20%"
          opacity={0.2}
        />

        <div className="relative mx-auto max-w-5xl text-center">

          <motion.p
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            className="text-[10px] font-extrabold uppercase"
            style={{
              color:
                COLOR.lime,

              letterSpacing:
                "0.25em",
            }}
          >
            There is room for you
          </motion.p>


          <motion.h2
            initial={{
              opacity: 0,
              y: 30,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.8,
            }}
            className="mt-7 text-[clamp(3rem,8vw,7rem)] font-extrabold leading-[0.88] tracking-[-0.07em] text-white"
          >

            Stop being the
            best-kept
            <br />

            <span
              style={{
                background:
                  GRADIENT.creativo,

                WebkitBackgroundClip:
                  "text",

                backgroundClip:
                  "text",

                color:
                  "transparent",
              }}
            >
              secret.
            </span>

          </motion.h2>


          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-white/50 md:text-lg">

            Join creators who are
            sharing knowledge,
            opportunities and the
            kind of momentum that is
            difficult to create alone.

          </p>


          <div className="mt-11">

            <MagneticButton
              href="https://tinyurl.com/creativocommunity"
              className="rounded-full px-10 py-5 text-sm font-extrabold text-white"
              style={{
                background:
                  GRADIENT.creativo,

                boxShadow:
                  "0 25px 70px -20px rgba(255,46,136,0.85)",
              }}
            >

              Join Creativo ↗

            </MagneticButton>

          </div>

        </div>

      </section>


      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}

      <footer
        className="border-t border-white/5 px-6 py-8"
        style={{
          background:
            COLOR.black,
        }}
      >

        <div className="mx-auto flex max-w-[1350px] flex-col items-center justify-between gap-4 sm:flex-row">

          <p className="text-xs text-white/30">

            Creativo is a community
            powered by Showwork.

          </p>


          <Link
            href="/"
            className="text-xs font-bold transition-colors hover:text-white"
            style={{
              color:
                COLOR.lime,
            }}
          >

            Back to Showwork ↗

          </Link>

        </div>

      </footer>


      <HostApplicationModal
        open={hostModalOpen}
        onClose={() =>
          setHostModalOpen(
            false
          )
        }
      />

    </main>
  );
}