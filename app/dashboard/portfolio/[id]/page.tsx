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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 2.8 13.7 9l6.2 1.7-6.2 1.7-1.7 6.2-1.7-6.2-6.2-1.7L10.3 9 12 2.8Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M14 5h5v5M19 5l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
        include: {
          media: {
            orderBy: { displayOrder: "asc" },
          },
        },
      },
      media: true,
      testimonials: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!portfolio || portfolio.creatorId !== creator.id) {
    notFound();
  }

  if (portfolio.billingStatus === "PENDING_SETUP") {
    redirect("/dashboard/portfolio");
  }

  const liveUrl = portfolioUrl(portfolio.slug);

  const testimonialLink = `${process.env.NEXT_PUBLIC_APP_URL}/testimonial/${portfolio.slug}`;

  const ungroupedMedia = portfolio.media.filter((m) => !m.sectionId);

  const bannerCandidates = portfolio.sections
    .filter((s) => s.mediaType === "PHOTO" || s.mediaType === "VIDEO")
    .flatMap((s) => s.media)
    .concat(
      ungroupedMedia.filter(
        (m) => m.type === "PHOTO" || m.type === "VIDEO"
      )
    )
    .map((m) => ({
      id: m.id,
      url: publicUrlFor(m.fileKey),
      type: m.type as "PHOTO" | "VIDEO",
    }));

  const photoCount = portfolio.media.filter((m) => m.type === "PHOTO").length;
  const videoCount = portfolio.media.filter((m) => m.type === "VIDEO").length;
  const documentCount = portfolio.media.filter(
    (m) => m.type === "PDF" || m.type === "DOCUMENT"
  ).length;

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#0A0A0A]">
      {/* =====================================================
          TOP NAV
      ====================================================== */}
      <header className="sticky top-0 z-50 border-b border-[#E2E6EB] bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/dashboard/portfolio"
              className="group inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#747982] transition hover:text-[#0A0A0A]"
            >
              <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
                ←
              </span>

              <span className="hidden sm:inline">
                {creator.accountType === "AGENCY"
                  ? "All portfolios"
                  : "Portfolio"}
              </span>

              <span className="sm:hidden">Back</span>
            </Link>

            <span className="h-5 w-px bg-[#E1E4E9]" />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#17191C]">
                {portfolio.companyName}
              </p>

              <p className="hidden text-[10px] uppercase tracking-[0.1em] text-[#9A9EA6] sm:block">
                Portfolio studio
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group hidden items-center gap-2 rounded-full border border-[#DCE1E8] bg-white px-4 py-2 text-xs font-semibold text-[#454A52] transition hover:border-[#C8CED8] hover:shadow-sm sm:flex"
            >
              Preview live site
              <ExternalIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>

            <Link
              href="/dashboard"
              className="hidden rounded-full px-3 py-2 text-xs font-semibold text-[#747982] transition hover:bg-[#F3F4F6] hover:text-[#0A0A0A] md:block"
            >
              All apps
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO / PORTFOLIO IDENTITY
      ====================================================== */}
      <section className="relative overflow-hidden border-b border-[#E1E5EA] bg-white">
        {/* atmospheric glow */}
        <div
          className="pointer-events-none absolute -right-[180px] -top-[230px] h-[620px] w-[620px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,0.16) 0%, rgba(36,120,255,0.045) 42%, transparent 70%)",
          }}
        />

        <div
          className="pointer-events-none absolute -left-[200px] bottom-[-250px] h-[500px] w-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(104,84,255,0.05), transparent 68%)",
          }}
        />

        {/* grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,30,50,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(20,30,50,0.045) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "linear-gradient(to bottom right, black, transparent 70%)",
            WebkitMaskImage:
              "linear-gradient(to bottom right, black, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-12 sm:px-7 md:pb-16 md:pt-16 lg:px-10 lg:pt-20">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div className="max-w-[850px]">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDF3FF] text-[#2478FF]">
                  <SparkIcon className="h-4 w-4" />
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                  Portfolio studio
                </span>

                {portfolio.billingStatus === "ACTIVE" && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-[#CDD2DA]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6C9DFF]">
                      Active
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-[46px] font-semibold leading-[0.95] tracking-[-0.06em] text-[#090A0C] sm:text-[58px] md:text-[70px]">
                {portfolio.companyName}
              </h1>

              {portfolio.heroTagline && (
                <p className="mt-5 max-w-[680px] text-lg leading-7 text-[#777C84] sm:text-xl">
                  {portfolio.heroTagline}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-3 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
                >
                  View live portfolio
                  <ExternalIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>

                <CopyLinkButton url={liveUrl} />
              </div>
            </div>

            {/* statistics */}
            <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#E0E4EA] bg-white/75 shadow-[0_10px_40px_rgba(20,30,50,0.04)] backdrop-blur-xl">
              <div className="min-w-[85px] border-r border-[#E5E8ED] px-5 py-4">
                <p className="text-xl font-semibold tracking-tight">
                  {photoCount}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[#969BA4]">
                  Photos
                </p>
              </div>

              <div className="min-w-[85px] border-r border-[#E5E8ED] px-5 py-4">
                <p className="text-xl font-semibold tracking-tight">
                  {videoCount}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[#969BA4]">
                  Videos
                </p>
              </div>

              <div className="min-w-[85px] px-5 py-4">
                <p className="text-xl font-semibold tracking-tight">
                  {portfolio.sections.length}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[#969BA4]">
                  Sections
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          OFFLINE NOTICE
      ====================================================== */}
      {portfolio.billingStatus === "OFFLINE" && (
        <section className="mx-auto max-w-[1440px] px-5 pt-6 sm:px-7 lg:px-10">
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  This portfolio is currently offline
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600/70">
                  The monthly payment for this portfolio failed. It will not
                  be publicly visible until the billing issue is resolved.
                </p>
              </div>

              <Link
                href="/dashboard/portfolio"
                className="w-fit rounded-full bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Resolve billing
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          MAIN STUDIO
      ====================================================== */}
      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-7 md:py-14 lg:px-10 lg:py-16">
        {/* DETAILS */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2478FF]">
                01 / Identity
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#0A0A0A]">
                Shape your first impression.
              </h2>

              <p className="mt-2 max-w-[600px] text-sm leading-6 text-[#858A92]">
                Control the story, visuals, contact details and information
                visitors see when they discover your portfolio.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-[#E0E4E9] bg-white shadow-[0_20px_70px_rgba(20,30,50,0.05)]">
            <div className="border-b border-[#E8EBEF] bg-[#FAFBFC] px-6 py-4 sm:px-8">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2478FF]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747982]">
                  Portfolio identity
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-8">
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
          </div>
        </section>

        {/* CONTENT */}
        <section className="mt-16">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2478FF]">
                02 / Work
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#0A0A0A]">
                Curate the work.
              </h2>

              <p className="mt-2 max-w-[600px] text-sm leading-6 text-[#858A92]">
                Organise projects into clear sections so visitors can quickly
                understand what you do and see the quality of your work.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#8A8F97]">
              <span>{portfolio.sections.length} sections</span>
              <span className="h-1 w-1 rounded-full bg-[#CDD1D7]" />
              <span>{portfolio.media.length} files</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-[#E0E4E9] bg-white shadow-[0_20px_70px_rgba(20,30,50,0.05)]">
            <div className="border-b border-[#E8EBEF] bg-[#FAFBFC] px-6 py-4 sm:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#2478FF]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747982]">
                    Portfolio sections
                  </span>
                </div>

                <span className="hidden text-[10px] text-[#A0A4AB] sm:block">
                  Arrange your work into a story
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {portfolio.sections.length > 0 ? (
                <div className="space-y-12">
                  {portfolio.sections.map((section, index) => (
                    <div key={section.id} className="relative">
                      {index > 0 && (
                        <div className="absolute -top-6 left-0 right-0 h-px bg-[#EEF0F3]" />
                      )}

                      <div className="mb-5 flex items-center gap-3">
                        <span className="text-[10px] font-bold tabular-nums text-[#B0B4BB]">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="h-px w-6 bg-[#DDE2E8]" />
                      </div>

                      <PortfolioSectionHeader
                        sectionId={section.id}
                        name={section.name}
                        mediaType={section.mediaType}
                        fileCount={section.media.length}
                      />

                      <div
                        className={`mt-5 grid gap-3 ${
                          section.mediaType === "PDF" ||
                          section.mediaType === "DOCUMENT"
                            ? "grid-cols-1 sm:grid-cols-2"
                            : "grid-cols-2 sm:grid-cols-4"
                        }`}
                      >
                        {section.media.map((m) => (
                          <PortfolioFileGridItem
                            key={m.id}
                            mediaId={m.id}
                            url={publicUrlFor(m.fileKey)}
                            filename={
                              m.fileKey.split("/").pop() ?? "file"
                            }
                            type={m.type}
                            sectionId={section.id}
                            isCover={
                              section.coverMediaId
                                ? section.coverMediaId === m.id
                                : m.id === section.media[0]?.id
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#DCE1E7] bg-[#FAFBFC] px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF3FF] text-[#2478FF]">
                    <span className="text-xl">+</span>
                  </div>

                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-[#202226]">
                    Your portfolio is waiting for its first chapter.
                  </h3>

                  <p className="mx-auto mt-2 max-w-[420px] text-sm leading-6 text-[#8A8F97]">
                    Create your first section and start turning your work into
                    a visual story.
                  </p>
                </div>
              )}

              <div className="mt-8 border-t border-[#E8EBEF] pt-7">
                <PortfolioAddSection
                  hasSections={portfolio.sections.length > 0}
                />
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="mt-16">
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2478FF]">
              03 / Social proof
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#0A0A0A]">
              Let your clients speak.
            </h2>

            <p className="mt-2 max-w-[600px] text-sm leading-6 text-[#858A92]">
              Collect testimonials directly from clients and choose what
              appears publicly on your portfolio.
            </p>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-[#E0E4E9] bg-white shadow-[0_20px_70px_rgba(20,30,50,0.05)]">
            <div
              className="relative overflow-hidden px-6 py-7 sm:px-8"
              style={{
                background:
                  "linear-gradient(135deg, #F1F6FF 0%, #F8FAFD 55%, #EEF3FB 100%)",
              }}
            >
              <div
                className="pointer-events-none absolute right-[-50px] top-[-90px] h-[240px] w-[240px] rounded-full border border-[#2478FF]/10"
                aria-hidden
              />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2478FF] shadow-sm">
                    <SparkIcon className="h-4 w-4" />
                  </span>

                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#2478FF]">
                    Testimonial collection
                  </p>
                </div>

                <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#15171A]">
                  Give your clients a direct way to tell your story.
                </h3>

                <p className="mt-2 max-w-[650px] text-sm leading-6 text-[#707988]">
                  Share the link below. Anything a client submits appears here
                  for your approval before it ever goes live.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <div className="min-w-0 flex-1 rounded-xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl">
                    <p className="break-all text-xs text-[#68717F]">
                      {testimonialLink}
                    </p>
                  </div>

                  <CopyLinkButton url={testimonialLink} />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <PortfolioTestimonialsManager
                testimonials={portfolio.testimonials}
              />
            </div>
          </div>
        </section>

        {/* LIVE PORTFOLIO CTA */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-[32px] bg-[#090A0C] px-7 py-10 text-white sm:px-10 lg:px-12">
            <div
              className="pointer-events-none absolute -right-[100px] -top-[160px] h-[430px] w-[430px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(36,120,255,0.45), rgba(36,120,255,0.08) 45%, transparent 70%)",
              }}
            />

            <div
              className="pointer-events-none absolute right-[7%] top-[25px] h-[230px] w-[230px] rounded-full border border-white/[0.07]"
              aria-hidden
            >
              <div className="absolute inset-[30px] rounded-full border border-white/[0.05]" />
              <div className="absolute inset-[60px] rounded-full border border-white/[0.04]" />
            </div>

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6EA5FF]">
                  Your public portfolio
                </p>

                <h2 className="mt-3 max-w-[700px] text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                  This is the experience
                  <br />
                  your clients will see.
                </h2>

                <p className="mt-4 max-w-[570px] text-sm leading-6 text-white/45">
                  Open your live portfolio to see your work exactly as a
                  visitor experiences it.
                </p>
              </div>

              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-fit shrink-0 items-center gap-3 rounded-full bg-white px-5 py-3 text-xs font-semibold text-[#090A0C] transition-all hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(255,255,255,0.1)]"
              >
                Open live portfolio
                <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="border-t border-[#E1E4E9] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <p className="text-xs text-[#969AA2]">
            Portfolio Studio · Showwork
          </p>

          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#747982] transition hover:text-[#2478FF]"
          >
            {liveUrl}
          </a>
        </div>
      </footer>
    </main>
  );
}