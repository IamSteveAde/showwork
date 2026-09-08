"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const BLUE = "#2478FF";

const stages = [
  {
    number: "01",
    label: "IDEAS",
    title: "Start with the thinking.",
    description:
      "Bring ideas, references, concepts and direction into one shared space before production begins.",
    icon: Sparkles,
  },
  {
    number: "02",
    label: "IN PRODUCTION",
    title: "Keep everything moving.",
    description:
      "Organise content as it comes together so everyone can see what is being worked on and what is coming next.",
    icon: FolderOpen,
  },
  {
    number: "03",
    label: "FOR REVIEW",
    title: "Put the work in front of the right people.",
    description:
      "Present content clearly and give clients and collaborators an obvious place to review and respond.",
    icon: MessageSquare,
  },
  {
    number: "04",
    label: "APPROVED",
    title: "Know what is ready.",
    description:
      "Turn feedback into decisions and keep approved content easy to find as the workspace grows.",
    icon: CircleCheck,
  },
];

const benefits = [
  {
    eyebrow: "PLAN TOGETHER",
    title: "Give ideas somewhere to become real.",
    description:
      "Instead of spreading briefs, references and content plans across chats and documents, keep the thinking connected to the work.",
    icon: Sparkles,
  },
  {
    eyebrow: "PRESENT CLEARLY",
    title: "Make content easy to understand.",
    description:
      "Give clients a clean view of what they are looking at, what needs their attention and what is already moving forward.",
    icon: ImageIcon,
  },
  {
    eyebrow: "GET APPROVALS",
    title: "Replace 'just checking in' with clarity.",
    description:
      "Make review and approval part of the workspace, so your team always knows which content needs a decision.",
    icon: CircleCheck,
  },
  {
    eyebrow: "KEEP MOVING",
    title: "Build a workspace that keeps growing.",
    description:
      "This isn't a one-off delivery folder. Keep adding content, updating plans and collaborating with the client as the relationship continues.",
    icon: FolderOpen,
  },
];

function GridBackground({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: dark
            ? "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)"
            : "linear-gradient(rgba(17,19,23,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,19,23,0.045) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(to bottom, black, transparent 90%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black, transparent 90%)",
        }}
      />

      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: dark
            ? "radial-gradient(circle, rgba(36,120,255,0.16), transparent 65%)"
            : "radial-gradient(circle, rgba(36,120,255,0.10), transparent 65%)",
        }}
      />
    </>
  );
}

function WorkspaceMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[1050px]">
      <div className="absolute -inset-10 rounded-[45px] bg-blue-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 35, rotateX: 5 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_40px_100px_rgba(15,23,42,0.14)]"
      >
        {/* Browser */}
        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </div>

          <div className="hidden rounded-md border border-slate-200 bg-white px-20 py-1.5 text-[9px] text-slate-400 sm:block">
            app.showwork.co/workspace/aurora
          </div>

          <div className="h-6 w-6 rounded-full bg-slate-200" />
        </div>

        <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[215px_1fr]">
          {/* Sidebar */}
          <aside className="hidden border-r border-slate-200 bg-[#FAFBFC] p-5 lg:block">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-bold text-white">
                S
              </div>

              <span className="text-xs font-bold tracking-tight text-slate-950">
                SHOWWORK
              </span>
            </div>

            <div className="mt-9">
              <p className="px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Workspace
              </p>

              <div className="mt-3 space-y-1">
                {[
                  ["Overview", true],
                  ["Content plan", false],
                  ["In production", false],
                  ["For review", false],
                  ["Approved", false],
                ].map(([label, active]) => (
                  <div
                    key={String(label)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[10px] font-medium ${
                      active
                        ? "bg-slate-950 text-white"
                        : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-blue-400" : "bg-slate-300"
                      }`}
                    />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                People
              </p>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-600">
                  AC
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-slate-800">
                    Aurora Creative
                  </p>
                  <p className="text-[9px] text-slate-400">Client</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                  SW
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-slate-800">
                    Showwork Team
                  </p>
                  <p className="text-[9px] text-slate-400">Team</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="min-w-0">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                    Client Content Workspace
                  </p>

                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-2xl">
                    Aurora — September Content
                  </h3>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Ongoing content planning & approvals
                  </p>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <div className="flex -space-x-2">
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-blue-200" />
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-300" />
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-700" />
                  </div>

                  <span className="text-[9px] font-semibold text-slate-400">
                    3 collaborators
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2 overflow-hidden">
                {[
                  "Overview",
                  "Content plan",
                  "Production",
                  "Review",
                  "Approved",
                ].map((item, index) => (
                  <span
                    key={item}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[9px] font-semibold ${
                      index === 0
                        ? "bg-slate-950 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {/* Header stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Planned", "24"],
                  ["In production", "08"],
                  ["For review", "05"],
                  ["Approved", "11"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Content grid */}
              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-950">
                        September content
                      </p>

                      <p className="mt-1 text-[9px] text-slate-400">
                        Latest items in the workspace
                      </p>
                    </div>

                    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200">
                      <Plus size={13} className="text-slate-500" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      {
                        title: "Brand story",
                        status: "Approved",
                        type: "PHOTO",
                      },
                      {
                        title: "Behind the scenes",
                        status: "Review",
                        type: "VIDEO",
                      },
                      {
                        title: "Product feature",
                        status: "Production",
                        type: "PHOTO",
                      },
                      {
                        title: "Founder story",
                        status: "Approved",
                        type: "PHOTO",
                      },
                        {
                        title: "September offer",
                        status: "Review",
                        type: "CAROUSEL",
                      },
                      {
                        title: "Customer story",
                        status: "Production",
                        type: "VIDEO",
                      },
                    ].map((item, index) => (
                      <div
                        key={item.title}
                        className="group overflow-hidden rounded-xl border border-slate-200"
                      >
                        <div
                          className="relative h-[105px]"
                          style={{
                            background:
                              index % 3 === 0
                                ? "linear-gradient(135deg,#dbeafe,#eff6ff)"
                                : index % 3 === 1
                                ? "linear-gradient(135deg,#e2e8f0,#f8fafc)"
                                : "linear-gradient(135deg,#dbe4f5,#f1f5f9)",
                          }}
                        >
                          <div className="absolute inset-0 opacity-30">
                            <div className="absolute left-[20%] top-[20%] h-12 w-12 rounded-full bg-white blur-xl" />
                            <div className="absolute bottom-[10%] right-[10%] h-14 w-14 rounded-full bg-blue-300 blur-xl" />
                          </div>

                          {item.type === "VIDEO" && (
                            <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90">
                              <Send
                                size={9}
                                className="rotate-[-20deg] text-slate-800"
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <p className="truncate text-[9px] font-semibold text-slate-700">
                            {item.title}
                          </p>

                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`rounded-full px-2 py-1 text-[7px] font-bold uppercase tracking-[0.08em] ${
                                item.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : item.status === "Review"
                                  ? "bg-blue-50 text-[#2478FF]"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.status}
                            </span>

                            <span className="text-[7px] text-slate-400">
                              {item.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity rail */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-slate-950">
                        Needs your attention
                      </p>

                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[8px] font-bold text-[#2478FF]">
                        3
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {[
                        "Approve product feature",
                        "Review September offer",
                        "Comment on BTS reel",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-2"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
                          <span className="text-[9px] text-slate-500">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <div className="flex items-center gap-2">
                      <CircleCheck
                        size={14}
                        className="text-emerald-400"
                      />

                      <p className="text-[10px] font-semibold text-white">
                        Workspace is active
                      </p>
                    </div>

                    <p className="mt-3 text-[9px] leading-4 text-white/40">
                      Updated by your team and client today.
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-white/10">
                        <div className="h-full w-[72%] rounded-full bg-blue-400" />
                      </div>

                      <span className="text-[8px] font-bold text-white/50">
                        72%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating cards */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.75, duration: 0.7 }}
        className="absolute -left-5 top-[20%] hidden w-[175px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)] xl:block"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
            <MessageSquare size={13} className="text-[#2478FF]" />
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
              New feedback
            </p>

            <p className="mt-1 text-[10px] font-semibold text-slate-800">
              3 items need review
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="absolute -right-5 bottom-[17%] hidden w-[175px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)] xl:block"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="h-7 w-7 rounded-full border-2 border-white bg-blue-200" />
            <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-300" />
            <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-700" />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-800">
              Client + team
            </p>

            <p className="text-[9px] text-slate-400">
              Working together
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ContentWorkspacePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-[900px] overflow-hidden border-b border-slate-200 bg-[#F8FAFD] pt-28 sm:pt-32">
        <GridBackground />

        <div className="pointer-events-none absolute left-0 right-0 top-[38%] border-t border-slate-200/70" />
        <div className="pointer-events-none absolute left-0 right-0 top-[78%] border-t border-slate-200/60" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF] shadow-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
              Showwork Content Workspace
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="mt-8 text-[clamp(3.3rem,8vw,7rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-slate-950"
            >
              Content your clients
              <br />
              <span className="text-[#2478FF]">
                can actually see coming together.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg"
            >
              A living workspace for planning, presenting and approving
              content with clients and teams.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/signup?next=/dashboard/calendars"
                className="group inline-flex h-13 items-center justify-center gap-3 rounded-full bg-slate-950 px-7 text-sm font-semibold text-white shadow-xl shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-[#2478FF]"
              >
                Create a client workspace
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#workflow"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                See how it works
                <ChevronRight size={15} />
              </a>
            </motion.div>
          </div>

          <div className="relative mt-20 sm:mt-24">
            <WorkspaceMockup />
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="relative overflow-hidden bg-slate-950 py-28 text-white sm:py-36">
        <GridBackground dark />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Your ongoing client workspace
              </p>

              <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl">
                Not another content
                <br />
                calendar.
              </h2>
            </div>

            <div>
              <p className="max-w-xl text-lg leading-8 text-white/55">
                Your relationship with a client doesn't end after one
                campaign. Their content keeps moving — and your workspace
                should move with it.
              </p>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">
                Create one place for a client, invite the people who need
                access and keep building the workspace as the work evolves.
              </p>
            </div>
          </div>

          <div className="mt-24 grid border-y border-white/10 sm:grid-cols-3">
            {[
              [
                "01",
                "Plan together",
                "Ideas, references and direction.",
              ],
              [
                "02",
                "Review together",
                "Feedback stays with the work.",
              ],
              [
                "03",
                "Keep building",
                "One workspace for the relationship.",
              ],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="border-b border-white/10 px-0 py-8 sm:border-b-0 sm:border-r sm:px-8 sm:first:pl-0 sm:last:border-r-0"
              >
                <p className="text-[10px] font-bold tracking-[0.15em] text-white/30">
                  {number}
                </p>

                <p className="mt-4 text-sm font-semibold text-white">
                  {title}
                </p>

                <p className="mt-2 text-sm text-white/40">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section
        id="workflow"
        className="relative overflow-hidden bg-white py-28 sm:py-36"
      >
        <div className="pointer-events-none absolute right-[-200px] top-[12%] h-[520px] w-[520px] rounded-full border border-blue-100" />

        <div className="pointer-events-none absolute right-[-140px] top-[20%] h-[390px] w-[390px] rounded-full border border-blue-100" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
              How it moves
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl">
              From idea
              <br />
              to approved.
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-500">
              Give the content a clear journey — and give everyone involved a
              clear view of where it stands.
            </p>
          </div>

          <div className="mt-20">
            {stages.map((stage, index) => {
              const Icon = stage.icon;

              return (
                <motion.div
                  key={stage.number}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.6,
                  }}
                  className="group grid border-t border-slate-200 py-8 sm:grid-cols-[100px_80px_1fr_1fr] sm:items-center sm:gap-8 sm:py-10"
                >
                  <span className="text-[10px] font-bold tracking-[0.16em] text-slate-300">
                    {stage.number}
                  </span>

                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition group-hover:border-blue-200 group-hover:bg-blue-50 sm:mt-0">
                    <Icon
                      size={19}
                      className="text-slate-500 transition group-hover:text-[#2478FF]"
                    />
                  </div>

                  <div className="mt-6 sm:mt-0">
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[#2478FF]">
                      {stage.label}
                    </p>

                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-2xl">
                      {stage.title}
                    </h3>
                  </div>

                  <p className="mt-4 max-w-md text-sm leading-6 text-slate-500 sm:mt-0">
                    {stage.description}
                  </p>
                </motion.div>
              );
            })}

            <div className="border-t border-slate-200" />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="relative overflow-hidden bg-[#F4F6F9] py-28 sm:py-36">
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
              Built for ongoing work
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl">
              A better way to work
              <br />
              with your clients.
            </h2>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-2">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;

              return (
                <motion.div
                  key={benefit.eyebrow}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.07, duration: 0.6 }}
                  className="group relative min-h-[380px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 sm:p-10"
                >
                  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-50 opacity-0 blur-3xl transition duration-700 group-hover:opacity-100" />

                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon size={19} />
                    </div>

                    <p className="mt-12 text-[10px] font-bold tracking-[0.18em] text-[#2478FF]">
                      {benefit.eyebrow}
                    </p>

                    <h3 className="mt-4 max-w-md text-3xl font-semibold leading-[1.05] tracking-[-0.05em] text-slate-950 sm:text-4xl">
                      {benefit.title}
                    </h3>

                    <p className="mt-5 max-w-md text-sm leading-6 text-slate-500">
                      {benefit.description}
                    </p>
                  </div>

                  <div className="absolute bottom-7 right-7 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 transition group-hover:border-blue-200 group-hover:bg-blue-50">
                    <ArrowRight
                      size={14}
                      className="text-slate-400 transition group-hover:text-[#2478FF]"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COLLABORATION VISUAL */}
      <section className="relative overflow-hidden bg-white py-28 sm:py-36">
        <div className="absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-50/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
                Built for teams and clients
              </p>

              <h2 className="mt-5 text-4xl font-semibold leading-[1] tracking-[-0.06em] text-slate-950 sm:text-6xl">
                Everyone sees
                <br />
                the same picture.
              </h2>

              <p className="mt-7 max-w-xl text-base leading-7 text-slate-500">
                Invite collaborators, give clients access and keep the entire
                relationship centred around the work.
              </p>

              <div className="mt-9 space-y-4">
                {[
                  "Invite clients and collaborators",
                  "Keep feedback attached to content",
                  "See what needs attention",
                  "Keep adding content as the relationship grows",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
                      <Check size={12} className="text-[#2478FF]" />
                    </div>

                    <span className="text-sm font-medium text-slate-600">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[#F6F8FB] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-7">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                        Collaboration
                      </p>

                      <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        Content review
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                      <Users size={15} className="text-[#2478FF]" />
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-950 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                        September campaign
                      </p>

                      <span className="rounded-full bg-blue-400/10 px-2 py-1 text-[8px] font-bold text-blue-400">
                        REVIEW
                      </span>
                    </div>

                    <p className="mt-5 max-w-sm text-xl font-semibold tracking-[-0.04em] text-white">
                      5 pieces are waiting for client feedback.
                    </p>

                    <div className="mt-6 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((item) => (
                        <div
                          key={item}
                          className="h-1.5 rounded-full bg-blue-400"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100" />

                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-slate-800">
                            Aurora Creative
                          </p>

                          <p className="mt-1 text-[9px] text-slate-400">
                            “This direction works. Approved.”
                          </p>
                        </div>

                        <CircleCheck
                          size={15}
                          className="text-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200" />

                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-slate-800">
                            Creative team
                          </p>

                          <p className="mt-1 text-[9px] text-slate-400">
                            Added 3 new pieces for review.
                          </p>
                        </div>

                        <Send
                          size={13}
                          className="text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK STATEMENT */}
      <section className="relative overflow-hidden bg-slate-950 py-28 text-white sm:py-36">
        <GridBackground dark />

        <div className="relative mx-auto max-w-6xl px-6 text-center sm:px-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
            Keep the relationship moving
          </p>

          <h2 className="mx-auto mt-6 max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.07em] sm:text-7xl">
            Stop treating every piece of content
            <br />
            like a separate project.
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-white/45 sm:text-lg">
            Build one living workspace for the client. Keep planning, creating
            and approving inside it as the relationship evolves.
          </p>

          <div className="mx-auto mt-16 grid max-w-3xl border-y border-white/10 sm:grid-cols-3">
            {[
              ["01", "Plan", "Build the direction"],
              ["02", "Create", "Keep the work moving"],
              ["03", "Approve", "Know what's ready"],
            ].map(([number, title, subtitle]) => (
              <div
                key={number}
                className="border-b border-white/10 p-7 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <p className="text-[9px] font-bold tracking-[0.15em] text-white/25">
                  {number}
                </p>

                <p className="mt-5 text-lg font-semibold text-white">
                  {title}
                </p>

                <p className="mt-2 text-[10px] text-white/35">
                  {subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-[#F5F7FA] py-32 sm:py-40">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
            Start a client workspace
          </p>

          <h2 className="mt-6 text-5xl font-semibold leading-[0.92] tracking-[-0.075em] text-slate-950 sm:text-7xl">
            Plan better.
            <br />
            <span className="text-[#2478FF]">Work together.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-slate-500">
            Give your clients one place to see the work, give feedback and
            keep moving with you.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup?next=/dashboard/calendars"
              className="group inline-flex h-13 items-center justify-center gap-3 rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#2478FF]"
            >
              Create a client workspace
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/"
              className="inline-flex h-13 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Back to Showwork
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white">
                  S
                </div>

                <span className="text-sm font-bold tracking-[-0.03em] text-slate-950">
                  SHOWWORK
                </span>
              </Link>

              <p className="mt-4 max-w-xs text-xs leading-5 text-slate-400">
                The workspace for creative work.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-16 gap-y-8 text-xs sm:grid-cols-3">
              <div>
                <p className="font-semibold text-slate-950">
                  Solutions
                </p>

                <div className="mt-4 space-y-3">
                  <Link
                    href="/portfolio"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Portfolio
                  </Link>

                  <Link
                    href="/delivery"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Project Delivery
                  </Link>

                  <Link
                    href="/content-workspace"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Content Workspace
                  </Link>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-950">
                  Explore
                </p>

                <div className="mt-4 space-y-3">
                  <Link
                    href="/"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Home
                  </Link>

                  <Link
                    href="/creativo"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Creativo
                  </Link>

                  <Link
                    href="/blog"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Blog
                  </Link>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-950">
                  Account
                </p>

                <div className="mt-4 space-y-3">
                  <Link
                    href="/login"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    className="block text-slate-400 transition hover:text-slate-950"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-slate-100 pt-6 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Showwork. All rights reserved.
            </p>

            <p>Built for people who make things.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}