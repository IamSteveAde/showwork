"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  Check,
  Play,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";

const COLOR = {
  black: "#101828",
  white: "#FFFFFF",
  blue: "#1768E8",
  blueSoft: "#EEF5FF",
  border: "#E4E7EC",
  muted: "#667085",
  subtle: "#98A2B3",
};

const COMMUNITY_URL =
  "https://chat.whatsapp.com/GVRHGFaFW5Z0yOOWbWmrn0?mode=gi_t";

const SOCIAL_TUTORIAL_URL =
  "https://youtu.be/2UFJNWqFnxQ?si=3M8DOLyCvLhKaukN";

const ROUTES = [
  {
    key: "creator",
    number: "01",
    eyebrow: "FOR CREATORS",
    title: "You make the work.",
    description:
      "For videographers, photographers, designers and creative professionals who need a better way to present and deliver their work.",
    href: "/dashboard/portfolio",
    icon: Camera,
    tag: "Portfolio + delivery",
  },
  {
    key: "social",
    number: "02",
    eyebrow: "FOR SOCIAL MEDIA TEAMS",
    title: "You manage the content.",
    description:
      "Build client workspaces, give AI the business context, generate content calendars and manage the entire social media workflow in one place.",
    href: "/dashboard/calendars",
    icon: WandSparkles,
    tag: "AI-powered client workspaces",
    tutorial: true,
  },
  {
    key: "portfolio",
    number: "03",
    eyebrow: "FOR YOUR PROFESSIONAL PRESENCE",
    title: "You need a portfolio.",
    description:
      "Create a polished portfolio that gives your work one professional home and makes it easier for people to discover what you do.",
    href: "/dashboard/portfolio",
    icon: BriefcaseBusiness,
    tag: "Free portfolio",
  },
];

