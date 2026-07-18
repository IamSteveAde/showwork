"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Next.js's built-in loading.tsx only appears once the target page
 * actually starts fetching data — there's a real gap between "user
 * clicked" and "navigation started" where nothing shows at all, which
 * is exactly what reads as unresponsive. This shows the same gold
 * roller the instant any internal link is clicked, then hides it once
 * the URL actually changes (confirming the navigation went through).
 */
export default function RouteTransitionIndicator() {
  const [active, setActive] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL changing is our signal that navigation actually completed.
  useEffect(() => {
    setActive(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // only internal links
      if (anchor.target === "_blank") return; // opens a new tab, not a real navigation here
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // opening in new tab/window

      // Same destination — nothing will actually navigate.
      if (href === pathname) return;

      setActive(true);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "rgba(10,10,10,0.45)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <style>{`
        @keyframes showwork-spin { to { transform: rotate(360deg); } }
        @keyframes showwork-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
      `}</style>
      <div style={{ position: "relative", width: 56, height: 56 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "9999px", border: "3px solid rgba(245,200,66,0.15)" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            border: "3px solid transparent",
            borderTopColor: "#F5C842",
            borderRightColor: "#F5C842",
            animation: "showwork-spin 0.9s linear infinite",
          }}
        />
      </div>
      <p
        style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          animation: "showwork-pulse 1.6s ease-in-out infinite",
        }}
      >
        Show<span style={{ color: "#F5C842" }}>work</span>
      </p>
    </div>
  );
}