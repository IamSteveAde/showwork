import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import SpotlightCycleManager from "@/components/admin/spotlight/SpotlightCycleManager";
import SpotlightSubmissionManager from "@/components/admin/spotlight/SpotlightSubmissionManager";

const COLOR = { black: "#0A0A0A", gold: "#F5C842" };

export default async function AdminSpotlightPage() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) redirect("/login");

  const [cycles, activeCycle] = await Promise.all([
    db.spotlightCycle.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    }),
    db.spotlightCycle.findFirst({ where: { isActive: true }, include: { submissions: { orderBy: { submittedAt: "desc" } } } }),
  ]);

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to admin
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Monthly Spotlight
        </p>
        <h1 className="mb-8 text-3xl font-bold text-white">Manage the Spotlight</h1>

        <div className="flex flex-col gap-6">
          <SpotlightCycleManager
            initialCycles={cycles.map((c) => ({
              ...c,
              submissionOpensAt: c.submissionOpensAt.toISOString(),
              submissionDeadline: c.submissionDeadline.toISOString(),
            }))}
          />

          <SpotlightSubmissionManager
            cycleLabel={activeCycle?.monthLabel ?? null}
            initialSubmissions={
              activeCycle
                ? activeCycle.submissions.map((s) => ({ ...s, submittedAt: s.submittedAt.toISOString() }))
                : []
            }
          />
        </div>
      </div>
    </main>
  );
}