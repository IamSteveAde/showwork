import PaymentSyncStatus from "@/components/admin/PaymentSyncStatus";
import Link from "next/link";
import {
  getAdminAnalytics,
  getAdminTotals,
  ADMIN_TOOLS,
  type AnalyticsParams,
} from "@/lib/adminAnalytics";
import AnalyticsFilters from "@/components/admin/AnalyticsFilters";
import AnalyticsChart from "@/components/admin/AnalyticsChart";
import { AdminMetric, ngn } from "@/components/admin/AdminMetrics";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { notFound, redirect } from "next/navigation";
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsParams>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();
  const data = await getAdminAnalytics(await searchParams);
  const totals = await getAdminTotals();
  const { window: w, daily, comparison: c, breakdown, heatmap, signups } = data;
  const sum = (key: "revenue" | "signups" | "activity") =>
    daily.reduce((s, r) => s + r[key], 0);
  const peak = [...heatmap].sort((a, b) => b.count - a.count)[0];
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(1, ...heatmap.map((r) => r.count));
  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-blue-600">
            Business intelligence
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Understand growth, revenue and how people use Showwork.
          </p>
        </div>
        <span className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-500">
          {w.from} — {w.to}
        </span>
      </div>
      <PaymentSyncStatus />
      <AnalyticsFilters tool={w.tool} range={w.range} from={w.from} to={w.to} />
      {w.error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        >
          {w.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          label="Collected revenue"
          value={ngn(sum("revenue"))}
          current={sum("revenue")}
          previous={c.revenue}
          detail={`${c.payments} live payments · ${c.payers} paying accounts`}
        />
        <AdminMetric
          label="New signups"
          value={sum("signups").toLocaleString()}
          current={sum("signups")}
          previous={c.signups}
          detail={
            w.tool === "all"
              ? "Accounts created in this period"
              : "New accounts that used this tool by period end"
          }
        />
        <AdminMetric
          label="Active creators"
          value={c.active.toLocaleString()}
          detail="Distinct accounts with recorded creation activity"
        />
        <AdminMetric
          label="Product activity"
          value={sum("activity").toLocaleString()}
          current={sum("activity")}
          previous={c.activity}
          detail="Projects, tasks, uploads, posts, AI versions & community events"
        />
      </div>
      <AnalyticsChart rows={daily} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="p-6">
            <h2 className="font-semibold">Tool performance</h2>
            <p className="mt-1 text-xs text-slate-500">
              Revenue and recorded activity for the selected period
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y bg-slate-50 text-xs text-slate-500">
                <tr>
                  {["Tool", "Revenue", "Creators", "Activity"].map((h) => (
                    <th key={h} className="px-6 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ADMIN_TOOLS)
                  .filter(
                    ([key]) =>
                      key !== "all" && (w.tool === "all" || w.tool === key),
                  )
                  .map(([key, label]) => {
                    const r = breakdown.find((r) => r.tool === key);
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="px-6 py-4 font-medium">{label}</td>
                        <td className="px-6 py-4">{ngn(r?.revenue ?? 0)}</td>
                        <td className="px-6 py-4 text-slate-500">
                          {r?.users ?? 0}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {r?.activity ?? 0}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">Period insights</h2>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs text-slate-500">
                Revenue per paying account
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {ngn(c.payers ? Math.round(sum("revenue") / c.payers) : 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Average payment</p>
              <p className="mt-1 text-2xl font-semibold">
                {ngn(c.payments ? Math.round(sum("revenue") / c.payments) : 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Busiest weekly time slot</p>
              <p className="mt-1 text-lg font-semibold">
                {peak
                  ? `${weekdays[peak.day - 1]} · ${String(peak.hour).padStart(2, "0")}:00–${String(peak.hour + 1).padStart(2, "0")}:00`
                  : "No activity yet"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {peak
                  ? `${peak.count} events across the selected period · Lagos time`
                  : "Insights appear when activity is recorded."}
              </p>
            </div>
          </div>
        </section>
      </div>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold">When activity picks up</h2>
        <p className="mt-1 text-xs text-slate-500">
          Recorded creation events by weekday and hour · Africa/Lagos
        </p>
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="mb-2 grid grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-1 text-[10px] text-slate-400">
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h}>{h % 3 === 0 ? `${h}:00` : ""}</span>
              ))}
            </div>
            {weekdays.map((day, d) => (
              <div
                key={day}
                className="mb-1 grid grid-cols-[40px_repeat(24,minmax(0,1fr))] items-center gap-1"
              >
                <span className="text-xs text-slate-500">{day}</span>
                {Array.from({ length: 24 }, (_, h) => {
                  const n =
                    heatmap.find((r) => r.day === d + 1 && r.hour === h)
                      ?.count ?? 0;
                  return (
                    <div
                      key={h}
                      tabIndex={0}
                      aria-label={`${day} ${h}:00: ${n} events`}
                      title={`${day} ${h}:00 · ${n} events`}
                      className="h-7 rounded-sm"
                      style={{
                        background: n
                          ? `rgba(37,99,235,${0.2 + (0.8 * n) / max})`
                          : "#f1f5f9",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-right text-xs text-slate-400">
          Lighter: less activity · Darker: more activity
        </p>
      </section>
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between p-6">
          <div>
            <h2 className="font-semibold">Who’s signing up</h2>
            <p className="mt-1 text-xs text-slate-500">
              Latest eight matching accounts
            </p>
          </div>
          <Link
            href="/admin/accounts"
            className="text-xs font-medium text-blue-600"
          >
            All accounts →
          </Link>
        </div>
        {signups.length ? (
          signups.map((s) => (
            <Link
              key={s.id}
              href={`/admin/creators/${s.id}`}
              className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium">{s.name || s.email}</p>
                <p className="mt-1 text-xs text-slate-500">{s.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs capitalize text-slate-500">
                  {s.accountType.toLowerCase().replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {s.createdAt.toLocaleDateString("en-NG", {
                    timeZone: "Africa/Lagos",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="border-t p-6 text-sm text-slate-400">
            No signups match this period and tool.
          </p>
        )}
      </section>
      <section>
        <h2 className="font-semibold">Platform footprint</h2>
        <p className="mt-1 text-xs text-slate-500">
          Current platform totals · independent of the period and tool filters
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Delivery projects", totals.projects],
            ["Managed projects", totals.managed],
            ["Workspaces", totals.workspaces],
            ["Portfolios", totals.portfolios],
            ["Content posts", totals.posts],
            ["Tasks", totals.tasks],
          ].map(([label, n]) => (
            <div key={label} className="rounded-xl border bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-semibold">
                {Number(n).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
      <p className="text-xs leading-6 text-slate-400">
        Revenue is collected NGN from verified live Paystack charges, not
        recurring revenue. Activity measures stored creation events, not page
        views or sessions; deleted activity records are excluded; verified
        revenue survives account deletion. Tool signup attribution reflects
        usage by period end, not acquisition source. Creators may use several
        tools, so tool counts overlap. Project Management and Community have no
        separately attributed payment types.
      </p>
    </main>
  );
}
