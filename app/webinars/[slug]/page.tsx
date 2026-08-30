import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import WebinarLandingContent from "@/components/webinars/WebinarLandingContent";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const webinar = await db.creativoWebinar.findUnique({
    where: { slug },
    select: { topic: true, description: true, flyerImageUrl: true },
  });

  if (!webinar) {
    return { title: "Webinar not found — Showwork" };
  }

  const title = `${webinar.topic} | Creativo Webinar`;
  const description = webinar.description || "A Creativo webinar — reserve your spot.";
  const image = webinar.flyerImageUrl || `${process.env.NEXT_PUBLIC_APP_URL}/images/shwk.jpg`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function WebinarLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const webinar = await db.creativoWebinar.findUnique({
    where: { slug },
    include: { speakers: { orderBy: { displayOrder: "asc" } } },
  });
  if (!webinar) notFound();

  const isPast = webinar.startsAt < new Date();

  return (
    <WebinarLandingContent
      webinar={{ ...webinar, startsAt: webinar.startsAt.toISOString() }}
      isPast={isPast}
    />
  );
}