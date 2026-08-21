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
} from "lucide-react";

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
          height: 24,
          width: 112,
          background:
            "linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 58%, #B8FF35 100%)",

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
    icon: Home,
  },
  {
    label: "Creativo Community",
    href: "/creativo",
    color: COLOR.lime,
    badge: "COMMUNITY",
    icon: UsersRound,
  },
];

function NavLink({
  label,
  href,
  color,
  badge,
  icon: Icon,
}: {
  label: string;
  href: string;
  color: string;
  badge?: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-2 py-2 text-[13px] font-semibold tracking-[-0.01em] text-white/55 transition-colors duration-300 hover:text-white"
    >
      <Icon
        size={14}
        strokeWidth={2}
        className="transition-transform duration-300 group-hover:scale-110"
        style={{
          color,
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
        className="relative mx-auto max-w-[1500px] overflow-hidden transition-all duration-500"
        style={{
          background: mobileOpen
            ? "rgba(8,8,8,0.97)"
            : scrolled
            ? "rgba(8,8,8,0.82)"
            : "rgba(8,8,8,0.18)",

          backdropFilter: "blur(22px)",

          border:
            scrolled || mobileOpen
              ? "1px solid rgba(255,255,255,0.12)"
              : "1px solid rgba(255,255,255,0.08)",

          boxShadow:
            scrolled || mobileOpen
              ? "0 20px 70px -28px rgba(0,0,0,0.75)"
              : "none",

          /*
           * Important:
           * When the mobile menu opens, force the container back
           * to the normal rounded rectangle. This prevents the
           * scrolled pill / oval shape from expanding with the menu.
           */
          borderRadius: mobileOpen
            ? "26px"
            : scrolled
            ? "999px"
            : "26px",
        }}
      >
        {/* Ambient glow */}

        <div
          className="pointer-events-none absolute left-[10%] top-0 h-full w-40 opacity-25 blur-[45px]"
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

        {/* ------------------------------------------------------------------ */}
        {/*                              NAV                                   */}
        {/* ------------------------------------------------------------------ */}

        <nav className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 md:px-7 md:py-4">
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
                  icon={link.icon}
                />
              ))}
            </div>
          </div>

          {/* Desktop actions */}

          <div className="hidden items-center gap-6 sm:flex">
            <Link
              href="/login"
              className="group flex items-center gap-2 text-[13px] font-semibold text-white/55 transition-colors duration-300 hover:text-white"
            >
              <LogIn
                size={15}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover:-translate-x-0.5"
              />

              <span>Log in</span>
            </Link>

            <Link
              href="/signup"
              className="group relative overflow-hidden rounded-full px-5 py-2.5 text-[13px] font-bold text-black transition-transform duration-300 hover:scale-[1.04] md:px-6 md:py-3"
              style={{
                background: COLOR.lime,
                boxShadow:
                  "0 12px 35px -12px rgba(184,255,53,0.7)",
              }}
            >
              <span
                className="absolute inset-0 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0"
                style={{
                  background:
                    "linear-gradient(135deg, #B8FF35 0%, #FFCC00 100%)",
                }}
              />

              <span className="relative z-10 flex items-center gap-2">
                Get started

                <ArrowUpRight
                  size={15}
                  strokeWidth={2.5}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </Link>
          </div>

          {/* Mobile button */}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 transition-colors duration-300 sm:hidden"
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
                <X
                  size={19}
                  strokeWidth={2.2}
                  style={{
                    color: COLOR.black,
                  }}
                />
              ) : (
                <Menu
                  size={20}
                  strokeWidth={2}
                  className="text-white"
                />
              )}
            </motion.div>
          </button>
        </nav>

        {/* ------------------------------------------------------------------ */}
        {/*                          MOBILE MENU                                */}
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
              className="relative overflow-hidden lg:hidden"
            >
              <div className="border-t border-white/10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
                <div className="grid gap-1.5">
                  {NAV_LINKS.map((link, index) => {
                    const Icon = link.icon;

                    return (
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
                          className="group flex items-center justify-between rounded-2xl px-3.5 py-3.5 transition-all duration-300 hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-xl"
                              style={{
                                background: `${link.color}18`,
                                border: `1px solid ${link.color}25`,
                              }}
                            >
                              <Icon
                                size={15}
                                strokeWidth={2}
                                style={{
                                  color: link.color,
                                }}
                              />
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[14px] font-semibold text-white">
                                {link.label}
                              </span>

                              {link.badge && (
                                <span
                                  className="mt-0.5 text-[8px] font-bold uppercase"
                                  style={{
                                    color: link.color,
                                    letterSpacing: "0.12em",
                                  }}
                                >
                                  {link.badge}
                                </span>
                              )}
                            </div>
                          </div>

                          <ArrowUpRight
                            size={17}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                            style={{
                              color: link.color,
                            }}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Account actions */}

                <div className="mt-4 grid gap-2.5 border-t border-white/10 pt-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-center text-[13px] font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <LogIn size={15} strokeWidth={2} />
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="group relative overflow-hidden rounded-full px-5 py-3.5 text-center text-[13px] font-bold text-black"
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

                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Sparkles size={15} strokeWidth={2.2} />

                      Start creating

                      <ArrowUpRight
                        size={15}
                        strokeWidth={2.5}
                        className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </span>
                  </Link>
                </div>

                {/* Brand line */}

                <div className="mt-4 flex items-center gap-3 px-1">
                  <div
                    className="h-[2px] flex-1 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #2478FF, #B8FF35, #FFCC00, #FF8A1F)",
                    }}
                  />

                  <span
                    className="whitespace-nowrap text-[7px] font-bold uppercase text-white/25"
                    style={{
                      letterSpacing: "0.16em",
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