import { Metadata } from "next";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import BlogFooter from "@/components/blog/BlogFooter";
import LeaderboardPageContent from "@/components/leaderboard/LeaderboardPageContent";

export const metadata: Metadata = {
  title: "Creativo Creator Leaderboard & Spotlight Winners | Showwork",
  description: "Explore Creativo Spotlight winners and ranked creative work by category and month. Discover photographers, videographers and creators recognized by Showwork.",
  alternates: { canonical: "/leaderboard" },
  keywords: ["creative leaderboard Nigeria", "photography awards", "videographer spotlight winners", "creative community rankings"],
  openGraph: { type: "website", siteName: "Showwork", title: "Creativo Creator Leaderboard | Showwork", description: "Explore Creativo Spotlight winners and ranked creative work by category and month.", url: "/leaderboard", images: ["/images/create.jpg"] },
  twitter: { card: "summary_large_image", title: "Creativo Creator Leaderboard | Showwork", description: "Discover photographers, videographers and creators recognized by Showwork.", images: ["/images/create.jpg"] },
};

// Same reasoning as /creativo and /spotlight: reads admin-managed
// data that changes regularly (new rankings), with no cookies()/
// headers() call of its own to otherwise force dynamic rendering.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const entries = await db.creativoLeaderboardEntry.findMany({
    orderBy: [{ periodDate: "desc" }, { points: "desc" }],
  });

  return (
    <main>
      <Navbar />
      <LeaderboardPageContent entries={entries.map((e) => ({ ...e, periodDate: e.periodDate.toISOString() }))} />
      <BlogFooter />
    </main>
  );
}
