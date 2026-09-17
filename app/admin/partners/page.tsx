"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Partner = {
  id: string;
  referralCode: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  isActive: boolean;
  createdAt: string;
  creator: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  _count: {
    referrals: number;
  };
};

type DashboardData = {
  overview: {
    totalPartners: number;
    activePartners: number;
    activeReferrals: number;
    pendingCommissions: number;
    pendingPayouts: number;
    totalCommissions: number;
    totalPayouts: number;
  };
  referrals: {
    pending: number;
    active: number;
    expired: number;
    disqualified: number;
  };
  commissions: {
    pending: {
      count: number;
      amountNgn: number;
    };
    approved: {
      count: number;
      amountNgn: number;
    };
    paid: {
      count: number;
      amountNgn: number;
    };
    voided: {
      count: number;
      amountNgn: number;
    };
  };
  payouts: {
    pending: {
      count: number;
      amountNgn: number;
    };
    approved: {
      count: number;
      amountNgn: number;
    };
    paid: {
      count: number;
      amountNgn: number;
    };
    rejected: {
      count: number;
      amountNgn: number;
    };
  };
  partners: Partner[];
};

type ApiResponse =
  | DashboardData
  | {
      error: string;
    };

export default function AdminPartnersPage() {
const [data, setData] = useState<DashboardData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/admin/partners", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok || "error" in result) {
          throw new Error(
            "error" in result
              ? result.error
              : "Failed to load partner data."
          );
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load partner data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

    async function handlePartnerAction(
    partnerId: string,
    action: "approve" | "reject"
  ) {
    try {
      setProcessingId(partnerId);
      setError("");

      const response = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Failed to ${action === "approve" ? "approve" : "reject"} partner.`
        );
      }

      const refreshResponse = await fetch("/api/admin/partners", {
        method: "GET",
        cache: "no-store",
      });

      const refreshedData = (await refreshResponse.json()) as ApiResponse;

      if (!refreshResponse.ok || "error" in refreshedData) {
        throw new Error(
          "Partner action succeeded, but the partner list could not be refreshed."
        );
      }

      setData(refreshedData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action === "approve" ? "approve" : "reject"} partner.`
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 text-[#101828] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-xs font-medium text-[#667085] transition hover:text-[#2478FF]"
            >
              ← Back to Admin
            </Link>

            <p className="mt-6 text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Operations
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
              Partner Program
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
              Manage partners, referrals, commissions and payout requests.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B42318]">
            {error}
          </div>
        )}

        {/* Overview */}
        <section className="mt-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Partners"
              value={
                loading
                  ? "—"
                  : formatNumber(data?.overview.totalPartners ?? 0)
              }
              description={
                loading
                  ? "Loading..."
                  : `${formatNumber(
                      data?.overview.activePartners ?? 0
                    )} currently active`
              }
            />

            <MetricCard
              label="Active Referrals"
              value={
                loading
                  ? "—"
                  : formatNumber(data?.overview.activeReferrals ?? 0)
              }
              description="Customers currently active"
            />

            <MetricCard
              label="Pending Commissions"
              value={
                loading
                  ? "—"
                  : formatNgn(
                      data?.overview.pendingCommissions ?? 0
                    )
              }
              description={
                loading
                  ? "Loading..."
                  : `${formatNumber(
                      data?.commissions.pending.count ?? 0
                    )} commissions awaiting review`
              }
            />

            <MetricCard
              label="Pending Payouts"
              value={
                loading
                  ? "—"
                  : formatNgn(data?.overview.pendingPayouts ?? 0)
              }
              description={
                loading
                  ? "Loading..."
                  : `${formatNumber(
                      data?.payouts.pending.count ?? 0
                    )} requests awaiting processing`
              }
            />
          </div>
        </section>

        {/* Management */}
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Management
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
              Partner operations
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
  href="/admin/partners"
  className="group rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.025)] transition hover:-translate-y-0.5 hover:border-[#C9D9EC] hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
>
  <div className="flex items-start justify-between gap-4">
    <h3 className="text-sm font-semibold text-[#101828]">
      Partners
    </h3>

    <span className="text-[#98A2B3] transition group-hover:translate-x-0.5 group-hover:text-[#2478FF]">
      ↗
    </span>
  </div>

  <p className="mt-2 text-xs leading-5 text-[#667085]">
    View partner accounts, referral activity and partner status.
  </p>

  <div className="mt-5">
    <span className="inline-flex rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#475467]">
      {loading
        ? "Loading..."
        : `${formatNumber(
            data?.overview.totalPartners ?? 0
          )} partners`}
    </span>
  </div>
</Link>

            <Link
  href="/admin/partners/commissions"
  className="group rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.025)] transition hover:-translate-y-0.5 hover:border-[#C9D9EC] hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
>
  <div className="flex items-start justify-between gap-4">
    <h3 className="text-sm font-semibold text-[#101828]">
      Commissions
    </h3>

    <span className="text-[#98A2B3] transition group-hover:translate-x-0.5 group-hover:text-[#2478FF]">
      ↗
    </span>
  </div>

  <p className="mt-2 text-xs leading-5 text-[#667085]">
    Review, approve or void commissions generated from qualifying payments.
  </p>

  <div className="mt-5">
    <span className="inline-flex rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#475467]">
      {loading
        ? "Loading..."
        : `${formatNumber(
            data?.commissions.pending.count ?? 0
          )} pending`}
    </span>
  </div>
</Link>

            <Link
  href="/admin/partners/payouts"
  className="group rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.025)] transition hover:-translate-y-0.5 hover:border-[#C9D9EC] hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
>
  <div className="flex items-start justify-between gap-4">
    <h3 className="text-sm font-semibold text-[#101828]">
      Payouts
    </h3>

    <span className="text-[#98A2B3] transition group-hover:translate-x-0.5 group-hover:text-[#2478FF]">
      ↗
    </span>
  </div>

  <p className="mt-2 text-xs leading-5 text-[#667085]">
    Review payout requests and manage partner settlements.
  </p>

  <div className="mt-5">
    <span className="inline-flex rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#475467]">
      {loading
        ? "Loading..."
        : `${formatNumber(
            data?.payouts.pending.count ?? 0
          )} pending`}
    </span>
  </div>
</Link>
          </div>
        </section>

        {/* Referral overview */}
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Referrals
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
              Referral overview
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SmallStat
              label="Pending"
              value={
                loading
                  ? "—"
                  : formatNumber(data?.referrals.pending ?? 0)
              }
            />

            <SmallStat
              label="Active"
              value={
                loading
                  ? "—"
                  : formatNumber(data?.referrals.active ?? 0)
              }
            />

            <SmallStat
              label="Expired"
              value={
                loading
                  ? "—"
                  : formatNumber(data?.referrals.expired ?? 0)
              }
            />

            <SmallStat
              label="Disqualified"
              value={
                loading
                  ? "—"
                  : formatNumber(
                      data?.referrals.disqualified ?? 0
                    )
              }
            />
          </div>
        </section>

        {/* Commission overview */}
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Commissions
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
              Commission overview
            </h2>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#E4E7EC] bg-white shadow-[0_5px_24px_rgba(16,24,40,0.025)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-[#EAECF0] bg-[#FCFCFD]">
                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                      Status
                    </th>

                    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                      Commissions
                    </th>

                    <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <CommissionRow
                    label="Pending"
                    count={data?.commissions.pending.count ?? 0}
                    amount={data?.commissions.pending.amountNgn ?? 0}
                    loading={loading}
                  />

                  <CommissionRow
                    label="Approved"
                    count={data?.commissions.approved.count ?? 0}
                    amount={data?.commissions.approved.amountNgn ?? 0}
                    loading={loading}
                  />

                  <CommissionRow
                    label="Paid"
                    count={data?.commissions.paid.count ?? 0}
                    amount={data?.commissions.paid.amountNgn ?? 0}
                    loading={loading}
                  />

                  <CommissionRow
                    label="Voided"
                    count={data?.commissions.voided.count ?? 0}
                    amount={data?.commissions.voided.amountNgn ?? 0}
                    loading={loading}
                    last
                  />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Partner directory */}
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Directory
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                  Partners
                </h2>

                <p className="mt-1 text-xs text-[#667085]">
                  All enrolled partners and their referral activity.
                </p>
              </div>

              {!loading && data && (
                <p className="text-xs font-medium text-[#98A2B3]">
                  {formatNumber(data.partners.length)} total
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#E4E7EC] bg-white shadow-[0_5px_24px_rgba(16,24,40,0.025)]">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-[#98A2B3]">
                Loading partners...
              </div>
            ) : data?.partners.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-semibold text-[#101828]">
                  No partners yet
                </p>

                <p className="mt-1 text-xs text-[#667085]">
                  Partners will appear here after they join the Partner
                  Program.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-[#EAECF0] bg-[#FCFCFD]">
                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                        Partner
                      </th>

                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                        Referral Code
                      </th>

                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                        Referrals
                      </th>

                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
  Joined
</th>

<th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
  Actions
</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data?.partners.map((partner) => (
                      <PartnerRow
  key={partner.id}
  partner={partner}
  onAction={handlePartnerAction}
  processing={processingId === partner.id}
/>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Commission policy */}
        <section className="mt-10">
          <div className="rounded-[24px] border border-[#E4E7EC] bg-white p-6 shadow-[0_5px_24px_rgba(16,24,40,0.025)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Program rules
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">
              Commission structure
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <PolicyItem
                label="Commission"
                value="10%"
                description="Earned on qualifying payments."
              />

              <PolicyItem
                label="Commission window"
                value="12 months"
                description="Starts when a referred customer makes their first qualifying payment."
              />

              <PolicyItem
                label="Minimum payout"
                value="₦5,000"
                description="Approved commissions must reach this amount before payout."
              />
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              Quick access
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
              Partner tools
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminNavCard
              href="/admin"
              title="Admin Dashboard"
              description="Return to the main Showwork administration dashboard."
            />

            <AdminNavCard
              href="/dashboard/partners"
              title="Partner Dashboard"
              description="View the partner-facing experience and commission history."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.025)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#101828]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </div>
  );
}

function AdminActionCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.025)]">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold text-[#101828]">
          {title}
        </h3>

        <span className="shrink-0 rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[#667085]">
          {value}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-4 shadow-[0_5px_24px_rgba(16,24,40,0.02)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
        {value}
      </p>
    </div>
  );
}

