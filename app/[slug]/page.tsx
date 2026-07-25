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
    },
  });

  if (!project) notFound();

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

  // Check whether this browser already unlocked this project before —
  // if so, skip straight past both gates instead of asking again.
  //
  // NOTE: verifyViewerToken currently only returns { email }. To make
  // the viewer's *name* persist across visits the same way email
  // already does, the signed token itself needs to also embed name —
  // that's a change to lib/auth.ts and the route that creates this
  // cookie (verify-password), not made here. Until then, a returning
  // visitor within the same unlocked session will need to be identified
  // by email only for this initial load; the name they typed still
  // works correctly for any review they submit during the current visit.
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
      initiallyUnlocked={!!viewerSession}
      initialViewerEmail={viewerSession?.email ?? null}
    />
  );
}