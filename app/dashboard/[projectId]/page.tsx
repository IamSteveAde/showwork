import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import { publicUrlFor } from "@/lib/r2";
import { appUrl } from "@/lib/url";
import PublishButton from "@/components/PublishButton";
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
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const { projectId } = await params;
  const { payment } = await searchParams;

  let project = await db.project.findUnique({
    where: { id: projectId },
    include: { media: { orderBy: { displayOrder: "asc" } } },
  });

  if (!project || project.creatorId !== creator.id) notFound();

  // Fallback confirmation path: webhooks are Paystack's servers calling
  // ours, which can't reach localhost during local development, and even
  // in production a webhook can be delayed.
  if (payment === "callback" && !project.paid && project.paystackRef) {
    try {
      const verification = await verifyTransaction(project.paystackRef);
      const isSuccessful =
        verification?.data?.status === "success" &&
        verification?.data?.reference === project.paystackRef;

      if (isSuccessful) {
        project = await db.project.update({
          where: { id: project.id },
          data: { paid: true, paidAt: new Date(), badgeVisible: false },
          include: { media: { orderBy: { displayOrder: "asc" } } },
        });
      }
    } catch (err) {
      console.error("Callback verification error:", err);
    }
  }

  const liveUrl = `${appUrl()}/${project.slug}`;

  const paidProjectsCount = await db.project.count({
    where: { creatorId: creator.id, paid: true },
  });
  const isFirstFree = paidProjectsCount === 0;

  const totalFiles = project.media.length;
  const approvedCount = project.media.filter((m) => m.approvalStatus === "APPROVED").length;
  const needsRevisionCount = project.media.filter((m) => m.approvalStatus === "NEEDS_REVISION").length;
  const pendingCount = totalFiles - approvedCount - needsRevisionCount;
  const allApproved = totalFiles > 0 && approvedCount === totalFiles;

  const uploadSessionsRemaining = MAX_ADDITIONAL_UPLOAD_BATCHES - project.additionalUploadCount;

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
              project.paid
                ? { background: "rgba(245,200,66,0.15)", color: COLOR.gold }
                : { background: "rgba(248,247,244,0.06)", color: "rgba(248,247,244,0.4)" }
            }
          >
            {project.paid ? "Live" : "Draft"}
          </span>
        </div>

        {/* live URL / publish card */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          {project.paid ? (
            <>
              <p className="mb-2 text-sm text-green-400">✓ Live and paid</p>
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
                {isFirstFree
                  ? "This one's on us — your first project publishes free. After this, it's ₦5,000 per project."
                  : "This project is a draft. Publish it to remove the Spotlite badge and go live for your client."}
              </p>
              <PublishButton projectId={project.id} creatorEmail={creator.email} isFirstFree={isFirstFree} />
            </>
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
                You can add more files to this project up to <strong className="text-white/70">3 times total</strong> — no extra charge.
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
      </div>
    </main>
  );
}