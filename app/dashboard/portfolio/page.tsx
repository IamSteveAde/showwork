import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { appUrl } from "@/lib/url";
import CreatePortfolioForm from "@/components/portfolio/CreatePortfolioForm";
import PortfolioSectionHeader from "@/components/portfolio/PortfolioSectionHeader";
import PortfolioAddSection from "@/components/portfolio/PortfolioAddSection";
import PortfolioFileGridItem from "@/components/portfolio/PortfolioFileGridItem";
import PortfolioDetailsForm from "@/components/portfolio/PortfolioDetailsForm";
import CopyLinkButton from "@/components/CopyLinkButton";

const COLOR = { black: "#0A0A0A", gold: "#F5C842", charcoal: "#1A1A1A" };

export default async function PortfolioDashboardPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const portfolio = await db.portfolio.findUnique({
    where: { creatorId: creator.id },
    include: {
      sections: {
        orderBy: { displayOrder: "asc" },
        include: { media: { orderBy: { displayOrder: "asc" } } },
      },
      media: true,
    },
  });

  if (!portfolio) {
    return (
      <main className="min-h-screen px-6 py-16" style={{ background: COLOR.black }}>
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>
        <CreatePortfolioForm />
      </main>
    );
  }

  const liveUrl = `${appUrl()}/p/${portfolio.slug}`;
  const ungroupedMedia = portfolio.media.filter((m) => !m.sectionId);

  const bannerCandidates = portfolio.sections
    .filter((s) => s.mediaType === "PHOTO" || s.mediaType === "VIDEO")
    .flatMap((s) => s.media)
    .concat(ungroupedMedia.filter((m) => m.type === "PHOTO" || m.type === "VIDEO"))
    .map((m) => ({ id: m.id, url: publicUrlFor(m.fileKey), type: m.type as "PHOTO" | "VIDEO" }));

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Your portfolio
        </p>
        <h1 className="mb-8 text-3xl font-bold text-white">{portfolio.companyName}</h1>

        {/* live URL */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <p className="mb-2 text-sm text-green-400">✓ Live — always on, free</p>
          <div className="flex items-center gap-2">
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium underline" style={{ color: COLOR.gold }}>
              {liveUrl}
            </a>
            <CopyLinkButton url={liveUrl} />
          </div>
        </div>

        {/* details + banner */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Details
          </h2>
          <PortfolioDetailsForm
            companyName={portfolio.companyName}
            heroTagline={portfolio.heroTagline}
            heroMediaId={portfolio.heroMediaId}
            bannerCandidates={bannerCandidates}
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
        </div>

        {/* sections */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Sections
          </h2>

          {portfolio.sections.length > 0 && (
            <div className="mb-6 flex flex-col gap-8">
              {portfolio.sections.map((section) => (
                <div key={section.id}>
                  <PortfolioSectionHeader
                    sectionId={section.id}
                    name={section.name}
                    mediaType={section.mediaType}
                    fileCount={section.media.length}
                  />
                  <div className={`grid gap-3 ${section.mediaType === "PDF" || section.mediaType === "DOCUMENT" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
                    {section.media.map((m) => (
                      <PortfolioFileGridItem
                        key={m.id}
                        mediaId={m.id}
                        url={publicUrlFor(m.fileKey)}
                        filename={m.fileKey.split("/").pop() ?? "file"}
                        type={m.type}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <PortfolioAddSection hasSections={portfolio.sections.length > 0} />
        </div>
      </div>
    </main>
  );
}