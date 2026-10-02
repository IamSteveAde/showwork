export default function WorkspaceLoading() {
  return <div role="status" aria-live="polite" className="min-h-screen bg-[#F5F7FB] p-6 text-[#101828]">
    <div className="mx-auto max-w-6xl space-y-5">
      <p className="text-sm font-medium">Loading workspace…</p>
      <div aria-hidden="true" className="h-16 rounded-2xl bg-slate-200 motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-80 rounded-2xl bg-white" />
    </div>
  </div>;
}
