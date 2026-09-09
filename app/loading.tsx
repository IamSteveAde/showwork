"use client";

import { useEffect, useState } from "react";

const BLUE = "#2478FF";

export default function Loading() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      aria-label="Loading Showwork"
      role="status"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 42%, rgba(36,120,255,0.055), transparent 30%), #080808",
        color: "#fff",
        opacity: mounted ? 1 : 0,
        transition: "opacity 260ms ease",
      }}
    >
      <style>{`
        @keyframes showwork-bounce-1 {
          0%, 100% {
            transform: translateY(0) scaleX(1) scaleY(1);
          }
          42% {
            transform: translateY(-34px) scaleX(0.94) scaleY(1.06);
          }
          58% {
            transform: translateY(-18px) scaleX(0.97) scaleY(1.03);
          }
        }

        @keyframes showwork-bounce-2 {
          0%, 100% {
            transform: translateY(0) scaleX(1) scaleY(1);
          }
          42% {
            transform: translateY(-34px) scaleX(0.94) scaleY(1.06);
          }
          58% {
            transform: translateY(-18px) scaleX(0.97) scaleY(1.03);
          }
        }

        @keyframes showwork-bounce-3 {
          0%, 100% {
            transform: translateY(0) scaleX(1) scaleY(1);
          }
          42% {
            transform: translateY(-34px) scaleX(0.94) scaleY(1.06);
          }
          58% {
            transform: translateY(-18px) scaleX(0.97) scaleY(1.03);
          }
        }

        @keyframes showwork-shadow-1 {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.28;
          }
          42% {
            transform: scaleX(0.58);
            opacity: 0.10;
          }
          58% {
            transform: scaleX(0.76);
            opacity: 0.16;
          }
        }

        @keyframes showwork-shadow-2 {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.28;
          }
          42% {
            transform: scaleX(0.58);
            opacity: 0.10;
          }
          58% {
            transform: scaleX(0.76);
            opacity: 0.16;
          }
        }

        @keyframes showwork-shadow-3 {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.28;
          }
          42% {
            transform: scaleX(0.58);
            opacity: 0.10;
          }
          58% {
            transform: scaleX(0.76);
            opacity: 0.16;
          }
        }

        @keyframes showwork-glow {
          0%, 100% {
            opacity: 0.18;
            transform: scale(1);
          }
          50% {
            opacity: 0.34;
            transform: scale(1.12);
          }
        }

        @keyframes showwork-wordmark {
          0% {
            opacity: 0;
            transform: translateY(7px);
            letter-spacing: 0.28em;
          }
          35% {
            opacity: 0.45;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 0.22em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .showwork-motion {
            animation: none !important;
          }
        }
      `}</style>

      <div
        style={{
          position: "relative",
          width: 180,
          height: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        {/* Ambient blue atmosphere */}
        <div
          className="showwork-motion"
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            width: 130,
            height: 80,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(36,120,255,0.22) 0%, rgba(36,120,255,0.06) 38%, transparent 72%)",
            filter: "blur(18px)",
            animation: "showwork-glow 2.2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* Bouncing balls */}
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 0,
            right: 0,
            height: 70,
          }}
        >
          {/* Ball 1 */}
          <div
            className="showwork-motion"
            style={{
              position: "absolute",
              left: 28,
              bottom: 4,
              width: 13,
              height: 13,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 32% 26%, #8DB8FF 0%, #2478FF 35%, #1253C7 72%, #0A2E73 100%)",
              boxShadow:
                "0 5px 18px rgba(36,120,255,0.30), inset 1px 1px 2px rgba(255,255,255,0.35)",
              animation:
                "showwork-bounce-1 1.35s cubic-bezier(.37,0,.63,1) infinite",
            }}
          />

          {/* Ball 2 */}
          <div
            className="showwork-motion"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 4,
              width: 16,
              height: 16,
              marginLeft: -8,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 32% 26%, #A5C8FF 0%, #2478FF 35%, #1253C7 72%, #0A2E73 100%)",
              boxShadow:
                "0 6px 22px rgba(36,120,255,0.38), inset 1px 1px 2px rgba(255,255,255,0.38)",
              animation:
                "showwork-bounce-2 1.35s cubic-bezier(.37,0,.63,1) -0.22s infinite",
            }}
          />

          {/* Ball 3 */}
          <div
            className="showwork-motion"
            style={{
              position: "absolute",
              right: 28,
              bottom: 4,
              width: 13,
              height: 13,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 32% 26%, #8DB8FF 0%, #2478FF 35%, #1253C7 72%, #0A2E73 100%)",
              boxShadow:
                "0 5px 18px rgba(36,120,255,0.30), inset 1px 1px 2px rgba(255,255,255,0.35)",
              animation:
                "showwork-bounce-3 1.35s cubic-bezier(.37,0,.63,1) -0.44s infinite",
            }}
          />

          {/* Ground shadows */}
          <div
            className="showwork-motion"
            style={{
              position: "absolute",
              left: 28,
              bottom: 0,
              width: 13,
              height: 3,
              borderRadius: "50%",
              background: "rgba(36,120,255,0.35)",
              filter: "blur(2px)",
              animation:
                "showwork-shadow-1 1.35s cubic-bezier(.37,0,.63,1) infinite",
            }}
          />

          <div
            className="showwork-motion"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: 16,
              height: 3,
              marginLeft: -8,
              borderRadius: "50%",
              background: "rgba(36,120,255,0.35)",
              filter: "blur(2px)",
              animation:
                "showwork-shadow-2 1.35s cubic-bezier(.37,0,.63,1) -0.22s infinite",
            }}
          />

          <div
            className="showwork-motion"
            style={{
              position: "absolute",
              right: 28,
              bottom: 0,
              width: 13,
              height: 3,
              borderRadius: "50%",
              background: "rgba(36,120,255,0.35)",
              filter: "blur(2px)",
              animation:
                "showwork-shadow-3 1.35s cubic-bezier(.37,0,.63,1) -0.44s infinite",
            }}
          />
        </div>

        {/* Brand */}
        <div
          className="showwork-motion"
          style={{
            position: "relative",
            marginTop: 26,
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.72)",
            animation:
              "showwork-wordmark 1.1s cubic-bezier(.22,1,.36,1) forwards",
            whiteSpace: "nowrap",
          }}
        >
          SHOW
          <span style={{ color: BLUE }}>WORK</span>
        </div>
      </div>
    </div>
  );
}