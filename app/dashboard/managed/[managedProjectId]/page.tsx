import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/url";
import ManagedProjectBrief from "@/components/ManagedProjectBrief";
import ManagedProjectCollaborators from "@/components/ManagedProjectCollaborators";
import ManagedProjectTasks from "@/components/ManagedProjectTasks";
import ManagedProjectPublish from "@/components/ManagedProjectPublish";
import CopyLinkButton from "@/components/CopyLinkButton";

const COLOR = { black: "#0A0A0A", blue: "#2478FF", midGray: "#888786" };

export default async function ManagedProjectDetailPage({
  params,
}: {
  params: Promise<{ managedProjectId: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const { managedProjectId } = await params;

  const managedProject = await db.managedProject.findUnique({
    where: { id: managedProjectId },
    include: {
      collaborators: { include: { creator: { select: { id: true, name: true, email: true } } } },
      deliveryProject: { select: { slug: true, accessCode: true } },
    },
  });
  if (!managedProject) notFound();

  const isOwner = managedProject.creatorId === creator.id;
  const isCollaborator = !isOwner && managedProject.collaborators.some((c) => c.creatorId === creator.id);
  if (!isOwner && !isCollaborator) notFound();

  const assigneeOptions = [
    { id: managedProject.creatorId, name: creator.name, email: creator.email },
    ...managedProject.collaborators
      .filter((c) => c.creatorId !== managedProject.creatorId)
      .map((c) => ({ id: c.creator.id, name: c.creator.name, email: c.creator.email })),
  ];

  const portalUrl = managedProject.deliveryProject ? `${appUrl()}/${managedProject.deliveryProject.slug}` : null;

  return (
    <main className="min-h-screen px-6 py-12" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
          Managed project
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">{managedProject.name}</h1>
        <p className="mb-6 text-sm" style={{ color: COLOR.midGray }}>
          Status: {managedProject.status.replace("_", " ").toLowerCase()}
          {managedProject.publishedAt && " · Published"}
        </p>

        {/* CLIENT PORTAL — exists automatically the moment this
            project was created. Shows task/progress status until
            publish, then switches to finished files. */}
        {portalUrl && (
          <div className="mb-6 rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
            <p className="mb-2 text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Client portal
            </p>
            <div className="flex items-center gap-2">
              <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium underline" style={{ color: COLOR.blue }}>
                {portalUrl}
              </a>
              <CopyLinkButton url={portalUrl} />
            </div>
            {isOwner && managedProject.deliveryProject?.accessCode && (
              <p className="mt-2 flex items-center gap-2 text-xs text-white/40">
                Access code:
                <span className="rounded px-2 py-0.5 font-mono font-semibold text-white/70" style={{ background: "rgba(255,255,255,0.08)" }}>
                  {managedProject.deliveryProject.accessCode}
                </span>
                <CopyLinkButton url={managedProject.deliveryProject.accessCode} />
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <ManagedProjectBrief
            managedProjectId={managedProject.id}
            isOwner={isOwner}
            brief={{
              name: managedProject.name,
              briefObjective: managedProject.briefObjective,
              briefBackground: managedProject.briefBackground,
              briefTargetAudience: managedProject.briefTargetAudience,
              briefCreativeDirection: managedProject.briefCreativeDirection,
              briefDeliverables: managedProject.briefDeliverables,
              briefBrandGuidelines: managedProject.briefBrandGuidelines,
              briefReferences: managedProject.briefReferences,
              briefRequiredFormats: managedProject.briefRequiredFormats,
              briefPlatforms: managedProject.briefPlatforms,
              briefImportantNotes: managedProject.briefImportantNotes,
              briefDeadline: managedProject.briefDeadline?.toISOString() ?? null,
              briefVisibleToClient: managedProject.briefVisibleToClient,
            }}
          />

          <ManagedProjectCollaborators managedProjectId={managedProject.id} isOwner={isOwner} />

          <ManagedProjectTasks
            managedProjectId={managedProject.id}
            isOwner={isOwner}
            currentCreatorId={creator.id}
            assigneeOptions={assigneeOptions}
          />

          {isOwner && (
            <ManagedProjectPublish
              managedProjectId={managedProject.id}
              publishedAt={managedProject.publishedAt?.toISOString() ?? null}
            />
          )}
        </div>
      </div>
    </main>
  );
}