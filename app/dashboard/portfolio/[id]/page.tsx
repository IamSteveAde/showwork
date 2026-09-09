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
      {/* DARK STUDIO HEADER + HERO */}
      <section className="relative overflow-hidden bg-[#07090D] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-56 h-[680px] w-[680px] rounded-full blur-[150px]"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,.22) 0%, rgba(36,120,255,.07) 42%, transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 bottom-[-300px] h-[620px] w-[620px] rounded-full blur-[160px]"
          style={{
            background:
              "radial-gradient(circle, rgba(67,89,255,.12) 0%, transparent 68%)",
          }}
        />

        <header className="relative z-10">
          <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-7 lg:px-10">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-white/[0.055] px-3.5 py-2.5 text-xs font-semibold text-white/55 transition-all hover:bg-white/[0.09] hover:text-white"
              >
                <ArrowIcon className="h-3.5 w-3.5 -rotate-180 transition-transform duration-300 group-hover:-translate-x-0.5" />
                <span>All apps</span>
              </Link>

              <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/90">
                  {portfolio.companyName}
                </p>
                <p className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.13em] text-white/25 sm:block">
                  Portfolio studio
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group hidden items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white/65 transition-all hover:bg-white/[0.11] hover:text-white sm:flex"
              >
                Preview live site
                <ExternalIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>

              <Link
                href="/dashboard"
                className="rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-[#090A0C] transition hover:bg-white/90"
              >
                All apps
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-14 pt-14 sm:px-7 sm:pb-20 md:pt-20 lg:px-10 lg:pb-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:gap-20">
            <div className="max-w-[900px]">
              <div className="mb-7 inline-flex items-center gap-2.5 rounded-full bg-[#2478FF]/[0.11] px-3.5 py-2">
                <SparkIcon className="h-3.5 w-3.5 text-[#6EA5FF]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6EA5FF]">
                  Portfolio studio
                </span>
                {portfolio.billingStatus === "ACTIVE" && (
                  <span className="rounded-full bg-[#2478FF]/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9BC0FF]">
                    Active
                  </span>
                )}
              </div>

              <h1 className="max-w-[900px] text-[clamp(3.4rem,7vw,7.2rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-white">
                Make your work
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(105deg, #FFFFFF 15%, #A7C8FF 58%, #4B8DFF 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  impossible to miss.
                </span>
              </h1>

              {portfolio.heroTagline && (
                <p className="mt-7 max-w-[680px] text-base leading-7 text-white/40 sm:text-xl sm:leading-8">
                  {portfolio.heroTagline}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-3.5 text-xs font-bold text-[#080A0E] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(255,255,255,.12)]"
                >
                  View live portfolio
                  <ExternalIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>

                <CopyLinkButton url={liveUrl} />
              </div>
            </div>

            <div className="rounded-[30px] bg-white/[0.055] p-5 shadow-[0_30px_100px_rgba(0,0,0,.28)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                  Portfolio at a glance
                </p>
                <span className="h-2 w-2 rounded-full bg-[#2478FF] shadow-[0_0_18px_rgba(36,120,255,.9)]" />
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/[0.055] p-4">
                  <p className="text-3xl font-semibold tracking-[-0.05em]">
                    {photoCount}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    Photos
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.055] p-4">
                  <p className="text-3xl font-semibold tracking-[-0.05em]">
                    {videoCount}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    Videos
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.055] p-4">
                  <p className="text-3xl font-semibold tracking-[-0.05em]">
                    {portfolio.sections.length}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    Sections
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.055] p-4">
                  <p className="text-3xl font-semibold tracking-[-0.05em]">
                    {documentCount}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    Documents
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-white/25">
                Your portfolio is the public-facing expression of your work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OFFLINE NOTICE */}
      {portfolio.billingStatus === "OFFLINE" && (
        <section className="mx-auto max-w-[1440px] px-5 pt-7 sm:px-7 lg:px-10">
          <div className="rounded-[24px] bg-red-50 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  This portfolio is currently offline
                </p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-red-600/70">
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

      {/* MAIN STUDIO */}
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-7 md:py-16 lg:px-10 lg:py-20">
        {/* IDENTITY */}
        <section>
          <div className="mb-7 max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
              01 / Identity
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#0A0A0A] sm:text-4xl">
              Shape your first impression.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#858A92]">
              Control the story, visuals, contact details and information
              visitors see when they discover your portfolio.
            </p>
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-[0_24px_80px_rgba(20,30,50,.055)] sm:p-8">
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
        </section>

        {/* WORK */}
        <section className="mt-20">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                02 / Work
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#0A0A0A] sm:text-4xl">
                Curate the work.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#858A92]">
                Organise projects into clear sections so visitors can quickly
                understand what you do and see the quality of your work.
              </p>
            </div>

            <div className="rounded-full bg-white px-4 py-2.5 text-xs font-medium text-[#777D86] shadow-sm">
              {portfolio.sections.length} sections&nbsp;&nbsp;·&nbsp;&nbsp;
              {portfolio.media.length} files
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-[0_24px_80px_rgba(20,30,50,.055)] sm:p-8">
            {portfolio.sections.length > 0 ? (
              <div className="space-y-14">
                {portfolio.sections.map((section, index) => (
                  <div key={section.id}>
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2478FF]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#17191C]">
                          {section.name}
                        </h3>
                      </div>
                      <span className="rounded-full bg-[#F4F6F9] px-3 py-1.5 text-[10px] font-semibold text-[#8A9099]">
                        {section.media.length} files
                      </span>
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
                          filename={m.fileKey.split("/").pop() ?? "file"}
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
              <div className="rounded-[24px] bg-[#F7F9FC] px-6 py-16 text-center">
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

            <div className="mt-9 pt-2">
              <PortfolioAddSection
                hasSections={portfolio.sections.length > 0}
              />
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="mt-20">
          <div className="mb-7 max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
              03 / Social proof
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#0A0A0A] sm:text-4xl">
              Let your clients speak.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#858A92]">
              Collect testimonials directly from clients and choose what
              appears publicly on your portfolio.
            </p>
          </div>

          <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_24px_80px_rgba(20,30,50,.055)]">
            <div className="relative overflow-hidden bg-[#0D1420] px-6 py-8 text-white sm:px-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full blur-[90px]"
                style={{
                  background:
                    "radial-gradient(circle, rgba(36,120,255,.28), transparent 68%)",
                }}
              />

              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-[#6EA5FF]">
                    <SparkIcon className="h-4 w-4" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#6EA5FF]">
                    Testimonial collection
                  </p>
                </div>

                <h3 className="mt-5 max-w-2xl text-xl font-semibold tracking-[-0.03em]">
                  Give your clients a direct way to tell your story.
                </h3>

                <p className="mt-2 max-w-[650px] text-sm leading-6 text-white/40">
                  Share the link below. Anything a client submits appears here
                  for your approval before it ever goes live.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.06] px-4 py-3.5">
                    <p className="break-all text-xs text-white/45">
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

        {/* LIVE CTA */}
        <section className="mt-20">
          <div className="relative overflow-hidden rounded-[34px] bg-[#080A0E] px-7 py-11 text-white shadow-[0_30px_100px_rgba(0,0,0,.15)] sm:px-10 lg:px-12 lg:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full blur-[100px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(36,120,255,.38), rgba(36,120,255,.06) 50%, transparent 70%)",
              }}
            />

            <div className="relative flex flex-col justify-between gap-9 lg:flex-row lg:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6EA5FF]">
                  Your public portfolio
                </p>

                <h2 className="mt-3 max-w-[700px] text-3xl font-semibold tracking-[-0.05em] sm:text-5xl sm:leading-[1]">
                  This is the experience
                  <br />
                  your clients will see.
                </h2>

                <p className="mt-5 max-w-[570px] text-sm leading-6 text-white/40">
                  Open your live portfolio to see your work exactly as a
                  visitor experiences it.
                </p>
              </div>

              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-fit shrink-0 items-center gap-3 rounded-full bg-white px-5 py-3.5 text-xs font-bold text-[#090A0C] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(255,255,255,.12)]"
              >
                Open live portfolio
                <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <p className="text-xs text-[#969AA2]">
            Portfolio Studio · Showwork
          </p>

          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-full truncate text-xs font-semibold text-[#747982] transition hover:text-[#2478FF]"
          >
            {liveUrl}
          </a>
        </div>
      </footer>
    </main>
  );
}
