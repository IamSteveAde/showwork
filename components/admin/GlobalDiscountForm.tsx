import Link from "next/link";
export default function GlobalDiscountForm({ currentPercent }: { currentPercent: number }) {
  return <div className="space-y-3"><p className="text-sm leading-6 text-slate-600">Manage product-specific discounts, durations, selected users and complimentary subscriptions in Billing Benefits.</p>{currentPercent > 0 && <p className="text-xs text-slate-500">Previous Delivery default: {currentPercent}%. Migrated offers are listed in the manager.</p>}<Link href="/admin/billing-offers" className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Manage billing benefits →</Link></div>;
}
