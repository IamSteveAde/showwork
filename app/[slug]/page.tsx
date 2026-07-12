import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import DeliveryPage from "./DeliveryPage";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await db.project.findUnique({
    where: { slug },
    include: { media: { orderBy: { displayOrder: "asc" } } },
  });

  if (!project) notFound();

  // Real view: someone actually opened this delivery link. Independent
  // of email capture — counts regardless of whether that's turned on.
  await db.project.update({
    where: { id: project.id },
    data: { viewCount: { increment: 1 } },
  });

  const media = project.media.map((m) => ({
    id: m.id,
    type: m.type,
    url: publicUrlFor(m.fileKey),
    caption: m.caption ?? "",
    approvalStatus: m.approvalStatus,
    approvalNote: m.approvalNote,
  }));

  // Resolve the creator's chosen hero against the actual media list — if
  // it was deleted since being picked, this just falls back to null and
  // ProjectContent auto-picks the first video/photo instead.
  const heroMedia = project.heroMediaId
    ? media.find((m) => m.id === project.heroMediaId) ?? null
    : null;

  return (
    <DeliveryPage
      projectId={project.id}
      clientName={project.clientName}
      badgeVisible={project.badgeVisible}
      primaryColor={project.primaryColor ?? "#C9A84C"}
      bgColor={project.bgColor ?? "#080808"}
      logoUrl={project.logoUrl}
      media={media}
      heroMedia={heroMedia}
      heroTagline={project.heroTagline}
    />
  );
}