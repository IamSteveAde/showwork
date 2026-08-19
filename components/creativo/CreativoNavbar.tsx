"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CORAL = "#FF5A5F";
const MAGENTA = "#FF2E88";

const NAV_ITEMS = [
  { label: "Why Creativo", href: "#why" },
  { label: "What you get", href: "#benefits" },
  { label: "Community", href: "#gallery" },
  { label: "Stories", href: "#stories" },
];

function CreativoLogo({ className = "" }: { className?: string }) {
  return (
    <a href="#top" className={`flex items-center gap-0.5 ${className}`}>
      <span className="text-xl font-extrabold tracking-tight text-white">Creativo</span>
      <span
        className="mb-[2px] h-[7px] w-[7px] rounded-full"
        style={{ background: `linear-gradient(135deg, ${CORAL}, ${MAGENTA})` }}
        aria-hidden
      />
    </a>
  );
}

/**
 * Creativo's navbar — its own standalone component so it can be
 * reused or swapped independently of the landing page itself. Fixed
 * to the top at all times (never "stuck" mid-page or scrolling away),
 * transparent over the hero and gaining a solid blurred background
 * only once the page has actually scrolled past it, so it never
 * competes with the hero for attention on first load.
 */
export default function CreativoNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Closing the mobile menu on route-internal anchor navigation, so
  // tapping a link doesn't leave the overlay open behind the section
  // it just jumped to.
  const handleNavClick = () => setMobileOpen(false);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(10,10,10,0.75)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-14">
        <CreativoLogo />

        {/* Desktop nav items — centered between logo and CTA */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {item.label}
              <span
                className="absolute -bottom-1 left-0 h-[2px] w-0 rounded-full transition-all duration-300 group-hover:w-full"
                style={{ background: `linear-gradient(90deg, ${CORAL}, ${MAGENTA})` }}
              />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#join"
            className="hidden items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.04] sm:flex"
            style={{ background: `linear-gradient(135deg, ${CORAL}, ${MAGENTA})` }}
          >
            Join the community
          </a>

          {/* Mobile menu toggle — nav items collapse behind this below
              the md breakpoint, since six items plus a CTA has no
              honest way to fit a narrow header. */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white md:hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden md:hidden"
            style={{ background: "rgba(10,10,10,0.97)", backdropFilter: "blur(14px)" }}
          >
            <div className="flex flex-col gap-1 px-6 pb-6 pt-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="#join"
                onClick={handleNavClick}
                className="mt-2 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${CORAL}, ${MAGENTA})` }}
              >
                Join the community
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}