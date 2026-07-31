"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MESSAGES = [
  "Let's create something meaningful ✨",
  "Content that gets attention — let's talk",
  "Got a project in mind? Say hello 👋",
  "Ready when you are",
];

function IconWhatsApp() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.85L2.05 22l5.36-1.4a9.9 9.9 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.13-2.9-7C17 3.03 14.53 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.25 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

export default function WhatsAppChatWidget({
  whatsappNumber,
  companyName,
}: {
  whatsappNumber: string;
  companyName: string;
}) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 500);
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  const digitsOnly = whatsappNumber.replace(/[^0-9]/g, "");
  const message = `Hi ${companyName}, I saw your portfolio on Showwork and I'd love to talk about a project.`;
  const href = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3"
    >
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={msgIndex}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="hidden max-w-[210px] rounded-2xl bg-black/85 px-4 py-2.5 text-sm text-white shadow-xl backdrop-blur-md sm:block"
          >
            {MESSAGES[msgIndex]}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105" style={{ background: "#25D366" }}>
        <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: "#25D366" }} />
        <IconWhatsApp />
      </div>
    </a>
  );
}