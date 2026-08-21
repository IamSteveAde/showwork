"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*                               BRAND SYSTEM                                 */
/* -------------------------------------------------------------------------- */

const COLOR = {
  black: "#080808",
  charcoal: "#151515",
  offWhite: "#F7F4EC",

  blue: "#2478FF",
  blueDark: "#0052FF",
  blueLight: "#68B2FF",

  lime: "#B8FF35",
  orange: "#FF8A1F",
  yellow: "#FFCC00",

  creativoCoral: "#FF5A5F",
  creativoMagenta: "#FF2E88",

  brandGradient:
    "linear-gradient(135deg, #2478FF 0%, #0052FF 42%, #B8FF35 72%, #FFCC00 100%)",

  creativoGradient:
    "linear-gradient(135deg, #FF5A5F 0%, #FF2E88 100%)",
};

/* -------------------------------------------------------------------------- */
/*                                   LOGO                                     */
/* -------------------------------------------------------------------------- */

function Logo() {
  return (
    <Link
      href="/"
      aria-label="Showwork home"
      className="group relative flex flex-shrink-0 items-center"
    >
      <div
        role="img"
        aria-label="Showwork"
        className="relative z-10 transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        style={{
          height: 27,
          width: 124,

          background:
            "linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 55%, #B8FF35 100%)",

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
          background: COLOR.lime,
        }}
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                                NAVIGATION                                  */
/* -------------------------------------------------------------------------- */

const NAV_LINKS = [
  {
    label: "Home",
    href: "/",
    color: COLOR.blueLight,
  },
  {
    label: "Creativo Community",
    href: "/creativo",
    color: COLOR.lime,
    badge: "COMMUNITY",
  },
];

function NavLink({
  label,
  href,
  color,
  badge,
}: {
  label: string;
  href: string;
  color: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-2 py-2 text-[13px] font-semibold tracking-[-0.01em] text-white/55 transition-colors duration-300 hover:text-white"
    >
      <span
        className="h-[7px] w-[7px] rounded-full transition-transform duration-300 group-hover:scale-125"
        style={{
          background: color,
          boxShadow: `0 0 14px ${color}`,
        }}
      />

      <span>{label}</span>

      {badge && (
        <span
          className="ml-1 rounded-full px-2 py-[3px] text-[8px] font-bold"
          style={{
            background: "rgba(184,255,53,0.12)",
            color: COLOR.lime,
            border: "1px solid rgba(184,255,53,0.18)",
            letterSpacing: "0.08em",
          }}
        >
          {badge}
        </span>
      )}

      <motion.span
        className="absolute -bottom-[2px] left-0 h-[1.5px] rounded-full"
        initial={{ width: 0 }}
        whileHover={{ width: "100%" }}
        transition={{
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          background: color,
        }}
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  NAVBAR                                    */
/* -------------------------------------------------------------------------- */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
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

  return (
    <motion.header
      initial={{
        opacity: 0,
        y: -20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-all duration-500 sm:px-5 sm:pt-5"
    >
      <div
        className="relative mx-auto max-w-[1500px] transition-all duration-500"
        style={{
          background: scrolled
            ? "rgba(8,8,8,0.78)"
            : "rgba(8,8,8,0.18)",

          backdropFilter: "blur(22px)",

          border: scrolled
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(255,255,255,0.08)",

          boxShadow: scrolled
            ? "0 20px 70px -28px rgba(0,0,0,0.75)"
            : "none",

          borderRadius: scrolled ? "999px" : "28px",
        }}
      >
        {/* Ambient color glow */}

        <div
          className="pointer-events-none absolute left-[10%] top-0 h-full w-40 opacity-30 blur-[45px]"
          style={{
            background: COLOR.blue,
          }}
        />

        <div
          className="pointer-events-none absolute right-[12%] top-0 h-full w-28 opacity-20 blur-[40px]"
          style={{
            background: COLOR.lime,
          }}
        />

        {/* Grain */}

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04] mix-blend-overlay"
          aria-hidden
        >
          <filter id="navGrain">
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
            filter="url(#navGrain)"
          />
        </svg>

        <nav className="relative z-10 flex items-center justify-between px-5 py-3.5 md:px-7 md:py-4">
          {/* LEFT */}

          <div className="flex items-center gap-12">
            <Logo />

            <div className="hidden items-center gap-8 lg:flex">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  label={link.label}
                  href={link.href}
                  color={link.color}
                  badge={link.badge}
                />
              ))}
            </div>
          </div>

          {/* RIGHT */}

          <div className="hidden items-center gap-6 sm:flex">
            <Link
              href="/login"
              className="text-[13px] font-semibold text-white/55 transition-colors duration-300 hover:text-white"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="group relative overflow-hidden rounded-full px-6 py-3 text-[13px] font-bold text-black transition-transform duration-300 hover:scale-[1.04]"
              style={{
                background: COLOR.lime,

                boxShadow:
                  "0 12px 35px -12px rgba(184,255,53,0.7)",
              }}
            >
              {/* Hover gradient */}

              <span
                className="absolute inset-0 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0"
                style={{
                  background:
                    "linear-gradient(135deg, #B8FF35 0%, #FFCC00 100%)",
                }}
              />

              <span className="relative z-10 flex items-center gap-2">
                Get started

                <span className="text-base leading-none transition-transform duration-300 group-hover:translate-x-1">
                  ↗
                </span>
              </span>
            </Link>
          </div>

          {/* MOBILE BUTTON */}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 sm:hidden"
            style={{
              background: mobileOpen
                ? COLOR.lime
                : "rgba(255,255,255,0.08)",
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-[18px] w-[18px]"
                  style={{
                    color: COLOR.black,
                  }}
                >
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-[18px] w-[18px] text-white"
                >
                  <path
                    d="M4 7H20M4 12H20M4 17H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </motion.div>
          </button>
        </nav>

        {/* MOBILE MENU */}

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
              className="relative overflow-hidden lg:hidden"
            >
              <div className="border-t border-white/10 px-5 pb-5 pt-5">
                <div className="grid gap-2">
                  {NAV_LINKS.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{
                        opacity: 0,
                        x: -15,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay: 0.05 + index * 0.06,
                        duration: 0.3,
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="group flex items-center justify-between rounded-2xl px-4 py-4 transition-all duration-300 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background: link.color,
                              boxShadow: `0 0 12px ${link.color}`,
                            }}
                          />

                          <span className="text-[15px] font-semibold text-white">
                            {link.label}
                          </span>
                        </div>

                        <span
                          className="text-lg transition-transform duration-300 group-hover:translate-x-1"
                          style={{
                            color: link.color,
                          }}
                        >
                          ↗
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Account actions */}

                <div className="mt-5 grid gap-3 border-t border-white/10 pt-5">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full border border-white/12 px-5 py-3.5 text-center text-sm font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="group relative overflow-hidden rounded-full px-5 py-4 text-center text-sm font-bold text-black"
                    style={{
                      background: COLOR.lime,
                    }}
                  >
                    <span
                      className="absolute inset-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #B8FF35, #FFCC00)",
                      }}
                    />

                    <span className="relative z-10">
                      Start creating ↗
                    </span>
                  </Link>
                </div>

                {/* Brand line */}

                <div className="mt-5 flex items-center gap-3 px-2">
                  <div
                    className="h-1.5 flex-1 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #2478FF, #B8FF35, #FFCC00, #FF8A1F)",
                    }}
                  />

                  <span
                    className="text-[8px] font-bold uppercase text-white/25"
                    style={{
                      letterSpacing: "0.18em",
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