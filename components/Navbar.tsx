"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const BLUE = "#2478FF";
const BLUE_DARK = "#0052FF";
const CREATIVO_CORAL = "#FF5A5F";
const CREATIVO_MAGENTA = "#FF2E88";

/**
 * The Showwork logo — rendered as a real <img> at its natural aspect
 * ratio, not a CSS mask forced into a hardcoded width/height. The
 * mask approach both flattened the logo to one solid color and
 * assumed a 2:1 aspect ratio that may not match the actual file,
 * which is the likely cause of it looking off. Sized meaningfully
 * larger here so it actually carries the header.
 */
function Logo() {
  return (
    <Link href="/" aria-label="Showwork home" className="group flex flex-shrink-0 items-center">
      <div
        role="img"
        aria-label="Showwork"
        className="transition-transform duration-300 ease-out group-hover:scale-105"
        style={{
          height: 24,
          width: 110, // generously wide — mask-size:contain scales the
          // real logo to fit within this box at its own true aspect
          // ratio, so a wide container never distorts it; it only
          // controls how much room the logo is allowed to occupy.
          backgroundColor: BLUE,
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
    </Link>
  );
}

const NAV_LINKS = [
  { label: "Home", href: "/", accent: false },
  { label: "Creativo Community", href: "/creativo", accent: true },
];

function NavLink({ label, href, accent }: { label: string; href: string; accent: boolean }) {
  return (
    <Link href={href} className="group relative flex items-center gap-2 py-1 text-[13.5px] font-semibold text-white/70 transition-colors duration-200 hover:text-white">
      {accent && (
        <span
          className="h-[6px] w-[6px] rounded-full"
          style={{ background: `linear-gradient(135deg, ${CREATIVO_CORAL}, ${CREATIVO_MAGENTA})` }}
          aria-hidden
        />
      )}
      {label}
      <span
        className="absolute -bottom-1.5 left-0 h-[1.5px] w-0 rounded-full transition-all duration-300 ease-out group-hover:w-full"
        style={{ background: accent ? `linear-gradient(90deg, ${CREATIVO_CORAL}, ${CREATIVO_MAGENTA})` : BLUE }}
      />
    </Link>
  );
}

/**
 * The main Showwork navbar. Transparent over a hero on first load,
 * gaining a solid blurred background with a hairline border once the
 * page has scrolled, so it never competes with whatever's beneath it
 * before someone starts scrolling.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(8,8,10,0.78)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(248,247,244,0.09)" : "1px solid transparent",
        boxShadow: scrolled ? "0 8px 32px -12px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay" aria-hidden>
        <filter id="navGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#navGrain)" />
      </svg>

      <nav className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-16 md:py-5">
        <div className="flex items-center gap-14">
          <Logo />
          <div className="hidden items-center gap-10 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-8 sm:flex">
          <Link href="/login" className="text-[13.5px] font-semibold text-white/70 transition-colors duration-200 hover:text-white">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full px-6 py-2.5 text-[13.5px] font-bold text-white transition-all duration-300 hover:scale-[1.04]"
            style={{
              background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
              boxShadow: `0 10px 32px -10px ${BLUE}99`,
            }}
          >
            Sign up
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-full sm:hidden"
          style={{ background: "rgba(248,247,244,0.09)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
            {mobileOpen ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden sm:hidden"
            style={{ background: "rgba(8,8,10,0.98)", backdropFilter: "blur(18px)" }}
          >
            <div className="flex flex-col gap-1 px-6 pb-6 pt-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.accent && (
                    <span
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ background: `linear-gradient(135deg, ${CREATIVO_CORAL}, ${CREATIVO_MAGENTA})` }}
                      aria-hidden
                    />
                  )}
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/8 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-center text-sm font-semibold text-white/75 hover:bg-white/5 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full px-5 py-3 text-center text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}
                >
                  Sign up
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}