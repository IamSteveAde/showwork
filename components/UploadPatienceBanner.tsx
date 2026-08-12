"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MESSAGES = [
  "Large files take a little longer — hang tight.",
  "Your files are uploading securely in the background.",
  "No need to keep this tab in focus, just don't close it.",
  "Almost every upload finishes faster than it feels.",
  "If it looks slow, that's your actual connection speed — not a problem here.",
];

// A small, reassuring rotating message shown while a real upload is
// in progress — the point isn't new information, it's confidence
// that nothing has frozen during what can genuinely be a long,
// quiet-looking wait on a large file.
export default function UploadPatienceBanner({ active }: { active: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-4 py-3" style={{ background: "rgba(36,120,255,0.08)", border: "1px solid rgba(36,120,255,0.2)" }}>
      <motion.span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: "#2478FF" }}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4 }}
          className="text-xs text-white/70"
        >
          {MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}