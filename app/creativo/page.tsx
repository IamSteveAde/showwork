import { Metadata } from "next";
import { db } from "@/lib/db";
import CreativoContent from "@/components/creativo/CreativoContent";

const CREATIVO_TITLE = "Creativo: Community for Photographers & Creators | Showwork";
const CREATIVO_DESCRIPTION =
  "Join Creativo, Showwork's community for photographers, videographers, editors and motion designers. Get peer feedback, referrals, monthly creative challenges and practical webinars.";
const CREATIVO_IMAGE = "/images/create.jpg";

export const metadata: Metadata = {
  title: CREATIVO_TITLE,
  description: CREATIVO_DESCRIPTION,
  alternates: { canonical: "/creativo" },
  keywords: ["creative community Nigeria", "photographer community", "videographer community", "creative networking", "Creativo Showwork"],
  openGraph: {
    title: CREATIVO_TITLE,
    description: CREATIVO_DESCRIPTION,
    images: [{ url: CREATIVO_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: CREATIVO_TITLE,
    description: CREATIVO_DESCRIPTION,
    images: [CREATIVO_IMAGE],
  },
};

export const dynamic = "force-dynamic";



export default async function CreativoPage() {
  const [settings, entries, webinars] = await Promise.all([
    db.platformSettings.findUnique({ where: { id: "singleton" } }),
    // Recent entries only — the public page only ever shows "this
    // month" / "last month," so there's no need to pull the entire
    // history down to the client.
    db.creativoLeaderboardEntry.findMany({
      orderBy: [{ periodDate: "desc" }, { points: "desc" }],
      take: 100,
    }),
        db.creativoWebinar.findMany({ orderBy: { startsAt: "desc" }, include: { speakers: { orderBy: { displayOrder: "asc" }, take: 1 } } }),
  ]);

  return (
    <CreativoContent
      memberCountLabel={settings?.creativoMemberCountLabel ?? null}
      entries={entries.map((e) => ({ ...e, periodDate: e.periodDate.toISOString() }))}
      webinars={webinars.map((w) => ({ ...w, startsAt: w.startsAt.toISOString() }))}
    />
  );
}
