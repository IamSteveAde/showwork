import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { appUrl } from "@/lib/url";
import FileGridItem from "@/components/FileGridItem";
import CopyLinkButton from "@/components/CopyLinkButton";
import AddMoreFilesButton from "@/components/AddMoreFilesButton";
import SectionHeader from "@/components/SectionHeader";
import DeliveryStatusControl from "@/components/DeliveryStatusControl";
import EditableField from "@/components/EditableField";
import CollaboratorsPanel from "@/components/CollaboratorsPanel";
import type { CSSProperties, ReactNode } from "react";

const MAX_ADDITIONAL_UPLOAD_BATCHES = 3;

const COLOR = {
  black: "#08090B",
  gold: "#F5C842",
  goldSoft: "#FFE28A",
  orange: "#E8881A",
  panel: "#121419",
};

type WorkspaceView = "overview" | "work" | "access" | "team" | "activity";

function IconArrowLeft({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function IconExternal({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function IconDownload({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

function IconOverview({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function IconGlobe({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-6.5-3.6-9S9.6 5.5 12 3Z" />
    </svg>
  );
}

function IconUsers({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4.5a4 4 0 0 1 0 7.5" />
      <path d="M17 14a6 6 0 0 1 5 6" />
    </svg>
  );
}

function IconFiles({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="3" width="12" height="16" rx="2" />
      <path d="M8 7h5M8 11h5M8 15h3" />
      <path d="M16 7h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-1" />
    </svg>
  );
}

function IconActivity({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
    </svg>
  );
}

function IconPlus({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function IconRevision({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" />
      <path d="M4 4v4.6h4.6" />
    </svg>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: "rgba(245,200,66,0.09)", color: COLOR.goldSoft }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FFE28A]/70">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/30">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function Stat({
  value,
  label,
  tone = "default",
}: {
  value: string | number;
  label: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warning"
        ? "text-orange-300"
        : "text-white";

  return (
    <div className="rounded-[22px] border border-white/[0.055] bg-white/[0.032] p-5">
      <p className={`text-2xl font-semibold tracking-[-0.03em] ${toneClass}`}>{value}</p>
      <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-white/25">{label}</p>
    </div>
  );
}

function WorkspaceNavItem({
  href,
  label,
  description,
  active,
  icon,
  badge,
}: {
  href: string;
  label: string;
  description: string;
  active: boolean;
  icon: ReactNode;
  badge?: string | number;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all ${
        active
          ? "border-[#F5C842]/16 bg-[#F5C842]/[0.08] text-white"
          : "border-transparent text-white/42 hover:border-white/[0.05] hover:bg-white/[0.035] hover:text-white/75"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active ? "bg-[#F5C842]/10 text-[#FFE28A]" : "bg-white/[0.035] text-white/30 group-hover:text-white/55"
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-semibold">{label}</span>
          {badge !== undefined ? (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${active ? "bg-[#F5C842]/10 text-[#FFE28A]" : "bg-white/[0.045] text-white/28"}`}>
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-white/23">{description}</span>
      </span>
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition ${
        active
          ? "border-[#F5C842]/20 bg-[#F5C842]/10 text-[#FFE28A]"
          : "border-white/[0.06] bg-white/[0.025] text-white/38"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const { projectId } = await params;
  const { view } = await searchParams;

  const allowedViews: WorkspaceView[] = ["overview", "work", "access", "team", "activity"];
  const activeView: WorkspaceView = allowedViews.includes(view as WorkspaceView)
    ? (view as WorkspaceView)
    : "overview";

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      media: {
        orderBy: { displayOrder: "asc" },
        include: {
          reviews: { orderBy: { createdAt: "asc" } },
          videoComments: { orderBy: { createdAt: "asc" } },
        },
      },
      sections: {
        orderBy: { displayOrder: "asc" },
        include: {
          media: {
            where: { folderId: null },
            orderBy: { displayOrder: "asc" },
            include: {
              reviews: { orderBy: { createdAt: "asc" } },
              videoComments: { orderBy: { createdAt: "asc" } },
            },
          },
          folders: {
            orderBy: { displayOrder: "asc" },
            include: {
              media: {
                orderBy: { displayOrder: "asc" },
                include: {
                  reviews: { orderBy: { createdAt: "asc" } },
                  videoComments: { orderBy: { createdAt: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project || project.creatorId !== creator.id) {
    notFound();
  }

  const viewerEmails = await db.viewerEmail.findMany({
    where: { projectId: project.id },
    orderBy: { viewedAt: "desc" },
  });

  const isLive = true;
  const liveUrl = `${appUrl()}/${project.slug}`;
  const totalFiles = project.media.length;
  const approvedCount = project.media.filter((m) => m.approvalStatus === "APPROVED").length;
  const needsRevisionCount = project.media.filter((m) => m.approvalStatus === "NEEDS_REVISION").length;
  const pendingCount = totalFiles - approvedCount - needsRevisionCount;
  const allApproved = totalFiles > 0 && approvedCount === totalFiles;
  const ungroupedMedia = project.media.filter((m) => !m.sectionId);

  const uploadSessionsRemaining =
    creator.subscriptionActive || creator.isComped
      ? Infinity
      : MAX_ADDITIONAL_UPLOAD_BATCHES - project.additionalUploadCount;

  const sectionsWithFiles = project.sections.filter(
    (section) =>
      section.media.length > 0 ||
      section.folders.some((folder) => folder.media.length > 0)
  ).length;

  const progressPercent =
    totalFiles > 0 ? Math.round((approvedCount / totalFiles) * 100) : 0;

  const viewHref = (nextView: WorkspaceView) =>
    `/dashboard/${project.id}?view=${nextView}`;

  const pageMeta: Record<
    WorkspaceView,
    { eyebrow: string; title: string; description: string }
  > = {
    overview: {
      eyebrow: "Project overview",
      title: "Everything important, at a glance.",
      description:
        "Track delivery progress, project status and the next actions that keep this client moving.",
    },
    work: {
      eyebrow: "The work",
      title: "Files, feedback and approvals.",
      description:
        "Manage everything being delivered to the client without mixing it with access, people or activity.",
    },
    access: {
      eyebrow: "Client access",
      title: "Control the client experience.",
      description:
        "Share the live delivery portal and manage the access code your client uses to enter it.",
    },
    team: {
      eyebrow: "Collaboration",
      title: "The people behind the project.",
      description:
        "Manage the teammates and collaborators who can help move this delivery forward.",
    },
    activity: {
      eyebrow: "Client activity",
      title: "See who is showing up.",
      description:
        "Understand who has opened the delivery and when they last visited.",
    },
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090B] text-white">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-52 -top-52 h-[700px] w-[700px] rounded-full blur-[170px]"
          style={{
            background:
              "radial-gradient(circle, rgba(245,200,66,0.065), transparent 68%)",
          }}
        />
        <div
          className="absolute right-[-250px] top-[22%] h-[680px] w-[680px] rounded-full blur-[180px]"
          style={{
            background:
              "radial-gradient(circle, rgba(232,136,26,0.035), transparent 70%)",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.045] bg-[#08090B]/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/projects"
            className="group inline-flex items-center gap-2.5 text-sm text-white/35 transition hover:text-white"
          >
            <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">All projects</span>
            <span className="sm:hidden">Projects</span>
          </Link>

          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 items-center gap-3 md:flex">
              <span className="max-w-[260px] truncate text-xs font-medium text-white/55">
                {project.clientName}
              </span>
              <span className="h-3 w-px bg-white/[0.07]" />
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.055] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {isLive ? "Live" : "Offline"}
            </span>

            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3.5 py-2 text-[11px] font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white sm:inline-flex"
            >
              Client view
              <IconExternal className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Mobile project identity */}
      <div className="relative z-20 border-b border-white/[0.04] px-4 pb-4 pt-5 lg:hidden sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#FFE28A]/55">
              Project workspace
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-[-0.03em]">
              {project.clientName}
            </h1>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold text-[#FFE28A]">{progressPercent}%</p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-white/20">approved</p>
          </div>
        </div>

        <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            <MobileNavItem href={viewHref("overview")} label="Overview" active={activeView === "overview"} />
            <MobileNavItem href={viewHref("work")} label={`Work · ${totalFiles}`} active={activeView === "work"} />
            <MobileNavItem href={viewHref("access")} label="Client access" active={activeView === "access"} />
            <MobileNavItem href={viewHref("team")} label="Team" active={activeView === "team"} />
            <MobileNavItem href={viewHref("activity")} label={`Activity · ${viewerEmails.length}`} active={activeView === "activity"} />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[286px] shrink-0 border-r border-white/[0.045] lg:flex lg:flex-col">
          <div className="border-b border-white/[0.045] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#FFE28A]/50">
              Project workspace
            </p>

            <div className="mt-3 min-w-0">
              <EditableField
                projectId={project.id}
                field="clientName"
                value={project.clientName}
                displayClassName="block max-w-full truncate text-xl font-semibold tracking-[-0.03em] text-white"
                inputClassName="w-full rounded-xl px-3 py-2 text-base font-semibold text-white"
                confirmMessage="Renaming this project will also change its link. Any link you've already sent your client will stop working. Continue?"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.05] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-white/30">Approval progress</span>
                <span className="text-xs font-semibold text-[#FFE28A]">{progressPercent}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progressPercent}%`, background: COLOR.gold }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[9px] text-white/20">
                <span>{approvedCount} approved</span>
                <span>{totalFiles} files</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <p className="px-3 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/16">
              Workspace
            </p>

            <div className="space-y-1">
              <WorkspaceNavItem
                href={viewHref("overview")}
                label="Overview"
                description="Status and project health"
                active={activeView === "overview"}
                icon={<IconOverview className="h-[17px] w-[17px]" />}
              />
              <WorkspaceNavItem
                href={viewHref("work")}
                label="Work"
                description="Files, feedback and approvals"
                active={activeView === "work"}
                icon={<IconFiles className="h-[17px] w-[17px]" />}
                badge={totalFiles}
              />
            </div>

            <p className="px-3 pb-2 pt-6 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/16">
              Client
            </p>

            <div className="space-y-1">
              <WorkspaceNavItem
                href={viewHref("access")}
                label="Client access"
                description="Portal link and access code"
                active={activeView === "access"}
                icon={<IconGlobe className="h-[17px] w-[17px]" />}
              />
              <WorkspaceNavItem
                href={viewHref("activity")}
                label="Activity"
                description="Who has viewed the project"
                active={activeView === "activity"}
                icon={<IconActivity className="h-[17px] w-[17px]" />}
                badge={viewerEmails.length}
              />
            </div>

            <p className="px-3 pb-2 pt-6 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/16">
              Collaboration
            </p>

            <WorkspaceNavItem
              href={viewHref("team")}
              label="Team"
              description="People working on delivery"
              active={activeView === "team"}
              icon={<IconUsers className="h-[17px] w-[17px]" />}
            />
          </nav>

          <div className="border-t border-white/[0.045] p-3">
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-white/[0.055] bg-white/[0.028] px-4 py-3 text-xs font-semibold text-white/52 transition hover:bg-white/[0.06] hover:text-white"
            >
              <span>Open client portal</span>
              <IconExternal className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <a
              href={`/api/projects/${project.id}/report`}
              download
              className="mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-medium text-white/25 transition hover:bg-white/[0.025] hover:text-white/55"
            >
              <IconDownload className="h-3.5 w-3.5" />
              Download project report
            </a>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1120px] px-4 pb-24 pt-8 sm:px-6 md:pt-10 lg:px-10 lg:pb-28 lg:pt-12">
            {/* Page title */}
            <div className="mb-9 border-b border-white/[0.045] pb-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#FFE28A]/65">
                {pageMeta[activeView].eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-4xl md:text-[46px]">
                {pageMeta[activeView].title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/30">
                {pageMeta[activeView].description}
              </p>
            </div>

            {/* =====================================================
                OVERVIEW
            ====================================================== */}
            {activeView === "overview" && (
              <div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat value={totalFiles} label="Files" />
                  <Stat value={approvedCount} label="Approved" tone="success" />
                  <Stat value={needsRevisionCount} label="Revisions" tone="warning" />
                  <Stat value={viewerEmails.length} label="Client visits" />
                </div>

                <div className="mt-6">
                  <DeliveryStatusControl
                    projectId={project.id}
                    currentStatus={project.deliveryStatus}
                  />
                </div>

                {/* Project health */}
                <div className="mt-8 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
                  <div className="overflow-hidden rounded-[28px] border border-white/[0.05] bg-[#111318]">
                    <div className="border-b border-white/[0.045] p-6 sm:p-7">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/24">
                        Delivery health
                      </p>
                      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-4xl font-semibold tracking-[-0.05em] text-white">
                            {progressPercent}%
                          </p>
                          <p className="mt-1 text-sm text-white/28">of files approved</p>
                        </div>
                        <p className="max-w-sm text-xs leading-5 text-white/28">
                          {totalFiles === 0
                            ? "Add the first files to begin this delivery."
                            : needsRevisionCount > 0
                              ? `${needsRevisionCount} file${needsRevisionCount === 1 ? "" : "s"} need attention before the project can move forward.`
                              : allApproved
                                ? "Everything is approved. This delivery is ready for the next stage."
                                : `${pendingCount} file${pendingCount === 1 ? "" : "s"} are still awaiting client review.`}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 sm:p-7">
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progressPercent}%`, background: COLOR.gold }}
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-lg font-semibold text-emerald-300">{approvedCount}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-white/20">Approved</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-orange-300">{needsRevisionCount}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-white/20">Revisions</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white/70">{pendingCount}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-white/20">Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/[0.05] bg-white/[0.025] p-6 sm:p-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/24">
                      Quick actions
                    </p>

                    <div className="mt-5 space-y-2">
                      <Link
                        href={viewHref("work")}
                        scroll={false}
                        className="group flex items-center justify-between rounded-2xl bg-white/[0.035] px-4 py-3.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.065] hover:text-white"
                      >
                        <span>Manage project files</span>
                        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>

                      <Link
                        href={viewHref("access")}
                        scroll={false}
                        className="group flex items-center justify-between rounded-2xl bg-white/[0.035] px-4 py-3.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.065] hover:text-white"
                      >
                        <span>Manage client access</span>
                        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>

                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        <span>Open client portal</span>
                        <IconExternal className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Next attention */}
                <div className="mt-5 rounded-[28px] border border-white/[0.05] bg-white/[0.022] p-6 sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          needsRevisionCount > 0
                            ? "bg-orange-400/10 text-orange-300"
                            : allApproved
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-[#F5C842]/10 text-[#FFE28A]"
                        }`}
                      >
                        {needsRevisionCount > 0 ? (
                          <IconRevision className="h-5 w-5" />
                        ) : allApproved ? (
                          <IconCheck className="h-5 w-5" />
                        ) : (
                          <IconFiles className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {needsRevisionCount > 0
                            ? "Revisions need your attention."
                            : allApproved
                              ? "Everything is approved."
                              : totalFiles === 0
                                ? "Start by adding the work."
                                : "The project is waiting on client review."}
                        </p>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-white/28">
                          {needsRevisionCount > 0
                            ? "Open Work to review the notes attached to the affected files."
                            : allApproved
                              ? "Every file in this delivery has been approved by the client."
                              : totalFiles === 0
                                ? "Create sections and upload the files you want the client to review."
                                : `${pendingCount} file${pendingCount === 1 ? "" : "s"} still need a decision from the client.`}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={viewHref("work")}
                      scroll={false}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-xs font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      Open work
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================
                WORK
            ====================================================== */}
            {activeView === "work" && (
              <div>
                <div className="mb-7 rounded-[28px] border border-[#F5C842]/10 bg-[#171518] p-6 sm:p-7">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#FFE28A]">
                        Keep the project moving.
                      </p>
                      <p className="mt-2 max-w-xl text-xs leading-5 text-white/32">
                        Add new files or sections whenever the work evolves. Your
                        client will always see the latest version in their delivery.
                      </p>
                    </div>

                    <div className="shrink-0">
                      <AddMoreFilesButton
                        projectId={project.id}
                        remaining={uploadSessionsRemaining}
                      />
                    </div>
                  </div>
                </div>

                {needsRevisionCount > 0 && (
                  <div className="mb-7 rounded-[22px] border border-orange-400/10 bg-orange-400/[0.06] px-5 py-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-400/10 text-orange-300">
                        <IconRevision className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-orange-200">
                          {needsRevisionCount} file{needsRevisionCount === 1 ? "" : "s"} need
                          {needsRevisionCount === 1 ? "s" : ""} attention.
                        </p>
                        <p className="mt-1 text-xs leading-5 text-orange-200/45">
                          Your client has requested changes. Review the notes attached
                          to the affected files below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {allApproved && needsRevisionCount === 0 && (
                  <div className="mb-7 rounded-[22px] border border-emerald-400/10 bg-emerald-400/[0.055] px-5 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                        <IconCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-200">
                          Everything is approved.
                        </p>
                        <p className="mt-1 text-xs text-emerald-200/40">
                          Your client has approved every file in this project.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <SectionIntro
                  eyebrow="Project files"
                  title="Everything you're delivering"
                  description={
                    totalFiles > 0
                      ? `${approvedCount} approved · ${needsRevisionCount} revision${
                          needsRevisionCount === 1 ? "" : "s"
                        } · ${pendingCount} awaiting review`
                      : "Organize the work into sections and folders before it reaches the client."
                  }
                  icon={<IconFiles className="h-5 w-5" />}
                  action={
                    totalFiles > 0 ? (
                      <div className="hidden items-center gap-3 sm:flex">
                        <span className="text-xs text-white/20">
                          {sectionsWithFiles} section{sectionsWithFiles === 1 ? "" : "s"}
                        </span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progressPercent}%`, background: COLOR.gold }}
                          />
                        </div>
                      </div>
                    ) : undefined
                  }
                />

                {totalFiles === 0 ? (
                  <div className="rounded-[28px] border border-white/[0.05] bg-[#121419] px-6 py-20 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                      <IconFiles className="h-6 w-6 text-white/25" />
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-white">
                      Nothing here yet.
                    </h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/25">
                      Add your first section and start uploading the work you want
                      your client to see.
                    </p>
                    <div className="mt-6">
                      <AddMoreFilesButton
                        projectId={project.id}
                        remaining={uploadSessionsRemaining}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-14">
                    {project.sections.map((section) => (
                      <div key={section.id}>
                        <SectionHeader
                          projectId={project.id}
                          sectionId={section.id}
                          name={section.name}
                          mediaType={section.mediaType}
                          fileCount={
                            section.media.length +
                            section.folders.reduce(
                              (sum, folder) => sum + folder.media.length,
                              0
                            )
                          }
                          uploadSessionsRemaining={uploadSessionsRemaining}
                        />

                        {section.media.length > 0 && (
                          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {section.media.map((m) => (
                              <FileGridItem
                                key={m.id}
                                mediaId={m.id}
                                url={publicUrlFor(m.fileKey)}
                                filename={m.fileKey.split("/").pop() ?? "file"}
                                caption={m.caption}
                                type={m.type}
                                approvalStatus={m.approvalStatus}
                                approvalNote={m.approvalNote}
                                reviews={m.reviews.map((r) => ({
                                  reviewerName: r.reviewerName,
                                  reviewerEmail: r.reviewerEmail,
                                  status: r.status as "APPROVED" | "NEEDS_REVISION",
                                  note: r.note,
                                  createdAt: r.createdAt.toISOString(),
                                }))}
                                comments={m.videoComments.map((c) => ({
                                  id: c.id,
                                  reviewerName: c.reviewerName,
                                  reviewerEmail: c.reviewerEmail,
                                  note: c.note,
                                  videoTimestampSeconds: c.videoTimestampSeconds,
                                  createdAt: c.createdAt.toISOString(),
                                }))}
                              />
                            ))}
                          </div>
                        )}

                        {section.folders.map((folder) => (
                          <div
                            key={folder.id}
                            className="mt-8 rounded-[24px] border border-white/[0.04] bg-white/[0.022] p-5 sm:p-6"
                          >
                            <div className="mb-5 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-white/70">
                                  {folder.name}
                                </p>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-white/20">
                                  {folder.media.length} file{folder.media.length === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                              {folder.media.map((m) => (
                                <FileGridItem
                                  key={m.id}
                                  mediaId={m.id}
                                  url={publicUrlFor(m.fileKey)}
                                  filename={m.fileKey.split("/").pop() ?? "file"}
                                  caption={m.caption}
                                  type={m.type}
                                  approvalStatus={m.approvalStatus}
                                  approvalNote={m.approvalNote}
                                  reviews={m.reviews.map((r) => ({
                                    reviewerName: r.reviewerName,
                                    reviewerEmail: r.reviewerEmail,
                                    status: r.status as "APPROVED" | "NEEDS_REVISION",
                                    note: r.note,
                                    createdAt: r.createdAt.toISOString(),
                                  }))}
                                  comments={m.videoComments.map((c) => ({
                                    id: c.id,
                                    reviewerName: c.reviewerName,
                                    reviewerEmail: c.reviewerEmail,
                                    note: c.note,
                                    videoTimestampSeconds: c.videoTimestampSeconds,
                                    createdAt: c.createdAt.toISOString(),
                                  }))}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {ungroupedMedia.length > 0 && (
                      <div>
                        <div className="mb-5">
                          <p className="text-sm font-semibold text-white/70">Other files</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-white/20">
                            {ungroupedMedia.length} file{ungroupedMedia.length === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                          {ungroupedMedia.map((m) => (
                            <FileGridItem
                              key={m.id}
                              mediaId={m.id}
                              url={publicUrlFor(m.fileKey)}
                              filename={m.fileKey.split("/").pop() ?? "file"}
                              caption={m.caption}
                              type={m.type}
                              approvalStatus={m.approvalStatus}
                              approvalNote={m.approvalNote}
                              reviews={m.reviews.map((r) => ({
                                reviewerName: r.reviewerName,
                                reviewerEmail: r.reviewerEmail,
                                status: r.status as "APPROVED" | "NEEDS_REVISION",
                                note: r.note,
                                createdAt: r.createdAt.toISOString(),
                              }))}
                              comments={m.videoComments.map((c) => ({
                                id: c.id,
                                reviewerName: c.reviewerName,
                                reviewerEmail: c.reviewerEmail,
                                note: c.note,
                                videoTimestampSeconds: c.videoTimestampSeconds,
                                createdAt: c.createdAt.toISOString(),
                              }))}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =====================================================
                CLIENT ACCESS
            ====================================================== */}
            {activeView === "access" && (
              <div>
                <SectionIntro
                  eyebrow="Client portal"
                  title="Give the client one clear way in."
                  description="Everything your client needs to access this delivery lives here."
                  icon={<IconGlobe className="h-5 w-5" />}
                />

                <div className="overflow-hidden rounded-[30px] border border-white/[0.05] bg-[#121419]">
                  <div className="border-b border-white/[0.045] p-6 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">Client portal</span>
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Live
                          </span>
                        </div>
                        <p className="mt-2 max-w-lg text-xs leading-5 text-white/30">
                          Share this link with your client. It opens the polished,
                          client-facing version of this delivery.
                        </p>

                        <div className="mt-5 flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.025] px-4 py-3">
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1 truncate text-xs font-medium text-[#FFE28A]"
                          >
                            {liveUrl}
                          </a>
                          <CopyLinkButton url={liveUrl} />
                        </div>
                      </div>

                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-semibold text-black transition hover:bg-white/90"
                      >
                        Open client portal
                        <IconExternal className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="rounded-[22px] border border-white/[0.045] bg-white/[0.025] p-5">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                            Client access code
                          </p>
                          <p className="mt-1.5 text-xs leading-5 text-white/25">
                            Your client uses this code to unlock the delivery.
                          </p>
                        </div>

                        {project.accessCode ? (
                          <div className="flex items-center gap-3">
                            <EditableField
                              projectId={project.id}
                              field="accessCode"
                              value={project.accessCode}
                              displayClassName="rounded-xl bg-white/[0.06] px-4 py-2.5 font-mono text-sm font-semibold tracking-[0.12em] text-white"
                              displayStyle={{ background: "rgba(255,255,255,0.06)" }}
                              inputClassName="rounded-xl px-4 py-2.5 font-mono text-sm font-semibold text-white"
                              monospace
                            />
                            <CopyLinkButton url={project.accessCode} />
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs text-white/25">No access code set</span>
                            <EditableField
                              projectId={project.id}
                              field="accessCode"
                              value=""
                              displayClassName="rounded-xl bg-[#F5C842]/10 px-4 py-2.5 text-xs font-semibold text-[#F5C842]"
                              displayStyle={{ background: "rgba(245,200,66,0.10)", color: COLOR.gold }}
                              inputClassName="rounded-xl px-4 py-2.5 font-mono text-sm font-semibold text-white"
                              monospace
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/[0.045] bg-white/[0.022] p-5 sm:p-6">
                  <p className="text-xs font-semibold text-white/60">A cleaner client experience</p>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-white/25">
                    The client portal is intentionally separate from this workspace.
                    Your team gets the controls; your client gets only the presentation,
                    review and approval experience they need.
                  </p>
                </div>
              </div>
            )}

            {/* =====================================================
                TEAM
            ====================================================== */}
            {activeView === "team" && (
              <div>
                <SectionIntro
                  eyebrow="Team"
                  title="People on this project"
                  description="Manage who can collaborate on this delivery."
                  icon={<IconUsers className="h-5 w-5" />}
                />

                <div className="rounded-[28px] border border-white/[0.045] bg-white/[0.02] p-1">
                  <CollaboratorsPanel projectId={project.id} />
                </div>
              </div>
            )}

            {/* =====================================================
                ACTIVITY
            ====================================================== */}
            {activeView === "activity" && (
              <div>
                <SectionIntro
                  eyebrow="Client activity"
                  title="Who's viewing"
                  description="See who has accessed this delivery and when."
                  icon={<IconActivity className="h-5 w-5" />}
                />

                {viewerEmails.length === 0 ? (
                  <div className="rounded-[28px] border border-white/[0.045] bg-white/[0.022] px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.035] text-white/25">
                      <IconActivity className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-white/40">
                      No client activity yet.
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/22">
                      Once someone opens the delivery, their visit will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[28px] border border-white/[0.045] bg-white/[0.022]">
                    <div className="border-b border-white/[0.04] px-5 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-white/50">
                          Recent visitors
                        </p>
                        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold text-white/25">
                          {viewerEmails.length}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-white/[0.04]">
                      {viewerEmails.map((viewer) => (
                        <div
                          key={viewer.id}
                          className="flex flex-col gap-2 px-5 py-4 transition hover:bg-white/[0.018] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        >
                          <div className="min-w-0">
                            {viewer.name ? (
                              <p className="truncate text-sm font-medium text-white/72">
                                {viewer.name}
                              </p>
                            ) : null}
                            <p
                              className={`truncate text-xs ${
                                viewer.name ? "mt-0.5 text-white/30" : "text-white/65"
                              }`}
                            >
                              {viewer.email}
                            </p>
                          </div>

                          <span className="shrink-0 text-[10px] text-white/20">
                            {new Date(viewer.viewedAt).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-7 text-center sm:flex-row sm:text-left">
              <p className="text-xs text-white/18">{project.clientName} · Showwork</p>
              <Link
                href="/dashboard/projects"
                className="text-xs text-white/24 transition hover:text-white/55"
              >
                Back to all projects
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
