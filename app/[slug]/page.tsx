import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { verifyViewerToken } from "@/lib/auth";
import DeliveryPage from "./DeliveryPage";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await db.project.findUnique({
    where: { slug },
    include: {
      media: {
        orderBy: { displayOrder: "asc" },
        include: { reviews: { orderBy: { createdAt: "asc" } } },
      },
      creator: { select: { subscriptionActive: true, isComped: true } },
      sections: {
        orderBy: { displayOrder: "asc" },
        include: {
          media: {
            orderBy: { displayOrder: "asc" },
            include: { reviews: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
      // The project-management side, if this delivery was created
      // through that flow — null for every regular, directly-created
      // delivery, which is the majority case and behaves exactly as
      // it always has.
      managedProject: {
        include: {
          tasks: {
            orderBy: { createdAt: "asc" },
            select: { id: true, title: true, status: true },
          },
        },
      },
    },
  });

  if (!project || project.deletedAt) notFound();

  // Real view: someone actually opened this delivery link. Independent
  // of email capture — counts regardless of whether that's turned on.
  await db.project.update({
    where: { id: project.id },
    data: { viewCount: { increment: 1 } },
  });

  const mapMedia = (m: (typeof project.media)[number]) => ({
    id: m.id,
    type: m.type,
    url: publicUrlFor(m.fileKey),
    caption: m.caption ?? "",
    approvalStatus: m.approvalStatus,
    approvalNote: m.approvalNote,
    reviews: m.reviews.map((r) => ({
      reviewerName: r.reviewerName,
      reviewerEmail: r.reviewerEmail,
      status: r.status as "APPROVED" | "NEEDS_REVISION",
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })),
  });

  const media = project.media.map(mapMedia);

  // The client-facing view of each creator-named section — replaces the
  // old hardcoded "Films" / "Photography" split entirely. Only sections
  // that actually have files in them are shown.
  const sections = project.sections
    .filter((s) => s.media.length > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      mediaType: s.mediaType,
      media: s.media.map(mapMedia),
    }));

  // Anything not assigned to a section (older uploads from before
  // sections existed) — shown as its own fallback group by the
  // rendering component, same as on the creator's dashboard.
  const ungroupedMedia = project.media
    .filter((m) => !m.sectionId)
    .map(mapMedia);

  // Resolve the creator's chosen hero against the actual media list — if
  // it was deleted since being picked, this just falls back to null and
  // ProjectContent auto-picks the first video/photo instead.
  const heroMedia = project.heroMediaId
    ? media.find((m) => m.id === project.heroMediaId) ?? null
    : null;

  // Only the fields a client should ever see about the managed
  // project: task titles and statuses, never assignee identities,
  // internal review notes, or who uploaded what — none of that is
  // this audience's business. The brief itself is included only when
  // the owner explicitly turned briefVisibleToClient on.
  const managedProjectForClient = project.managedProject
    ? {
        name: project.managedProject.name,
        publishedAt: project.managedProject.publishedAt?.toISOString() ?? null,
        tasks: project.managedProject.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
        brief: project.managedProject.briefVisibleToClient
          ? {
              objective: project.managedProject.briefObjective,
              background: project.managedProject.briefBackground,
              targetAudience: project.managedProject.briefTargetAudience,
              creativeDirection: project.managedProject.briefCreativeDirection,
              deliverables: project.managedProject.briefDeliverables,
              brandGuidelines: project.managedProject.briefBrandGuidelines,
              references: project.managedProject.briefReferences,
              requiredFormats: project.managedProject.briefRequiredFormats,
              platforms: project.managedProject.briefPlatforms,
              importantNotes: project.managedProject.briefImportantNotes,
              deadline: project.managedProject.briefDeadline?.toISOString() ?? null,
            }
          : null,
      }
    : null;

  // Check whether this browser already unlocked this project before —
  // if so, skip straight past both gates instead of asking again,
  // including the name they gave, now that it's embedded in this same
  // signed token alongside the email (see lib/auth.ts and the
  // verify-password route, which is what actually creates this cookie).
  const cookieStore = await cookies();
  const unlockToken = cookieStore.get(`viewer_${project.id}`)?.value;
  const viewerSession = unlockToken ? verifyViewerToken(unlockToken, project.id) : null;

  return (
    <DeliveryPage
      projectId={project.id}
      clientName={project.clientName}
      badgeVisible={project.badgeVisible && !project.creator.subscriptionActive && !project.creator.isComped}
      primaryColor={project.primaryColor ?? "#C9A84C"}
      bgColor={project.bgColor ?? "#080808"}
      logoUrl={project.logoUrl}
      media={media}
      sections={sections}
      ungroupedMedia={ungroupedMedia}
      heroMedia={heroMedia}
      heroTagline={project.heroTagline}
      deliveryStatus={project.deliveryStatus}
      initiallyUnlocked={!!viewerSession}
      initialViewerEmail={viewerSession?.email ?? null}
      initialViewerName={viewerSession?.name ?? null}
      managedProject={managedProjectForClient}
    />
  );
}