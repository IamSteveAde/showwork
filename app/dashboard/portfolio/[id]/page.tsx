import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { portfolioUrl } from "@/lib/portfolioUrl";
import PortfolioSectionHeader from "@/components/portfolio/PortfolioSectionHeader";
import PortfolioAddSection from "@/components/portfolio/PortfolioAddSection";
import PortfolioFileGridItem from "@/components/portfolio/PortfolioFileGridItem";
import PortfolioDetailsForm from "@/components/portfolio/PortfolioDetailsForm";
import CopyLinkButton from "@/components/CopyLinkButton";
import PortfolioTestimonialsManager from "@/components/portfolio/PortfolioTestimonialsManager";

const COLOR = { black: "#0A0A0A", gold: "#F5C842", charcoal: "#1A1A1A" };

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const { id } = await params;

  const portfolio = await db.portfolio.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { displayOrder: "asc" },
        include: { media: { orderBy: { displayOrder: "asc" } } },
      },
      media: true,
      testimonials: { orderBy: { displayOrder: "asc" } },
    },
  });

  // Ownership check — a portfolio existing at all doesn't mean this
  // creator owns it, especially now that an agency account can hold
  // several. 404 rather than a permission error, so this doesn't leak
  // whether a given id exists at all to someone who doesn't own it.
  if (!portfolio || portfolio.creatorId !== creator.id) notFound();

  // A paid-but-unpaid agency portfolio isn't manageable yet — send
  // back to the list, where the real payment-status messaging lives.
  if (portfolio.billingStatus === "PENDING_SETUP") {
    redirect("/dashboard/portfolio");
  }

  const liveUrl = portfolioUrl(portfolio.slug);
  const testimonialLink = `${process.env.NEXT_PUBLIC_APP_URL}/testimonial/${portfolio.slug}`;
  const ungroupedMedia = portfolio.media.filter((m) => !m.sectionId);

  const bannerCandidates = portfolio.sections
    .filter((s) => s.mediaType === "PHOTO" || s.mediaType === "VIDEO")
    .flatMap((s) => s.media)
    .concat(ungroupedMedia.filter((m) => m.type === "PHOTO" || m.type === "VIDEO"))
    .map((m) => ({ id: m.id, url: publicUrlFor(m.fileKey), type: m.type as "PHOTO" | "VIDEO" }));

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard/portfolio" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← {creator.accountType === "AGENCY" ? "Back to all portfolios" : "Back to dashboard"}
        </Link>

        {portfolio.billingStatus === "OFFLINE" && (
          <div className="mb-6 rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p className="text-sm font-semibold text-red-400">This portfolio is currently offline</p>
            <p className="mt-1 text-xs text-white/50">
              The monthly payment for this portfolio failed. It won't be publicly visible until it's resolved.
            </p>
          </div>
        )}

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          {creator.accountType === "AGENCY" ? "Client portfolio" : "Your portfolio"}
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
                       heroBannerDesktopUrl={portfolio.heroBannerDesktopUrl}
            heroBannerDesktopType={portfolio.heroBannerDesktopType}
            heroBannerMobileUrl={portfolio.heroBannerMobileUrl}
            heroBannerMobileType={portfolio.heroBannerMobileType}
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
            bioText={portfolio.bioText}
            bioSkills={portfolio.bioSkills}
            bioStat={portfolio.bioStat}
            bioPhotoUrl={portfolio.bioPhotoUrl}
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
                        sectionId={section.id}
                        isCover={section.coverMediaId ? section.coverMediaId === m.id : m.id === section.media[0]?.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <PortfolioAddSection hasSections={portfolio.sections.length > 0} />
        </div>

        {/* testimonials */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-2 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Testimonials
          </h2>
          <p className="mb-5 text-xs text-white/40">
            Shown as a scrolling carousel on your public portfolio, right after the &ldquo;Get in touch&rdquo; section.
          </p>

          <div className="mb-5 rounded-lg p-4" style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.15)" }}>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.08em" }}>
              Get testimonials directly from clients
            </p>
            <p className="mb-3 text-xs text-white/40">
              Share this link — anything a client submits shows up below for your approval before it ever goes live.
            </p>
            <div className="flex items-center gap-2">
              <span className="flex-1 break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                {testimonialLink}
              </span>
              <CopyLinkButton url={testimonialLink} />
            </div>
          </div>

          <PortfolioTestimonialsManager testimonials={portfolio.testimonials} />
        </div>
      </div>
    </main>
  );
}