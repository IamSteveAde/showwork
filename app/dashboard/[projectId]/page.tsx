import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { appUrl } from "@/lib/url";
import FileGridItem from "@/components/FileGridItem";
import AddMoreFilesButton from "@/components/AddMoreFilesButton";

const MAX_ADDITIONAL_UPLOAD_BATCHES = 3;

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { media: { orderBy: { displayOrder: "asc" } } },
  });

  if (!project || project.creatorId !== creator.id) notFound();

  const viewerEmails = await db.viewerEmail.findMany({
    where: { projectId: project.id },
    orderBy: { viewedAt: "desc" },
  });

  // Live if either: it was paid outright under the old one-time model
  // (grandfathered forever), or the creator's subscription is currently
  // active (covers every project they have, automatically).
  const isLive = project.paid || creator.subscriptionActive || creator.isComped;

  const liveUrl = `${appUrl()}/${project.slug}`;

  const totalFiles = project.media.length;
  const approvedCount = project.media.filter((m) => m.approvalStatus === "APPROVED").length;
  const needsRevisionCount = project.media.filter((m) => m.approvalStatus === "NEEDS_REVISION").length;
  const pendingCount = totalFiles - approvedCount - needsRevisionCount;
  const allApproved = totalFiles > 0 && approvedCount === totalFiles;

  // Unlimited add-more for active subscribers — the cap only exists to
  // stop the old one-time-payment model being stretched into free
  // ongoing use, which doesn't apply once someone's actually subscribed.
  const uploadSessionsRemaining = creator.subscriptionActive
    ? Infinity
    : MAX_ADDITIONAL_UPLOAD_BATCHES - project.additionalUploadCount;

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* nav */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            ← Back to dashboard
          </Link>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-white">Show</span>
            <span className="text-sm font-bold" style={{ color: COLOR.gold }}>work</span>
          </div>
        </div>

        {/* header */}
        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Project
        </p>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{project.clientName}</h1>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={
              isLive
                ? { background: "rgba(245,200,66,0.15)", color: COLOR.gold }
                : { background: "rgba(248,247,244,0.06)", color: "rgba(248,247,244,0.4)" }
            }
          >
            {isLive ? "Live" : "Draft"}
          </span>
        </div>

        {/* live URL / subscribe prompt card */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          {isLive ? (
            <>
              <p className="mb-2 text-sm text-green-400">✓ Live</p>
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-medium underline"
                style={{ color: COLOR.gold }}
              >
                {liveUrl}
              </a>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-white/50">
                This project isn&apos;t live yet. Subscribe for unlimited projects — every
                delivery you create goes live automatically, with no per-project fee.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex rounded-lg px-5 py-3 text-sm font-medium"
                style={{ background: COLOR.gold, color: COLOR.black }}
              >
                Subscribe — ₦15,000/month
              </Link>
            </>
          )}
        </div>

        {/* PASSCODE */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <p className="mb-2 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Client access code
          </p>
          {project.accessCode ? (
            <p className="flex items-center gap-3">
              <span
                className="rounded px-3 py-1.5 font-mono text-lg font-semibold text-white"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                {project.accessCode}
              </span>
              <span className="text-xs text-white/30">Share this with your client to unlock the delivery.</span>
            </p>
          ) : (
            <p className="text-xs text-white/30">
              This project was created before we started saving the plain code — you'll need to remember what you set, or share a new one by editing the project.
            </p>
          )}
        </div>

        {/* ADD MORE FILES — prominent, top of page */}
        <div
          className="mb-8 rounded-2xl p-6"
          style={{ background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.25)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Need to add more to this delivery?</p>
              <p className="mt-1 text-xs text-white/50">
                {creator.subscriptionActive
                  ? "Unlimited — add as many files as you need, whenever you need to."
                  : (
                    <>You can add more files to this project up to <strong className="text-white/70">3 times total</strong> — no extra charge.</>
                  )}
              </p>
            </div>
            <AddMoreFilesButton projectId={project.id} remaining={uploadSessionsRemaining} />
          </div>
        </div>

        {/* status banners */}
        {needsRevisionCount > 0 && (
          <div
            className="mb-6 rounded-2xl p-4 text-sm font-medium"
            style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#fdba74" }}
          >
            ✎ {needsRevisionCount} file{needsRevisionCount === 1 ? "" : "s"} flagged for revision by your client — see notes below.
          </div>
        )}
        {allApproved && needsRevisionCount === 0 && (
          <div
            className="mb-6 rounded-2xl p-4 text-sm font-medium"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }}
          >
            ✓ Every file in this project has been approved by your client.
          </div>
        )}

        {/* files grid */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.05em" }}>
            Files ({totalFiles})
          </h2>
          <p className="text-xs text-white/40">
            {approvedCount} approved · {needsRevisionCount} revision{needsRevisionCount === 1 ? "" : "s"} · {pendingCount} pending
          </p>
        </div>

        {totalFiles === 0 ? (
          <div className="rounded-2xl p-10 text-center text-sm text-white/40" style={{ background: COLOR.charcoal }}>
            No files yet — use &ldquo;Add more files&rdquo; above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {project.media.map((m) => (
              <FileGridItem
                key={m.id}
                mediaId={m.id}
                url={publicUrlFor(m.fileKey)}
                filename={m.fileKey.split("/").pop() ?? "file"}
                caption={m.caption}
                type={m.type}
                approvalStatus={m.approvalStatus}
                approvalNote={m.approvalNote}
              />
            ))}
          </div>
        )}

        {/* CLIENT EMAILS — everyone who signed in to view this delivery */}
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.05em" }}>
            Viewer emails ({viewerEmails.length})
          </h2>
          {viewerEmails.length === 0 ? (
            <div className="rounded-2xl p-6 text-sm text-white/40" style={{ background: COLOR.charcoal }}>
              No one has viewed this delivery yet.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {viewerEmails.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md px-4 py-2.5 text-sm"
                  style={{ background: COLOR.charcoal }}
                >
                  <span className="text-white/80">{v.email}</span>
                  <span className="text-xs text-white/30">
                    {new Date(v.viewedAt).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}