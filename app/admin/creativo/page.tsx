import UiSymbol from "@/components/ui/UiSymbol";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import CreativoSettingsForm from "@/components/admin/creativo/CreativoSettingsForm";
import CreativoLeaderboardManager from "@/components/admin/creativo/CreativoLeaderboardManager";
import CreativoWebinarManager from "@/components/admin/creativo/CreativoWebinarManager";

const COLOR = { black: "#F6F8FB", gold: "#2563EB" };

export default async function CreativoAdminPage() {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) redirect("/login");

  const [settings, entries, webinars] = await Promise.all([
    db.platformSettings.findUnique({ where: { id: "singleton" } }),
    db.creativoLeaderboardEntry.findMany({ orderBy: [{ periodDate: "desc" }, { points: "desc" }] }),
       db.creativoWebinar.findMany({ orderBy: { startsAt: "desc" }, include: { speakers: { orderBy: { displayOrder: "asc" } } } }),
  ]);

  return (
    <main className="min-h-screen p-5 sm:p-8" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><>{" "}<UiSymbol name="left" />{" Back to admin "}</></Link>

                <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              Creativo
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Manage the landing page</h1>
          </div>
          <Link
            href="/admin/spotlight"
            className="rounded-lg px-4 py-2 text-xs font-semibold"
            style={{ background: "#EFF6FF", color: COLOR.gold }}
          ><>{" Manage Spotlight "}<UiSymbol name="right" />{" "}</></Link>
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