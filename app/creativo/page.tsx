import { Metadata } from "next";
import { db } from "@/lib/db";
import CreativoContent from "@/components/creativo/CreativoContent";

const CREATIVO_TITLE = "Creativo — Community for Photographers, Videographers & Creators | Showwork";
const CREATIVO_DESCRIPTION =
  "Join Creativo, the free community for photographers, videographers, editors, and motion designers who want better clients, better pay, and real visibility. Real feedback, referrals, monthly challenges, and live webinars — powered by Showwork.";
const CREATIVO_IMAGE = `${process.env.NEXT_PUBLIC_APP_URL}/images/create.jpg`;

export const metadata: Metadata = {
  title: CREATIVO_TITLE,
  description: CREATIVO_DESCRIPTION,
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
    db.creativoWebinar.findMany({ orderBy: { startsAt: "desc" } }),
  ]);

  return (
    <CreativoContent
      memberCountLabel={settings?.creativoMemberCountLabel ?? null}
      entries={entries.map((e) => ({ ...e, periodDate: e.periodDate.toISOString() }))}
      webinars={webinars.map((w) => ({ ...w, startsAt: w.startsAt.toISOString() }))}
    />
  );
}