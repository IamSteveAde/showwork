"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import { ArrowRight, ArrowUpRight, Sparkles, MoveUpRight, CheckCheck, MessageCircle, WandSparkles, BarChart3, CalendarDays, MessagesSquare, CheckCircle2, UsersRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import BookDemoModal from "@/components/landing/BookDemoModal";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import people from "@/public/images/people.png";
import dashboard from "@/public/images/dashboard.webp";

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

const features = [
  { label: "Plan", detail: "Content, beautifully organised", Icon: CalendarDays },
  { label: "Engage", detail: "Every conversation in reach", Icon: MessagesSquare },
  { label: "Analyse", detail: "See what is working", Icon: BarChart3 },
  { label: "Improve", detail: "Make your next move smarter", Icon: Sparkles },
] as const;

function ShowworkExperienceSection({ dashboard }: { dashboard: StaticImageData }) {
  const reduced = useReducedMotion();
  const animated = reduced === false;
  return (
    <section id="experience" aria-labelledby="experience-heading" className="relative isolate scroll-mt-24 overflow-hidden bg-[#EAF2FF] px-5 py-20 sm:px-8 sm:py-28 lg:px-14 lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-40 h-[480px] w-[480px] rounded-full bg-[#D6F1E7]/75 blur-[100px]" />
        <div className="absolute -right-40 bottom-12 h-[580px] w-[580px] rounded-full bg-[#C9DFFF]/80 blur-[120px]" />
        <div className="absolute left-1/2 top-[45%] h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-white/45" />
      </div>
      <div className="mx-auto max-w-[1280px]">
        <motion.div initial={animated ? { opacity: 0, y: 28 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="mx-auto max-w-[790px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B9D3FA] bg-white/65 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#155FC7]">
            <Sparkles size={14} aria-hidden="true" /> The Showwork experience
          </div>
          <h2 id="experience-heading" className="mt-7 text-[clamp(2.5rem,5.1vw,5rem)] font-semibold leading-[1.03] tracking-[-0.065em] text-[#102A29]">
            Everything your marketing team needs. <em className="font-[var(--font-fraunces)] font-medium text-[#155FC7]">Together.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[590px] text-base leading-8 text-[#526775] sm:text-lg">From content planning to customer conversations, performance insights, and intelligent recommendations.</p>
        </motion.div>

        <div className="relative mx-auto mt-12 max-w-[1140px] sm:mt-16">
          <motion.div initial={animated ? { opacity: 0, y: 65, scale: 0.94, rotateX: 7 } : false} whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} style={{ perspective: 1200 }} className="relative mx-auto max-w-[970px]">
            <div aria-hidden="true" className="absolute -inset-5 rounded-[36px] bg-white/35 blur-2xl sm:-inset-10" />
            <motion.div animate={animated ? { y: [0, -9, 0] } : undefined} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="relative overflow-hidden rounded-[18px] border border-white/80 bg-white/65 p-2 shadow-[0_30px_90px_rgba(25,70,133,0.16)] sm:rounded-[30px] sm:p-3">
              <Image src={dashboard} alt="Illustrative Showwork product views including content calendar, social inbox, analytics and AI recommendations" sizes="(max-width: 1023px) 100vw, 970px" className="h-auto w-full rounded-[12px] sm:rounded-[22px]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/55" />
            </motion.div>
          </motion.div>

          <motion.div aria-hidden="true" initial={animated ? { opacity: 0, x: -25 } : false} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.6, duration: 0.7 }} className="pointer-events-none absolute -left-3 top-[20%] hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(21,95,199,0.12)] xl:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F5EB] text-[#16834B]"><CalendarDays size={18} /></span>
            <span className="text-xs font-semibold text-[#102A29]">Ideas become plans</span>
          </motion.div>
          <motion.div aria-hidden="true" initial={animated ? { opacity: 0, x: 25 } : false} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.85, duration: 0.7 }} className="pointer-events-none absolute -right-3 bottom-[22%] hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(21,95,199,0.12)] xl:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F0FF] text-[#155FC7]"><BarChart3 size={18} /></span>
            <span className="text-xs font-semibold text-[#102A29]">Insights drive growth</span>
          </motion.div>
        </div>

        <div className="mx-auto mt-12 grid max-w-[1050px] grid-cols-2 gap-3 sm:mt-16 lg:grid-cols-4 lg:gap-4">
          {features.map(({ label, detail, Icon }, i) => (
            <motion.div key={label} initial={animated ? { opacity: 0, y: 25 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: i * 0.1 }} whileHover={animated ? { y: -5 } : undefined} className="group flex min-w-0 items-start gap-3 rounded-[20px] border border-white/80 bg-white/60 p-4 shadow-[0_8px_25px_rgba(25,70,133,0.04)] backdrop-blur-sm transition-colors hover:bg-white/90 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#DDEBFF] text-[#155FC7] transition-colors group-hover:bg-[#D8F3A5] group-hover:text-[#102A29]"><Icon size={19} aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-bold text-[#102A29]">{label}</span><span className="mt-1 block text-[11px] leading-[1.5] text-[#5D7180] sm:text-xs">{detail}</span></span>
            </motion.div>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-center text-xs leading-6 text-[#617386]">
          <ArrowUpRight size={14} className="shrink-0 text-[#155FC7]" aria-hidden="true" />
          <p>Illustrative product views. Features and metrics depend on your plan, connected channels, and permissions.</p>
        </div>
      </div>
    </section>
  );
}


export default function HomeClient({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`${jakarta.variable} ${fraunces.variable} overflow-x-clip bg-[#F8FAF5] text-[#102A29]`}
        style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
      >
        <Navbar />
        <section aria-labelledby="home-heading" className="relative isolate overflow-hidden bg-[#F8FAF5]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-32 -top-48 h-[620px] w-[620px] rounded-full bg-[#E3EEFF]/80 blur-[110px]" />
            <div className="absolute -left-48 bottom-0 h-[480px] w-[480px] rounded-full bg-[#E7F5DD]/65 blur-[110px]" />
            <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(#B5C8BB_0.7px,transparent_0.7px)] [background-size:26px_26px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
          </div>

          <div className="relative mx-auto grid max-w-[1340px] items-center gap-12 px-5 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36 lg:min-h-[790px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-14 lg:pb-24 lg:pt-40">
            <div className="relative z-20 min-w-0 max-w-[700px]">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#D6E7DA] bg-white/80 px-4 py-2.5 shadow-[0_8px_25px_rgba(16,42,41,0.04)]"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inset-0 rounded-full bg-[#16834B] motion-safe:animate-ping motion-safe:opacity-30" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-[#16834B]" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#31584B] sm:text-[11px]">
                  Serious technology. Human energy.
                </span>
              </motion.div>

              <h1 id="home-heading" className="max-w-[740px] text-[clamp(3.3rem,5.4vw,6.15rem)] font-semibold leading-[0.99] tracking-[-0.075em] text-[#102A29]">
                <span className="block overflow-hidden pb-[0.09em]">
                  <motion.span className="block" initial={{ y: "115%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}>
                    Great teams
                  </motion.span>
                </span>
                <span className="block overflow-hidden pb-[0.09em]">
                  <motion.span className="block" initial={{ y: "115%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                    do great work.
                  </motion.span>
                </span>
                <span className="mt-2 block overflow-hidden pb-[0.11em] text-[#155FC7]">
                  <motion.span className="block" initial={{ y: "115%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.95, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}>
                    Showwork makes
                  </motion.span>
                </span>
                <span className="block overflow-hidden pb-[0.13em] text-[#155FC7]">
                  <motion.span className="inline-flex flex-wrap items-baseline gap-x-[0.23em]" initial={{ y: "115%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.95, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}>
                    <span>it</span>
                    <span className="relative inline-block">
                      <em className="relative z-10 font-[var(--font-fraunces)] font-medium italic">easier.</em>
                      <motion.span aria-hidden="true" className="absolute bottom-[0.08em] left-0 right-0 h-[0.14em] origin-left rounded-full bg-[#D8F3A5]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 1.35, ease: [0.16, 1, 0.3, 1] }} />
                    </span>
                  </motion.span>
                </span>
              </h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.9 }} className="mt-7 max-w-[510px] text-base leading-8 text-[#52635E] sm:text-lg">
                One intelligent workspace to plan, create, collaborate, publish, engage, and grow together.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 1.08 }} className="mt-8 flex flex-wrap items-center gap-3 sm:gap-5">
                <button type="button" onClick={() => setDemoOpen(true)} className={`group inline-flex items-center justify-between gap-8 rounded-full bg-[#155FC7] px-7 py-4 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(21,95,199,0.2)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#104CA1] hover:shadow-[0_18px_38px_rgba(21,95,199,0.28)] motion-reduce:transform-none ${focus}`}>
                  Book a Demo
                  <ArrowUpRight size={19} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
                <Link href="/signup" className={`group inline-flex items-center gap-2 rounded-full px-3 py-4 text-sm font-semibold text-[#102A29] transition-colors hover:text-[#155FC7] ${focus}`}>
                  Explore Showwork
                  <ArrowRight size={17} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }} className="mt-10 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#668074]">
                <span className="h-px w-9 bg-[#B4C9BC]" />
                Less coordination. More creation.
              </motion.div>
            </div>

            <motion.figure initial={{ opacity: 0, y: 48, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.15, delay: 0.32, ease: [0.16, 1, 0.3, 1] }} className="relative mx-auto w-full min-w-0 max-w-[600px] lg:max-w-none">
              <div aria-hidden="true" className="absolute -inset-5 rounded-[65px] bg-[#D8F3A5]/55 blur-3xl sm:-inset-9" />
              <div aria-hidden="true" className="absolute -bottom-5 -left-4 right-5 top-6 rounded-[42px] bg-[#D8F3A5] sm:-bottom-8 sm:-left-8 sm:right-8 sm:top-9 sm:rounded-[65px]" />
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="relative overflow-hidden rounded-[34px] rounded-tr-[100px] bg-[#D8F3A5] shadow-[0_35px_90px_rgba(16,42,41,0.15)] sm:rounded-[50px] sm:rounded-tr-[145px]">
                <Image src={people} alt="Three teammates sharing ideas around a laptop in a blue studio." priority sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 46vw, 600px" className="h-auto w-full" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#102A29]/20 via-transparent to-transparent" />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 22, y: 14 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.8, delay: 1.25 }} className="absolute -right-2 top-[12%] hidden items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-[0_15px_45px_rgba(16,42,41,0.12)] sm:flex lg:-right-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F5EB] text-[#16834B]"><CheckCheck size={18} aria-hidden="true" /></span>
                <span className="text-xs font-semibold text-[#102A29]">Work, moving forward.</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -18, y: 12 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.8, delay: 1.48 }} className="absolute -bottom-3 left-2 flex items-center gap-2 rounded-full border border-white/80 bg-[#102A29] px-4 py-3 text-white shadow-[0_15px_40px_rgba(16,42,41,0.17)] sm:-bottom-5 sm:left-6 sm:px-5">
                <Sparkles size={16} className="text-[#D8F3A5]" aria-hidden="true" />
                <span className="text-[11px] font-semibold sm:text-xs">A little more together. A lot more possible.</span>
              </motion.div>
            </motion.figure>
          </div>

          <div className="relative mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#102A29]/15 py-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52635E] sm:mx-8 lg:mx-14">
            <span>Made for the people behind the marketing</span>
            <span className="flex items-center gap-2 text-[#155FC7]">Meet your new workspace <MoveUpRight size={14} aria-hidden="true" /></span>
          </div>
        </section>

        <ShowworkExperienceSection dashboard={dashboard} />

        <section
          id="ai-inbox"
          aria-labelledby="inbox-heading"
          className="relative isolate scroll-mt-24 overflow-hidden bg-[#F8FAF5] px-5 py-20 sm:px-8 sm:py-28 lg:px-14 lg:py-32"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 -z-10 h-[650px] w-[650px] rounded-full bg-[#DCEFE5]/50 blur-[110px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-60 -left-40 -z-10 h-[500px] w-[500px] rounded-full bg-[#E4EDFA]/40 blur-[110px]" />

          <div className="mx-auto grid max-w-[1160px] items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
            <div className="relative z-10 max-w-[535px]">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#CDE5D6] bg-white/80 px-4 py-2 shadow-sm">
                <Sparkles size={15} className="text-[#16834B]" aria-hidden="true" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#176B45]">AI-powered conversations</span>
              </div>

              <h2 id="inbox-heading" className="mt-8 text-[clamp(2.6rem,4.5vw,4.3rem)] font-semibold leading-[1.08] tracking-[-0.06em] text-[#102A29]">
                Every customer message. <span className="text-[#155FC7]">One inbox.</span> <span className="text-[#16834B]">Faster replies.</span>
              </h2>

              <p className="mt-7 max-w-[470px] text-[16px] leading-[1.85] text-[#60716A] sm:text-[17px]">
                Your customers reach out on Instagram, Facebook, and WhatsApp. Showwork brings supported conversations into one place, so your team never has to jump between apps. Turn on Showwork AI to draft thoughtful replies—or let it respond automatically on eligible channels while you focus on growing your business.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Social messaging channels">
                {(["Instagram", "Facebook", "WhatsApp"] as const).map((channel) => (
                  <span key={channel} className="rounded-full border border-[#DCE8E1] bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[#36584C] shadow-sm">
                    {channel}
                  </span>
                ))}
                <span className="text-[11px] font-medium text-[#718078]">One connected inbox</span>
              </div>

              <Link href="/signup" className={`group mt-9 inline-flex items-center justify-center gap-4 rounded-full bg-[#102A29] px-7 py-4 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(16,42,41,0.12)] transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:bg-[#155FC7] ${focus}`}>
                Explore AI Inbox
                <ArrowUpRight size={18} className="transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>

              <p className="mt-7 max-w-[470px] text-[11px] leading-[1.8] text-[#718078] sm:text-[12px]">
                Channel connections and messaging capabilities depend on platform permissions and supported integrations. AI drafting is available on Studio and Agency; automatic replies are opt-in on Agency, subject to supported channels and plan allowances.
              </p>
            </div>

            <ShowworkAIConversation />
          </div>
        </section>

        <section
          aria-labelledby="team-heading"
          className="relative isolate min-h-[max(760px,115svh)] overflow-clip bg-[#102A29] text-white sm:min-h-[max(800px,115svh)]"
        >
          {/* Sticky, viewport-sized photograph: pinned while this section scrolls.
              Unlike background-attachment: fixed, this also works on mobile Safari. */}
          <div aria-hidden="true" className="absolute inset-0 z-0">
            <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[#102A29]">
              <picture>
                <source media="(min-width: 768px)" srcSet="/images/team.webp" type="image/webp" />
                <img
                  src="/images/team-mobile.webp"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-[center_45%] md:object-[center_48%]"
                />
              </picture>
              {/* Selective contrast stays pinned to the photograph. */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#102A29]/80 via-[#102A29]/10 via-[44%] to-[#102A29]/85 md:bg-gradient-to-r md:from-[#102A29]/85 md:via-[#102A29]/35 md:via-[42%] md:to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#102A29]/85 to-transparent md:h-[30%]" />
            </div>
          </div>

          <div className="relative z-10 mx-auto flex min-h-[max(760px,115svh)] max-w-[1440px] flex-col justify-between px-5 pb-10 pt-16 sm:min-h-[max(800px,115svh)] sm:px-8 sm:pb-14 sm:pt-20 lg:px-14 lg:pb-16 lg:pt-24">
            <div className="max-w-[850px]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="flex items-center gap-3"
              >
                <span className="h-px w-9 bg-[#D8F3A5]" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D8F3A5] sm:text-xs">
                  Good work is a team sport.
                </p>
              </motion.div>
              <motion.h2
                id="team-heading"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="mt-7 max-w-[800px] text-[clamp(2.75rem,6.1vw,6.6rem)] font-semibold leading-[0.98] tracking-[-0.065em] drop-shadow-[0_3px_20px_rgba(0,0,0,0.16)]"
              >
                Less back-and-forth.
                <br />
                <em className="mt-2 block font-[var(--font-fraunces)] font-medium leading-[1.03] text-[#D8F3A5]">
                  More getting things done.
                </em>
              </motion.h2>
            </div>

            {/* Small product-connected annotations; illustrative only. */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.65, duration: 0.7 }}
              className="absolute right-[7%] top-[49%] hidden items-center gap-2.5 rounded-full border border-white/50 bg-[#F8FAF5]/90 px-4 py-2.5 text-[#102A29] shadow-[0_14px_45px_rgba(0,0,0,0.12)] backdrop-blur-md lg:flex"
            >
              <CheckCircle2 size={17} className="text-[#16834B]" />
              <span className="text-xs font-semibold">Creative review approved</span>
            </motion.div>
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.85, duration: 0.7 }}
              className="absolute right-[12%] bottom-[24%] hidden items-center gap-2 rounded-full border border-white/40 bg-[#102A29]/65 px-4 py-2.5 text-white shadow-xl backdrop-blur-md xl:flex"
            >
              <UsersRound size={16} className="text-[#D8F3A5]" />
              <span className="text-xs font-medium">One team. One shared flow.</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.32, duration: 0.8 }}
              className="max-w-[550px]"
            >
              <p className="max-w-[470px] text-base leading-7 text-white/95 sm:text-lg sm:leading-8">
                Your people, feedback, and approvals. Finally working together.
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.17em] text-[#D8F3A5]">
                Create. Review. Approve.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link
                  href="/signup"
                  className={`group inline-flex items-center gap-4 rounded-full bg-[#D8F3A5] px-6 py-4 text-sm font-semibold text-[#102A29] transition-colors hover:bg-white ${focus}`}
                >
                  Find your team’s flow
                  <ArrowUpRight size={18} aria-hidden="true" className="transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
                </Link>
              </div>
              <p className="mt-5 text-[11px] leading-5 text-white/75">
                Illustrative collaboration experience. Team access and features vary by plan.
              </p>
            </motion.div>
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
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className={`mt-9 inline-flex items-center gap-7 rounded-full bg-[#102A29] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#1C4946] ${focus}`}
            >
              Book a Demo
              <ArrowUpRight size={20} aria-hidden="true" />
            </button>
            <p className="mt-5 text-sm text-[#36533E]">
              Marketing Workspace · Seven-day trial
            </p>
          </div>
        </section>
        <SiteFooter homepage />
        <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      </main>
    </MotionConfig>
  );
}


