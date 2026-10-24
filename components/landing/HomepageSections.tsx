"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  Layers3,
  Mail,
  MessageSquare,
  BarChart3,
  Send,
  RefreshCw,
  Sparkles,
  Users,
  Building2,
} from "lucide-react";

const section = "px-5 py-20 sm:px-8 sm:py-28 lg:px-16";
const heading =
  "mt-5 font-[var(--font-fraunces)] text-[clamp(2.2rem,4.6vw,4.6rem)] font-normal leading-[1.04] tracking-[-0.045em]";
const intro = "mt-6 max-w-2xl text-base leading-8 text-slate-600";
const pillars = [
  {
    Icon: BookOpen,
    title: "Business knowledge & context",
    body: "Give your team access to the information behind your business, brand, audience, and marketing direction.",
    reference: "Knowledge & business documents",
    step: 1,
  },
  {
    Icon: CalendarDays,
    title: "Planning & content creation",
    body: "Organise calendars and prepare content with relevant business context and available AI assistance.",
    reference: "Calendar & AI Studio",
    step: 2,
  },
  {
    Icon: Users,
    title: "Team & workflow management",
    body: "Coordinate collaborators, feature access, feedback, and approvals within your marketing workflow.",
    reference: "People & client review",
    step: 4,
  },
  {
    Icon: Send,
    title: "Publishing & execution",
    body: "Connect supported social accounts and manage publishing settings, schedules, and post status.",
    reference: "Channels & publishing controls",
    step: 6,
  },
  {
    Icon: MessageSquare,
    title: "Conversations & leads",
    body: "Bring supported social conversations, contact notes, and lead follow-up closer to your marketing work.",
    reference: "Inbox & Leads · Studio and Agency",
    step: 7,
  },
  {
    Icon: BarChart3,
    title: "Analytics & intelligence",
    body: "Review available performance data and use supported recommendations to inform your next decisions.",
    reference: "Analytics & Reporting",
    step: 8,
  },
];
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#155FC7]">
      {children}
    </p>
  );
}

