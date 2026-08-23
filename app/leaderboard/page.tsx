import { Metadata } from "next";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import BlogFooter from "@/components/blog/BlogFooter";
import LeaderboardPageContent from "@/components/leaderboard/LeaderboardPageContent";

export const metadata: Metadata = {
  title: "Leaderboard | Showwork",
  description: "Every Creativo Spotlight winner, ever — filterable by category and month, plus who's won the most all-time.",
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