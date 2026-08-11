"use client";

import { motion } from "framer-motion";

interface ClientBrief {
  objective: string | null;
  background: string | null;
  targetAudience: string | null;
  creativeDirection: string | null;
  deliverables: string | null;
  brandGuidelines: string | null;
  references: string | null;
  requiredFormats: string | null;
  platforms: string | null;
  importantNotes: string | null;
  deadline: string | null;
}
interface ClientTask {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

const STATUS_LABELS: Record<string, string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };
const BRIEF_LABELS: { key: keyof ClientBrief; label: string }[] = [
  { key: "objective", label: "Objective" },
  { key: "background", label: "Background" },
  { key: "targetAudience", label: "Target audience" },
  { key: "creativeDirection", label: "Creative direction" },
  { key: "deliverables", label: "Deliverables" },
  { key: "brandGuidelines", label: "Brand guidelines" },
  { key: "references", label: "References" },
  { key: "requiredFormats", label: "Required formats" },
  { key: "platforms", label: "Platforms" },
  { key: "importantNotes", label: "Important notes" },
];

// What a client sees before the work is published — the brief (only
// if the creator turned that on) and live task progress. Deliberately
// shows only task titles and statuses: no assignee names, no internal
// review notes, no uploaded-file details. Once the creator publishes,
// this whole view is replaced by ProjectContent showing the actual
// finished files — this component never renders again after that.
export default function ManagedProjectClientView({
  clientName,
  projectName,
  primaryColor,
  bgColor,
  logoUrl,
  brief,
  tasks,
}: {
  clientName: string;
  projectName: string;
  primaryColor: string;
  bgColor: string;
  logoUrl: string | null;
  brief: ClientBrief | null;
  tasks: ClientTask[];
}) {
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const progressPercent = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-6 py-16 md:px-20"
      style={{ background: bgColor }}
    >
      <div className="mx-auto max-w-2xl">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mb-8 h-8 w-auto" />
        ) : (
          <p className="mb-8 text-lg font-bold text-white">{clientName}</p>
        )}

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: primaryColor, letterSpacing: "0.15em" }}>
          In progress
        </p>
        <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl">{projectName}</h1>
        <p className="mb-10 text-sm text-white/50">
          Your work is being prepared — here&apos;s where things stand right now.
        </p>

        {tasks.length > 0 && (
          <div className="mb-10 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Overall progress</p>
              <p className="text-sm font-semibold" style={{ color: primaryColor }}>{progressPercent}%</p>
            </div>
            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, background: primaryColor }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-sm text-white/80">{task.title}</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: task.status === "DONE" ? "rgba(34,197,94,0.15)" : task.status === "IN_PROGRESS" ? `${primaryColor}22` : "rgba(255,255,255,0.06)",
                      color: task.status === "DONE" ? "#4ade80" : task.status === "IN_PROGRESS" ? primaryColor : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {brief && (
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="mb-4 text-sm font-semibold text-white">About this project</p>
            <div className="flex flex-col gap-4">
              {BRIEF_LABELS.filter(({ key }) => brief[key]).map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                    {label}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{brief[key] as string}</p>
                </div>
              ))}
              {brief.deadline && (
                <div>
                  <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                    Expected by
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {new Date(brief.deadline).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}