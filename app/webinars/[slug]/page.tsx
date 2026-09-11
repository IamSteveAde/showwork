import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

import Navbar from "@/components/Navbar";
import WebinarLandingContent from "@/components/webinars/WebinarLandingContent";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*                                METADATA                                    */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const webinar = await db.creativoWebinar.findUnique({
    where: { slug },
    select: {
      topic: true,
      description: true,
      flyerImageUrl: true,
    },
  });

  if (!webinar) {
    return {
      title: "Webinar not found — Showwork",
      description: "The requested Creativo webinar could not be found.",
    };
  }

  const title = `${webinar.topic} | Creativo Webinar`;
  const description =
    webinar.description ||
    "Join a Creativo webinar built for ambitious creatives, professionals and teams.";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://useshowwork.com";

  const image =
    webinar.flyerImageUrl || `${baseUrl}/images/shwk.jpg`;

  return {
    title,
    description,

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      type: "website",
      title,
      description,
      url: `${baseUrl}/webinars/${slug}`,
      siteName: "Showwork",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: webinar.topic,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                  PAGE                                      */
/* -------------------------------------------------------------------------- */

export default async function WebinarLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const webinar = await db.creativoWebinar.findUnique({
    where: { slug },
    include: {
      speakers: {
        orderBy: {
          displayOrder: "asc",
        },
      },
    },
  });

  if (!webinar) {
    notFound();
  }

  const isPast = webinar.startsAt < new Date();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090B] text-white">
      {/* ================================================================== */}
      {/* SHOWWORK NAVIGATION                                                */}
      {/* ================================================================== */}

      <div className="relative z-[100]">
        <Navbar />
      </div>

      {/* ================================================================== */}
      {/* CINEMATIC TOP FRAME                                                 */}
      {/* ================================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-240px] h-[620px] w-[620px] -translate-x-1/2 rounded-full opacity-[0.13] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #2478FF 0%, rgba(36,120,255,0.15) 45%, transparent 72%)",
          }}
        />

        <div
          className="absolute right-[-180px] top-[35%] h-[480px] w-[480px] rounded-full opacity-[0.07] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #68B2FF 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ================================================================== */}
      {/* WEBINAR EXPERIENCE                                                  */}
      {/* ================================================================== */}

      <div className="relative z-10">
        <WebinarLandingContent
          webinar={{
            ...webinar,
            startsAt: webinar.startsAt.toISOString(),
          }}
          isPast={isPast}
        />
      </div>

      {/* ================================================================== */}
      {/* SUBTLE PAGE FINISH                                                  */}
      {/* ================================================================== */}

      <div className="pointer-events-none relative z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <footer className="relative z-10 border-t border-white/[0.06] bg-[#08090B]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between md:px-12">
          <div>
            <p className="text-sm font-semibold tracking-[-0.02em] text-white">
              Showwork
            </p>

            <p className="mt-1 text-xs text-white/35">
              The workspace for creatives and creative teams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-white/35">
            <a
              href="/"
              className="transition-colors hover:text-white"
            >
              Showwork
            </a>

            <a
              href="/creativo"
              className="transition-colors hover:text-white"
            >
              Creativo Community
            </a>

            <a
              href="/webinars"
              className="transition-colors hover:text-white"
            >
              Webinars
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}