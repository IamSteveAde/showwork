"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleCheck,
  FileCheck2,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Users,
  WandSparkles,
  LockKeyhole,
  Filter,
  Globe2,
  CalendarDays,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const BLUE = "#2478FF";

const features = [
  {
    eyebrow: "ONE CLIENT. ONE SPACE.",
    title: "A workspace that grows with the relationship.",
    description:
      "Create one living workspace for each client. Keep adding content, campaigns, ideas, feedback and approvals without starting over every month.",
    icon: LayoutDashboard,
  },
  {
    eyebrow: "AI STUDIO",
    title: "Create with the context already in the room.",
    description:
      "Give AI your business knowledge, then generate content ideas and drafts around the client's real brand, direction and goals.",
    icon: WandSparkles,
  },
  {
    eyebrow: "CLIENT REVIEW",
    title: "Make approval feel effortless.",
    description:
      "Clients see a clean presentation of the work, filter what matters and respond directly to each piece. No hunting through chats.",
    icon: FileCheck2,
  },
  {
    eyebrow: "TEAMWORK",
    title: "Bring the right people in.",
    description:
      "Invite collaborators and clients with the access they need. Keep everyone working from the same source of truth.",
    icon: Users,
  },
];

const workflow = [
  {
    number: "01",
    title: "Create the workspace",
    description:
      "Set up a dedicated space for the client and give the relationship a permanent home.",
    icon: Plus,
  },
  {
    number: "02",
    title: "Plan and create",
    description:
      "Build content, attach assets, add captions and direction, and keep the next pieces visible.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Review and decide",
    description:
      "Send the client a focused view. They can approve, request a revision or leave feedback.",
    icon: MessageSquare,
  },
  {
    number: "04",
    title: "Keep moving",
    description:
      "Approved work is locked, revisions stay editable, and the workspace continues growing with the account.",
    icon: CircleCheck,
  },
];

const capabilities = [
  ["Smart content filters", "Find content by platform, status, type, category or whether files are attached.", Filter],
  ["Multi-platform previews", "See how approved content is presented across Instagram and TikTok before it moves forward.", ImageIcon],
  ["Client access", "Give clients a focused private experience without exposing the rest of your workspace.", Globe2],
  ["People & permissions", "Invite clients and collaborators with clear levels of access.", Users],
  ["Business knowledge", "Keep brand information, documents and references available to the AI Studio.", FolderKanban],
  ["Approvals that mean something", "Once a client approves a post, it becomes locked so the approved version stays protected.", LockKeyhole],
  ["Publishing workflow", "Move approved content toward publishing without losing the decision trail.", Send],
  ["Insights", "Understand what is planned, in review and approved so the next action is obvious.", BarChart3],
];

function Grid({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: dark
            ? "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)"
            : "linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(to bottom, black, transparent 92%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black, transparent 92%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[-160px] h-[720px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: dark
            ? "radial-gradient(circle, rgba(36,120,255,0.18), transparent 67%)"
            : "radial-gradient(circle, rgba(36,120,255,0.10), transparent 67%)",
        }}
      />
    </>
  );
}

