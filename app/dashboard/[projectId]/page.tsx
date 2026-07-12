import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import PublishButton from "@/components/PublishButton";
import ReplaceFileButton from "@/components/ReplaceFileButton";

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

  // Fallback confirmation path: webhooks are Paystack's servers calling ours,
  // which can't reach localhost during local development, and even in
  // production a webhook can be delayed. If we've just been redirected back
  // from checkout and the project isn't marked paid yet, verify the
  // transaction directly right here before rendering — this makes the
  // whole flow work locally with zero extra tooling, and acts as a second,
  // redundant confirmation path alongside the webhook in production.
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
      // If verification fails here, the webhook (once reachable) remains
      // the source of truth — don't block the page from rendering.
      console.error("Callback verification error:", err);
    }
  }

  const liveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${project.slug}`;

  // Same check as the API route uses — computed here purely to show the
  // right message and button label before the creator even clicks.
  const paidProjectsCount = await db.project.count({
    where: { creatorId: creator.id, paid: true },
  });
  const isFirstFree = paidProjectsCount === 0;

  const approvedCount = project.media.filter((m) => m.approvalStatus === "APPROVED").length;
  const needsRevisionCount = project.media.filter((m) => m.approvalStatus === "NEEDS_REVISION").length;
  const pendingCount = project.media.length - approvedCount - needsRevisionCount;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
      >
        ← Back to dashboard
      </Link>

      <p className="text-xs uppercase tracking-widest text-white/40">Project</p>
      <h1 className="mb-6 text-2xl font-light">{project.clientName}</h1>

      <div className="mb-8 rounded-xl border border-white/10 p-5">
        {project.paid ? (
          <>
            <p className="mb-2 text-sm text-green-400">✓ Live and paid</p>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm underline"
              style={{ color: "#C9A84C" }}
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

      {needsRevisionCount > 0 && (
        <div
          className="mb-6 rounded-xl p-4 text-sm"
          style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#fdba74" }}
        >
          {needsRevisionCount} file{needsRevisionCount === 1 ? "" : "s"} flagged for revision by your client — see notes below.
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wide text-white/40">
          Files ({project.media.length})
        </h2>
        <p className="text-xs text-white/40">
          {approvedCount} approved · {needsRevisionCount} revision{needsRevisionCount === 1 ? "" : "s"} · {pendingCount} pending
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {project.media.map((m) => (
          <li key={m.id} className="rounded-md bg-white/5 px-3 py-2 text-xs text-white/60">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">
                {m.type === "VIDEO" ? "🎬" : "🖼️"} {m.fileKey.split("/").pop()}
              </span>
              {m.approvalStatus !== "PENDING" && (
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={
                    m.approvalStatus === "APPROVED"
                      ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                      : { background: "rgba(249,115,22,0.15)", color: "#fdba74" }
                  }
                >
                  {m.approvalStatus === "APPROVED" ? "✓ Approved" : "✎ Needs revision"}
                </span>
              )}
            </div>
            {m.approvalStatus === "NEEDS_REVISION" && m.approvalNote && (
              <p className="mt-1.5 rounded bg-black/30 px-2 py-1.5 text-white/70">
                &ldquo;{m.approvalNote}&rdquo;
              </p>
            )}
            {m.approvalStatus === "NEEDS_REVISION" && (
              <ReplaceFileButton mediaId={m.id} type={m.type} label="↑ Upload revised version" />
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}