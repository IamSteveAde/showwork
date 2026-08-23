"use client";

import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";

const COLOR = {
  blue: "#2478FF",
  blueDark: "#0052FF",
  black: "#0A0A0A",
  yellow: "#FFCC00",
};

export default function SpotlightHero({
  heroImageUrl,
  headline,
  description,
  isOpen,
}: {
  heroImageUrl: string | null;
  headline: string;
  description: string;
  isOpen: boolean;
}) {
  const scrollToForm = () => {
    document.getElementById("submit")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section
      className="relative isolate flex min-h-[88vh] items-end overflow-hidden bg-[#0A0A0A] px-6 pb-10 pt-36 sm:min-h-[92vh] sm:pb-14 md:px-12 md:pb-16 lg:px-16"
      style={{
        // Creates a clean stacking context so the fixed background
        // cannot visually bleed into the sections below.
        contain: "paint",
      }}
    >
      {/* ================================================================
          FIXED HERO IMAGE
          ================================================================ */}

      {heroImageUrl && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${heroImageUrl}")`,
              backgroundAttachment: "fixed",
            }}
            aria-hidden="true"
          />

          {/* Cinematic black treatment */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(5,7,12,0.20) 0%, rgba(5,7,12,0.34) 32%, rgba(5,7,12,0.78) 68%, rgba(5,7,12,0.97) 100%)",
            }}
            aria-hidden="true"
          />

          {/* Blue brand light */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(circle at 15% 22%, rgba(36,120,255,0.30) 0%, rgba(36,120,255,0) 34%), radial-gradient(circle at 88% 18%, rgba(255,204,0,0.12) 0%, rgba(255,204,0,0) 24%)",
            }}
            aria-hidden="true"
          />

          {/* Bottom cinematic fade */}
          <div
            className="absolute inset-x-0 bottom-0 z-0 h-[48%]"
            style={{
              background:
                "linear-gradient(to top, rgba(5,7,12,0.98), rgba(5,7,12,0))",
            }}
            aria-hidden="true"
          />

          {/* Fine grid */}
          <div
            className="absolute inset-0 z-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
            aria-hidden="true"
          />
        </>
      )}

      {/* ================================================================
          CONTENT
          ================================================================ */}

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">

          {/* Main editorial content */}
          <div className="max-w-5xl">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/20 px-3.5 py-2 backdrop-blur-xl">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #2478FF, #0052FF)",
                }}
              >
                <Sparkles
                  size={10}
                  strokeWidth={2.5}
                  className="text-white"
                />
              </span>

              <span className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-white/65 sm:text-[10px]">
                Monthly Spotlight
              </span>
            </div>

            <h1 className="max-w-5xl text-[3rem] font-extrabold leading-[0.94] tracking-[-0.065em] text-white sm:text-6xl md:text-7xl lg:text-[6rem]">
              {headline}
            </h1>

            <p className="mt-7 max-w-2xl text-sm leading-7 text-white/55 sm:text-base md:text-lg">
              {description}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                onClick={isOpen ? scrollToForm : undefined}
                disabled={!isOpen}
                className="group inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-xs font-extrabold text-white shadow-[0_18px_45px_-18px_rgba(36,120,255,0.8)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-18px_rgba(36,120,255,0.95)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:px-7 sm:py-4 sm:text-sm"
                style={{
                  background: isOpen
                    ? "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)"
                    : "rgba(255,255,255,0.1)",
                  color: isOpen
                    ? "#FFFFFF"
                    : "rgba(255,255,255,0.5)",
                  boxShadow: isOpen
                    ? "0 18px 45px -18px rgba(36,120,255,0.8)"
                    : undefined,
                }}
              >
                {isOpen
                  ? "Submit Your Project"
                  : "Submissions closed — back next month"}

                {isOpen && (
                  <ArrowRight
                    size={15}
                    strokeWidth={2.5}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                )}
              </button>

              {isOpen && (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("submit")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3.5 text-xs font-bold text-white/55 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:inline-flex"
                >
                  How it works
                  <ArrowDown size={13} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Small editorial side panel */}
          <div className="hidden lg:block">
            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
              <div
                className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl"
                style={{
                  background: "rgba(36,120,255,0.25)",
                }}
              />

              <div className="relative">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/30">
                    Creativo
                  </span>

                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: isOpen
                        ? COLOR.yellow
                        : "rgba(255,255,255,0.25)",
                      boxShadow: isOpen
                        ? "0 0 12px rgba(255,204,0,0.75)"
                        : undefined,
                    }}
                  />
                </div>

                <p className="text-2xl font-extrabold leading-tight tracking-[-0.04em] text-white">
                  Your work
                  <br />
                  deserves
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(100deg, #2478FF, #68B2FF, #FFFFFF)",
                    }}
                  >
                    the spotlight.
                  </span>
                </p>

                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">
                    {isOpen ? "Open for entries" : "Currently closed"}
                  </span>

                  <span
                    className="text-[10px] font-extrabold"
                    style={{
                      color: isOpen ? COLOR.yellow : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {isOpen ? "NOW" : "SOON"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom scroll cue */}
        <div className="mt-12 flex items-center gap-3 text-white/25">
          <span className="h-px w-10 bg-white/15" />

          <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
            Explore the spotlight
          </span>

          <ArrowDown
            size={12}
            strokeWidth={1.8}
            className="animate-bounce"
          />
        </div>
      </div>
    </section>
  );
}
