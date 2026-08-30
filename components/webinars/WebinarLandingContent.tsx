"use client";

import { useState } from "react";
import Link from "next/link";
import WebinarRsvpModal from "@/components/creativo/WebinarRsvpModal";

const COLOR = { black: "#080808", offWhite: "#F7F4EC", blue: "#2478FF", yellow: "#FFCC00" };

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

function IconInstagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconYouTube() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4h0s-3.9 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.6c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.8.8 2.3.9 1.7.1 6.5.2 6.5.2s3.9 0 6.7-.2c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.7.2-3.5v-1.6c0-1.7-.2-3.5-.2-3.5ZM9.9 14.6V8.9l5.4 2.9-5.4 2.8Z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
    </svg>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
      style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.55)" }}
    >
      {children}
    </a>
  );
}

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const hasSocials = speaker.instagramUrl || speaker.youtubeUrl || speaker.xUrl || speaker.linkedinUrl;
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-black/5">
          {speaker.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={speaker.profileImageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-black">{speaker.name}</p>
          <p className="text-xs font-semibold" style={{ color: "#2478FF" }}>{speaker.title}</p>
        </div>
      </div>
      {speaker.bio && <p className="mt-3 text-sm leading-relaxed text-black/60">{speaker.bio}</p>}
      {hasSocials && (
        <div className="mt-4 flex items-center gap-2">
          {speaker.instagramUrl && <SocialIcon href={speaker.instagramUrl} label={`${speaker.name} on Instagram`}><IconInstagram /></SocialIcon>}
          {speaker.youtubeUrl && <SocialIcon href={speaker.youtubeUrl} label={`${speaker.name} on YouTube`}><IconYouTube /></SocialIcon>}
          {speaker.xUrl && <SocialIcon href={speaker.xUrl} label={`${speaker.name} on X`}><IconX /></SocialIcon>}
          {speaker.linkedinUrl && <SocialIcon href={speaker.linkedinUrl} label={`${speaker.name} on LinkedIn`}><IconLinkedIn /></SocialIcon>}
        </div>
      )}
    </div>
  );
}

export default function WebinarLandingContent({ webinar, isPast }: { webinar: WebinarData; isPast: boolean }) {
  const [rsvpOpen, setRsvpOpen] = useState(false);

  const expectPoints = webinar.whatToExpect
    ? webinar.whatToExpect.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];

  return (
    <main style={{ background: COLOR.offWhite }}>
      <div className="relative overflow-hidden" style={{ background: COLOR.black }}>
        {webinar.flyerImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={webinar.flyerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.4) 0%, rgba(8,8,8,0.9) 100%)" }} />
          </>
        )}

        <div className="relative px-6 pb-16 pt-40 md:px-16">
          <Link href="/webinars" className="mb-6 inline-flex items-center gap-2 text-sm hover:underline" style={{ color: COLOR.blue }}>
            ← All webinars
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="mb-3 text-xs font-bold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.2em" }}>
                {isPast ? "Past session" : "Creativo webinar"}
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-5xl">
                {webinar.topic}
              </h1>
              <p className="mt-5 text-sm text-white/50">
                {new Date(webinar.startsAt).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {webinar.venue && ` · ${webinar.venue}`}
              </p>

              {webinar.description && (
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60">{webinar.description}</p>
              )}

              <div className="mt-8">
                {isPast ? (
                  webinar.replayUrl ? (
                    <a
                      href={webinar.replayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-black"
                      style={{ background: COLOR.yellow }}
                    >
                      Watch the replay
                    </a>
                  ) : (
                    <p className="text-sm text-white/30">This session has already happened.</p>
                  )
                ) : (
                  <button
                    onClick={() => setRsvpOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                    style={{ background: COLOR.blue }}
                  >
                    Reserve your spot
                  </button>
                )}
              </div>
            </div>

            {webinar.flyerImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={webinar.flyerImageUrl} alt="" className="hidden aspect-[4/5] w-full rounded-2xl object-cover lg:block" />
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16 md:px-16">
        {expectPoints.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 text-xl font-bold text-black">What to expect</h2>
            <ul className="flex flex-col gap-2.5">
              {expectPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-black/65">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: COLOR.blue }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {webinar.speakers.length > 0 ? (
          <div>
            <h2 className="mb-4 text-xl font-bold text-black">
              {webinar.speakers.length === 1 ? "Speaker" : "Speakers"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {webinar.speakers.map((speaker) => (
                <SpeakerCard key={speaker.id} speaker={speaker} />
              ))}
            </div>
          </div>
        ) : (
          webinar.guests && (
            <div>
              <h2 className="mb-3 text-xl font-bold text-black">Speakers</h2>
              <p className="text-sm leading-relaxed text-black/65">{webinar.guests}</p>
            </div>
          )
        )}
      </div>

      {rsvpOpen && (
        <WebinarRsvpModal
          webinarId={webinar.id}
          topic={webinar.topic}
          onClose={() => setRsvpOpen(false)}
        />
      )}
    </main>
  );
}