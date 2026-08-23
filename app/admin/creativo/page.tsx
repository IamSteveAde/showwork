import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import CreativoSettingsForm from "@/components/admin/creativo/CreativoSettingsForm";
import CreativoLeaderboardManager from "@/components/admin/creativo/CreativoLeaderboardManager";
import CreativoWebinarManager from "@/components/admin/creativo/CreativoWebinarManager";

const COLOR = { black: "#0A0A0A", gold: "#F5C842" };

export default async function CreativoAdminPage() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) redirect("/login");

  const [settings, entries, webinars] = await Promise.all([
    db.platformSettings.findUnique({ where: { id: "singleton" } }),
    db.creativoLeaderboardEntry.findMany({ orderBy: [{ periodDate: "desc" }, { points: "desc" }] }),
    db.creativoWebinar.findMany({ orderBy: { startsAt: "desc" } }),
  ]);

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to admin
        </Link>

                <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              Creativo
            </p>
            <h1 className="text-3xl font-bold text-white">Manage the landing page</h1>
          </div>
          <Link
            href="/admin/spotlight"
            className="rounded-lg px-4 py-2 text-xs font-semibold"
            style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
          >
            Manage Spotlight →
          </Link>
        </div>

        <div className="flex flex-col gap-6">
          <CreativoSettingsForm initialLabel={settings?.creativoMemberCountLabel ?? null} />
          <CreativoLeaderboardManager
            initialEntries={entries.map((e) => ({ ...e, periodDate: e.periodDate.toISOString() }))}
          />
          <CreativoWebinarManager
            initialWebinars={webinars.map((w) => ({ ...w, startsAt: w.startsAt.toISOString() }))}
          />
        </div>
      </div>
    </main>
  );
}