"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers/contexts where the Clipboard API is
      // blocked (e.g. non-HTTPS) — select the text so the person can
      // still copy manually via Cmd/Ctrl+C.
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // give up silently — the link is still visible and selectable
      }
      document.body.removeChild(el);
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy link"
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors"
      style={{
        background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
        color: copied ? "#22C55E" : "rgba(255,255,255,0.6)",
      }}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="5" y="5" width="7.5" height="7.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3.5 9V2.7A1.2 1.2 0 0 1 4.7 1.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}