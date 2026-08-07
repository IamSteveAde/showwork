import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { appUrl } from "@/lib/url";
import FileGridItem from "@/components/FileGridItem";
import CopyLinkButton from "@/components/CopyLinkButton";
import AddMoreFilesButton from "@/components/AddMoreFilesButton";
import SectionHeader from "@/components/SectionHeader";
import DeliveryStatusControl from "@/components/DeliveryStatusControl";
import EditableField from "@/components/EditableField";

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
    include: {
      media: {
        orderBy: { displayOrder: "asc" },
        include: { reviews: { orderBy: { createdAt: "asc" } } },
      },
      sections: {
        orderBy: { displayOrder: "asc" },
        include: {
          media: {
            orderBy: { displayOrder: "asc" },
            include: { reviews: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
    },
  });

  if (!project || project.creatorId !== creator.id || project.deletedAt) notFound();

  const viewerEmails = await db.viewerEmail.findMany({
    where: { projectId: project.id },
    orderBy: { viewedAt: "desc" },
  });

  // Live the moment it's created. Creation itself is already gated by
  // the creator's tier quota (enforced in POST /api/projects) — so
  // anything that successfully got created was already allowed under
  // their allowance, whether that's Free, a paid tier, or comped. There's
  // no separate "paid to publish" step left in this model.
  const isLive = true;

  const liveUrl = `${appUrl()}/${project.slug}`;

  const totalFiles = project.media.length;
  const approvedCount = project.media.filter((m) => m.approvalStatus === "APPROVED").length;
  const needsRevisionCount = project.media.filter((m) => m.approvalStatus === "NEEDS_REVISION").length;
  const pendingCount = totalFiles - approvedCount - needsRevisionCount;
  const allApproved = totalFiles > 0 && approvedCount === totalFiles;

  // Any file uploaded before sections existed (or otherwise unassigned)
  // — shown as its own fallback group rather than being hidden.
  const ungroupedMedia = project.media.filter((m) => !m.sectionId);

  // Unlimited add-more for active subscribers *and* comped (admin-
  // granted free) accounts — the cap only exists to stop the old
  // one-time-payment model being stretched into free ongoing use,
  // which doesn't apply to either of those cases.
  const uploadSessionsRemaining = creator.subscriptionActive || creator.isComped
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
          {/* Editable project name — click to rename. The project's
              slug (its public URL) intentionally never changes when
              this does, so a link already shared with a client keeps
              working regardless of what the project gets renamed to. */}
          <EditableField
            projectId={project.id}
            field="clientName"
            value={project.clientName}
            displayClassName="text-3xl font-bold text-white"
            inputClassName="rounded-md px-3 py-1 text-3xl font-bold text-white"
          />
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
          >
            Live
          </span>
          <a
            href={`/api/projects/${project.id}/report`}
            download
            className="ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v6.5M6 7.5L3 4.5M6 7.5L9 4.5M1.5 9.5H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download report
          </a>
        </div>

        {/* DELIVERY STATUS — the client sees this exact same status */}
        <div className="mb-6">
          <DeliveryStatusControl projectId={project.id} currentStatus={project.deliveryStatus} />
        </div>

        {/* live URL card */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <p className="mb-2 text-sm text-green-400">✓ Live</p>
          <div className="flex items-center gap-2">
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium underline"
              style={{ color: COLOR.gold }}
            >
              {liveUrl}
            </a>
            <CopyLinkButton url={liveUrl} />
          </div>
        </div>

        {/* PASSCODE */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <p className="mb-2 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Client access code
          </p>
          {project.accessCode ? (
            <div className="flex items-center gap-3">
              <EditableField
                projectId={project.id}
                field="accessCode"
                value={project.accessCode}
                displayClassName="rounded px-3 py-1.5 font-mono text-lg font-semibold text-white"
                displayStyle={{ background: "rgba(255,255,255,0.08)" }}
                inputClassName="rounded px-3 py-1.5 font-mono text-lg font-semibold text-white"
                monospace
              />
              <CopyLinkButton url={project.accessCode} />
              <span className="text-xs text-white/30">Share this with your client to unlock the delivery.</span>
            </div>
          ) : (
            <p className="text-xs text-white/30">
              This project was created before we started saving the plain code — set one now by clicking below.
              <EditableField
                projectId={project.id}
                field="accessCode"
                value=""
                displayClassName="ml-2 rounded px-3 py-1.5 text-xs font-semibold"
                displayStyle={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
                inputClassName="rounded px-3 py-1.5 font-mono text-lg font-semibold text-white"
                monospace
              />
            </p>
          )}
        </div>

        {/* ADD SECTION — prominent, top of page */}
        <div
          className="mb-8 rounded-2xl p-6"
          style={{ background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.25)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Add another section</p>
              <p className="mt-1 text-xs text-white/50">
                {creator.subscriptionActive
                  ? "Unlimited — add as many sections as you need, whenever you need to."
                  : (
                    <>You can add sections to this project up to <strong className="text-white/70">3 times total</strong> — no extra charge.</>
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

        {/* files, grouped by section */}
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
            No files yet — use &ldquo;Add another section&rdquo; above to get started.
          </div>
        ) : (
          <>
            {project.sections.map((section) => (
              <div key={section.id} className="mb-10">
                <SectionHeader
                  projectId={project.id}
                  sectionId={section.id}
                  name={section.name}
                  mediaType={section.mediaType}
                  fileCount={section.media.length}
                  uploadSessionsRemaining={uploadSessionsRemaining}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {section.media.map((m) => (
                    <FileGridItem
                      key={m.id}
                      mediaId={m.id}
                      url={publicUrlFor(m.fileKey)}
                      filename={m.fileKey.split("/").pop() ?? "file"}
                      caption={m.caption}
                      type={m.type}
                      approvalStatus={m.approvalStatus}
                      approvalNote={m.approvalNote}
                      reviews={m.reviews.map((r) => ({
                        reviewerName: r.reviewerName,
                        reviewerEmail: r.reviewerEmail,
                        status: r.status as "APPROVED" | "NEEDS_REVISION",
                        note: r.note,
                        createdAt: r.createdAt.toISOString(),
                      }))}
                    />
                  ))}
                </div>
              </div>
            ))}

            {ungroupedMedia.length > 0 && (
              <div className="mb-10">
                <h2 className="mb-4 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.05em" }}>
                  Other files ({ungroupedMedia.length})
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {ungroupedMedia.map((m) => (
                    <FileGridItem
                      key={m.id}
                      mediaId={m.id}
                      url={publicUrlFor(m.fileKey)}
                      filename={m.fileKey.split("/").pop() ?? "file"}
                      caption={m.caption}
                      type={m.type}
                      approvalStatus={m.approvalStatus}
                      approvalNote={m.approvalNote}
                      reviews={m.reviews.map((r) => ({
                        reviewerName: r.reviewerName,
                        reviewerEmail: r.reviewerEmail,
                        status: r.status as "APPROVED" | "NEEDS_REVISION",
                        note: r.note,
                        createdAt: r.createdAt.toISOString(),
                      }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
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
                  <span className="text-white/80">
                    {v.name && <span className="font-medium text-white">{v.name}</span>}
                    {v.name && " — "}
                    {v.email}
                  </span>
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