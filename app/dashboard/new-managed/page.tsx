"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

const COLOR = {
  black: "#07090D",
  blue: "#2478FF",
  blueBright: "#67A0FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  charcoal: "#10141B",
  midGray: "#858C98",
};

const inputClass =
  "w-full rounded-[18px] bg-white/[0.045] px-4 py-4 text-[14px] leading-6 text-white outline-none transition-all duration-200 placeholder:text-white/20 hover:bg-white/[0.065] focus:bg-white/[0.075] focus:ring-2 focus:ring-[#2478FF]/35";

function IconArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function IconArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function IconSpark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
      <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  );
}

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function IconBriefcase({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="3" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
      <path d="M10 12v2h4v-2" />
    </svg>
  );
}

function Field({
  label,
  optional = true,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <label className="text-[11px] font-semibold uppercase tracking-[0.11em] text-white/45">
          {label}
          {optional && (
            <span className="ml-1.5 normal-case font-normal tracking-normal text-white/20">
              optional
            </span>
          )}
        </label>
        {hint && (
          <span className="hidden text-[10px] text-white/20 sm:block">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function NewManagedProjectPage() {
  const router = useRouter();

  const [name, setName] = useState("");

  const [brief, setBrief] = useState({
    briefObjective: "",
    briefBackground: "",
    briefTargetAudience: "",
    briefCreativeDirection: "",
    briefDeliverables: "",
    briefBrandGuidelines: "",
    briefReferences: "",
    briefRequiredFormats: "",
    briefPlatforms: "",
    briefImportantNotes: "",
    briefDeadline: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update =
    (field: keyof typeof brief) =>
    (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setBrief((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/managed-projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          ...brief,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create project");
      }

      router.push(`/dashboard/managed/${data.managedProject.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setLoading(false);
    }
  };

  const completedFields = Object.values(brief).filter(
    (value) => value.trim().length > 0
  ).length;

  const totalFields = Object.values(brief).length;
  const progress = Math.round((completedFields / totalFields) * 100);
  const projectStarted = name.trim().length > 0;

  const steps = [
    {
      number: "01",
      title: "Name the project",
      text: "Give the work a clear identity.",
      done: projectStarted,
    },
    {
      number: "02",
      title: "Shape the brief",
      text: "Add the context your team needs.",
      done: completedFields > 0,
    },
    {
      number: "03",
      title: "Start the work",
      text: "Create the project and refine it as you go.",
      done: false,
    },
  ];

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#07090D] text-white selection:bg-[#2478FF]/30"
      style={{ background: COLOR.black }}
    >
      {/* Soft atmosphere only — no grids, rules, or decorative lines. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-[18%] -top-[16%] h-[680px] w-[680px] rounded-full blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,.18) 0%, rgba(36,120,255,.07) 38%, transparent 70%)",
          }}
        />
        <div
          className="absolute -right-[18%] top-[8%] h-[620px] w-[620px] rounded-full blur-[150px]"
          style={{
            background:
              "radial-gradient(circle, rgba(0,82,255,.12) 0%, transparent 68%)",
          }}
        />
        <div
          className="absolute bottom-[-20%] left-[35%] h-[520px] w-[520px] rounded-full blur-[150px]"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,.08) 0%, transparent 68%)",
          }}
        />
        <div className="absolute left-[53%] top-[14%] h-40 w-40 rounded-full bg-[#2478FF]/[0.045] blur-[70px]" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link
            href="/dashboard/start"
            className="group inline-flex items-center gap-3 rounded-full bg-white/[0.045] px-3.5 py-2 text-sm text-white/45 transition-all duration-200 hover:bg-white/[0.075] hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]">
              <IconArrowLeft className="h-3.5 w-3.5" />
            </span>
            <span>Back to projects</span>
          </Link>

          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF] shadow-[0_0_14px_rgba(36,120,255,.9)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
              New managed project
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1380px] px-5 pb-28 pt-10 sm:px-8 lg:px-12 lg:pt-16">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-20 xl:gap-28">
            <div className="min-w-0">
              {/* Hero */}
              <div className="max-w-4xl">
                <div className="mb-7 inline-flex items-center gap-2.5 rounded-full bg-[#2478FF]/[0.09] px-3 py-2">
                  <IconSpark className="h-3.5 w-3.5 text-[#67A0FF]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#67A0FF]">
                    Project setup
                  </span>
                </div>

                <h1 className="text-[clamp(3.25rem,7vw,6.9rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-white">
                  Give the work
                  <br />
                  <span
                    style={{
                      background:
                        "linear-gradient(105deg, #FFFFFF 15%, #9CC1FF 58%, #2478FF 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    a clear start.
                  </span>
                </h1>

                <p className="mt-7 max-w-2xl text-[15px] leading-7 text-white/38 sm:text-lg">
                  Start with the context that matters. Build the brief now,
                  invite your team later, and keep the project moving as the
                  work evolves.
                </p>
              </div>

              {/* Project identity */}
              <section className="mt-14 sm:mt-20">
                <div className="mb-5 flex items-end justify-between gap-5">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#4B8DFF]">
                      01
                    </p>
                    <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
                      Project identity
                    </h2>
                  </div>
                  <span className="hidden text-xs text-white/20 sm:block">
                    The one thing you need first
                  </span>
                </div>

                <div className="rounded-[30px] bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,.22)] sm:p-8">
                  <Field
                    label="Project name"
                    optional={false}
                    hint="Clear beats clever"
                  >
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Soundhous — Q3 Campaign"
                      required
                      className={inputClass}
                    />
                  </Field>

                  <div className="mt-5 flex items-center gap-2 text-xs text-white/22">
                    <IconBriefcase className="h-3.5 w-3.5" />
                    <span>
                      This name will appear across your managed projects and
                      workspace.
                    </span>
                  </div>
                </div>
              </section>

              {/* Creative brief */}
              <section className="mt-12 sm:mt-16">
                <div className="mb-5 flex items-end justify-between gap-5">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#4B8DFF]">
                      02
                    </p>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
                        Creative brief
                      </h2>
                      <span className="rounded-full bg-white/[0.055] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                        Flexible
                      </span>
                    </div>
                  </div>
                  <span className="hidden text-xs text-white/20 sm:block">
                    {completedFields}/{totalFields} details added
                  </span>
                </div>

                <div className="rounded-[30px] bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,.22)] sm:p-8">
                  <div className="space-y-8">
                    <Field label="Objective" hint="The outcome that matters">
                      <textarea
                        rows={3}
                        value={brief.briefObjective}
                        onChange={update("briefObjective")}
                        className={inputClass}
                        placeholder="What is this project meant to achieve?"
                      />
                    </Field>

                    <Field label="Background / context" hint="What led to this?">
                      <textarea
                        rows={3}
                        value={brief.briefBackground}
                        onChange={update("briefBackground")}
                        className={inputClass}
                        placeholder="Anything relevant leading up to this project..."
                      />
                    </Field>

                    <Field label="Target audience" hint="Who are we speaking to?">
                      <textarea
                        rows={3}
                        value={brief.briefTargetAudience}
                        onChange={update("briefTargetAudience")}
                        className={inputClass}
                        placeholder="Describe the people this work needs to reach..."
                      />
                    </Field>

                    <Field
                      label="Creative direction"
                      hint="The feeling / visual language"
                    >
                      <textarea
                        rows={3}
                        value={brief.briefCreativeDirection}
                        onChange={update("briefCreativeDirection")}
                        className={inputClass}
                        placeholder="What should the work feel, look, or sound like?"
                      />
                    </Field>

                    <Field label="Deliverables" hint="What are we making?">
                      <textarea
                        rows={3}
                        value={brief.briefDeliverables}
                        onChange={update("briefDeliverables")}
                        className={inputClass}
                        placeholder="What's actually being produced?"
                      />
                    </Field>

                    <Field label="Brand guidelines" hint="Rules worth knowing">
                      <textarea
                        rows={3}
                        value={brief.briefBrandGuidelines}
                        onChange={update("briefBrandGuidelines")}
                        className={inputClass}
                        placeholder="Colours, typography, tone, brand rules..."
                      />
                    </Field>

                    <Field label="References / inspiration" hint="Links, examples, mood">
                      <textarea
                        rows={3}
                        value={brief.briefReferences}
                        onChange={update("briefReferences")}
                        className={inputClass}
                        placeholder="Links, examples, references, moodboards..."
                      />
                    </Field>

                    <div className="grid gap-8 sm:grid-cols-2">
                      <Field label="Required formats">
                        <input
                          type="text"
                          value={brief.briefRequiredFormats}
                          onChange={update("briefRequiredFormats")}
                          className={inputClass}
                          placeholder="e.g. MP4, 1080×1920"
                        />
                      </Field>

                      <Field label="Platforms">
                        <input
                          type="text"
                          value={brief.briefPlatforms}
                          onChange={update("briefPlatforms")}
                          className={inputClass}
                          placeholder="e.g. Instagram, TikTok"
                        />
                      </Field>
                    </div>

                    <Field label="Important notes" hint="Anything we shouldn't miss">
                      <textarea
                        rows={3}
                        value={brief.briefImportantNotes}
                        onChange={update("briefImportantNotes")}
                        className={inputClass}
                        placeholder="Constraints, dependencies, sensitivities, or anything else..."
                      />
                    </Field>

                    <Field label="Deadline" hint="When does it need to land?">
                      <input
                        type="date"
                        value={brief.briefDeadline}
                        onChange={update("briefDeadline")}
                        className={inputClass}
                        style={{ colorScheme: "dark" }}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {error && (
                <div className="mt-7 rounded-[20px] bg-red-500/[0.08] px-5 py-4">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Submit */}
              <section className="mt-12 sm:mt-16">
                <div className="rounded-[30px] bg-[#0D1626] p-5 shadow-[0_30px_100px_rgba(0,0,0,.28)] sm:p-7">
                  <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#2478FF] shadow-[0_0_14px_rgba(36,120,255,.9)]" />
                        <p className="text-sm font-semibold text-white">
                          {projectStarted ? "Ready to create" : "Start with a name"}
                        </p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/28">
                        You can update the brief, add collaborators, and
                        continue shaping the project after creation.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !name.trim()}
                      className="group inline-flex h-14 shrink-0 items-center justify-center gap-3 rounded-2xl px-6 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(36,120,255,.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_65px_rgba(36,120,255,.32)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                      style={{ background: COLOR.gradient }}
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Creating project...
                        </>
                      ) : (
                        <>
                          Create project
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform group-hover:translate-x-0.5">
                            <IconArrowUpRight className="h-4 w-4" />
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Desktop side rail */}
            <aside className="hidden lg:block">
              <div className="sticky top-8 space-y-5">
                <div className="rounded-[30px] bg-white/[0.035] p-6 shadow-[0_24px_90px_rgba(0,0,0,.22)]">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                        Brief progress
                      </p>
                      <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">
                        {progress}%
                      </p>
                    </div>
                    <div className="rounded-full bg-[#2478FF]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#67A0FF]">
                      Live
                    </div>
                  </div>

                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(progress, projectStarted ? 5 : 0)}%`,
                        background: COLOR.gradient,
                      }}
                    />
                  </div>

                  <p className="mt-4 text-xs leading-5 text-white/25">
                    {completedFields === 0
                      ? "Start with the essentials. Everything else can come later."
                      : `${completedFields} of ${totalFields} optional details added.`}
                  </p>
                </div>

                <div className="rounded-[30px] bg-white/[0.035] p-6 shadow-[0_24px_90px_rgba(0,0,0,.22)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                    Your flow
                  </p>

                  <div className="mt-6 space-y-6">
                    {steps.map((step) => (
                      <div key={step.number} className="flex gap-3.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                            step.done
                              ? "bg-[#2478FF]/15 text-[#67A0FF]"
                              : "bg-white/[0.045] text-white/25"
                          }`}
                        >
                          {step.done ? (
                            <IconCheck className="h-3.5 w-3.5" />
                          ) : (
                            step.number
                          )}
                        </div>

                        <div className="pt-0.5">
                          <p className="text-xs font-semibold text-white/70">
                            {step.title}
                          </p>
                          <p className="mt-1 text-[11px] leading-4 text-white/22">
                            {step.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] bg-[#0D1626] p-6 shadow-[0_24px_90px_rgba(0,0,0,.2)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2478FF]/10">
                    <IconSpark className="h-4 w-4 text-[#67A0FF]" />
                  </div>
                  <p className="mt-5 text-sm font-medium leading-6 text-white/65">
                    A good brief creates momentum, not paperwork.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/22">
                    Give the team enough clarity to make the next good
                    decision. The rest can evolve with the work.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Mobile progress */}
          <div className="mt-10 lg:hidden">
            <div className="rounded-[24px] bg-white/[0.035] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                    Brief progress
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    {completedFields} of {totalFields} details added
                  </p>
                </div>
                <span className="text-lg font-semibold text-[#67A0FF]">
                  {progress}%
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(progress, projectStarted ? 5 : 0)}%`,
                    background: COLOR.gradient,
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