const demoConversations = [
  { name: "Daniel", initials: "DA", channel: "Instagram", message: "Hi! Do you offer social media management?", reply: "Hi Daniel! Yes, we do. Would you like to know more about our packages?", avatar: "bg-[#E2ECFF] text-[#155FC7]" },
  { name: "Mike", initials: "MI", channel: "Facebook", message: "Hey! Can I get a quote for a new project?", reply: "Absolutely, Mike! We'd love to help. Could you tell us a little about your project?", avatar: "bg-[#FCE9DA] text-[#A45B26]" },
  { name: "Sarah", initials: "SA", channel: "WhatsApp", message: "Hello! How can I book a consultation?", reply: "Hi Sarah! We'd be happy to help you get started. Would you like our booking details?", avatar: "bg-[#F1E7FF] text-[#8052B0]" },
] as const;

type DemoPhase = "idle" | "incoming" | "typing" | "reply" | "sent";

function ShowworkAIConversation() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reducedMotion !== false) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    const schedule = (delay: number, callback: () => void) => {
      elapsed += delay;
      timers.push(setTimeout(callback, elapsed));
    };

    // Complete each conversation before advancing to the next.
    schedule(350, () => setPhase("incoming"));
    schedule(1000, () => setPhase("typing"));
    schedule(1350, () => setPhase("reply"));
    schedule(750, () => setPhase("sent"));
    schedule(2900, () => {
      setPhase("idle");
      setIndex((previous) => (previous + 1) % demoConversations.length);
    });

    return () => timers.forEach(clearTimeout);
  }, [visible, index, reducedMotion]);

  const current = demoConversations[index];
  const staticView = reducedMotion !== false;
  const showIncoming = staticView || phase !== "idle";
  const showTyping = !staticView && phase === "typing";
  const showReply = staticView || phase === "reply" || phase === "sent";
  const showSent = staticView || phase === "sent";

  return (
    <div ref={rootRef} className="relative mx-auto flex h-[475px] min-w-0 w-full max-w-[560px] items-center justify-center sm:h-[505px] lg:h-[545px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[10%] h-64 w-64 rounded-full bg-[#BDECD5]/45 blur-[75px]" />
        <div className="absolute bottom-[8%] right-0 h-64 w-64 rounded-full bg-[#D4E4FF]/65 blur-[85px]" />
        <div className="absolute left-1/2 top-1/2 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#CFE5D9]/60 sm:h-[410px] sm:w-[410px]" />
        <div className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#CFE5D9]/40 sm:h-[300px] sm:w-[300px]" />
      </div>

      <div className="absolute right-0 top-3 z-20 inline-flex items-center gap-2 rounded-full border border-[#D7E9DF] bg-white/95 px-3 py-2 shadow-[0_10px_30px_rgba(16,42,41,0.06)] sm:right-3 sm:top-8">
        <span className="h-2 w-2 rounded-full bg-[#25A86A]" />
        <span className="text-[10px] font-semibold text-[#245C43] sm:text-[11px]">Auto-replies enabled · Demo</span>
      </div>

      <div className="relative z-10 w-full max-w-[475px] px-1 sm:px-5" aria-label="Illustrative fictional customer conversation demonstrating opt-in Showwork AI automatic replies">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#155FC7] text-white shadow-[0_8px_18px_rgba(21,95,199,0.18)]">
              <MessageCircle size={19} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[13px] font-bold text-[#15352F]">AI Inbox</span>
              <span className="block text-[10px] text-[#71847A]">A smarter way to connect</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2F3E9] px-3 py-1.5 text-[10px] font-semibold text-[#16834B]">
            <Sparkles size={12} aria-hidden="true" /> Showwork AI
          </span>
        </div>

        <div className="relative min-h-[145px]">
          {showIncoming && (
            <div key={`incoming-${index}`} className="sw-message-enter mr-6 sm:mr-14">
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${current.avatar}`}>{current.initials}</span>
                <span className="text-[12px] font-bold text-[#15352F]">{current.name}</span>
                <span className="text-[10px] text-[#82948B]">via {current.channel}</span>
              </div>
              <div className="ml-4 rounded-[23px] rounded-tl-[6px] border border-[#E3EAE6] bg-white px-5 py-5 shadow-[0_15px_35px_rgba(16,42,41,0.07)] sm:px-6">
                <p className="text-[14px] font-medium leading-[1.7] text-[#25423B] sm:text-[15px]">{current.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto mr-8 h-6 w-px bg-gradient-to-b from-transparent via-[#B7DCC8] to-transparent" aria-hidden="true" />

        <div className="ml-6 sm:ml-14">
          <div className="mb-2.5 flex items-center justify-end gap-2.5">
            <div className="text-right">
              <p className="text-[12px] font-bold text-[#155FC7]">Showwork AI</p>
              <p className="text-[10px] text-[#71847A]">Responding for your team</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#E1F2E8] text-[#16834B]">
              <WandSparkles size={18} aria-hidden="true" />
            </span>
          </div>
          <div className="relative min-h-[125px]">
            {showTyping && (
              <div className="sw-message-enter absolute right-0 top-0 flex items-center gap-2 rounded-[22px] rounded-tr-[6px] border border-[#CFE5D9] bg-[#ECF8F0] px-5 py-4 shadow-sm">
                <span className="flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} className="sw-typing-dot h-2 w-2 rounded-full bg-[#16834B]" style={{ animationDelay: `${dot * 160}ms` }} />
                  ))}
                </span>
                <span className="ml-2 text-[11px] font-medium text-[#498068]">AI is writing</span>
              </div>
            )}
            {showReply && (
              <div key={`reply-${index}`} className="sw-message-enter rounded-[23px] rounded-tr-[6px] border border-[#BFD9FF] bg-[#155FC7] px-5 py-5 text-white shadow-[0_18px_40px_rgba(21,95,199,0.16)] sm:px-6">
                <p className="text-[14px] font-medium leading-[1.7] sm:text-[15px]">{current.reply}</p>
              </div>
            )}
          </div>
          <div className="mt-2 flex min-h-7 items-center justify-end">
            {showSent && (
              <span className="sw-message-enter inline-flex items-center gap-1.5 text-right text-[10px] font-medium text-[#477864] sm:text-[11px]">
                <CheckCheck size={15} className="shrink-0 text-[#16834B]" aria-hidden="true" />
                Sent automatically by Showwork AI
              </span>
            )}
          </div>
        </div>

        <div aria-hidden="true" className="mt-5 flex items-center justify-center gap-1.5">
          {demoConversations.map((item, i) => (
            <span key={item.name} className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-6 bg-[#155FC7]" : "w-1.5 bg-[#CBDDD2]"}`} />
          ))}
        </div>
      </div>

      <span className="absolute bottom-0 right-1 rounded-full border border-[#E2ECE5] bg-white/90 px-3 py-2 text-[10px] font-medium text-[#648073] shadow-sm">
        Illustrative conversation
      </span>

      <style jsx>{`
        @keyframes swMessageEnter {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes swTypingDot {
          0%, 60%, 100% { opacity: .35; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-5px); }
        }
        .sw-message-enter { animation: swMessageEnter 550ms cubic-bezier(.2,.8,.2,1) both; }
        .sw-typing-dot { animation: swTypingDot 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sw-message-enter, .sw-typing-dot { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
