"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import WebinarRsvpModal from "@/components/creativo/WebinarRsvpModal";

const COLOR = {
  black: "#08090B",
  blackSoft: "#101216",
  paper: "#F5F3EE",
  white: "#FFFFFF",
  blue: "#2478FF",
  blueBright: "#68B2FF",
  yellow: "#FFCC00",
  ink: "#111214",
  muted: "rgba(17,18,20,0.58)",
  line: "rgba(17,18,20,0.10)",
  lineDark: "rgba(255,255,255,0.10)",
};

interface Speaker {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  profileImageUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  xUrl: string | null;
  linkedinUrl: string | null;
}

interface WebinarData {
  id: string;
  slug: string;
  flyerImageUrl: string | null;
  topic: string;
  description: string | null;
  whatToExpect: string | null;
  guests: string | null;
  startsAt: string;
  venue: string | null;
  replayUrl: string | null;
  speakers: Speaker[];
}

/* -------------------------------------------------------------------------- */
/*                                  ICONS                                     */
/* -------------------------------------------------------------------------- */

function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7 17 17 7M8 7h9v9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4.5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 3v3M17 3v3M3 9h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 7v5l3.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
    </svg>
  );
}

function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.8 13.9 9l6.3 1.9-6.3 1.9-1.9 6.4-1.9-6.4-6.3-1.9L10.1 9 12 2.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle
        cx="17.2"
        cy="6.8"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4h0s-3.9 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.6c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.8.8 2.3.9 1.7.1 6.5.2 6.5.2s3.9 0 6.7-.2c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.7.2-3.5v-1.6c0-1.7-.2-3.5-.2-3.5ZM9.9 14.6V8.9l5.4 2.9-5.4 2.8Z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SOCIAL BUTTON                                 */
/* -------------------------------------------------------------------------- */

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5"
      style={{
        borderColor: "rgba(17,18,20,0.10)",
        background: "#FFFFFF",
        color: "rgba(17,18,20,0.55)",
      }}
    >
      {children}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SPEAKER CARD                                  */
