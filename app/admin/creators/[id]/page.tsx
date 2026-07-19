import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import CreatorRowActions from "@/components/admin/CreatorRowActions";
import DeleteCreatorButton from "@/components/admin/DeleteCreatorButton";

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentCreator();
  if (!admin) redirect("/login");
  if (!isAdminEmail(admin.email)) notFound();

  const { id } = await params;

  const creator = await db.creator.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { media: true, viewerEmails: true } } },
      },
    },
  });
  if (!creator) notFound();

  // Every client email captured across every one of this creator's
  // projects — the "client customers email, associated to the account"
  // view specifically requested.
  const viewerEmails = await db.viewerEmail.findMany({
    where: { project: { creatorId: creator.id } },
    include: { project: { select: { clientName: true, slug: true } } },
    orderBy: { viewedAt: "desc" },
  });

  return (
    <main className="min-h-screen" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to admin
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              Creator
            </p>
            <h1 className="text-3xl font-bold text-white">{creator.name || creator.email}</h1>
            <p className="mt-1 text-sm text-white/40">{creator.email}</p>
            <p className="mt-1 text-xs text-white/30">
              Joined {creator.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <DeleteCreatorButton creatorId={creator.id} creatorLabel={creator.name || creator.email} />
        </div>

        <div className="mb-10 rounded-xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-4 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Plan & access
          </h2>
          <CreatorRowActions
            creatorId={creator.id}
            isComped={creator.isComped}
            discountPercent={creator.discountPercent}
            expanded
          />
        </div>

        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Projects ({creator.projects.length})
          </h2>
          <div className="flex flex-col gap-2">
            {creator.projects.length === 0 ? (
              <p className="text-sm text-white/30">No projects yet.</p>
            ) : (
              creator.projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-4 py-3 text-sm" style={{ background: COLOR.charcoal }}>
                  <span className="text-white">{p.clientName}</span>
                  <span className="text-xs text-white/30">
                    {p._count.media} files · {p._count.viewerEmails} views
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Client emails captured ({viewerEmails.length})
          </h2>
          {viewerEmails.length === 0 ? (
            <p className="text-sm text-white/30">No client has entered their email yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {viewerEmails.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md px-4 py-2.5 text-sm" style={{ background: COLOR.charcoal }}>
                  <span className="text-white/80">{v.email}</span>
                  <span className="text-xs text-white/30">
                    {v.project.clientName} · {v.viewedAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}