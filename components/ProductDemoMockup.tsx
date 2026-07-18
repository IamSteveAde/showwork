"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLOR = {
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
};

// A live, animated recreation of the actual delivery experience — not a
// static screenshot. Cycles through three real moments of the product:
// the client's hero screen, the approve/flag interaction, and the
// creator's own usage view. Built from the real UI system, so it stays
// accurate as the product evolves, and needs no video file to exist.
const FRAMES = [
  { label: "What your client opens", key: "hero" },
  { label: "How they respond", key: "review" },
  { label: "What you see back", key: "dashboard" },
] as const;

export default function ProductDemoMockup() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % FRAMES.length), 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-lg">
      <div
        className="overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: COLOR.charcoal, border: "1px solid rgba(245,200,66,0.15)" }}
      >
        {/* browser chrome */}
        <div
          className="flex items-center gap-1.5 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="ml-3 text-[10px] text-white/25">showwork.spotliteafrica.com/fashion-fest</span>
        </div>

        <div className="relative h-72">
          <AnimatePresence mode="wait">
            {FRAMES[active].key === "hero" && (
              <motion.div
                key="hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, #1a1a1a, #241c06)" }}
              >
                <div className="absolute left-4 top-4 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR.gold }} />
                  <span className="text-[9px] font-semibold uppercase text-white/50" style={{ letterSpacing: "0.15em" }}>
                    Private preview
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: "rgba(245,200,66,0.15)", border: "1px solid rgba(245,200,66,0.4)" }}
                  >
                    <div
                      className="ml-1 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent"
                      style={{ borderLeftColor: COLOR.gold }}
                    />
                  </div>
                </div>
                <div className="absolute bottom-5 left-4 right-4">
                  <p className="text-lg font-bold text-white">Three months of work.</p>
                  <p className="text-lg font-bold" style={{ color: COLOR.gold }}>One night to remember.</p>
                </div>
              </motion.div>
            )}

            {FRAMES[active].key === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 grid grid-cols-2 gap-1.5 p-4"
              >
                {[
                  { tone: "#2a2410", status: "approved" },
                  { tone: "#141414", status: "revision" },
                  { tone: "#1e1e1e", status: "approved" },
                  { tone: "#201c10", status: "none" },
                ].map((tile, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg" style={{ background: tile.tone }}>
                    {tile.status === "approved" && (
                      <span
                        className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                        style={{ background: "#22C55E", color: "#080808" }}
                      >
                        ✓ Approved
                      </span>
                    )}
                    {tile.status === "revision" && (
                      <span
                        className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                        style={{ background: "#F97316", color: "#080808" }}
                      >
                        ✎ Revision
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {FRAMES[active].key === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex flex-col justify-center gap-4 p-6"
              >
                <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.1em" }}>
                  This billing cycle
                </p>
                <p className="text-3xl font-bold text-white">
                  3 <span className="text-white/30">of 5 projects used</span>
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: "60%", background: COLOR.gold }} />
                </div>
                <p className="text-xs text-white/40">Fashion Fest flagged 1 file for revision — check your notes.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* frame indicator / label */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium text-white/40">{FRAMES[active].label}</p>
        <div className="flex gap-1.5">
          {FRAMES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show frame ${i + 1}`}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === active ? 18 : 6,
                background: i === active ? COLOR.gold : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}