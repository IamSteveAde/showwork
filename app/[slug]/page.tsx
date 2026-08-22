import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { verifyViewerToken } from "@/lib/auth";
import DeliveryPage from "./DeliveryPage";

// A lightweight, separate query from the main page component below —
// only the couple of fields actually needed for the shared-link
// preview, not the full project with all its media/section includes.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: {
      clientName: true,
      heroMediaId: true,
      creator: { select: { companyName: true, name: true } },
      media: {
        select: { id: true, fileKey: true, type: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!project) {
    return { title: "Project not found — Showwork" };
  }

  const creatorName = project.creator.companyName || project.creator.name || "Showwork";
  const title = `${project.clientName} — Delivered by ${creatorName}`;
  const description = `${creatorName} has delivered your project. View, approve, and download your final files. Sponsored by Showwork.`;

   // Any real photo from this delivery, picked at random — not
  // specifically the banner, and not a generic Showwork graphic.
  // Only falls back to the generic image if the project genuinely
  // has no photos at all (video-only or document-only deliveries),
  // since a video file itself can't be used as a share-preview image.
  const projectPhotos = project.media.filter((m) => m.type === "PHOTO");
  const randomPhoto = projectPhotos.length > 0
    ? projectPhotos[Math.floor(Math.random() * projectPhotos.length)]
    : null;
  const image = randomPhoto
    ? publicUrlFor(randomPhoto.fileKey)
    : `${process.env.NEXT_PUBLIC_APP_URL}/images/shwk.jpg`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

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
          // Files sitting directly in the section, with no
          // sub-section — the fallback group shown after every named
          // sub-section within it.
          media: {
            where: { folderId: null },
            orderBy: { displayOrder: "asc" },
            include: { reviews: { orderBy: { createdAt: "asc" } } },
          },
          // Every sub-section within this section, each with its own
          // files — this is what lets a client browse "Sonos
          // Campaign" and "Sonance Campaign" as genuinely separate
          // groups within the same section, instead of one flat list.
          folders: {
            orderBy: { displayOrder: "asc" },
            include: {
              media: {
                orderBy: { displayOrder: "asc" },
                include: { reviews: { orderBy: { createdAt: "asc" } } },
              },
            },
          },
        },
      },
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

  const mapMedia = (m: {
    id: string;
    type: "PHOTO" | "VIDEO" | "DOCUMENT" | "PDF";
    fileKey: string;
    caption: string | null;
    approvalStatus: "PENDING" | "APPROVED" | "NEEDS_REVISION";
    approvalNote: string | null;
    reviews: { reviewerName: string | null; reviewerEmail: string; status: "PENDING" | "APPROVED" | "NEEDS_REVISION"; note: string | null; createdAt: Date }[];
  }) => ({
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
  // that actually have files in them are shown — either directly in
  // the section, or inside one of its sub-sections.
  const sections = project.sections
    .filter((s) => s.media.length > 0 || s.folders.some((f) => f.media.length > 0))
    .map((s) => ({
      id: s.id,
      name: s.name,
      mediaType: s.mediaType,
      media: s.media.map(mapMedia),
      // Only sub-sections that actually have files — an empty
      // sub-section a creator hasn't finished uploading to yet stays
      // invisible to the client rather than showing as an empty
      // heading with nothing under it.
      folders: s.folders
        .filter((f) => f.media.length > 0)
        .map((f) => ({ id: f.id, name: f.name, media: f.media.map(mapMedia) })),
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