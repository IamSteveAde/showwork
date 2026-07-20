import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import AddCreatorForm from "@/components/admin/AddCreatorForm";
import GlobalDiscountForm from "@/components/admin/GlobalDiscountForm";
import CreatorRowActions from "@/components/admin/CreatorRowActions";
import { whatsappLinkFor } from "@/lib/phone";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

const PAGE_SIZE = 20;

function formatNgn(n: number) {
  return `₦${n.toLocaleString()}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();

  const { page } = await searchParams;

  // ── Platform-wide stats ──
  const [totalCreators, totalProjects, totalMedia, totalViewerEmails] = await Promise.all([
    db.creator.count(),
    db.project.count(),
    db.media.count(),
    db.viewerEmail.count(),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [allTimeAgg, monthAgg, yearAgg] = await Promise.all([
    db.paymentRecord.aggregate({ _sum: { amountNgn: true } }),
    db.paymentRecord.aggregate({ _sum: { amountNgn: true }, where: { createdAt: { gte: startOfMonth } } }),
    db.paymentRecord.aggregate({ _sum: { amountNgn: true }, where: { createdAt: { gte: startOfYear } } }),
  ]);

  // Last 12 months, broken down — real "filter over time" visibility
  // without needing a complex arbitrary date-range picker.
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const recentPayments = await db.paymentRecord.findMany({
    where: { createdAt: { gte: twelveMonthsAgo } },
    select: { amountNgn: true, createdAt: true },
  });
  const monthlyBreakdown: { label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = monthDate.toLocaleDateString("en-NG", { month: "short", year: "2-digit" });
    const total = recentPayments
      .filter((p) => p.createdAt.getFullYear() === monthDate.getFullYear() && p.createdAt.getMonth() === monthDate.getMonth())
      .reduce((sum, p) => sum + p.amountNgn, 0);
    monthlyBreakdown.push({ label, total });
  }
  const maxMonthly = Math.max(1, ...monthlyBreakdown.map((m) => m.total));

  // ── Creators table, paginated ──
  const totalCreatorPages = Math.max(1, Math.ceil(totalCreators / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, parseInt(page ?? "1", 10) || 1), totalCreatorPages);

  const creators = await db.creator.findMany({
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { projects: true } } },
  });

  const platformSettings = await db.platformSettings.findUnique({ where: { id: "singleton" } });

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              Admin
            </p>
            <h1 className="text-3xl font-bold text-white">Platform overview</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-white/40 underline hover:text-white">
            Back to dashboard
          </Link>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Creators", value: totalCreators.toLocaleString() },
            { label: "Projects created", value: totalProjects.toLocaleString() },
            { label: "Files uploaded", value: totalMedia.toLocaleString() },
            { label: "Client emails captured", value: totalViewerEmails.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-5" style={{ background: COLOR.charcoal }}>
              <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── REVENUE ── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "This month", value: monthAgg._sum.amountNgn ?? 0 },
            { label: "This year", value: yearAgg._sum.amountNgn ?? 0 },
            { label: "All time", value: allTimeAgg._sum.amountNgn ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-5" style={{ background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.2)" }}>
              <p className="text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.08em" }}>
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{formatNgn(stat.value)}</p>
            </div>
          ))}
        </div>

        {/* ── MONTHLY BREAKDOWN ── */}
        <div className="mb-10 rounded-xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Revenue, last 12 months
          </h2>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {monthlyBreakdown.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (m.total / maxMonthly) * 100)}px`,
                    background: m.total > 0 ? COLOR.gold : "rgba(255,255,255,0.08)",
                  }}
                  title={formatNgn(m.total)}
                />
                <span className="text-[10px] text-white/30">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PLATFORM SETTINGS ── */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <h2 className="mb-3 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Platform-wide discount
            </h2>
            <p className="mb-4 text-xs text-white/40">
              Applies to every new subscription started while active. Doesn&apos;t change existing subscribers&apos; current price.
            </p>
            <GlobalDiscountForm currentPercent={platformSettings?.globalDiscountPercent ?? 0} />
          </div>

          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <h2 className="mb-3 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Add a creator
            </h2>
            <p className="mb-4 text-xs text-white/40">
              Creates an account directly, already verified — no OTP step.
            </p>
            <AddCreatorForm />
          </div>
        </div>

        {/* ── CREATORS TABLE ── */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <h2 className="text-xl font-semibold text-white">Creators</h2>
        </div>

        <div className="overflow-x-auto rounded-xl" style={{ background: COLOR.charcoal }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="px-4 py-3 font-semibold text-white/40">Creator</th>
                <th className="px-4 py-3 font-semibold text-white/40">Plan</th>
                <th className="px-4 py-3 font-semibold text-white/40">Projects</th>
                <th className="px-4 py-3 font-semibold text-white/40">Joined</th>
                <th className="px-4 py-3 font-semibold text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/creators/${c.id}`} className="font-medium text-white hover:underline">
                      {c.name || c.email}
                    </Link>
                    <p className="text-xs text-white/30">{c.email}</p>
                    {c.phone && <p className="text-xs text-white/25">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: c.isComped ? "rgba(34,197,94,0.15)" : "rgba(245,200,66,0.15)",
                        color: c.isComped ? "#4ade80" : COLOR.gold,
                      }}
                    >
                      {c.isComped
                        ? "Comped — Unlimited"
                        : c.subscriptionActive
                          ? c.subscriptionTier
                          : c.freeTierLimitOverride !== null
                            ? `Free (${c.freeTierLimitOverride}/mo)`
                            : "Free"}
                    </span>
                    {c.discountPercent > 0 && (
                      <span className="ml-1.5 text-xs text-white/40">({c.discountPercent}% off)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{c._count.projects}</td>
                  <td className="px-4 py-3 text-white/40">
                    {c.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.phone && (
                        <a
                          href={whatsappLinkFor(c.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold"
                          style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.85L2.05 22l5.36-1.4a9.9 9.9 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.13-2.9-7C17 3.03 14.53 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.25 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
                          </svg>
                          WhatsApp
                        </a>
                      )}
                      <CreatorRowActions
                        creatorId={c.id}
                        isComped={c.isComped}
                        discountPercent={c.discountPercent}
                        freeTierLimitOverride={c.freeTierLimitOverride}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalCreatorPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Link
              href={`/admin?page=${currentPage - 1}`}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={
                currentPage <= 1
                  ? { background: "rgba(248,247,244,0.04)", color: "rgba(248,247,244,0.25)", pointerEvents: "none" }
                  : { background: COLOR.charcoal, color: "white" }
              }
            >
              ← Previous
            </Link>
            <span className="text-sm text-white/40">Page {currentPage} of {totalCreatorPages}</span>
            <Link
              href={`/admin?page=${currentPage + 1}`}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={
                currentPage >= totalCreatorPages
                  ? { background: "rgba(248,247,244,0.04)", color: "rgba(248,247,244,0.25)", pointerEvents: "none" }
                  : { background: COLOR.charcoal, color: "white" }
              }
            >
              Next →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}