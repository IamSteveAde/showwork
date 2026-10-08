"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="p-8">
      <div className="rounded-2xl border bg-white p-8">
        <h2 className="text-xl font-semibold">Couldn’t load this admin page</h2>
        <p className="mt-2 text-sm text-slate-500">
          Please try again to refresh the data.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
