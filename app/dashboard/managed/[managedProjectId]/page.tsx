import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/url";
import ManagedProjectBrief from "@/components/ManagedProjectBrief";
import ManagedProjectCollaborators from "@/components/ManagedProjectCollaborators";
import ManagedProjectTasks from "@/components/ManagedProjectTasks";
import ManagedProjectPublish from "@/components/ManagedProjectPublish";
import CopyLinkButton from "@/components/CopyLinkButton";

const COLOR = {
  black: "#08090B",
  blue: "#2478FF",
  blueSoft: "#6EA2FF",
  white: "#FFFFFF",
  muted: "#858991",
};

function IconArrowLeft({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function IconArrowUpRight({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function IconBrief({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  );
}

function IconTasks({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 9 1.5 1.5L12 8" />
      <path d="M14 9h2" />
      <path d="m8 15 1.5 1.5L12 14" />
      <path d="M14 15h2" />
    </svg>
  );
}

function IconUsers({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4.5a4 4 0 0 1 0 7.5" />
      <path d="M17 14a6 6 0 0 1 5 6" />
    </svg>
  );
}

function IconSend({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function IconGlobe({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-6.5-3.6-9S9.6 5.5 12 3Z" />
    </svg>
  );
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SectionHeading({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{
          background: "rgba(36,120,255,0.09)",
          color: COLOR.blueSoft,
        }}
      >
        {icon}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold tracking-[0.12em] text-white/20">
            {number}
          </span>

          <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
            {title}
          </h2>
        </div>

        <p className="mt-1 text-sm text-white/30">
          {description}
        </p>
      </div>
    </div>
  );
}

function SideLink({
  href,
  number,
  label,
  active = false,
}: {
  href: string;
  number: string;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
        active
          ? "bg-white/[0.05]"
          : "hover:bg-white/[0.035]"
      }`}
    >
      <span
        className={`text-[9px] font-semibold ${
          active ? "text-[#4B8DFF]" : "text-white/20"
        }`}
      >
        {number}
      </span>

      <span
        className={`text-xs ${
          active
            ? "font-semibold text-white"
            : "text-white/35 group-hover:text-white/70"
        }`}
      >
        {label}
      </span>
    </a>
  );
}

export default async function ManagedProjectDetailPage({
  params,
}: {
  params: Promise<{ managedProjectId: string }>;
}) {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const { managedProjectId } = await params;

  const managedProject = await db.managedProject.findUnique({
    where: {
      id: managedProjectId,
    },
    include: {
      collaborators: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      deliveryProject: {
        select: {
          slug: true,
          accessCode: true,
        },
      },
    },
  });

  if (!managedProject) {
    notFound();
  }

  const isOwner = managedProject.creatorId === creator.id;

  const isCollaborator =
    !isOwner &&
    managedProject.collaborators.some(
      (c) => c.creatorId === creator.id
    );

  if (!isOwner && !isCollaborator) {
    notFound();
  }

  const assigneeOptions = [
    {
      id: managedProject.creatorId,
      name: creator.name,
      email: creator.email,
    },
    ...managedProject.collaborators
      .filter(
        (c) => c.creatorId !== managedProject.creatorId
      )
      .map((c) => ({
        id: c.creator.id,
        name: c.creator.name,
        email: c.creator.email,
      })),
  ];

  const portalUrl = managedProject.deliveryProject
    ? `${appUrl()}/${managedProject.deliveryProject.slug}`
    : null;

  const status = formatStatus(managedProject.status);

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background: COLOR.black,
      }}
    >
      {/* =====================================================
          SOFT BACKGROUND ATMOSPHERE
      ====================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -left-48 -top-48 h-[650px] w-[650px] rounded-full blur-[160px]"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,0.12), transparent 68%)",
          }}
        />

        <div
          className="absolute -right-48 top-[30%] h-[600px] w-[600px] rounded-full blur-[160px]"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,0.055), transparent 70%)",
          }}
        />

        <div
          className="absolute bottom-[-250px] left-[30%] h-[500px] w-[700px] rounded-full blur-[160px]"
          style={{
            background:
              "radial-gradient(circle, rgba(36,120,255,0.04), transparent 70%)",
          }}
        />
      </div>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="relative z-20">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-6 md:px-10">
          <Link
            href="/dashboard/projects"
            className="group inline-flex items-center gap-2.5 text-sm text-white/35 transition-colors hover:text-white"
          >
            <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Projects</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: managedProject.publishedAt
                  ? "#4ADE80"
                  : COLOR.blue,
              }}
            />

            <span className="text-xs text-white/35">
              {managedProject.publishedAt
                ? "Published"
                : status}
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 pb-28 pt-10 md:px-10 md:pt-16">
        {/* ===================================================
            PROJECT HERO
        ==================================================== */}

        <section>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-4xl">
              <p
                className="mb-5 text-[10px] font-semibold uppercase"
                style={{
                  color: COLOR.blueSoft,
                  letterSpacing: "0.16em",
                }}
              >
                Managed project
              </p>

              <h1 className="max-w-4xl break-words text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl">
                {managedProject.name}
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-6 text-white/35">
                Your project workspace for the brief, team,
                tasks and final delivery.
              </p>
            </div>

            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:bg-white/90"
              >
                View client portal

                <IconArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            )}
          </div>
        </section>

        {/* ===================================================
            SIMPLE PAGE NAVIGATION
        ==================================================== */}

        <nav className="mt-12 flex gap-2 overflow-x-auto pb-2">
          <a
            href="#brief"
            className="whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black"
          >
            Brief
          </a>

          <a
            href="#team"
            className="whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-medium text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Team
          </a>

          <a
            href="#tasks"
            className="whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-medium text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Task
          </a>

          {isOwner && (
            <a
              href="#publish"
              className="whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-medium text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Deliver
            </a>
          )}
        </nav>

        {/* ===================================================
            CLIENT PORTAL
        ==================================================== */}

        {portalUrl && (
          <section className="mt-8">
            <div className="relative overflow-hidden rounded-[30px] bg-[#11151C]">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-36 h-[420px] w-[420px] rounded-full blur-[110px]"
                style={{
                  background:
                    "radial-gradient(circle, rgba(36,120,255,0.18), transparent 68%)",
                }}
              />

              <div className="relative flex flex-col gap-8 p-7 sm:p-9 md:flex-row md:items-center md:justify-between md:p-10">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2478FF]/10">
                    <IconGlobe
                      className="h-5 w-5"
                      style={{
                        color: COLOR.blueSoft,
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-white">
                        Client portal
                      </h2>

                      <span className="text-[10px] text-emerald-400">
                        Live
                      </span>
                    </div>

                    <p className="mt-2 max-w-lg text-xs leading-5 text-white/30">
                      This is the space your client uses to
                      follow progress and access the finished
                      work.
                    </p>

                    <div className="mt-4 flex min-w-0 items-center gap-2">
                      <span className="max-w-[320px] truncate text-xs text-white/40">
                        {portalUrl}
                      </span>

                      <CopyLinkButton url={portalUrl} />
                    </div>
                  </div>
                </div>

                {isOwner &&
                  managedProject.deliveryProject
                    ?.accessCode && (
                    <div className="shrink-0 rounded-2xl bg-white/[0.045] px-5 py-4">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                        Access code
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold tracking-wider text-white/70">
                          {
                            managedProject.deliveryProject
                              .accessCode
                          }
                        </span>

                        <CopyLinkButton
                          url={
                            managedProject.deliveryProject
                              .accessCode
                          }
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================
            WORKSPACE
        ==================================================== */}

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_250px]">
          {/* =================================================
              MAIN CONTENT
          ================================================== */}

          <div className="min-w-0 space-y-16">
            {/* =================================================
                BRIEF
            ================================================== */}

            <section id="brief" className="scroll-mt-8">
              <SectionHeading
                icon={<IconBrief className="h-5 w-5" />}
                number="01"
                title="The brief"
                description="The thinking behind the work."
              />

              <div className="mt-6">
                <ManagedProjectBrief
                  managedProjectId={managedProject.id}
                  isOwner={isOwner}
                  brief={{
                    name: managedProject.name,
                    briefObjective:
                      managedProject.briefObjective,
                    briefBackground:
                      managedProject.briefBackground,
                    briefTargetAudience:
                      managedProject.briefTargetAudience,
                    briefCreativeDirection:
                      managedProject.briefCreativeDirection,
                    briefDeliverables:
                      managedProject.briefDeliverables,
                    briefBrandGuidelines:
                      managedProject.briefBrandGuidelines,
                    briefReferences:
                      managedProject.briefReferences,
                    briefRequiredFormats:
                      managedProject.briefRequiredFormats,
                    briefPlatforms:
                      managedProject.briefPlatforms,
                    briefImportantNotes:
                      managedProject.briefImportantNotes,
                    briefDeadline:
                      managedProject.briefDeadline?.toISOString() ??
                      null,
                    briefVisibleToClient:
                      managedProject.briefVisibleToClient,
                  }}
                />
              </div>
            </section>

            {/* =================================================
                TEAM
            ================================================== */}

            <section id="team" className="scroll-mt-8">
              <SectionHeading
                icon={<IconUsers className="h-5 w-5" />}
                number="02"
                title="The team"
                description="The people making it happen."
              />

              <div className="mt-6">
                <ManagedProjectCollaborators
                  managedProjectId={managedProject.id}
                  isOwner={isOwner}
                />
              </div>
            </section>

            {/* =================================================
                WORK
            ================================================== */}

            <section id="tasks" className="scroll-mt-8">
              <SectionHeading
                icon={<IconTasks className="h-5 w-5" />}
                number="03"
                title="The task"
                description="Turn the brief into action."
              />

              <div className="mt-6">
                <ManagedProjectTasks
                  managedProjectId={managedProject.id}
                  isOwner={isOwner}
                  currentCreatorId={creator.id}
                  assigneeOptions={assigneeOptions}
                />
              </div>
            </section>

            {/* =================================================
                DELIVER
            ================================================== */}

            {isOwner && (
              <section id="publish" className="scroll-mt-8">
                <SectionHeading
                  icon={<IconSend className="h-5 w-5" />}
                  number="04"
                  title="Deliver"
                  description="When it's ready, send it out."
                />

                <div className="mt-6">
                  <ManagedProjectPublish
                    managedProjectId={managedProject.id}
                    publishedAt={
                      managedProject.publishedAt?.toISOString() ??
                      null
                    }
                  />
                </div>
              </section>
            )}
          </div>

          {/* =================================================
              DESKTOP SIDEBAR
          ================================================== */}

          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/20">
                In this project
              </p>

              <div className="space-y-1">
                <SideLink
                  href="#brief"
                  number="01"
                  label="The brief"
                  active
                />

                <SideLink
                  href="#team"
                  number="02"
                  label="The team"
                />

                <SideLink
                  href="#tasks"
                  number="03"
                  label="The task"
                />

                {isOwner && (
                  <SideLink
                    href="#publish"
                    number="04"
                    label="Deliver"
                  />
                )}
              </div>

              <div className="mt-10 rounded-2xl bg-white/[0.025] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20">
                  Project status
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        managedProject.publishedAt
                          ? "#4ADE80"
                          : COLOR.blue,
                    }}
                  />

                  <span className="text-xs font-medium text-white/60">
                    {managedProject.publishedAt
                      ? "Published"
                      : status}
                  </span>
                </div>
              </div>

              <div className="mt-6 px-2">
                <p className="text-[11px] leading-5 text-white/20">
                  {isOwner
                    ? "You own this project and can manage the brief, team, work and delivery."
                    : "You're collaborating on this project."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}