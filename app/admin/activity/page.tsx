import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { portfolioUrl } from "@/lib/portfolioUrl";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

function relativeTime(date: Date | null): string {
  if (!date) return "Never logged in";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

// A creator not seen in 30+ days (or never seen at all) reads as
// "gone quiet" — surfaced visually so this page actually answers "who
// should I check in on," not just "here's a list of dates."
function activityColor(date: Date | null): string {
  if (!date) return "#888786";
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 3) return "#4ade80"; // active recently
  if (diffDays <= 14) return "#F5C842"; // slowing down
  return "#f87171"; // quiet a while
}

export default async function AdminActivityPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();

  const creators = await db.creator.findMany({
    orderBy: [{ lastLoginAt: { sort: "desc", nulls: "last" } }],
    select: {
      id: true,
      name: true,
      email: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { projects: true } },
      portfolio: { select: { slug: true } },
    },
  });

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to admin
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Admin
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">Creator activity</h1>
        <p className="mb-10 text-sm text-white/40">
          Sorted by most recent login — the fastest way to see who's actively using the platform and who's gone quiet.
        </p>

        <div className="overflow-hidden rounded-xl" style={{ background: COLOR.charcoal }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-white/40" style={{ letterSpacing: "0.05em" }}>
                <th className="px-4 py-3 font-semibold">Creator</th>
                <th className="px-4 py-3 font-semibold">Last session</th>
                <th className="px-4 py-3 font-semibold">Projects</th>
                <th className="px-4 py-3 font-semibold">Portfolio</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/creators/${c.id}`} className="text-white hover:underline">
                      {c.name || "—"}
                    </Link>
                    <p className="text-xs text-white/30">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: activityColor(c.lastLoginAt) }}
                      />
                      {relativeTime(c.lastLoginAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{c._count.projects}</td>
                  <td className="px-4 py-3">
                    {c.portfolio ? (
                      <a
                        href={portfolioUrl(c.portfolio.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5"
                        style={{ color: COLOR.gold }}
                      >
                        Yes
                        <span className="text-white/30 underline decoration-white/20 hover:text-white/60">
                          {c.portfolio.slug}
                        </span>
                      </a>
                    ) : (
                      <span className="text-white/30">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/40">
                    {c.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {creators.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/30">
                    No creators yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}