function StatusPill({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green" | "gray";
}) {
  const styles = {
    blue: "bg-blue-50 text-[#2478FF]",
    green: "bg-emerald-50 text-emerald-600",
    gray: "bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function WorkspacePreview() {
  const posts = [
    { title: "Founder story", status: "Approved", tone: "green", type: "PHOTO" },
    { title: "Behind the scenes", status: "Review", tone: "blue", type: "VIDEO" },
    { title: "Product feature", status: "Production", tone: "gray", type: "PHOTO" },
    { title: "Customer story", status: "Approved", tone: "green", type: "VIDEO" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[1120px]">
      <div className="absolute -inset-10 rounded-[50px] bg-blue-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 35, rotateX: 4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_45px_120px_rgba(15,23,42,0.14)]"
      >
        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-[#FAFBFC] px-4 sm:px-5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </div>

          <div className="hidden rounded-lg border border-slate-200 bg-white px-16 py-1.5 text-[8px] text-slate-400 sm:block">
            app.showwork.co/workspace/aurora
          </div>

          <div className="h-6 w-6 rounded-full bg-slate-200" />
        </div>

        <div className="grid min-h-[575px] lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-slate-200 bg-[#FBFCFD] p-5 lg:block">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-bold text-white">
                S
              </div>
              <span className="text-xs font-bold tracking-[-0.02em]">
                SHOWWORK
              </span>
            </div>

            <div className="mt-9">
              <p className="px-2 text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Workspace
              </p>

              <div className="mt-3 space-y-1">
                {[
                  ["Overview", true],
                  ["Content", false],
                  ["AI Studio", false],
                  ["People", false],
                  ["Insights", false],
                  ["Publish", false],
                ].map(([label, active]) => (
                  <div
                    key={String(label)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[9px] font-semibold ${
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

            <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
              <div className="flex items-center gap-2">
                <WandSparkles size={12} className="text-[#2478FF]" />
                <span className="text-[9px] font-bold text-slate-800">
                  AI Studio
                </span>
                <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[7px] font-bold text-[#2478FF]">
                  NEW
                </span>
              </div>
              <p className="mt-2 text-[8px] leading-4 text-slate-500">
                Create with your client context.
              </p>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#2478FF]">
                    Client Content Workspace
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-2xl">
                    Aurora Creative
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Ongoing content · September
                  </p>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <div className="flex -space-x-2">
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-blue-200" />
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-300" />
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-700" />
                  </div>
                  <span className="text-[8px] font-semibold text-slate-400">
                    3 people
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2 overflow-hidden">
                {["Overview", "Content", "AI Studio", "Review", "Publish"].map(
                  (item, index) => (
                    <span
                      key={item}
                      className={`shrink-0 rounded-lg px-3 py-2 text-[8px] font-semibold ${
                        index === 0
                          ? "bg-slate-950 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="p-5 sm:p-8">
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
                    <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_250px]">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-950">
                        September content
                      </p>
                      <p className="mt-1 text-[8px] text-slate-400">
                        Filter, review and keep moving.
                      </p>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200">
                      <Plus size={13} className="text-slate-500" />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-hidden">
                    <span className="rounded-lg bg-slate-950 px-3 py-2 text-[8px] font-semibold text-white">
                      All
                    </span>
                    <span className="rounded-lg border border-slate-200 px-3 py-2 text-[8px] font-semibold text-slate-500">
                      Review
                    </span>
                    <span className="rounded-lg border border-slate-200 px-3 py-2 text-[8px] font-semibold text-slate-500">
                      Approved
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {posts.map((post, index) => (
                      <div
                        key={post.title}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <div
                          className="relative h-[82px]"
                          style={{
                            background:
                              index % 2 === 0
                                ? "linear-gradient(135deg,#dbeafe,#f8fafc)"
                                : "linear-gradient(135deg,#e2e8f0,#f8fafc)",
                          }}
                        >
                          {post.type === "VIDEO" && (
                            <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90">
                              <Send
                                size={9}
                                className="rotate-[-20deg] text-slate-800"
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-2.5">
                          <p className="truncate text-[8px] font-semibold text-slate-700">
                            {post.title}
                          </p>
                          <div className="mt-2">
                            <StatusPill
                              tone={post.tone as "blue" | "green" | "gray"}
                            >
                              {post.status}
                            </StatusPill>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-slate-950">
                        Needs attention
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
                        <div key={item} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
                          <span className="text-[8px] text-slate-500">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <div className="flex items-center gap-2">
                      <CircleCheck size={13} className="text-emerald-400" />
                      <p className="text-[9px] font-semibold text-white">
                        11 approved
                      </p>
                    </div>
                    <p className="mt-2 text-[8px] leading-4 text-white/40">
                      Approved content stays protected from accidental edits.
                    </p>
                    <div className="mt-4 h-1.5 rounded-full bg-white/10">
                      <div className="h-full w-[72%] rounded-full bg-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.75, duration: 0.7 }}
        className="absolute -left-5 top-[24%] hidden w-[180px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)] xl:block"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
            <MessageSquare size={13} className="text-[#2478FF]" />
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
              Client feedback
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
        className="absolute -right-5 bottom-[15%] hidden w-[180px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)] xl:block"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
            <WandSparkles size={13} className="text-[#2478FF]" />
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
              AI Studio
            </p>
            <p className="mt-1 text-[10px] font-semibold text-slate-800">
              Create from context
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ delay: index * 0.06, duration: 0.6 }}
      className="group relative min-h-[350px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 sm:p-10"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-50 opacity-0 blur-3xl transition duration-700 group-hover:opacity-100" />

      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition-transform duration-300 group-hover:-translate-y-1">
          <Icon size={19} />
        </div>

        <p className="mt-12 text-[9px] font-bold tracking-[0.18em] text-[#2478FF]">
          {feature.eyebrow}
        </p>

        <h3 className="mt-4 max-w-md text-2xl font-semibold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:text-3xl">
          {feature.title}
        </h3>

        <p className="mt-5 max-w-md text-sm leading-6 text-slate-500">
          {feature.description}
        </p>
      </div>

      <div className="absolute bottom-7 right-7 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 transition group-hover:border-blue-200 group-hover:bg-blue-50">
        <ArrowUpRight
          size={14}
          className="text-slate-400 transition group-hover:text-[#2478FF]"
        />
      </div>
    </motion.div>
  );
}

export default function ContentWorkspacePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#F7FAFE] pt-28 sm:pt-32">
        <Grid />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 sm:px-8 sm:pb-32 lg:px-12">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF] shadow-sm"
            >
              <Sparkles size={12} />
              Showwork Content Workspace
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="mt-8 text-[clamp(3.2rem,8vw,7rem)] font-semibold leading-[0.89] tracking-[-0.078em] text-slate-950"
            >
              One place for
              <br />
              <span className="text-[#2478FF]">the whole client relationship.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg"
            >
              Plan content, create with AI, share work, collect feedback and
              get approvals — inside one living workspace that keeps growing
              with every client.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/signup?next=/dashboard/calendars"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-slate-950 px-7 text-sm font-semibold text-white shadow-xl shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-[#2478FF]"
              >
                Create a client workspace
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                See how it works
                <ChevronRight size={15} />
              </a>
            </motion.div>
          </div>

          <div className="relative mt-20 sm:mt-24">
            <WorkspacePreview />
          </div>
        </div>
      </section>

      {/* POSITIONING */}
      <section className="relative overflow-hidden bg-slate-950 py-28 text-white sm:py-36">
        <Grid dark />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Built differently
              </p>
              <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl">
                Not another
                <br />
                content calendar.
              </h2>
            </div>

            <div>
              <p className="max-w-2xl text-lg leading-8 text-white/60">
                A content calendar tells you what is scheduled. Showwork gives
                the client relationship somewhere to live.
              </p>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
                Create the workspace once. Add your team. Add the client. Keep
                planning, creating, reviewing and approving there as the work
                evolves.
              </p>
            </div>
          </div>

          <div className="mt-24 grid border-y border-white/10 sm:grid-cols-4">
            {[
              ["01", "Plan", "Turn direction into a clear content plan."],
              ["02", "Create", "Build content with your team or AI."],
              ["03", "Review", "Put the right work in front of the client."],
              ["04", "Approve", "Know exactly what is ready to move."],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="border-b border-white/10 px-0 py-8 last:border-b-0 sm:border-b-0 sm:border-r sm:px-7 sm:last:border-r-0"
              >
                <p className="text-[9px] font-bold tracking-[0.15em] text-white/25">
                  {number}
                </p>
                <p className="mt-4 text-sm font-semibold text-white">
                  {title}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/40">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section
        id="how-it-works"
        className="relative overflow-hidden bg-white py-28 sm:py-36"
      >
        <div className="pointer-events-none absolute right-[-180px] top-[10%] h-[520px] w-[520px] rounded-full border border-blue-100" />
        <div className="pointer-events-none absolute right-[-120px] top-[18%] h-[390px] w-[390px] rounded-full border border-blue-100" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
              How it works
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl">
              From first idea
              <br />
              to ready to publish.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-500">
              Every step stays connected, so your team and your client always
              know what is happening next.
            </p>
          </div>

          <div className="mt-20">
            {workflow.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-70px" }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                  className="group grid border-t border-slate-200 py-9 sm:grid-cols-[90px_64px_1fr_1fr] sm:items-center sm:gap-8 sm:py-11"
                >
                  <span className="text-[10px] font-bold tracking-[0.16em] text-slate-300">
                    {item.number}
                  </span>

                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition group-hover:border-blue-200 group-hover:bg-blue-50 sm:mt-0">
                    <Icon
                      size={19}
                      className="text-slate-500 transition group-hover:text-[#2478FF]"
                    />
                  </div>

                  <div className="mt-6 sm:mt-0">
                    <h3 className="text-xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-2xl">
                      {item.title}
                    </h3>
                  </div>

                  <p className="mt-4 max-w-md text-sm leading-6 text-slate-500 sm:mt-0">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
            <div className="border-t border-slate-200" />
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="relative overflow-hidden bg-[#F4F6F9] py-28 sm:py-36">
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
              Everything connected
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl">
              The tools you need.
              <br />
              In one workspace.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-500">
              Less switching. Less searching. Less explaining. More time doing
              the work your client actually hired you to do.
            </p>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-2">
            {features.map((feature, index) => (
              <FeatureCard key={feature.eyebrow} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="relative overflow-hidden bg-white py-28 sm:py-36">
        <div className="pointer-events-none absolute left-[-240px] top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-blue-50/70 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid items-center gap-16 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                <WandSparkles size={11} />
                AI Studio
              </div>

              <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-6xl">
                Don't give AI a blank page.
                <br />
                <span className="text-[#2478FF]">Give it context.</span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-7 text-slate-500">
                Add the client's business knowledge, references and direction.
                AI Studio uses that context to help generate content ideas and
                drafts that actually belong to the brand.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Build a business knowledge base",
                  "Generate batches of content",
                  "Edit every draft before confirming",
                  "Regenerate individual ideas when needed",
                  "Keep previous generations available",
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
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[#F6F8FB] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-7">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                        AI Studio
                      </p>
                      <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        September content batch
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[8px] font-bold text-[#2478FF]">
                      12 DRAFTS
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-950 p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={13} className="text-blue-400" />
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
                        Client context
                      </p>
                    </div>
                    <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-white">
                      Aurora is building trust through useful, human content.
                    </p>
                    <p className="mt-3 text-[10px] leading-5 text-white/40">
                      Brand documents and previous direction are available to
                      the generator.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ["Founder lesson", "Instagram", "Draft"],
                      ["Customer story", "TikTok", "Regenerate"],
                      ["Product insight", "Instagram", "Draft"],
                    ].map(([title, platform, action], index) => (
                      <div
                        key={title}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-3.5"
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            index === 1 ? "bg-blue-50" : "bg-slate-50"
                          }`}
                        >
                          <Sparkles
                            size={13}
                            className={
                              index === 1
                                ? "text-[#2478FF]"
                                : "text-slate-400"
                            }
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-semibold text-slate-800">
                            {title}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            {platform}
                          </p>
                        </div>
                        <span className="text-[8px] font-semibold text-slate-400">
                          {action}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-4 py-3 text-[10px] font-bold text-white"
                  >
                    <WandSparkles size={13} />
                    Generate another batch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPROVAL */}
      <section className="relative overflow-hidden bg-slate-950 py-28 text-white sm:py-36">
        <Grid dark />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Review without the back and forth
              </p>

              <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl">
                The client sees what matters.
                <br />
                You keep control.
              </h2>

              <p className="mt-7 max-w-xl text-base leading-7 text-white/55">
                Clients get a clean private view of their content. They can
                filter what they need to see, open a piece, leave feedback,
                request a revision or approve it.
              </p>

              <div className="mt-9 grid gap-4 sm:grid-cols-2">
                {[
                  "Approve or request revision",
                  "Feedback stays attached to content",
                  "Approved posts become locked",
                  "Private client access",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CircleCheck size={16} className="text-emerald-400" />
                    <span className="text-sm text-white/65">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur sm:p-7">
                <div className="rounded-[22px] bg-white p-5 text-slate-950 sm:p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
                        Client review
                      </p>
                      <p className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                        September content
                      </p>
                    </div>
                    <StatusPill tone="blue">5 to review</StatusPill>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ["Product feature", "Waiting for your decision"],
                      ["Founder story", "Approved"],
                      ["BTS reel", "Revision requested"],
                    ].map(([title, status], index) => (
                      <div
                        key={title}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                              index === 1
                                ? "bg-emerald-50"
                                : "bg-blue-50"
                            }`}
                          >
                            {index === 1 ? (
                              <CircleCheck
                                size={14}
                                className="text-emerald-500"
                              />
                            ) : (
                              <MessageSquare
                                size={14}
                                className="text-[#2478FF]"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-slate-800">
                              {title}
                            </p>
                            <p className="mt-1 text-[8px] text-slate-400">
                              {status}
                            </p>
                          </div>

                          <ChevronRight
                            size={13}
                            className="text-slate-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <LockKeyhole size={13} className="text-slate-500" />
                      <p className="text-[9px] font-semibold text-slate-700">
                        Approved means approved
                      </p>
                    </div>
                    <p className="mt-2 text-[8px] leading-4 text-slate-400">
                      Once the client approves a post, the approved version is
                      protected from editing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="relative overflow-hidden bg-[#F5F7FA] py-28 sm:py-36">
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
                Inside the workspace
              </p>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl">
                Simple on the surface.
                <br />
                Powerful underneath.
              </h2>
            </div>

            <p className="max-w-sm text-sm leading-6 text-slate-500">
              Everything is designed around one question:{" "}
              <span className="font-semibold text-slate-700">
                what needs to happen next?
              </span>
            </p>
          </div>

          <div className="mt-16 grid border-t border-slate-200 md:grid-cols-2">
            {capabilities.map(([title, description, Icon], index) => {
              const CapabilityIcon = Icon as typeof Filter;

              return (
                <motion.div
                  key={title as string}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: index * 0.035, duration: 0.5 }}
                  className="group border-b border-slate-200 p-7 first:border-t-0 md:nth-[odd]:border-r md:p-9"
                >
                  <div className="flex gap-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition group-hover:text-[#2478FF]">
                      <CapabilityIcon size={16} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">
                        {title as string}
                      </h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                        {description as string}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section className="relative overflow-hidden bg-white py-28 sm:py-36">
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
                Made for client-facing teams
              </p>
              <h2 className="mt-5 text-4xl font-semibold leading-[1] tracking-[-0.06em] text-slate-950 sm:text-6xl">
                If you make content for clients,
                <br />
                this is your space.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [
                  "Social media teams",
                  "Plan and manage ongoing content without rebuilding the process every month.",
                  CalendarDays,
                ],
                [
                  "Creative agencies",
                  "Keep multiple client relationships organised without losing the human side of the work.",
                  Users,
                ],
                [
                  "Freelancers",
                  "Give clients a professional place to review your work and stay involved.",
                  MessageSquare,
                ],
                [
                  "Growing teams",
                  "Bring strategy, creation, feedback and approvals into one shared system.",
                  BarChart3,
                ],
              ].map(([title, description, Icon]) => {
                const AudienceIcon = Icon as typeof CalendarDays;

                return (
                  <div
                    key={title as string}
                    className="rounded-[24px] border border-slate-200 bg-[#FAFBFC] p-7"
                  >
                    <AudienceIcon size={18} className="text-[#2478FF]" />
                    <h3 className="mt-8 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      {title as string}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {description as string}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* DARK STATEMENT */}
      <section className="relative overflow-hidden bg-slate-950 py-28 text-white sm:py-36">
        <Grid dark />

        <div className="relative mx-auto max-w-6xl px-6 text-center sm:px-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
            One relationship. One workspace.
          </p>

          <h2 className="mx-auto mt-6 max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.07em] sm:text-7xl">
            Stop starting from zero
            <br />
            every time the work changes.
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-white/45 sm:text-lg">
            Build a client workspace once. Then let it become the place where
            the relationship keeps moving.
          </p>

          <div className="mx-auto mt-16 grid max-w-3xl border-y border-white/10 sm:grid-cols-3">
            {[
              ["01", "One space", "Everything for the client"],
              ["02", "One flow", "Plan → create → review"],
              ["03", "One relationship", "Keep building together"],
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
                <p className="mt-2 text-[10px] text-white/35">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-[#F5F7FA] py-32 sm:py-40">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2478FF]">
            Start with one client
          </p>

          <h2 className="mt-6 text-5xl font-semibold leading-[0.92] tracking-[-0.075em] text-slate-950 sm:text-7xl">
            Give the work
            <br />
            <span className="text-[#2478FF]">somewhere to live.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-slate-500">
            Create a client workspace and bring planning, AI, collaboration,
            review and approvals into one place.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup?next=/dashboard/calendars"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-slate-950 px-8 text-[15px] font-semibold text-white shadow-xl shadow-slate-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2478FF] hover:shadow-[0_14px_35px_rgba(36,120,255,0.20)] sm:h-[58px] sm:px-9"
            >
              Create a client workspace
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/"
              className="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Back to Showwork
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
  <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
    {/* Main footer */}
    <div className="grid gap-14 py-16 sm:py-20 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-16">
      {/* Brand */}
      <div className="max-w-sm">
        <Link
          href="/"
          className="group inline-flex items-center"
          aria-label="Showwork home"
        >
          <img
            src="/images/logo/sw.svg"
            alt="Showwork"
            className="h-9 w-auto transition-opacity duration-200 group-hover:opacity-80"
          />
        </Link>

        <p className="mt-6 max-w-[280px] text-[14px] leading-6 text-slate-500">
          The workspace for people who make things — from first idea to final
          delivery.
        </p>

        <Link
          href="/signup"
          className="group mt-7 inline-flex h-12 items-center gap-2.5 rounded-full bg-slate-950 px-6 text-[13px] font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2478FF] hover:shadow-[0_14px_30px_rgba(36,120,255,0.18)]"
        >
          Get started
          <ArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      </div>

      {/* Solutions */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Solutions
        </p>

        <div className="mt-6 space-y-4">
          <Link
            href="/portfolio"
            className="group flex items-center justify-between text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            <span>Portfolio</span>
            <ArrowUpRight
              size={13}
              className="opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </Link>

          <Link
            href="/delivery"
            className="group flex items-center justify-between text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            <span>Project Delivery</span>
            <ArrowUpRight
              size={13}
              className="opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </Link>

          <Link
            href="/content-workspace"
            className="group flex items-center justify-between text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            <span>Content Workspace</span>
            <ArrowUpRight
              size={13}
              className="opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </Link>

          <Link
            href="/creativo"
            className="group flex items-center justify-between text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            <span>Creativo</span>
            <ArrowUpRight
              size={13}
              className="opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </Link>
        </div>
      </div>

      {/* Product */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Product
        </p>

        <div className="mt-6 space-y-4">
          <Link
            href="/"
            className="block text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            Home
          </Link>

          <Link
            href="/blog"
            className="block text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            Blog
          </Link>

          <Link
            href="/login"
            className="block text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="block text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            Create an account
          </Link>
        </div>
      </div>

      {/* Support */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Support
        </p>

        <div className="mt-6">
          <a
            href={`https://wa.me/2347018819588?text=${encodeURIComponent(
              "Hello Showwork Support 👋\n\nI’d like some help with Showwork.\n\nCould you please assist me?\n\nThank you."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-[20px] border border-slate-200 bg-[#FAFBFC] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_14px_35px_rgba(15,23,42,0.07)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF8EF] text-[#25D366]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-[17px] w-[17px]"
                  aria-hidden="true"
                >
                  <path
                    d="M20.52 3.449A11.86 11.86 0 0 0 12.058 0C5.5 0 .164 5.337.162 11.895c0 2.097.547 4.144 1.587 5.948L.06 24l6.3-1.653a11.86 11.86 0 0 0 5.692 1.45h.005c6.557 0 11.893-5.337 11.895-11.895a11.85 11.85 0 0 0-3.432-8.453Zm-8.462 18.277h-.004a9.84 9.84 0 0 1-5.015-1.372l-.36-.214-3.74.981.998-3.646-.234-.374a9.86 9.86 0 0 1-1.512-5.205C2.193 6.46 6.61 2.043 12.063 2.043a9.82 9.82 0 0 1 6.987 2.897 9.82 9.82 0 0 1 2.892 6.992c-.002 5.454-4.419 9.794-9.884 9.794Zm5.407-7.349c-.296-.148-1.753-.865-2.025-.964-.272-.099-.47-.148-.667.149-.198.296-.766.964-.939 1.162-.173.198-.346.223-.642.074-.296-.148-1.252-.462-2.385-1.473-.882-.787-1.477-1.758-1.65-2.054-.173-.296-.018-.456.13-.604.134-.133.296-.346.445-.519.148-.173.198-.297.297-.495.099-.198.05-.371-.025-.519-.074-.148-.667-1.607-.914-2.202-.241-.579-.486-.5-.667-.509-.173-.009-.371-.01-.568-.01-.198 0-.519.074-.791.371-.272.296-1.038 1.014-1.038 2.473s1.063 2.869 1.211 3.067c.148.198 2.092 3.194 5.071 4.481.709.306 1.262.489 1.693.626.712.226 1.36.194 1.872.118.571-.085 1.753-.717 2.001-1.41.247-.692.247-1.285.173-1.409-.074-.123-.272-.197-.568-.346Z"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900">
                  Talk to Showwork
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Need help choosing a workspace or getting something sorted?
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2478FF]">
                  Chat with us
                  <ArrowUpRight
                    size={12}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="flex flex-col gap-5 border-t border-slate-100 py-7 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-slate-500">
          © {new Date().getFullYear()} Showwork. All rights reserved.
        </p>

        <p className="text-[10px] text-slate-400">
          Built for people who make things.
        </p>
      </div>

      <div className="flex items-center gap-5 text-[10px] font-medium text-slate-400">
        <Link
          href="/privacy"
          className="transition-colors hover:text-slate-900"
        >
          Privacy
        </Link>

        <Link
          href="/terms"
          className="transition-colors hover:text-slate-900"
        >
          Terms
        </Link>

        <a
          href="mailto:hello@useshowwork.com"
          className="transition-colors hover:text-slate-900"
        >
          Contact
        </a>
      </div>
    </div>
  </div>
</footer>
    </main>
  );
}
