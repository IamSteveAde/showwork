"use client";

import { useState } from "react";
import Link from "next/link";
import WebinarRsvpModal from "@/components/creativo/WebinarRsvpModal";

const COLOR = { black: "#080808", offWhite: "#F7F4EC", blue: "#2478FF", yellow: "#FFCC00" };

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

        {webinar.guests && (
          <div>
            <h2 className="mb-3 text-xl font-bold text-black">Speakers</h2>
            <p className="text-sm leading-relaxed text-black/65">{webinar.guests}</p>
          </div>
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