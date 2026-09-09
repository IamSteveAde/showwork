"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const BLUE = "#2478FF";

export default function RouteTransitionIndicator() {
  const [active, setActive] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Hide the loader once the destination URL changes.
   */
  useEffect(() => {
    if (!active) return;

    setActive(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname, searchParams]);

  /*
   * Detect internal navigation immediately.
   */
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href) {
        return;
      }

      /*
       * Only internal navigation.
       */
      if (!href.startsWith("/")) {
        return;
      }

      /*
       * Ignore hash links.
       */
      if (href.startsWith("#")) {
        return;
      }

      /*
       * Ignore downloads.
       */
      if (anchor.hasAttribute("download")) {
        return;
      }

      /*
       * Ignore links opening a new tab.
       */
      if (anchor.target === "_blank") {
        return;
      }

      /*
       * Ignore API and Next.js internal URLs.
       */
      if (
        href.startsWith("/api/") ||
        href.startsWith("/_next/")
      ) {
        return;
      }

      const currentUrl =
        pathname +
        (searchParams?.toString()
          ? `?${searchParams.toString()}`
          : "");

      const normalize = (value: string) => {
        if (value === "/") return "/";
        return value.replace(/\/+$/, "");
      };

      if (normalize(href) === normalize(currentUrl)) {
        return;
      }

      /*
       * Already showing.
       */
      if (active) {
        return;
      }

      /*
       * Show immediately.
       */
      setActive(true);

      /*
       * Safety timeout.
       */
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setActive(false);
        timeoutRef.current = null;
      }, 4000);
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, searchParams, active]);

  /*
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!active) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        background: "rgba(7, 7, 8, 0.72)",

        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",

        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes showwork-dot-bounce {
          0%,
          60%,
          100% {
            transform: translateY(0) scale(1);
          }

          30% {
            transform: translateY(-12px) scale(1.04);
          }
        }

        @keyframes showwork-loader-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        .showwork-loader {
          animation: showwork-loader-in 160ms ease-out both;
        }

        .showwork-dot {
          animation:
            showwork-dot-bounce
            900ms
            cubic-bezier(0.34, 1.56, 0.64, 1)
            infinite;
        }

        .showwork-dot-1 {
          animation-delay: 0ms;
        }

        .showwork-dot-2 {
          animation-delay: 120ms;
        }

        .showwork-dot-3 {
          animation-delay: 240ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .showwork-dot {
            animation: none;
          }
        }
      `}</style>

      <div
        className="showwork-loader"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Bouncing dots */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 8,
            height: 32,
          }}
        >
          {/* Dot 1 */}
          <span
            className="showwork-dot showwork-dot-1"
            style={{
              display: "block",

              width: 9,
              height: 9,

              borderRadius: "50%",

              background: BLUE,

              boxShadow:
                "0 3px 12px rgba(36, 120, 255, 0.38)",

              willChange: "transform",
            }}
          />

          {/* Dot 2 */}
          <span
            className="showwork-dot showwork-dot-2"
            style={{
              display: "block",

              width: 11,
              height: 11,

              borderRadius: "50%",

              background: BLUE,

              boxShadow:
                "0 3px 14px rgba(36, 120, 255, 0.42)",

              willChange: "transform",
            }}
          />

          {/* Dot 3 */}
          <span
            className="showwork-dot showwork-dot-3"
            style={{
              display: "block",

              width: 9,
              height: 9,

              borderRadius: "50%",

              background: BLUE,

              boxShadow:
                "0 3px 12px rgba(36, 120, 255, 0.38)",

              willChange: "transform",
            }}
          />
        </div>
      </div>
    </div>
  );
}