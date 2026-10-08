import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Download, ArrowUpRight, Users } from "lucide-react";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  customerFilters,
  customerQuery,
  CUSTOMER_PRODUCTS,
  CUSTOMER_STATUSES,
  type CustomerParams,
} from "@/lib/adminCustomerFilters";
import { getCustomers } from "@/lib/adminCustomers";
import CustomerFiltersForm from "@/components/admin/CustomerFilters";
import { AdminMetric, ngn } from "@/components/admin/AdminMetrics";
const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  mixed: "bg-amber-50 text-amber-700",
  expired: "bg-amber-50 text-amber-700",
  one_time: "bg-blue-50 text-blue-700",
  complimentary: "bg-violet-50 text-violet-700",
  trial: "bg-cyan-50 text-cyan-700",
  archived: "bg-slate-100 text-slate-500",
  pending: "bg-slate-100 text-slate-600",
};
function date(value: Date | string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-NG", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}
const label = (value: string | null) =>
  value
    ? value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Not recorded";
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<CustomerParams>;
}) {
  const admin = await getCurrentCreator();
  if (!admin) redirect("/login");
  if (!isAdminEmail(admin.email)) notFound();
  const f = customerFilters(await searchParams);
  const data = await getCustomers(f);
  const { summary: s, rows, page, pages } = data;
  const period = f.from || f.to;
  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-blue-600">
            Customer relationships
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Customers
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            See who pays for Showwork, what they buy and where their
            subscriptions stand.
          </p>
        </div>
        <a
          href={`/api/admin/customers/export?${customerQuery(f, { page: "1" })}`}
          className={`inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ${f.error ? "pointer-events-none opacity-40" : ""}`}
          aria-disabled={!!f.error}
        >
          <Download size={16} />
          Export filtered CSV
        </a>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          label="Customers"
          value={s.customers.toLocaleString()}
          detail={`${s.rows} customer–product relationships match your filters`}
        />
        <AdminMetric
          label="Active customer products"
          value={s.active.toLocaleString()}
          detail={`${s.expired} expired customer–product relationships`}
        />
        <AdminMetric
          label={period ? "Payments in period" : "Verified payments · all time"}
          value={s.payments.toLocaleString()}
          detail="Real, verified payments only"
        />
        <AdminMetric
          label={period ? "Collected in period" : "Lifetime collected"}
          value={ngn(s.revenue)}
          detail="Totals for all matching rows, across every page"
        />
      </div>
      <CustomerFiltersForm key={customerQuery(f)} filters={f} />
      {f.error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        >
          {f.error} Showing all payment dates.
        </p>
      )}
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
          <div>
            <h2 className="font-semibold">Customer directory</h2>
            <p className="mt-1 text-xs text-slate-500">
              One row per customer and product · current status and lifetime
              payment history
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {s.rows
              ? `${(page - 1) * 25 + 1}–${Math.min(page * 25, s.rows)} of ${s.rows}`
              : "0 results"}
          </span>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-500">
                <tr>
                  {[
                    "Customer",
                    "Product & plan",
                    "Status",
                    "Payments",
                    "Collected",
                    "Last payment",
                    "Billing & history",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={`${r.key}:${r.product}`}
                    className="border-b align-top last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="max-w-[240px] px-5 py-5">
                      <div className="font-medium">
                        {r.creatorId ? (
                          <Link
                            href={`/admin/creators/${r.creatorId}`}
                            className="inline-flex items-center gap-1.5 hover:text-blue-600"
                          >
                            {r.name || r.email || "Customer"}
                            <ArrowUpRight size={13} />
                          </Link>
                        ) : (
                          "Archived customer"
                        )}
                      </div>
                      {r.email && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {r.email}
                        </p>
                      )}
                      {r.companyName && (
                        <p className="mt-1 text-xs text-slate-400">
                          {r.companyName}
                        </p>
                      )}
                      {r.phone && (
                        <p className="mt-1 text-xs text-slate-400">{r.phone}</p>
                      )}
                      {r.deactivated && (
                        <span className="mt-2 inline-block text-[10px] font-medium text-amber-700">
                          Account deactivated
                        </span>
                      )}
                      {!r.creatorId && (
                        <p className="mt-1 text-xs text-slate-400">
                          Historical payment retained
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      <p className="font-medium">
                        {CUSTOMER_PRODUCTS[
                          r.product as keyof typeof CUSTOMER_PRODUCTS
                        ] ?? r.product}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {r.status === "one_time"
                          ? "One-time purchase"
                          : label(r.plan)}
                      </p>
                      {r.cycle && r.status !== "one_time" && (
                        <p className="mt-1 text-xs text-slate-400">
                          {label(r.cycle)} billing
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[r.status] ?? statusStyle.pending}`}
                      >
                        {CUSTOMER_STATUSES[
                          r.status as keyof typeof CUSTOMER_STATUSES
                        ] ?? r.status}
                      </span>
                      {r.product === "portfolio" &&
                        (r.portfolioActiveCount > 0 ||
                          r.portfolioExpiredCount > 0) && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            {r.portfolioActiveCount} active ·{" "}
                            {r.portfolioExpiredCount} expired portfolios
                          </p>
                        )}
                      {r.status === "archived" && (
                        <p className="mt-2 max-w-32 text-[11px] text-slate-400">
                          Current subscription status unavailable
                        </p>
                      )}
                      {r.lifetimePayments === 0 && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          No verified live payment
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      <p className="font-semibold tabular-nums">
                        {r.lifetimePayments.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Lifetime</p>
                      {period && (
                        <p className="mt-2 text-xs text-blue-600">
                          {r.periodPayments} in period
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-5">
                      <p className="font-semibold tabular-nums">
                        {ngn(r.lifetimeRevenue)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Lifetime</p>
                      {period && (
                        <p className="mt-2 text-xs text-blue-600">
                          {ngn(r.periodRevenue)} in period
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-5">
                      <p>{date(r.lastPaidAt)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        First: {date(r.firstPaidAt)}
                      </p>
                    </td>
                    <td className="min-w-[220px] px-5 py-5">
                      <p className="text-xs text-slate-500">
                        {r.status === "one_time"
                          ? "No recurring subscription"
                          : r.nextBillingAt
                            ? `${r.status === "trial" ? "Trial ends" : r.status === "complimentary" ? "Access ends" : r.status === "expired" ? "Recorded renewal" : "Next billing"}: ${date(r.nextBillingAt)}`
                            : "Billing date not recorded"}
                      </p>
                      {r.recentPayments.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium text-blue-600">
                            Recent payments ({r.recentPayments.length})
                          </summary>
                          <div className="mt-3 space-y-3">
                            {r.recentPayments.map((p) => (
                              <div
                                key={p.reference}
                                className="rounded-lg border bg-white p-2.5"
                              >
                                <p className="flex justify-between gap-3 text-xs font-medium">
                                  <span>{date(p.paidAt)}</span>
                                  <span>{ngn(p.amountNgn)}</span>
                                </p>
                                <p className="mt-1 text-[10px] text-slate-500">
                                  {label(p.type)}
                                </p>
                                <p className="mt-1 max-w-56 break-all font-mono text-[10px] text-slate-400">
                                  {p.reference}
                                </p>
                              </div>
                            ))}
                            <p className="text-[10px] text-slate-400">
                              Latest five payments for this product
                            </p>
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Users size={32} className="text-slate-300" />
            <h3 className="mt-4 font-semibold">
              No customers match these filters
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try a different product, status or payment period.
            </p>
            <Link
              href="/admin/customers"
              className="mt-4 text-sm font-medium text-blue-600"
            >
              Clear filters
            </Link>
          </div>
        )}
        {pages > 1 && (
          <nav
            aria-label="Customer pagination"
            className="flex items-center justify-between border-t px-6 py-4"
          >
            <span className="text-xs text-slate-500">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/customers?${customerQuery(f, { page: String(page - 1) })}`}
                  className="rounded-lg border px-3 py-2 text-xs"
                >
                  Previous
                </Link>
              )}
              {page < pages && (
                <Link
                  href={`/admin/customers?${customerQuery(f, { page: String(page + 1) })}`}
                  className="rounded-lg border px-3 py-2 text-xs"
                >
                  Next
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
      <p className="text-xs leading-6 text-slate-400">
        Subscription status reflects current billing access, independently of
        account deactivation. One-time purchases do not expire as subscriptions.
        Payment counts and collected amounts exclude test transactions and
        unverified charges. Date filters apply to verified payments in Lagos
        time; lifetime totals remain visible. CSV exports include every matching
        row and clearly label UTC timestamps.
      </p>
    </main>
  );
}
