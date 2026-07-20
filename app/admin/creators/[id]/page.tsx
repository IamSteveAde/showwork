import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import CreatorRowActions from "@/components/admin/CreatorRowActions";
import DeleteCreatorButton from "@/components/admin/DeleteCreatorButton";
import { whatsappLinkFor } from "@/lib/phone";

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
            {creator.phone && <p className="mt-1 text-sm text-white/40">{creator.phone}</p>}
            <p className="mt-1 text-xs text-white/30">
              Joined {creator.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {creator.phone && (
              <a
                href={whatsappLinkFor(creator.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
                style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.85L2.05 22l5.36-1.4a9.9 9.9 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.13-2.9-7C17 3.03 14.53 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.25 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
                </svg>
                Chat on WhatsApp
              </a>
            )}
            <DeleteCreatorButton creatorId={creator.id} creatorLabel={creator.name || creator.email} />
          </div>
        </div>

        <div className="mb-10 rounded-xl p-6" style={{ background: COLOR.charcoal }}>
          <h2 className="mb-4 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
            Plan & access
          </h2>
          <CreatorRowActions
            creatorId={creator.id}
            isComped={creator.isComped}
            discountPercent={creator.discountPercent}
            freeTierLimitOverride={creator.freeTierLimitOverride}
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