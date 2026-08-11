"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COLOR = {
  black: "#0A0A0A",
  blue: "#2478FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

function Field({
  label,
  optional = true,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
        {label} {optional && <span className="normal-case text-white/25">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const textareaClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25";

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

  const update = (field: keyof typeof brief) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
    setBrief((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/managed-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create project");
      router.push(`/dashboard/managed/${data.managedProject.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-16 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/start"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
        >
          ← Back
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
          New managed project
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">Start the brief.</h1>
        <p className="mb-10 text-sm" style={{ color: COLOR.midGray }}>
          Only the project name is required — fill in whatever else is actually relevant now,
          and add or edit the rest later. Collaborators will be able to read this once you add them.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Field label="Project name" optional={false}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Soundhous — Q3 Campaign"
              required
              className={textareaClass}
            />
          </Field>

          <div className="mt-2 border-t border-white/10 pt-6">
            <p className="mb-5 text-sm font-semibold text-white">Creative brief</p>

            <div className="flex flex-col gap-5">
              <Field label="Objective">
                <textarea rows={2} value={brief.briefObjective} onChange={update("briefObjective")} className={textareaClass} placeholder="What is this project meant to achieve?" />
              </Field>
              <Field label="Background / context">
                <textarea rows={2} value={brief.briefBackground} onChange={update("briefBackground")} className={textareaClass} placeholder="Anything relevant leading up to this" />
              </Field>
              <Field label="Target audience">
                <textarea rows={2} value={brief.briefTargetAudience} onChange={update("briefTargetAudience")} className={textareaClass} />
              </Field>
              <Field label="Creative direction">
                <textarea rows={2} value={brief.briefCreativeDirection} onChange={update("briefCreativeDirection")} className={textareaClass} />
              </Field>
              <Field label="Deliverables">
                <textarea rows={2} value={brief.briefDeliverables} onChange={update("briefDeliverables")} className={textareaClass} placeholder="What's actually being produced" />
              </Field>
              <Field label="Brand guidelines">
                <textarea rows={2} value={brief.briefBrandGuidelines} onChange={update("briefBrandGuidelines")} className={textareaClass} />
              </Field>
              <Field label="References / inspiration">
                <textarea rows={2} value={brief.briefReferences} onChange={update("briefReferences")} className={textareaClass} placeholder="Links, examples, mood" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Required formats">
                  <input type="text" value={brief.briefRequiredFormats} onChange={update("briefRequiredFormats")} className={textareaClass} placeholder="e.g. MP4, 1080x1920" />
                </Field>
                <Field label="Platforms">
                  <input type="text" value={brief.briefPlatforms} onChange={update("briefPlatforms")} className={textareaClass} placeholder="e.g. Instagram, TikTok" />
                </Field>
              </div>
              <Field label="Important notes">
                <textarea rows={2} value={brief.briefImportantNotes} onChange={update("briefImportantNotes")} className={textareaClass} />
              </Field>
              <Field label="Deadline">
                <input type="date" value={brief.briefDeadline} onChange={update("briefDeadline")} className={textareaClass} style={{ colorScheme: "dark" }} />
              </Field>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="mt-2 flex w-fit items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
            style={{ background: COLOR.gradient }}
          >
            {loading ? "Creating..." : "Create project"}
          </button>
        </form>
      </div>
    </main>
  );
}