export default function WelcomePage() {
  const router = useRouter();

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  return (
    <main className="min-h-screen bg-white text-[#101828]">
      {/* =========================================================
          HEADER
      ========================================================== */}

      <header className="border-b border-[#EAECF0] bg-white">
        <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/dashboard"
            className="group flex items-center"
            aria-label="Showwork"
          >
            <img
              src="/images/logo/swwhite.svg"
              alt="Showwork"
              className="h-7 w-auto brightness-0"
            />
          </Link>

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-4 py-2 text-[11px] font-semibold text-[#475467] transition hover:border-[#CBD5E1] hover:bg-[#F9FAFB] hover:text-[#101828]"
          >
            Skip for now
            <ArrowRight
              size={13}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </header>

      {/* =========================================================
          MAIN
      ========================================================== */}

      <div className="mx-auto w-full max-w-[1320px] px-5 pb-10 pt-14 sm:px-8 sm:pb-14 sm:pt-20 lg:px-10 lg:pt-24">
        {/* HERO */}

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#DDE9FF] bg-[#F5F8FF] px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#1768E8]">
            <Sparkles size={11} />
            Welcome to Showwork
          </div>

          <h1 className="mt-7 text-[clamp(2.8rem,6vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.07em] text-[#101828]">
            What are you
            <br />
            <span className="text-[#1768E8]">building?</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[590px] text-[14px] leading-7 text-[#667085] sm:text-[15px]">
            Showwork gives creative professionals the tools to present their
            work, deliver projects and manage ongoing client content — all in
            one place.
          </p>
        </motion.section>

        {/* =========================================================
            OPTIONS
        ========================================================== */}

        <section className="mt-14 sm:mt-16">
          <div className="grid gap-4 lg:grid-cols-3">
            {ROUTES.map((route, index) => {
              const Icon = route.icon;
              const isSocial = route.key === "social";

              return (
                <motion.div
                  key={route.key}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.65,
                    delay: 0.12 + index * 0.09,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group"
                >
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() => handleCardClick(route.href)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleCardClick(route.href);
                      }
                    }}
                    className={`
                      relative
                      flex
                      min-h-[390px]
                      h-full
                      cursor-pointer
                      flex-col
                      overflow-hidden
                      rounded-[28px]
                      border
                      p-6
                      shadow-[0_2px_8px_rgba(16,24,40,0.025)]
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      sm:p-7
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#1768E8]
                      focus:ring-offset-2
                      ${
                        isSocial
                          ? "border-[#1768E8] bg-[#1768E8] text-white shadow-[0_18px_50px_rgba(23,104,232,0.18)] hover:border-[#0F5ACF] hover:shadow-[0_24px_60px_rgba(23,104,232,0.24)]"
                          : "border-[#E4E7EC] bg-white hover:border-[#C9D8F2] hover:shadow-[0_18px_50px_rgba(16,24,40,0.08)]"
                      }
                    `}
                  >
                    {/* =================================================
                        BLUE CARD DECORATIVE LINES
                    ================================================== */}

                    {isSocial && (
                      <>
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-20 -top-24 h-[280px] w-[280px] rounded-full border border-white/10"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-10 -top-14 h-[220px] w-[220px] rounded-full border border-white/[0.08]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute right-[-80px] top-[130px] h-px w-[340px] rotate-[-32deg] bg-white/10"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute right-[-100px] top-[170px] h-px w-[360px] rotate-[-32deg] bg-white/[0.07]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-[-80px] left-[-70px] h-[220px] w-[220px] rounded-full border border-white/[0.08]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-10 left-[-90px] h-px w-[300px] rotate-[28deg] bg-white/[0.08]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 opacity-[0.045]"
                          style={{
                            backgroundImage:
                              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                            backgroundSize: "34px 34px",
                          }}
                        />
                      </>
                    )}

                    {/* =================================================
                        TOP
                    ================================================== */}

                    <div className="relative z-10 flex items-center justify-between">
                      <span
                        className={`text-[9px] font-bold tracking-[0.18em] ${
                          isSocial ? "text-white/55" : "text-[#98A2B3]"
                        }`}
                      >
                        {route.number}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] ${
                          isSocial
                            ? "bg-white/12 text-white/80"
                            : "bg-[#F8FAFC] text-[#667085]"
                        }`}
                      >
                        {route.tag}
                      </span>
                    </div>

                    {/* =================================================
                        ICON
                    ================================================== */}

                    <div
                      className={`relative z-10 mt-9 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                        isSocial
                          ? "bg-white text-[#1768E8] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                          : "bg-[#F5F8FF] text-[#1768E8] group-hover:bg-[#1768E8] group-hover:text-white"
                      }`}
                    >
                      <Icon size={20} strokeWidth={1.8} />
                    </div>

                    {/* =================================================
                        COPY
                    ================================================== */}

                    <div className="relative z-10 mt-7">
                      <p
                        className={`text-[9px] font-bold uppercase tracking-[0.18em] ${
                          isSocial ? "text-white/65" : "text-[#1768E8]"
                        }`}
                      >
                        {route.eyebrow}
                      </p>

                      <h2
                        className={`mt-2 text-[24px] font-semibold tracking-[-0.045em] ${
                          isSocial ? "text-white" : "text-[#101828]"
                        }`}
                      >
                        {route.title}
                      </h2>

                      <p
                        className={`mt-3 max-w-[350px] text-[13px] leading-6 ${
                          isSocial ? "text-white/75" : "text-[#667085]"
                        }`}
                      >
                        {route.description}
                      </p>
                    </div>

                    {/* =================================================
                        SOCIAL MEDIA TUTORIAL
                    ================================================== */}

                    {route.tutorial && (
                      <a
                        href={SOCIAL_TUTORIAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Watch the Showwork social media workflow tutorial on YouTube"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        className="
                          group/tutorial
                          relative
                          z-20
                          mt-5
                          flex
                          items-center
                          gap-3
                          rounded-2xl
                          border
                          border-white/15
                          bg-white/10
                          p-3
                          backdrop-blur-sm
                          transition
                          hover:border-white/25
                          hover:bg-white/15
                        "
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1768E8] shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                          <Play
                            size={13}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-white">
                            New to Showwork?
                          </p>

                          <p className="mt-0.5 text-[9px] leading-4 text-white/60">
                            Watch the quick social media workflow tutorial
                          </p>
                        </div>

                        <ArrowRight
                          size={13}
                          className="ml-auto shrink-0 text-white/50 transition-transform group-hover/tutorial:translate-x-0.5 group-hover/tutorial:text-white"
                        />
                      </a>
                    )}

                    {/* =================================================
                        CTA
                    ================================================== */}

                    <div className="relative z-10 mt-auto flex items-center justify-between pt-7">
                      <span
                        className={`text-[11px] font-bold ${
                          isSocial
                            ? "text-white"
                            : "text-[#344054] group-hover:text-[#1768E8]"
                        }`}
                      >
                        Get started
                      </span>

                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                          isSocial
                            ? "border border-white/20 bg-white text-[#1768E8] group-hover:bg-white/90"
                            : "border border-[#E4E7EC] bg-white text-[#98A2B3] group-hover:border-[#1768E8] group-hover:bg-[#1768E8] group-hover:text-white"
                        }`}
                      >
                        <ArrowRight size={14} />
                      </div>
                    </div>

                    {/* =================================================
                        BOTTOM ACCENT
                    ================================================== */}

                    {!isSocial && (
                      <div className="absolute bottom-0 left-7 right-7 h-[2px] origin-left scale-x-0 rounded-full bg-[#1768E8] transition-transform duration-500 group-hover:scale-x-100" />
                    )}

                    {isSocial && (
                      <div className="absolute bottom-0 left-7 right-7 h-[2px] origin-left scale-x-0 rounded-full bg-white transition-transform duration-500 group-hover:scale-x-100" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            SIMPLE VALUE STRIP
        ========================================================== */}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.55,
            duration: 0.65,
          }}
          className="mx-auto mt-8 max-w-[920px]"
        >
          <div className="grid overflow-hidden rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] sm:grid-cols-3">
            <div className="flex items-center gap-3 border-b border-[#EAECF0] px-5 py-4 sm:border-b-0 sm:border-r">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#1768E8]">
                <Check size={14} strokeWidth={2.5} />
              </div>

              <span className="text-[10px] font-semibold text-[#475467]">
                One place for your client work
              </span>
            </div>

            <div className="flex items-center gap-3 border-b border-[#EAECF0] px-5 py-4 sm:border-b-0 sm:border-r">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#1768E8]">
                <Sparkles size={14} />
              </div>

              <span className="text-[10px] font-semibold text-[#475467]">
                AI built into your workflow
              </span>
            </div>

            <div className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#1768E8]">
                <Users size={14} />
              </div>

              <span className="text-[10px] font-semibold text-[#475467]">
                Built for working with clients
              </span>
            </div>
          </div>
        </motion.section>

        {/* =========================================================
            COMMUNITY
        ========================================================== */}

        <motion.a
          href={COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="
            group
            mx-auto
            mt-7
            flex
            w-full
            max-w-[430px]
            items-center
            justify-between
            rounded-2xl
            border
            border-[#EAECF0]
            bg-white
            px-5
            py-4
            shadow-[0_2px_8px_rgba(16,24,40,0.025)]
            transition
            hover:border-[#D0D5DD]
            hover:shadow-[0_8px_25px_rgba(16,24,40,0.05)]
          "
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0FDF4]">
              <Users size={15} className="text-[#16A34A]" />
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[#344054]">
                Join the Creativo Community
              </p>

              <p className="mt-0.5 text-[9px] text-[#98A2B3]">
                Meet other people building creative businesses.
              </p>
            </div>
          </div>

          <ArrowRight
            size={14}
            className="text-[#98A2B3] transition-transform group-hover:translate-x-1 group-hover:text-[#344054]"
          />
        </motion.a>

        {/* =========================================================
            FOOTER
        ========================================================== */}

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.8 }}
          className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#EAECF0] pt-5 text-[10px] text-[#98A2B3] sm:flex-row"
        >
          <p>You can change your choice anytime from your dashboard.</p>

          <Link
            href="/dashboard"
            className="font-semibold text-[#667085] underline underline-offset-4 transition hover:text-[#1768E8]"
          >
            Go to dashboard
          </Link>
        </motion.footer>
      </div>
    </main>
  );
}