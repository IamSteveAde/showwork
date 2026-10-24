"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import { ArrowRight, ArrowUpRight, Sparkles, MoveUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import people from "@/public/images/people.png";
import dashboard from "@/public/images/dashboard.webp";
import reply from "@/public/images/reply.webp";
import workflow from "@/public/images/workflow.webp";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});
const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current";
const title =
  "font-semibold tracking-[-0.065em] leading-[1.03] text-[clamp(2.5rem,5.1vw,5rem)]";

function Artwork({
  src,
  alt,
  sizes,
  className = "",
}: {
  src: StaticImageData;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <Image src={src} alt={alt} sizes={sizes} className="h-auto w-full" />
    </motion.div>
  );
}

export default function HomeClient({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  const start = "/signup";
  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`${jakarta.variable} ${fraunces.variable} overflow-x-clip bg-[#F8FAF5] text-[#102A29]`}
        style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
      >
        <Navbar />
        <section aria-labelledby="home-heading" className="relative isolate">
          <div className="mx-auto grid max-w-[1280px] items-center gap-8 px-5 pb-14 pt-28 sm:gap-10 sm:pt-32 sm:px-8 lg:min-h-[760px] lg:grid-cols-[1fr_1fr] lg:gap-8 lg:px-14 lg:pb-24 lg:pt-40">
            <div className="relative z-10 max-w-2xl">
              <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.17em]">
                <span
                  className="h-2 w-2 rounded-full bg-[#16834B]"
                  aria-hidden="true"
                />
                Serious technology. Human energy.
              </p>
              <h1
                id="home-heading"
                className="text-[clamp(3.2rem,5.5vw,5.6rem)] font-semibold leading-[0.99] tracking-[-0.075em]"
              >
                Great teams do great work. <br />
                <span className="text-[#155FC7]">
                  Showwork makes it{" "}
                  <em className="font-[var(--font-fraunces)] font-medium">
                    easier.
                  </em>
                </span>
              </h1>
              <p className="mt-7 max-w-md text-base leading-7 text-[#52635E] sm:text-lg sm:leading-8">
                One intelligent workspace to plan, create, collaborate, publish,
                engage, and grow together.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-8 sm:gap-4">
                <Link
                  href={start}
                  className={`group inline-flex items-center gap-6 rounded-full bg-[#155FC7] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#104CA1] ${focus}`}
                >
                  Get Started
                  <ArrowUpRight
                    size={19}
                    aria-hidden="true"
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </Link>
                <a
                  href="/signup"
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-4 text-sm font-semibold ${focus}`}
                >
                  Explore Showwork <ArrowRight size={17} aria-hidden="true" />
                </a>
              </div>
            </div>
            <figure className="relative min-w-0 pb-8 lg:pb-12">
              <div
                aria-hidden="true"
                className="absolute -bottom-2 left-8 right-0 top-12 rounded-tl-[90px] bg-[#D8F3A5] lg:left-14"
              />
              <Image
                src={people}
                alt="Three teammates sharing ideas around a laptop in a blue studio."
                priority
                sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 46vw, 568px"
                className="relative h-auto w-full rounded-tr-[56px] rounded-bl-[56px] lg:rounded-tr-none lg:rounded-bl-[100px]"
              />
              <figcaption className="relative ml-10 mt-5 flex items-center gap-3 text-sm font-semibold lg:ml-20">
                <Sparkles size={20} aria-hidden="true" />A little more together.
                A lot more possible.
              </figcaption>
            </figure>
          </div>
          <div className="mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#102A29]/15 py-5 text-[10px] font-semibold uppercase tracking-[0.15em] sm:mx-8 lg:mx-14">
            <span>Made for the people behind the marketing</span>
            <span className="flex items-center gap-2">
              Meet your new workspace{" "}
              <MoveUpRight size={14} aria-hidden="true" />
            </span>
          </div>
        </section>

        <section
          id="experience"
          aria-labelledby="experience-heading"
          className="relative scroll-mt-24 bg-[#EAF2FF] px-5 py-16 sm:px-8 sm:py-24 lg:px-14"
        >
          <div className="mx-auto max-w-[1280px]">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#155FC7]">
                The Showwork experience
              </p>
              <h2 id="experience-heading" className={`${title} mt-5`}>
                Everything your marketing team needs.
                <br />
                <em className="font-[var(--font-fraunces)] font-medium text-[#155FC7]">
                  Together.
                </em>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600">
                From content planning to customer conversations, performance
                insights, and intelligent recommendations.
              </p>
            </div>
            <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-7 gap-y-3 text-xs font-semibold sm:text-sm">
              {["Plan", "Engage", "Analyse", "Improve"].map((label, i) => (
                <span key={label} className="flex items-center gap-2">
                  <span className="text-[#155FC7]">0{i + 1}</span>
                  {label}
                </span>
              ))}
            </div>
            <Artwork
              src={dashboard}
              alt="Illustrative Showwork product views: content calendar, social inbox, marketing analytics, and AI recommendations."
              sizes="(max-width: 959px) 100vw, 880px"
              className="mx-auto mt-12 max-w-[880px] sm:mt-16"
            />
            <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-6 text-slate-600">
              Illustrative product views. Features and metrics depend on your
              plan, connected channels, and permissions.
            </p>
          </div>
        </section>

        <section
          id="ai-inbox"
          aria-labelledby="inbox-heading"
          className="relative isolate scroll-mt-24 overflow-hidden bg-[#F8FAF5] px-5 py-16 sm:px-8 sm:py-24 lg:px-14 lg:py-28"
        >
          {/* Subtle background atmosphere */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-0 -z-10 h-[650px] w-[650px] rounded-full bg-[#DCEFE5]/50 blur-[110px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-60 -left-40 -z-10 h-[500px] w-[500px] rounded-full bg-[#E4EDFA]/40 blur-[110px]"
          />

          <div className="mx-auto grid max-w-[1080px] items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-6">
            {/* LEFT: Content */}
            <div className="relative z-10 max-w-[540px]">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#CDE5D6] bg-white/75 px-4 py-2 shadow-sm">
                <Sparkles
                  size={15}
                  className="text-[#16834B]"
                  aria-hidden="true"
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#176B45]">
                  AI-powered conversations
                </span>
              </div>

              {/* Headline */}
              <h2
                id="inbox-heading"
                className="mt-8 max-w-[620px] text-[clamp(2.35rem,4vw,3.8rem)] font-semibold leading-[1.07] tracking-[-0.055em] text-[#102A29]"
              >
                Every message
                <br />
                deserves a
                <br />
                <span className="text-[#155FC7]">thoughtful reply.</span>
              </h2>

              {/* Description */}
              <p className="mt-7 max-w-[480px] text-[16px] leading-[1.85] text-[#60716A] sm:text-[17px]">
                Keep customer conversations moving with AI-powered reply
                suggestions and optional automatic responses.
              </p>

              {/* Features */}
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {/* Feature 1 */}
                <div className="group rounded-[22px] border border-[#E0EAE3] bg-white/75 p-5 transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-[#B9D9C7] hover:shadow-[0_16px_40px_rgba(16,42,41,0.06)]">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F4EB]">
                    <Sparkles
                      size={19}
                      className="text-[#16834B]"
                      aria-hidden="true"
                    />
                  </div>

                  <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[#102A29]">
                    AI-assisted replies
                  </h3>

                  <p className="mt-2 text-[13px] leading-[1.7] text-[#60716A]">
                    Get thoughtful reply suggestions. Review, personalise, and
                    send with confidence.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="group rounded-[22px] border border-[#E0EAE3] bg-white/75 p-5 transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-[#B9D9C7] hover:shadow-[0_16px_40px_rgba(16,42,41,0.06)]">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9F0FD]">
                    <ArrowUpRight
                      size={19}
                      className="text-[#155FC7]"
                      aria-hidden="true"
                    />
                  </div>

                  <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[#102A29]">
                    Automatic responses
                  </h3>

                  <p className="mt-2 text-[13px] leading-[1.7] text-[#60716A]">
                    Enable AI responses on supported channels to keep customers
                    engaged.
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <Link
                  href="/signup"
                  className={`group inline-flex items-center justify-center gap-4 rounded-full bg-[#102A29] px-7 py-4 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(16,42,41,0.12)] transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:bg-[#155FC7] hover:shadow-[0_12px_30px_rgba(21,95,199,0.18)] ${focus}`}
                >
                  Explore AI Inbox
                  <ArrowUpRight
                    size={18}
                    className="transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <span className="text-[12px] font-medium text-[#52635E]">
                  Built for teams that value every conversation.
                </span>
              </div>

              <p className="mt-5 max-w-lg text-xs leading-6 text-[#52635E]">
                AI drafting is available on Studio and Agency. Automatic replies
                are opt-in on Agency, with supported channels and plan
                allowances.
              </p>
            </div>

            {/* RIGHT: Product Visual */}
            <div className="relative flex min-w-0 items-center justify-center lg:justify-center">
              {/* Soft visual halo */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D9EDE3]/65 blur-[75px]"
              />

              {/* Decorative outline */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#CFE5D9]/60"
              />

              {/* Small contextual label */}
              <div className="absolute left-0 top-4 z-20 hidden items-center gap-2 rounded-full border border-[#E3EBE5] bg-white/95 px-4 py-2.5 shadow-[0_8px_30px_rgba(16,42,41,0.06)] sm:flex lg:-left-5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#22A66A]/25" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22A66A]" />
                </span>
                <span className="text-[11px] font-semibold text-[#244A39]">
                  AI assistance available
                </span>
              </div>

              {/* Screenshot */}
              <div className="relative z-10 flex w-full max-w-[420px] items-center justify-center py-12 sm:max-w-[450px] lg:max-w-[430px]">
                <Artwork
                  src={reply}
                  alt="Illustrative Showwork inbox showing customer conversations and an AI reply suggestion."
                  sizes="(max-width: 639px) 90vw, 410px"
                  className="mx-auto h-auto w-full max-w-[380px] object-contain drop-shadow-[0_25px_45px_rgba(16,42,41,0.10)] sm:max-w-[410px] lg:max-w-[390px]"
                />
              </div>

              {/* Bottom caption */}
              <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#E0EAE3] bg-white/90 px-4 py-2.5 shadow-[0_8px_24px_rgba(16,42,41,0.04)]">
                <Sparkles
                  size={13}
                  className="text-[#16834B]"
                  aria-hidden="true"
                />
                <span className="text-[11px] font-medium text-[#60716A]">
                  Less time replying. More time creating.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="team-heading"
          className="overflow-hidden bg-[#102A29] px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-14"
        >
          <div className="mx-auto max-w-[1280px]">
            <div className="grid items-end gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#BFEA91]">
                  Good work is a team sport.
                </p>
                <h2 id="team-heading" className={`${title} mt-5 max-w-3xl`}>
                  Less back-and-forth.
                  <br />
                  <em className="font-[var(--font-fraunces)] font-medium text-[#D8F3A5]">
                    More getting things done.
                  </em>
                </h2>
              </div>
              <div className="lg:pb-2">
                <p className="max-w-md text-base leading-7 text-emerald-50/85">
                  Bring your team, feedback, and approvals into one organised
                  workspace.
                </p>
                <p className="mt-5 text-sm font-semibold tracking-wide text-[#D8F3A5]">
                  Create. Review. Approve.
                </p>
              </div>
            </div>
            <Artwork
              src={workflow}
              alt="Illustrative Showwork collaboration view with teammates, feedback, review, and approval."
              sizes="(max-width: 1199px) 100vw, 1080px"
              className="mx-auto mt-12 max-w-[1080px]"
            />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-xs leading-6 text-emerald-50/80">
              <span>
                Illustrative workflow. Team access and features vary by plan.
              </span>
              <Link
                href="/signup"
                className={`inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[#D8F3A5] ${focus}`}
              >
                Find your team’s flow{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <IntegrationsSection homepage />

        <section
          id="products"
          aria-label="Explore Showwork products"
          className="scroll-mt-24 bg-white px-5 pt-20 sm:px-8 lg:px-14"
        >
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#155FC7]">
                Find your kind of Showwork
              </p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
                Marketing Workspace for your team. Project Delivery for creative
                handovers.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm font-semibold">
              <Link href="/signup" className={`rounded-sm ${focus}`}>
                Marketing Workspace{" "}
                <ArrowUpRight className="inline" size={16} aria-hidden="true" />
              </Link>
              <Link href="/signup" className={`rounded-sm ${focus}`}>
                Project Delivery{" "}
                <ArrowUpRight className="inline" size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
        <PricingSection compact />

        <section
          aria-labelledby="closing-heading"
          className="relative overflow-hidden bg-[#D8F3A5] px-5 py-20 sm:px-8 sm:py-28"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border-[38px] border-[#16834B]/10"
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Great teams. Better work. More fun.
            </p>
            <h2
              id="closing-heading"
              className="mt-6 text-[clamp(3.1rem,7vw,7rem)] font-semibold leading-[0.98] tracking-[-0.065em]"
            >
              Your next great thing.
              <br />
              <em className="font-[var(--font-fraunces)] font-medium">
                Starts together.
              </em>
            </h2>
            <Link
              href={start}
              className={`mt-9 inline-flex items-center gap-7 rounded-full bg-[#102A29] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#1C4946] ${focus}`}
            >
              Get Started
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <p className="mt-5 text-sm text-[#36533E]">
              Marketing Workspace · Seven-day trial
            </p>
          </div>
        </section>
        <SiteFooter homepage />
      </main>
    </MotionConfig>
  );
}
