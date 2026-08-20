import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import CreatePortfolioForm from "@/components/portfolio/CreatePortfolioForm";
import AgencyPortfolioList from "@/components/portfolio/AgencyPortfolioList";

const COLOR = { black: "#0A0A0A" };

export default async function PortfolioEntryPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  // Agency accounts always see the list — every portfolio they create
  // is paid, so there's no "free first one" to redirect straight
  // through to the way a regular creator's is.
  if (creator.accountType === "AGENCY") {
    const portfolios = await db.portfolio.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, companyName: true, slug: true, billingStatus: true },
    });

    return (
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center" style={{ background: COLOR.black }}>
            <p className="text-sm text-white/40">Loading...</p>
          </main>
        }
      >
        <AgencyPortfolioList initialPortfolios={portfolios} />
      </Suspense>
    );
  }

  // Regular creator — same free, single-portfolio behavior as before
  // this feature existed. findFirst rather than findUnique, since
  // creatorId is no longer a unique field at the database level, even
  // though a regular creator only ever has the one.
  const portfolio = await db.portfolio.findFirst({ where: { creatorId: creator.id }, select: { id: true } });

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

  redirect(`/dashboard/portfolio/${portfolio.id}`);
}