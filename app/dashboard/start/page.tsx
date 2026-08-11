import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";

const COLOR = {
  black: "#0A0A0A",
  blue: "#2478FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

function IconSend({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M20.5 3.5L10 13.5M20.5 3.5L14 20.5l-4-7-7-4 17.5-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function IconClipboard({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="5" y="4" width="14" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.5 11h7M8.5 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// The entry point for starting anything new — a deliberate choice
// between the two genuinely different things Showwork can do: a
// one-shot client delivery (upload, review, done), or a real managed
// project with a brief, task assignment, and an internal review gate
// before anything reaches the client. The existing delivery flow at
// /dashboard/new is completely untouched by this — this page just
// sits in front of it as a new first step.
export default async function StartProjectPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  return (
    <main className="min-h-screen px-6 py-16 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
          New
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">What are you starting?</h1>
        <p className="mb-10 text-sm" style={{ color: COLOR.midGray }}>
          Pick whichever matches how this project actually works — you can't switch one into the other later.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/new"
            className="group flex flex-col gap-4 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: COLOR.charcoal, boxShadow: "0 0 0 1px rgba(248,247,244,0.06)" }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(36,120,255,0.12)" }}
            >
              <IconSend className="h-5 w-5" style={{ color: COLOR.blue }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Deliver a project</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.midGray }}>
                Upload finished files, let your client approve or flag revisions, and hand off the delivery.
                The classic Showwork flow — start here if the work is already done.
              </p>
            </div>
            <span
              className="mt-auto flex items-center gap-2 pt-2 text-sm font-semibold transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: COLOR.blue }}
            >
              Start a delivery
              <span aria-hidden>→</span>
            </span>
          </Link>

          <Link
            href="/dashboard/new-managed"
            className="group flex flex-col gap-4 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: COLOR.charcoal, boxShadow: "0 0 0 1px rgba(248,247,244,0.06)" }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(36,120,255,0.12)" }}
            >
              <IconClipboard className="h-5 w-5" style={{ color: COLOR.blue }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create and manage a project</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.midGray }}>
                Write a brief, assign tasks to your team, and review their work before anything reaches
                the client. Start here if the work hasn&apos;t happened yet.
              </p>
            </div>
            <span
              className="mt-auto flex items-center gap-2 pt-2 text-sm font-semibold transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: COLOR.blue }}
            >
              Start a managed project
              <span aria-hidden>→</span>
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}