function CommissionRow({
  label,
  count,
  amount,
  loading,
  last = false,
}: {
  label: string;
  count: number;
  amount: number;
  loading: boolean;
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-[#F2F4F7]"}>
      <td className="px-5 py-4">
        <span className="text-sm font-medium text-[#101828]">
          {label}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="text-sm text-[#667085]">
          {loading ? "—" : formatNumber(count)}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <span className="text-sm font-semibold text-[#101828]">
          {loading ? "—" : formatNgn(amount)}
        </span>
      </td>
    </tr>
  );
}

function PartnerRow({
  partner,
  onAction,
  processing,
}: {
  partner: Partner;
  onAction: (
    partnerId: string,
    action: "approve" | "reject"
  ) => Promise<void>;
  processing: boolean;
}) {
  const displayName =
    partner.creator.name?.trim() ||
    partner.creator.email;

  const statusConfig = {
    PENDING: {
      label: "Pending",
      className: "bg-[#FFF7E6] text-[#B54708]",
    },
    ACTIVE: {
      label: "Active",
      className: "bg-[#ECFDF3] text-[#027A48]",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-[#FEF3F2] text-[#B42318]",
    },
    SUSPENDED: {
      label: "Suspended",
      className: "bg-[#F2F4F7] text-[#667085]",
    },
  } as const;

  const status = statusConfig[partner.status];

  return (
    <tr className="border-b border-[#F2F4F7] last:border-b-0">
      <td className="px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#101828]">
            {displayName}
          </p>

          <p className="mt-1 truncate text-xs text-[#98A2B3]">
            {partner.creator.email}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="rounded-lg bg-[#F2F4F7] px-2.5 py-1.5 font-mono text-xs font-semibold tracking-[0.04em] text-[#475467]">
          {partner.referralCode}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="text-sm font-medium text-[#101828]">
          {formatNumber(partner._count.referrals)}
        </span>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <span className="text-xs text-[#667085]">
          {formatDate(partner.createdAt)}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        {partner.status === "PENDING" ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={processing}
             onClick={() => {
  const confirmed = window.confirm(
    "Reject this Partner Program application?\n\nThe creator will be notified by email and will need to submit a new application."
  );

  if (confirmed) {
    void onAction(partner.id, "reject");
  }
}}
              className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-xs font-semibold text-[#B42318] transition hover:border-[#FECACA] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Processing..." : "Reject"}
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={() => {
  const confirmed = window.confirm(
    "Approve this Partner Program application?\n\nThis will activate Partner Program access, generate their referral link, grant one complimentary month, and send the onboarding email."
  );

  if (confirmed) {
    void onAction(partner.id, "approve");
  }
}}
              className="rounded-lg bg-[#2478FF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1769E0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Processing..." : "Approve"}
            </button>
          </div>
        ) : (
          <span className="text-xs text-[#98A2B3]">
            —
          </span>
        )}
      </td>
    </tr>
  );
}

function PolicyItem({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[#101828]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </div>
  );
}

function AdminNavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_5px_24px_rgba(16,24,40,0.025)] transition hover:-translate-y-0.5 hover:border-[#C9D9EC] hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="truncate text-sm font-semibold text-[#101828]">
          {title}
        </h3>

        <span className="text-[#98A2B3] transition group-hover:translate-x-0.5 group-hover:text-[#2478FF]">
          ↗
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </Link>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NG").format(value);
}

function formatNgn(value: number) {
  return `₦${new Intl.NumberFormat("en-NG").format(value)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}