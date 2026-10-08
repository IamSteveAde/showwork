export function AdminMetric({
  label,
  value,
  detail,
  previous,
  current,
}: {
  label: string;
  value: string;
  detail?: string;
  previous?: number;
  current?: number;
}) {
  const change =
    previous !== undefined && current !== undefined && previous > 0
      ? ((current - previous) / previous) * 100
      : null;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {previous !== undefined && (
        <p
          className={`mt-3 text-xs ${change !== null && change < 0 ? "text-amber-700" : "text-blue-700"}`}
        >
          {change === null
            ? "No prior baseline"
            : `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs previous period`}
        </p>
      )}
      {detail && (
        <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
      )}
    </article>
  );
}
export const ngn = (n: number) => `₦${n.toLocaleString("en-NG")}`;
