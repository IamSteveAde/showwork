"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const COLOR = { gold: "#F5C842", charcoal: "#1A1A1A", black: "#0A0A0A" };

/**
 * A restrained, premium floating CTA. Rather than the button itself
 * flashing through colors or bouncing, a thin ring of gold light slowly
 * traces the border of an otherwise still, solid charcoal pill — the
 * same visual language as a light catching the rim of a well-made
 * object. The surface stays calm; only the edge moves.
 */
export default function FloatingStartButton() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-6 z-40 md:bottom-8 md:right-8"
        >
          <div className="relative inline-flex">
            {/* dismiss */}
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white/50 shadow-md transition-colors hover:text-white"
              style={{ background: COLOR.black }}
            >
              ✕
            </button>

            {/* very soft ambient shadow beneath — a breathing presence,
                not a hard pulsing ring */}
            <motion.div
              className="absolute inset-0 rounded-full blur-xl"
              style={{ background: COLOR.gold }}
              animate={{ opacity: [0.12, 0.22, 0.12] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />

            {/* the rotating gold border-light, contained to a thin ring */}
            <div className="relative overflow-hidden rounded-full p-[1.5px]">
              <motion.div
                className="absolute inset-[-50%]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(245,200,66,0.9) 300deg, #F5C842 320deg, rgba(245,200,66,0.9) 340deg, transparent 360deg)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                aria-hidden
              />

              <Link
                href="/start"
                className="group relative flex items-center gap-2.5 whitespace-nowrap rounded-full px-6 py-3.5 text-sm font-semibold transition-transform duration-300 hover:scale-[1.02]"
                style={{ background: COLOR.charcoal }}
              >
                <span className="text-white">Start a delivery</span>
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5"
                  style={{ background: "rgba(245,200,66,0.15)" }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path
                      d="M1 4.5h6.5M5 1.5L8 4.5L5 7.5"
                      stroke={COLOR.gold}
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: COLOR.gold }}
                >
                  free
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}