/* -------------------------------------------------------------------------- */

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const hasSocials =
    speaker.instagramUrl ||
    speaker.youtubeUrl ||
    speaker.xUrl ||
    speaker.linkedinUrl;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55 }}
      className="group relative overflow-hidden rounded-[28px] border bg-white p-6 sm:p-7"
      style={{ borderColor: COLOR.line }}
    >
      <div
        className="absolute right-0 top-0 h-28 w-28 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: COLOR.blue }}
      />

      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-full bg-[#E9EAEC]">
            {speaker.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speaker.profileImageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-black/20">
                {speaker.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-lg font-bold tracking-[-0.025em] text-black">
              {speaker.name}
            </p>

            <p
              className="mt-1 text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: COLOR.blue }}
            >
              {speaker.title}
            </p>
          </div>
        </div>

        {speaker.bio && (
          <p className="mt-6 text-[14px] leading-[1.75] text-black/55">
            {speaker.bio}
          </p>
        )}

        {hasSocials && (
          <div className="mt-6 flex items-center gap-2">
            {speaker.instagramUrl && (
              <SocialIcon
                href={speaker.instagramUrl}
                label={`${speaker.name} on Instagram`}
              >
                <IconInstagram />
              </SocialIcon>
            )}

            {speaker.youtubeUrl && (
              <SocialIcon
                href={speaker.youtubeUrl}
                label={`${speaker.name} on YouTube`}
              >
                <IconYouTube />
              </SocialIcon>
            )}

            {speaker.xUrl && (
              <SocialIcon
                href={speaker.xUrl}
                label={`${speaker.name} on X`}
              >
                <IconX />
              </SocialIcon>
            )}

            {speaker.linkedinUrl && (
              <SocialIcon
                href={speaker.linkedinUrl}
                label={`${speaker.name} on LinkedIn`}
              >
                <IconLinkedIn />
              </SocialIcon>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

/* -------------------------------------------------------------------------- */
/*                         FLOATING RSVP INVITATION                           */
/* -------------------------------------------------------------------------- */

function FloatingReserveButton({
  speaker,
  onClick,
}: {
  speaker: Speaker | null;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -28, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay: 1,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed bottom-5 left-4 z-[80] sm:bottom-7 sm:left-6 lg:left-8"
    >
      {/* Soft ambient glow */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-[30px] opacity-30 blur-2xl"
        style={{ background: COLOR.blue }}
      />

      <motion.button
        type="button"
        onClick={onClick}
        aria-label="Reserve your spot for this webinar"
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex items-center overflow-hidden rounded-[22px] border text-left shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl"
        style={{
          borderColor: "rgba(255,255,255,0.13)",
          background:
            "linear-gradient(135deg, rgba(17,20,27,0.97), rgba(8,9,11,0.94))",
        }}
      >
        {/* Blue edge light */}
        <div
          className="absolute inset-y-0 left-0 w-[2px]"
          style={{ background: COLOR.blue }}
        />

        {/* Host image */}
        <div className="relative ml-2.5 flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center">
          {/* Animated ring */}
          <motion.span
            animate={{
              scale: [1, 1.16, 1],
              opacity: [0.28, 0.08, 0.28],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${COLOR.blue}`,
            }}
          />

          <div
            className="relative h-[50px] w-[50px] overflow-hidden rounded-full border-2"
            style={{
              borderColor: "rgba(255,255,255,0.18)",
              background: "#191C22",
            }}
          >
            {speaker?.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speaker.profileImageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/50">
                <SparkIcon className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* Live dot */}
          <span
            className="absolute bottom-1 right-0 h-3.5 w-3.5 rounded-full border-2"
            style={{
              borderColor: "#111318",
              background: COLOR.blue,
              boxShadow: `0 0 12px ${COLOR.blue}`,
            }}
          />
        </div>

        {/* Copy */}
        <div className="min-w-0 py-3 pl-3 pr-2 sm:pr-3">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: COLOR.blue,
                boxShadow: `0 0 9px ${COLOR.blue}`,
              }}
            />

            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/40">
              Live session
            </span>
          </div>

          <p className="mt-1 text-[13px] font-bold tracking-[-0.015em] text-white">
            Reserve your spot
          </p>

          <p className="mt-0.5 hidden max-w-[170px] truncate text-[10px] text-white/35 sm:block">
            {speaker
              ? `Join ${speaker.name} & Creativo`
              : "Join the Creativo conversation"}
          </p>
        </div>

        {/* Arrow */}
        <div
          className="mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:translate-x-0.5"
          style={{
            background: "rgba(36,120,255,0.14)",
            color: COLOR.blueBright,
          }}
        >
          <ArrowRight className="h-4 w-4" />
        </div>
      </motion.button>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            MAIN COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export default function WebinarLandingContent({
  webinar,
  isPast,
}: {
  webinar: WebinarData;
  isPast: boolean;
}) {
  const [rsvpOpen, setRsvpOpen] = useState(false);

  const expectPoints = useMemo(() => {
    if (!webinar.whatToExpect) return [];

    return webinar.whatToExpect
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }, [webinar.whatToExpect]);

  const date = useMemo(
    () => new Date(webinar.startsAt),
    [webinar.startsAt]
  );

  const host = webinar.speakers?.[0] ?? null;

  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main
      className="overflow-hidden"
      style={{
        background: COLOR.paper,
        color: COLOR.ink,
      }}
    >
      {/* ================================================================== */}
      {/* HERO                                                               */}
      {/* ================================================================== */}

      <section className="relative min-h-[min(900px,100svh)] overflow-hidden bg-[#08090B]">
        {webinar.flyerImageUrl && (
          <motion.div
            initial={{ scale: 1.04 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 1.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={webinar.flyerImageUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{
                opacity: 0.3,
              }}
            />
          </motion.div>
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(8,9,11,0.98) 0%, rgba(8,9,11,0.82) 38%, rgba(8,9,11,0.36) 72%, rgba(8,9,11,0.64) 100%)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(8,9,11,0.98) 0%, rgba(8,9,11,0.18) 52%, rgba(8,9,11,0.65) 100%)",
          }}
        />

        <div
          className="pointer-events-none absolute left-[38%] top-[18%] h-[380px] w-[380px] rounded-full blur-[130px]"
          style={{
            background: COLOR.blue,
            opacity: 0.13,
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-[min(900px,100svh)] max-w-[1440px] flex-col justify-end px-5 pb-10 pt-36 sm:px-8 sm:pb-14 lg:px-14 lg:pb-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-4xl">
              <Link
                href="/webinars"
                className="group mb-10 inline-flex items-center gap-2 text-xs font-semibold text-white/45 transition-colors hover:text-white"
              >
                <span className="transition-transform duration-300 group-hover:-translate-x-1">
                  ←
                </span>
                All webinars
              </Link>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.55 }}
                className="mb-5 flex items-center gap-3"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: isPast
                      ? "rgba(255,255,255,.35)"
                      : COLOR.blue,
                    boxShadow: isPast
                      ? "none"
                      : `0 0 18px ${COLOR.blue}`,
                  }}
                />

                <span
                  className="text-[10px] font-bold uppercase text-white/60 sm:text-xs"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {isPast
                    ? "Creativo / Past Session"
                    : "Creativo / Live Conversation"}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.18,
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="max-w-5xl text-[clamp(3rem,7.2vw,7.6rem)] font-semibold leading-[0.91] tracking-[-0.065em] text-white"
              >
                {webinar.topic}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3,
                  duration: 0.6,
                }}
                className="mt-7 max-w-2xl text-base leading-[1.7] text-white/55 sm:text-lg"
              >
                {webinar.description ||
                  "Real conversations, practical insight and fresh perspectives for people building careers, businesses and communities in the creative industry."}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.4,
                  duration: 0.6,
                }}
                className="mt-8 flex flex-wrap gap-2.5"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white/75 backdrop-blur-md">
                  <CalendarIcon />
                  {formattedDate}
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white/75 backdrop-blur-md">
                  <ClockIcon />
                  {formattedTime}
                </div>

                {webinar.venue && (
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white/75 backdrop-blur-md">
                    {webinar.venue}
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5,
                  duration: 0.6,
                }}
                className="mt-9"
              >
                {isPast ? (
                  webinar.replayUrl ? (
                    <a
                      href={webinar.replayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        background: COLOR.yellow,
                        boxShadow: "0 14px 40px rgba(255,204,0,.18)",
                      }}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10">
                        <PlayIcon />
                      </span>
                      Watch the replay
                      <ArrowUpRight className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  ) : (
                    <span className="text-sm text-white/35">
                      This conversation has ended.
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setRsvpOpen(true)}
                    className="group inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      background: COLOR.blue,
                      boxShadow: "0 18px 50px rgba(36,120,255,.25)",
                    }}
                  >
                    Reserve your spot
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
                      <ArrowRight />
                    </span>
                  </button>
                )}
              </motion.div>
            </div>

            {webinar.flyerImageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 30, rotate: 1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{
                  delay: 0.35,
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="hidden lg:block"
              >
                <div className="relative mx-auto max-w-[330px]">
                  <div className="absolute -inset-5 rounded-[36px] bg-white/[0.04] blur-2xl" />

                  <div className="relative overflow-hidden rounded-[24px] border border-white/15 bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={webinar.flyerImageUrl}
                      alt=""
                      className="aspect-[4/5] w-full rounded-[18px] object-cover"
                    />
                  </div>

                  <div className="absolute -bottom-5 -left-5 rounded-2xl border border-white/10 bg-[#111318]/90 px-4 py-3 backdrop-blur-xl">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                      Presented by
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      Creativo
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-12 hidden items-center justify-between border-t border-white/10 pt-5 md:flex">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
              A conversation for people building in the creative industry
            </p>

            <a
              href="#conversation"
              className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 transition-colors hover:text-white"
            >
              Explore
              <span className="transition-transform duration-300 group-hover:translate-y-0.5">
                ↓
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* AUDIENCE / POSITIONING                                             */}
      {/* ================================================================== */}

      <section
        id="conversation"
        className="border-b"
        style={{
          background: COLOR.blue,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-xl text-sm font-semibold leading-relaxed text-white sm:text-base">
              Creativo brings together the people shaping culture, businesses,
              careers and ideas through creativity.
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                "Creators",
                "Creative professionals",
                "Founders",
                "Creative teams",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* WHAT THIS IS                                                       */}
      {/* ================================================================== */}

      <section className="relative bg-[#F5F3EE]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
          <div className="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: COLOR.blue }}
              >
                The conversation
              </p>

              <h2 className="mt-5 max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-black sm:text-5xl">
                Not another webinar.
                <br />
                <span className="text-black/35">A room for ideas.</span>
              </h2>
            </div>

            <div className="max-w-2xl">
              <p className="text-xl font-medium leading-[1.5] tracking-[-0.025em] text-black sm:text-2xl">
                Creativo conversations are designed to give creative people
                access to the thinking, experiences and lessons behind the
                work.
              </p>

              <p className="mt-7 text-[15px] leading-[1.8] text-black/55">
                Come to learn from people who have done the work, ask better
                questions, discover new perspectives and leave with something
                useful enough to apply.
              </p>

              {webinar.guests && (
                <div
                  className="mt-9 border-l-2 pl-5"
                  style={{ borderColor: COLOR.blue }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">
                    Featured voices
                  </p>

                  <p className="mt-2 text-base font-semibold leading-relaxed text-black">
                    {webinar.guests}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* WHAT TO EXPECT                                                     */}
      {/* ================================================================== */}

      {expectPoints.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
            <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: COLOR.blue }}
                >
                  Inside the room
                </p>

                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-black sm:text-5xl">
                  What you&apos;ll leave with.
                </h2>
              </div>

              <p className="max-w-sm text-sm leading-relaxed text-black/45">
                A focused conversation built around useful ideas, real
                experience and the realities of creative work.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-[28px] border bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
              {expectPoints.map((point, index) => (
                <motion.div
                  key={`${point}-${index}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    delay: index * 0.04,
                    duration: 0.45,
                  }}
                  className="group relative min-h-[190px] bg-white p-7 transition-colors duration-300 hover:bg-[#F8F9FC] sm:p-8"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="text-[11px] font-bold tabular-nums"
                      style={{ color: COLOR.blue }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <ArrowUpRight className="h-4 w-4 text-black/15 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-black/50" />
                  </div>

                  <p className="mt-10 max-w-sm text-[15px] font-semibold leading-[1.6] tracking-[-0.015em] text-black/75">
                    {point}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* SPEAKERS                                                           */}
      {/* ================================================================== */}

      {webinar.speakers.length > 0 ? (
        <section className="relative overflow-hidden bg-[#F5F3EE]">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: COLOR.blue }}
                >
                  Who&apos;s in the room
                </p>

                <h2 className="mt-5 max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-black sm:text-5xl">
                  Learn from people who have done it.
                </h2>

                <p className="mt-6 max-w-sm text-sm leading-[1.8] text-black/50">
                  Meet the people bringing their experience, perspective and
                  expertise into this conversation.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {webinar.speakers.map((speaker) => (
                  <SpeakerCard key={speaker.id} speaker={speaker} />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        webinar.guests && (
          <section className="bg-[#F5F3EE]">
            <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
              <div className="max-w-3xl">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: COLOR.blue }}
                >
                  Featured voices
                </p>

                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-black sm:text-5xl">
                  Who&apos;s in the room.
                </h2>

                <p className="mt-7 text-lg leading-relaxed text-black/55">
                  {webinar.guests}
                </p>
              </div>
            </div>
          </section>
        )
      )}

      {/* ================================================================== */}
      {/* FINAL CTA                                                          */}
      {/* ================================================================== */}

      <section className="relative overflow-hidden bg-[#08090B]">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]"
          style={{
            background: COLOR.blue,
            opacity: 0.12,
          }}
        />

        <div className="relative mx-auto max-w-[1100px] px-5 py-24 text-center sm:px-8 md:py-32">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: COLOR.blueBright }}
          >
            {isPast ? "Keep the conversation going" : "Save your seat"}
          </p>

          <h2 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl">
            {isPast
              ? "The conversation is still worth having."
              : "Bring your curiosity. Leave with something useful."}
          </h2>

          <p className="mx-auto mt-7 max-w-xl text-sm leading-[1.8] text-white/45 sm:text-base">
            {isPast
              ? "Watch the replay and explore more conversations from the Creativo community."
              : "A focused session for people who care about their craft, their careers and the future of creative work."}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isPast ? (
              webinar.replayUrl ? (
                <a
                  href={webinar.replayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
                  style={{
                    background: COLOR.yellow,
                  }}
                >
                  <PlayIcon />
                  Watch replay
                  <ArrowUpRight />
                </a>
              ) : (
                <Link
                  href="/webinars"
                  className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
                >
                  Explore more webinars
                  <ArrowRight />
                </Link>
              )
            ) : (
              <button
                type="button"
                onClick={() => setRsvpOpen(true)}
                className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                style={{
                  background: COLOR.blue,
                  boxShadow: "0 18px 50px rgba(36,120,255,.25)",
                }}
              >
                Reserve your spot
                <ArrowRight />
              </button>
            )}

            <Link
              href="/webinars"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              More from Creativo
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FLOATING RSVP                                                      */}
      {/* ================================================================== */}

      {!isPast && (
        <FloatingReserveButton
          speaker={host}
          onClick={() => setRsvpOpen(true)}
        />
      )}

      {/* ================================================================== */}
      {/* RSVP MODAL                                                         */}
      {/* ================================================================== */}

      <AnimatePresence>
        {rsvpOpen && (
          <WebinarRsvpModal
            webinarId={webinar.id}
            topic={webinar.topic}
            onClose={() => setRsvpOpen(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}