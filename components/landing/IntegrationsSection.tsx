"use client";

import Image from "next/image";
import { useState } from "react";
import { Pause, Play } from "lucide-react";

const integrations = [
  { name: "Facebook", slug: "facebook" },
  { name: "X", slug: "x" },
  { name: "Instagram", slug: "instagram" },
  { name: "LinkedIn", slug: "linkedin" },
  { name: "TikTok", slug: "tiktok" },
  { name: "OpenAI", slug: "openai" },
  { name: "Meta", slug: "meta" },
  { name: "Paystack", slug: "paystack" },
];

export default function IntegrationsSection() {
  const [paused, setPaused] = useState(false);

  return (
    <section
      aria-labelledby="integrations-heading"
      className="border-b border-slate-200 bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
            Connected to your workflow
          </p>
          <h2
            id="integrations-heading"
            className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#111317] sm:text-4xl"
          >
            The tools you use. Working together.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            Showwork connects with your everyday tools to keep your work flowing.
          </p>
        </div>

        <div className="relative mt-10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 inset-y-8 rounded-full bg-blue-100/60 blur-3xl" />
          <div
            className="integrations-marquee relative overflow-hidden py-6"
            style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
          >
            <div
              className="integrations-track flex w-max"
              style={{ animationPlayState: paused ? "paused" : undefined }}
            >
              {[0, 1].map((copy) => (
                <ul
                  key={copy}
                  aria-hidden={copy === 1 ? true : undefined}
                  className="integrations-group flex shrink-0 items-center gap-4 pr-4"
                >
                  {integrations.map(({ name, slug }, index) => (
                    <li
                      key={slug}
                      className={`group flex w-44 shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors hover:border-blue-200 hover:bg-blue-50/50 ${index % 2 === 0 ? "-translate-y-2" : "translate-y-2"}`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 transition-colors group-hover:bg-white">
                        <Image
                          src={`/images/integrations/${slug}.svg`}
                          alt=""
                          width={26}
                          height={26}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#111317]">
                        {name}
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-center motion-reduce:hidden">
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Resume scrolling integrations" : "Pause scrolling integrations"}
              aria-pressed={paused}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
