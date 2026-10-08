export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-label="Loading admin workspace"
      className="space-y-6 p-8"
    >
      <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-36 animate-pulse rounded-2xl border bg-white"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border bg-white" />
      <span className="sr-only">Loading admin workspace…</span>
    </div>
  );
}