export function MarketingProblem() {
  const problems = [
    [
      FileSearch,
      "Scattered marketing information",
      "Business knowledge, content assets, and marketing direction live in different places.",
    ],
    [
      Layers3,
      "Disconnected execution",
      "Planning, publishing, and engagement happen across separate tools and processes.",
    ],
    [
      MessageSquare,
      "Limited visibility",
      "Managers struggle to see marketing activity and available performance information together.",
    ],
    [
      GitBranch,
      "Repeated coordination",
      "Teams chase updates, follow up on decisions, and explain the same information again.",
    ],
  ] as const;
  return (
    <section
      className={`${section} bg-[#F4F5F7] text-[#111317]`}
      aria-labelledby="problem-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Eyebrow>The work between the work</Eyebrow>
        <h2 id="problem-heading" className={`${heading} max-w-4xl`}>
          Your marketing team is working.
          <br />
          <span className="text-slate-500">
            But is everything working together?
          </span>
        </h2>
        <p className={intro}>
          Your team uses different tools to plan, create, publish, respond to
          conversations, and review performance. When those activities are
          disconnected, it becomes harder to maintain visibility, consistency,
          and a reliable workflow.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(([Icon, title, body]) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <Icon aria-hidden="true" size={24} className="text-[#155FC7]" />
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function MarketingSolution() {
  return (
    <section
      id="marketing-workspace"
      className={`${section} scroll-mt-24 bg-white text-[#111317]`}
      aria-labelledby="solution-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <Eyebrow>Marketing Workspace</Eyebrow>
            <h2 id="solution-heading" className={heading}>
              Everything behind your marketing. More connected.
            </h2>
          </div>
          <p className={intro}>
            From planning your next campaign to managing conversations and
            understanding performance, bring important marketing workflows into
            one connected environment.
          </p>
        </div>
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ Icon, title, body, reference, step }, i) => (
            <li key={title} className="relative rounded-2xl bg-[#EEF4FF] p-7">
              <div className="flex items-center justify-between">
                <Icon aria-hidden="true" className="text-[#155FC7]" />
                <span className="text-xs tabular-nums text-blue-700">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-8 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              <a
                href={`#tour-step-${step}`}
                className="mt-6 inline-flex items-center gap-2 text-xs font-semibold leading-6 text-[#155FC7]"
              >
                {reference}
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
        <Link
          href="/content-workspace"
          className="mt-8 inline-flex items-center gap-3 font-semibold text-[#155FC7]"
        >
          Explore Marketing Workspace{" "}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export function MarketingJourney() {
  const steps = [
    [
      BookOpen,
      "Understand your business",
      "Start with relevant business information and brand context.",
    ],
    [
      Sparkles,
      "Plan & create",
      "Organise the calendar and prepare marketing content.",
    ],
    [
      Users,
      "Collaborate & approve",
      "Bring team input, feedback, and decisions together.",
    ],
    [
      Send,
      "Publish & execute",
      "Move content through supported publishing workflows.",
    ],
    [
      MessageSquare,
      "Engage your audience",
      "Manage available conversations and customer enquiries.",
    ],
    [
      BarChart3,
      "Learn & improve",
      "Review available performance data and use it to guide the next plan.",
    ],
  ] as const;
  return (
    <section
      className={`${section} bg-[#F4F5F7] text-[#111317]`}
      aria-labelledby="journey-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Eyebrow>A continuous marketing operation</Eyebrow>
        <h2 id="journey-heading" className={`${heading} max-w-4xl`}>
          From the first idea to the next marketing decision.
        </h2>
        <p className={intro}>
          Marketing doesn’t end when content is approved. Connect the activities
          involved in preparing, executing, and improving your work.
        </p>
        <div className="mt-10 rounded-3xl border border-blue-200 bg-white p-5 sm:p-8">
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map(([Icon, title, body], i) => (
              <li key={title} className="rounded-2xl bg-[#EEF4FF] p-6">
                <div className="flex items-center justify-between text-[#155FC7]">
                  <Icon aria-hidden="true" size={24} />
                  <span className="text-xs font-semibold">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#102A29] p-5 text-emerald-50">
            <RefreshCw
              className="shrink-0 text-emerald-300"
              aria-hidden="true"
            />
            <p className="text-sm leading-6">
              <strong>Bring what you learn into the next cycle.</strong>{" "}
              Performance and conversation context can inform the next plan,
              with your team making the decisions.
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Understand → Plan → Create → Collaborate → Publish → Engage → Measure
          → Improve. Availability depends on your plan, connected accounts, and
          platform permissions.
        </p>
      </div>
    </section>
  );
}
export function BusinessKnowledge() {
  return (
    <section
      className={`${section} overflow-hidden bg-[#102A29] text-white`}
      aria-labelledby="knowledge-heading"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Keep the context. Build continuity.
          </p>
          <h2 id="knowledge-heading" className={heading}>
            Your business knowledge shouldn’t live in one employee’s head.
          </h2>
          <p className="mt-6 text-base leading-8 text-emerald-50/75">
            Your business knowledge should inform how your team plans, creates,
            communicates, and makes marketing decisions. Keep relevant
            information accessible so your team works from a shared
            understanding.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Keep business and brand information organised.",
              "Provide context for content creation.",
              "Support consistent marketing communication.",
              "Reduce repeated explanations.",
              "Preserve useful knowledge when team members change.",
            ].map((text) => (
              <li
                key={text}
                className="flex gap-3 text-sm leading-6 text-emerald-50/90"
              >
                <CheckCircle2
                  size={18}
                  className="mt-1 shrink-0 text-emerald-300"
                  aria-hidden="true"
                />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <figure className="rounded-[28px] border border-emerald-200/20 bg-white/5 p-6 sm:p-10">
          <figcaption className="text-xs uppercase tracking-[0.16em] text-emerald-200">
            One foundation. Multiple workflows.
          </figcaption>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              "Brand direction",
              "Audience context",
              "Products & services",
              "Business documents",
            ].map((text) => (
              <div
                key={text}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6"
              >
                {text}
              </div>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-px bg-emerald-300/40"
          />
          <div className="rounded-2xl bg-emerald-100 p-6 text-[#102A29]">
            <BookOpen aria-hidden="true" />
            <p className="mt-3 text-xl font-semibold">
              Shared business knowledge
            </p>
            <p className="mt-2 text-sm leading-6">
              A common starting point for your team.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-px bg-emerald-300/40"
          />
          <div className="grid grid-cols-2 gap-3">
            {["Planning", "Creation", "Collaboration", "Execution"].map(
              (name) => (
                <p
                  key={name}
                  className="rounded-xl border border-emerald-200/30 p-4 text-center text-sm"
                >
                  {name}
                </p>
              ),
            )}
          </div>
        </figure>
      </div>
    </section>
  );
}
export function ContextualPlanning() {
  return (
    <section
      className={`${section} bg-white text-[#111317]`}
      aria-labelledby="context-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Eyebrow>Intelligence with a starting point</Eyebrow>
        <div className="grid gap-6 lg:grid-cols-2">
          <h2 id="context-heading" className={heading}>
            Give AI context.
            <br />
            <span className="text-[#155FC7]">Not just instructions.</span>
          </h2>
          <p className={intro}>
            Use business information to support content preparation, reply
            drafting, and performance-informed recommendations. Your team
            reviews the suggestions and remains responsible for decisions.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            [
              Sparkles,
              "Content assistance",
              "Use relevant business context to prepare ideas and drafts within your AI allowance.",
            ],
            [
              MessageSquare,
              "Reply drafting",
              "Prepare a response using business source material, then review it before sending. Studio and Agency.",
            ],
            [
              BarChart3,
              "Performance recommendations",
              "Use available account data and business context to inform future content decisions. Studio and Agency.",
            ],
          ].map(([Icon, title, body]) => {
            const Mark = Icon as typeof Sparkles;
            return (
              <article
                key={String(title)}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <Mark aria-hidden="true" className="text-[#155FC7]" />
                <h3 className="mt-5 text-lg font-semibold">{String(title)}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {String(body)}
                </p>
              </article>
            );
          })}
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-600">
          AI assistance depends on usable source information, available data,
          plan allowances, and service availability. It does not independently
          manage your marketing.
        </p>
      </div>
    </section>
  );
}
export function EngagementPerformance() {
  return (
    <section
      className={`${section} bg-[#EEF4FF] text-[#111317]`}
      aria-labelledby="engagement-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Eyebrow>Beyond publishing</Eyebrow>
        <h2 id="engagement-heading" className={`${heading} max-w-4xl`}>
          Publishing is one part of marketing. Understanding what happens next
          matters too.
        </h2>
        <p className={intro}>
          Bring supported social engagement and performance workflows closer to
          the rest of your marketing operation.
        </p>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl bg-white p-7 sm:p-10">
            <MessageSquare
              size={30}
              className="text-[#155FC7]"
              aria-hidden="true"
            />
            <h3 className="mt-5 text-2xl font-semibold">
              Customer conversations
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Read and reply to supported social messages in Inbox. Keep contact
              details, notes, and lead status together for follow-up in Leads.
            </p>
            <ol className="mt-6 space-y-3 text-sm">
              {[
                "Open a conversation in Inbox",
                "Review the history and prepare a reply",
                "Keep lead notes and follow-up status in Leads",
              ].map((t, i) => (
                <li
                  key={t}
                  className="flex gap-3 border-b border-slate-100 pb-3"
                >
                  <span className="text-[#155FC7]">0{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs leading-6 text-slate-600">
              Studio and Agency. Messaging availability depends on the channel
              and permissions. Lead follow-up is not a complete sales CRM.
            </p>
          </article>
          <article className="rounded-3xl bg-[#102A29] p-7 text-white sm:p-10">
            <BarChart3
              size={30}
              className="text-emerald-300"
              aria-hidden="true"
            />
            <h3 className="mt-5 text-2xl font-semibold">
              Performance insights
            </h3>
            <p className="mt-4 text-sm leading-7 text-emerald-50/90">
              Review available account and post metrics in Analytics &
              Reporting. Compare periods where data exists and explore AI
              recommendations for your next content experiment.
            </p>
            <ol className="mt-6 space-y-3 text-sm">
              {[
                "Choose a reporting period and connected platform",
                "Review the available account and post metrics",
                "Use supported recommendations to guide the next plan",
              ].map((t, i) => (
                <li
                  key={t}
                  className="flex gap-3 border-b border-white/15 pb-3"
                >
                  <span className="text-emerald-300">0{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs leading-6 text-emerald-50/90">
              Basic analytics are included in each plan. Advanced reporting and
              AI recommendations require Studio or Agency. Unavailable metrics
              are not treated as zero.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
export function MarketingAudiences() {
  const audiences = [
    [
      Building2,
      "For businesses",
      "Bring greater structure and visibility to your marketing operations.",
    ],
    [
      Users,
      "For marketing teams",
      "Connect planning, execution, collaboration, and available performance insights.",
    ],
    [
      Layers3,
      "For agencies",
      "Coordinate client content operations and supported publishing and engagement workflows.",
    ],
    [
      CalendarDays,
      "For social media managers",
      "Manage recurring content creation, publishing, and client coordination.",
    ],
  ] as const;
  return (
    <section
      className={`${section} bg-[#F4F5F7] text-[#111317]`}
      aria-labelledby="audiences-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Eyebrow>People make the system work</Eyebrow>
        <h2 id="audiences-heading" className={`${heading} max-w-4xl`}>
          Built for the people responsible for making marketing happen.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {audiences.map(([Icon, title, body], i) => (
            <article
              key={title}
              className={`rounded-2xl p-7 sm:p-9 ${i === 0 ? "bg-[#155FC7] text-white" : "border border-slate-200 bg-white"}`}
            >
              <Icon size={26} aria-hidden="true" />
              <h3 className="mt-6 text-2xl font-semibold tracking-tight">
                {title}
              </h3>
              <p
                className={`mt-3 text-sm leading-7 ${i === 0 ? "text-blue-50" : "text-slate-600"}`}
              >
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function MarketingDemo() {
  const [prepared, setPrepared] = useState(false);
  function requestDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = `Hello Showwork,\n\nI'd like a Marketing Workspace demonstration.\nBusiness: ${form.get("business")}\nMy role: ${form.get("role")}\nWhat we'd like to organise: ${form.get("workflow")}\n\nPlease let me know the next steps.`;
    window.location.href = `mailto:hello@useshowwork.com?subject=${encodeURIComponent("Marketing Workspace demo request")}&body=${encodeURIComponent(body)}`;
    setPrepared(true);
  }
  return (
    <section
      id="demo"
      className={`${section} scroll-mt-24 bg-[#101827] text-white`}
      aria-labelledby="demo-heading"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            A closer look at your workflow
          </p>
          <h2 id="demo-heading" className={heading}>
            See how Showwork brings your marketing operations together.
          </h2>
          <p className="mt-6 text-base leading-8 text-slate-300">
            Explore how business knowledge, content creation, collaboration,
            publishing, conversations, and available performance insights work
            within Showwork.
          </p>
          <Link
            href="#workflow-tour"
            className="mt-8 inline-flex items-center gap-3 font-semibold text-blue-300"
          >
            See Showwork in Action <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <p className="mt-3 text-sm text-slate-400">
            Explore the product walkthrough, or request a demo for your
            business.
          </p>
        </div>
        <form
          onSubmit={requestDemo}
          className="rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-8"
        >
          <Mail className="text-blue-300" aria-hidden="true" />
          <h3 className="mt-4 text-2xl font-semibold">
            Let’s start with your team.
          </h3>
          <label className="mt-6 block text-sm">
            Business name
            <input
              name="business"
              required
              maxLength={120}
              autoComplete="organization"
              className="mt-2 block w-full rounded-xl border border-white/20 bg-[#101827] p-3 text-white"
            />
          </label>
          <label className="mt-4 block text-sm">
            Your role
            <input
              name="role"
              required
              maxLength={100}
              autoComplete="organization-title"
              className="mt-2 block w-full rounded-xl border border-white/20 bg-[#101827] p-3 text-white"
            />
          </label>
          <label className="mt-4 block text-sm">
            What would you like to organise?
            <textarea
              name="workflow"
              required
              maxLength={1500}
              rows={3}
              className="mt-2 block w-full resize-y rounded-xl border border-white/20 bg-[#101827] p-3 text-white"
            />
          </label>
          <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#155FC7] px-6 py-3 text-sm font-semibold">
            Request a demo by email <ArrowRight size={16} aria-hidden="true" />
          </button>
          <p className="mt-4 text-xs leading-6 text-slate-300">
            Opens your email app with a draft. Send it to request a demo; this
            does not book an appointment. You can also email{" "}
            <a href="mailto:hello@useshowwork.com" className="underline">
              hello@useshowwork.com
            </a>
            .
          </p>
          {prepared && (
            <p role="status" className="mt-3 text-sm text-emerald-300">
              If your email app opened, send the draft to complete your request.
              Otherwise, contact us using the email link above.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
export function WorkflowWalkthrough() {
  const steps = [
    [
      "Business workspace",
      "Create or open a Marketing Workspace for the business or client. Keep its content, connections, and team access within that workspace.",
      "Workspace counts depend on your plan.",
    ],
    [
      "Business context",
      "In Knowledge, add business documents or supported website sources. Review the extracted information so your team has a useful starting point.",
      "Source extraction and selected passages are not exhaustive knowledge of the business.",
    ],
    [
      "Content calendar",
      "Organise upcoming posts, captions, and assets in Calendar. Review timing and content before moving work forward.",
      "You can prepare content manually.",
    ],
    [
      "AI-assisted creation",
      "AI Studio provides business-context-assisted draft generation. Review and edit the resulting drafts before use.",
      "Requires available AI allowance and a functioning generation service; this guide does not demonstrate a completed live generation.",
    ],
    [
      "Team collaboration",
      "Use People to invite collaborators and manage their access. Keep content review within the workspace.",
      "Collaborator limits apply; advanced permissions require Studio or Agency.",
    ],
    [
      "Review and approval",
      "Share the client review experience to collect feedback, revisions, and approval decisions on content.",
      "Approval does not by itself guarantee publication.",
    ],
    [
      "Supported publishing",
      "Connect eligible accounts through Channels. Review publishing settings, schedule, and platform-specific requirements, then follow the post’s publishing status.",
      "Auto-publishing can be turned off. Platform consent, permissions, and media requirements still apply.",
    ],
    [
      "Social inbox",
      "Open Inbox to manage available conversations. Use Leads to keep notes, contact details, and follow-up status alongside customer enquiries.",
      "Studio or Agency; only supported messaging connections are included.",
    ],
    [
      "Available analytics",
      "In Analytics & Reporting, select a period and platform, inspect available metrics, and explore supported AI recommendations to inform the next content cycle.",
      "Account permissions, data availability, and plan access determine what is shown.",
    ],
  ];
  return (
    <section
      id="workflow-tour"
      className={`${section} scroll-mt-24 bg-white text-[#111317]`}
      aria-labelledby="tour-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Eyebrow>Explore the product workflow</Eyebrow>
        <h2 id="tour-heading" className={`${heading} max-w-3xl`}>
          Follow the work through Showwork.
        </h2>
        <p className={intro}>
          A guide to the workspace screens and decisions involved. Open each
          step to see how it connects to the next. This is a product guide, not
          a live account or performance demonstration.
        </p>
        <div className="mt-10 grid items-start gap-3 lg:grid-cols-2">
          {steps.map(([title, body, limit], i) => (
            <details
              id={`tour-step-${i}`}
              key={title}
              className="group scroll-mt-24 rounded-2xl border border-slate-200 bg-[#F7F9FC] open:bg-[#EEF4FF]"
              open={i === 0}
            >
              <summary className="flex cursor-pointer items-center gap-4 rounded-2xl p-5 text-base font-semibold">
                <span className="text-sm tabular-nums text-[#155FC7]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {title}
              </summary>
              <div className="px-6 pb-6">
                <p className="text-sm leading-7 text-slate-700">{body}</p>
                <p className="mt-3 text-xs leading-6 text-slate-600">{limit}</p>
              </div>
            </details>
          ))}
        </div>
        <Link
          href="/content-workspace"
          className="mt-8 inline-flex items-center gap-3 font-semibold text-[#155FC7]"
        >
          Explore Marketing Workspace
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export function ShowworkEcosystem() {
  return (
    <section
      id="products"
      className={`${section} scroll-mt-24 bg-[#F4F5F7] text-[#111317]`}
      aria-labelledby="ecosystem-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Eyebrow>The Showwork ecosystem</Eyebrow>
        <h2 id="ecosystem-heading" className={`${heading} max-w-3xl`}>
          More ways to organise and deliver your work.
        </h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-3xl bg-[#155FC7] p-8 text-white sm:p-10">
            <BookOpen aria-hidden="true" />
            <p className="mt-6 text-xs uppercase tracking-widest text-blue-100">
              Your marketing operations
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
              Marketing Workspace
            </h3>
            <p className="mt-5 max-w-lg text-base leading-8 text-blue-50">
              Connect business knowledge, content operations, supported
              publishing, conversations, and performance insights.
            </p>
            <Link
              href="/content-workspace"
              className="mt-8 inline-flex items-center gap-3 font-semibold"
            >
              Explore Marketing Workspace{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
            <Layers3 aria-hidden="true" className="text-[#155FC7]" />
            <h3 className="mt-10 text-2xl font-semibold">Project Delivery</h3>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Present creative work, collect feedback, manage approvals, and
              organise delivery.
            </p>
            <Link
              href="/delivery"
              className="mt-8 inline-flex items-center gap-3 font-semibold text-[#155FC7]"
            >
              Explore Project Delivery{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a
              href="/images/motion.mp4"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block text-sm text-slate-600 underline underline-offset-4"
            >
              Watch the Project Delivery walkthrough (opens a new tab)
            </a>
          </article>
        </div>
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm text-slate-600">
          <span>Also in Showwork</span>
          <Link
            href="/portfolio"
            className="font-semibold text-slate-900 underline underline-offset-4"
          >
            Portfolio
          </Link>
          <Link
            href="/creativo"
            className="font-semibold text-slate-900 underline underline-offset-4"
          >
            Creativo community
          </Link>
        </div>
      </div>
    </section>
  );
}
