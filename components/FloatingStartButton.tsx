"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const COLOR = { gold: "#F5C842", orange: "#E8881A", black: "#0A0A0A" };

/**
 * A gently animated floating CTA — cycles through the three brand
 * colors slowly, bobs like a soft wave, and pulses a glow ring behind
 * it to draw the eye without ever feeling frantic. Dismissible, so it
 * doesn't overstay its welcome for someone who's already noticed it.
 */
export default function FloatingStartButton() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-6 right-6 z-40 md:bottom-8 md:right-8"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative inline-flex"
          >
            {/* dismiss */}
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white/70 shadow-md transition-colors hover:text-white"
            >
              ✕
            </button>

            {/* soft pulsing glow, behind the button */}
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: COLOR.gold }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0, 0.45] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />

            <Link href="/start" className="relative">
              <motion.span
                animate={{ backgroundColor: [COLOR.gold, COLOR.orange, COLOR.black, COLOR.orange, COLOR.gold] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-xs font-bold shadow-2xl sm:px-6 sm:py-3.5 sm:text-sm"
                style={{ color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
              >
                <span aria-hidden>✨</span>
                Start delivery now — free
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}