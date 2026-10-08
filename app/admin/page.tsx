import Link from "next/link";
import {
  ArrowUpRight,
  Layers,
  CalendarDays,
  FolderKanban,
  Globe,
} from "lucide-react";
import { getAdminTotals, getAdminAnalytics } from "@/lib/adminAnalytics";
import { AdminMetric, ngn } from "@/components/admin/AdminMetrics";
import AnalyticsChart from "@/components/admin/AnalyticsChart";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { notFound, redirect } from "next/navigation";
export default async function AdminPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();
  const totals = await getAdminTotals();
  const data = await getAdminAnalytics({ range: "30" });
  const revenue = data.daily.reduce((s, r) => s + r.revenue, 0);
  const signups = data.daily.reduce((s, r) => s + r.signups, 0);
  return (
    <main className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-blue-600">
            Your business at a glance
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Overview
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            A clear view of Showwork. Everything you need to start your day.
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          Explore analytics
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          label="Total accounts"
          value={totals.accounts.toLocaleString()}
          detail={`${signups} new accounts in the last 30 days`}
        />
        <AdminMetric
          label="Revenue · last 30 days"
          value={ngn(revenue)}
          current={revenue}
          previous={data.comparison.revenue}
        />
        <AdminMetric
          label="Active creators · 30 days"
          value={data.comparison.active.toLocaleString()}
          detail="Accounts with recorded product creation activity"
        />
        <AdminMetric
          label="All-time collected revenue"
          value={ngn(totals.revenue)}
          detail={`${totals.paying} accounts with live payments`}
        />
      </div>
      <section className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Across your products</h2>
            <p className="mt-1 text-xs text-slate-500">
              Current platform footprint
            </p>
          </div>
          <Layers size={20} className="text-slate-400" />
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Delivery projects", totals.projects, FolderKanban],
            ["Managed projects", totals.managed, Layers],
            ["Content workspaces", totals.workspaces, CalendarDays],
            ["Portfolios", totals.portfolios, Globe],
          ].map(([label, value, Icon]) => {
            const Glyph = Icon as typeof Layers;
            return (
              <div key={String(label)} className="flex items-center gap-4">
                <span className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <Glyph size={20} />
                </span>
                <div>
                  <p className="text-2xl font-semibold">
                    {Number(value).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{String(label)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <AnalyticsChart rows={data.daily} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent signups</h2>
            <Link
              href="/admin/accounts"
              className="text-xs font-medium text-blue-600"
            >
              Manage accounts →
            </Link>
          </div>
          <div className="mt-4 divide-y">
            {data.signups.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                href={`/admin/creators/${s.id}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {s.name || s.email}
                  </p>
                  <p className="truncate text-xs text-slate-500">{s.email}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {s.createdAt.toLocaleDateString("en-NG", {
                    timeZone: "Africa/Lagos",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </Link>
            ))}
            {!data.signups.length && (
              <p className="py-6 text-sm text-slate-400">
                No new signups in the last 30 days.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">Quick actions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Go straight to the work that matters.
          </p>
          <div className="mt-4 space-y-2">
            {[
              [
                "/admin/accounts",
                "Manage accounts",
                "Search customers, add accounts or import a list",
              ],
              [
                "/admin/billing-offers",
                "Manage billing benefits",
                "Product discounts and complimentary access",
              ],
              [
                "/admin/social-calendars",
                "Review workspaces",
                "Client workspaces and billing controls",
              ],
              [
                "/admin/partners",
                "Partner program",
                "Applications, commissions and payouts",
              ],
            ].map(([href, title, description]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{description}</p>
                </div>
                <ArrowUpRight size={16} className="shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
