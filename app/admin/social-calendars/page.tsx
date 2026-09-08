import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import CalendarRowActions from "@/components/admin/social-calendars/CalendarRowActions";
import type { PaymentType } from "@prisma/client";

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

const PLAN_STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  BUILDING: { text: "Building", color: "#888786", bg: "rgba(136,135,134,0.15)" },
  AWAITING_APPROVAL: { text: "Awaiting approval", color: "#FFCC00", bg: "rgba(255,204,0,0.12)" },
  PLAN_APPROVED: { text: "Approved", color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  PLAN_NEEDS_CHANGES: { text: "Needs changes", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
};

const BILLING_STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  PENDING_SETUP: { text: "Never paid", color: "#F87171", bg: "rgba(239,68,68,0.12)" },
  ACTIVE: { text: "Active", color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  OFFLINE: { text: "Offline — payment failed", color: "#F87171", bg: "rgba(239,68,68,0.12)" },
};

export default async function AdminSocialCalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();

  const { page } = await searchParams;

  const [totalManagers, totalCalendars, activeCalendars, totalPosts] = await Promise.all([
    db.creator.count({ where: { accountType: "SOCIAL_MEDIA_MANAGER" } }),
    db.socialCalendar.count(),
    db.creator.count({
  where: {
    calendarBillingStatus: "ACTIVE",
  },
}),
    db.calendarPost.count(),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const revenueTypeFilter = { type: { in: ["CALENDAR_SUBSCRIPTION_INITIAL", "CALENDAR_SUBSCRIPTION_RENEWAL"] as PaymentType[] } };

  const [allTimeAgg, monthAgg, yearAgg] = await Promise.all([
    db.paymentRecord.aggregate({ _sum: { amountNgn: true }, where: revenueTypeFilter }),
    db.paymentRecord.aggregate({ _sum: { amountNgn: true }, where: { ...revenueTypeFilter, createdAt: { gte: startOfMonth } } }),
    db.paymentRecord.aggregate({ _sum: { amountNgn: true }, where: { ...revenueTypeFilter, createdAt: { gte: startOfYear } } }),
  ]);

  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const recentPayments = await db.paymentRecord.findMany({
    where: { ...revenueTypeFilter, createdAt: { gte: twelveMonthsAgo } },
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

  const managerBreakdown = await db.creator.findMany({
    where: { accountType: "SOCIAL_MEDIA_MANAGER" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ownedCalendars: true } } },
  });

  const totalCalendarPages = Math.max(1, Math.ceil(totalCalendars / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, parseInt(page ?? "1", 10) || 1), totalCalendarPages);

  const calendars = await db.socialCalendar.findMany({
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
  manager: {
    select: {
      name: true,
      email: true,
      calendarBillingStatus: true,
      calendarSubscriptionRenewsAt: true,
    },
  },
  _count: { select: { posts: true } },
},
  });

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              Admin
            </p>
            <h1 className="text-3xl font-bold text-white">Social media managers</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-white/40 underline hover:text-white">
              ← Platform overview
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Social media managers", value: totalManagers.toLocaleString() },
            { label: "Calendars created", value: totalCalendars.toLocaleString() },
            { label: "Active (paying)", value: activeCalendars.toLocaleString() },
            { label: "Posts planned", value: totalPosts.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-5" style={{ background: COLOR.charcoal }}>
              <p className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

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

        <div className="mb-10 rounded-xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Calendar revenue, last 12 months
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

        <div className="mb-4 flex items-center gap-3">
          <div className="h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <h2 className="text-xl font-semibold text-white">By manager</h2>
        </div>

        <div className="mb-10 overflow-x-auto rounded-xl" style={{ background: COLOR.charcoal }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="px-4 py-3 font-semibold text-white/40">Manager</th>
                <th className="px-4 py-3 font-semibold text-white/40">Calendars created</th>
                <th className="px-4 py-3 font-semibold text-white/40">Joined</th>
              </tr>
            </thead>
            <tbody>
              {managerBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-white/30">
                    No social media manager accounts yet.
                  </td>
                </tr>
              ) : (
                managerBreakdown.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{m.name || m.email}</p>
                      <p className="text-xs text-white/30">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">{m._count.ownedCalendars}</td>
                    <td className="px-4 py-3 text-white/40">
                      {m.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-[3px] w-10" style={{ background: COLOR.orange }} aria-hidden />
          <h2 className="text-xl font-semibold text-white">Calendars</h2>
        </div>

        <div className="overflow-x-auto rounded-xl" style={{ background: COLOR.charcoal }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="px-4 py-3 font-semibold text-white/40">Client</th>
                <th className="px-4 py-3 font-semibold text-white/40">Manager</th>
                <th className="px-4 py-3 font-semibold text-white/40">Plan</th>
                <th className="px-4 py-3 font-semibold text-white/40">Billing</th>
                <th className="px-4 py-3 font-semibold text-white/40">Posts</th>
                <th className="px-4 py-3 font-semibold text-white/40">Created</th>
                <th className="px-4 py-3 font-semibold text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calendars.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-white/30">
                    No calendars created yet.
                  </td>
                </tr>
              ) : (
                calendars.map((cal) => {
                  const planMeta = PLAN_STATUS_LABEL[cal.planStatus] ?? PLAN_STATUS_LABEL.BUILDING;
                  const billingMeta =
  BILLING_STATUS_LABEL[cal.manager.calendarBillingStatus] ??
  BILLING_STATUS_LABEL.PENDING_SETUP;
                  return (
                    <tr key={cal.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-3 font-medium text-white">{cal.clientName}</td>
                      <td className="px-4 py-3">
                        <p className="text-white/70">{cal.manager.name || cal.manager.email}</p>
                        <p className="text-xs text-white/30">{cal.manager.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: planMeta.bg, color: planMeta.color }}>
                          {planMeta.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: billingMeta.bg, color: billingMeta.color }}>
                          {billingMeta.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70">{cal._count.posts}</td>
                      <td className="px-4 py-3 text-white/40">
                        {cal.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <CalendarRowActions
  calendarId={cal.id}
  billingStatus={cal.manager.calendarBillingStatus}
/>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalCalendarPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Link
              href={`/admin/social-calendars?page=${currentPage - 1}`}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={
                currentPage <= 1
                  ? { background: "rgba(248,247,244,0.04)", color: "rgba(248,247,244,0.25)", pointerEvents: "none" }
                  : { background: COLOR.charcoal, color: "white" }
              }
            >
              ← Previous
            </Link>
            <span className="text-sm text-white/40">Page {currentPage} of {totalCalendarPages}</span>
            <Link
              href={`/admin/social-calendars?page=${currentPage + 1}`}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={
                currentPage >= totalCalendarPages
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