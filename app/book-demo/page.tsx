
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Sparkles,
  UsersRound,
} from "lucide-react";

import BookDemoModal from "@/components/landing/BookDemoModal";

const benefits = [
  {
    icon: CalendarDays,
    title: "Plan with clarity",
    description:
      "See how Showwork brings your content and campaigns into one organised calendar.",
  },
  {
    icon: UsersRound,
    title: "Work better together",
    description:
      "Discover a simpler way to manage feedback, collaboration, and approvals.",
  },
  {
    icon: Sparkles,
    title: "Let AI do more",
    description:
      "Explore how AI helps your team create, respond, and make smarter decisions.",
  },
];

export default function BookDemoPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8FAF5] text-[#102A29]">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-40 -top-40 h-[650px] w-[650px] rounded-full bg-[#DCEAFF]/60 blur-[120px]" />
        <div className="absolute -bottom-48 -left-40 h-[550px] w-[550px] rounded-full bg-[#D8F3A5]/40 blur-[120px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-7 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="text-[24px] font-extrabold tracking-[-0.07em] text-[#155FC7]"
        >
          showwork<span className="text-[#102A29]">.</span>
        </Link>

        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-[#52635E] transition hover:text-[#155FC7]"
        >
          <ArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />
          Back to website
        </Link>
      </header>

      {/* Main content */}
      <section className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:min-h-[750px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:px-14 lg:pb-28 lg:pt-16">
        {/* Left content */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#CDE5D6] bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#176B45]"
          >
            <span className="h-2 w-2 rounded-full bg-[#16834B]" />
            Your personalised Showwork experience
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-8 max-w-[650px] text-[clamp(3.1rem,5.5vw,5.8rem)] font-semibold leading-[1.02] tracking-[-0.07em]"
          >
            Great work
            <br />
            starts with
            <br />
            <span className="text-[#155FC7]">
              a conversation.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-7 max-w-[530px] text-base leading-8 text-[#60716A] sm:text-lg"
          >
            Discover how Showwork can help your team plan
            content, collaborate seamlessly, manage customer
            conversations, and grow with intelligent tools.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center gap-5"
          >
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="group inline-flex items-center gap-6 rounded-full bg-[#155FC7] px-8 py-4 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(21,95,199,0.2)] transition hover:-translate-y-0.5 hover:bg-[#104CA1]"
            >
              Book Your Demo
              <ArrowRight
                size={19}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <span className="inline-flex items-center gap-2 text-xs font-medium text-[#63786C]">
              <Clock3 size={16} />
              Quick, personalised walkthrough
            </span>
          </motion.div>

          <div className="mt-12 flex items-center gap-3 border-t border-[#DCE6DE] pt-6">
            <CheckCircle2
              size={19}
              className="shrink-0 text-[#16834B]"
            />
            <p className="text-sm text-[#60716A]">
              No commitment. Just a better way to work.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative"
        >
          <div
            aria-hidden="true"
            className="absolute -inset-5 rounded-[40px] bg-[#D8F3A5]/40 blur-3xl"
          />

          <div className="relative overflow-hidden rounded-[30px] border border-[#E1E9E2] bg-white p-7 shadow-[0_25px_80px_rgba(16,42,41,0.07)] sm:p-10">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#155FC7]">
                <CalendarDays size={23} />
              </span>

              <span className="rounded-full bg-[#E9F7E9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#16834B]">
                Personalised demo
              </span>
            </div>

            <h2 className="mt-7 text-[29px] font-semibold leading-tight tracking-[-0.05em]">
              See what's possible
              <br />
              with Showwork.
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#6C7A72]">
              We'll walk you through the tools that matter
              most to your business.
            </p>

            <div className="mt-8 space-y-6">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <div
                    key={benefit.title}
                    className="flex items-start gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F0F6EE] text-[#16834B]">
                      <Icon size={20} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#102A29]">
                        {benefit.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-6 text-[#75827B]">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="mt-9 flex w-full items-center justify-center gap-3 rounded-full bg-[#102A29] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#155FC7]"
            >
              Schedule My Demo
              <ArrowRight size={18} />
            </button>

            <p className="mt-4 text-center text-[11px] text-[#8A9790]">
              We'll confirm your preferred time by email.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#DCE6DE] px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[#718078]">
            © {new Date().getFullYear()} Showwork.
            Built for better work.
          </p>

          <Link
            href="/"
            className="text-xs font-semibold text-[#155FC7] hover:underline"
          >
            Explore Showwork
          </Link>
        </div>
      </footer>

      {/* Existing booking modal */}
      <BookDemoModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
      />
    </main>
  );
}
