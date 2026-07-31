import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import PortfolioContent from "@/components/portfolio/PortfolioContent";
import type { PortfolioMediaItem } from "@/components/portfolio/PortfolioMediaModal";

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const portfolio = await db.portfolio.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { displayOrder: "asc" },
        include: { media: { orderBy: { displayOrder: "asc" } } },
      },
      media: true,
    },
  });

  if (!portfolio) notFound();

  // No email/password gate on a portfolio at all — the whole point is
  // that it's freely, instantly shareable. Just a view counter.
  await db.portfolio.update({
    where: { id: portfolio.id },
    data: { viewCount: { increment: 1 } },
  });

  const mapMedia = (m: { id: string; type: string; fileKey: string; caption: string | null }): PortfolioMediaItem => ({
    id: m.id,
    type: m.type as PortfolioMediaItem["type"],
    url: publicUrlFor(m.fileKey),
    caption: m.caption,
  });

  const sections = portfolio.sections
    .filter((s) => s.media.length > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      mediaType: s.mediaType,
      media: s.media.map(mapMedia),
    }));

  const ungroupedMedia = portfolio.media.filter((m) => !m.sectionId).map(mapMedia);

  const allMappedMedia = portfolio.media.map(mapMedia);
  const heroMedia = portfolio.heroMediaId
    ? allMappedMedia.find((m) => m.id === portfolio.heroMediaId) ?? allMappedMedia[0] ?? null
    : allMappedMedia.find((m) => m.type === "VIDEO") ?? allMappedMedia[0] ?? null;

  return (
    <PortfolioContent
      companyName={portfolio.companyName}
      logoUrl={portfolio.logoUrl}
      primaryColor={portfolio.primaryColor ?? "#F5C842"}
      bgColor={portfolio.bgColor ?? "#0A0A0A"}
      heroMedia={heroMedia}
      heroTagline={portfolio.heroTagline}
      sections={sections}
      ungroupedMedia={ungroupedMedia}
      contactEmail={portfolio.contactEmail}
      whatsappNumber={portfolio.whatsappNumber}
      ctaText={portfolio.ctaText}
      instagramUrl={portfolio.instagramUrl}
      twitterUrl={portfolio.twitterUrl}
      linkedinUrl={portfolio.linkedinUrl}
      tiktokUrl={portfolio.tiktokUrl}
      facebookUrl={portfolio.facebookUrl}
      youtubeUrl={portfolio.youtubeUrl}
    />
  );
}