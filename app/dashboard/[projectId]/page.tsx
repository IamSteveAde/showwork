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
  charcoal: "#121316",
  panel: "#17191D",
  muted: "#858991",
};

function IconArrowLeft({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
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

function IconExternal({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function IconDownload({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

function IconGlobe({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
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

function IconUsers({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
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

function IconFiles({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
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
      <rect x="4" y="3" width="12" height="16" rx="2" />
      <path d="M8 7h5" />
      <path d="M8 11h5" />
      <path d="M8 15h3" />
      <path d="M16 7h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-1" />
    </svg>
  );
}

function IconActivity({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
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
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
    </svg>
  );
}

function formatDeliveryStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
    <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(245,200,66,0.09)",
            color: COLOR.goldSoft,
          }}
        >
          {icon}
        </div>

        <div>
          <p
            className="text-[10px] font-semibold uppercase"
            style={{
              color: "rgba(245,200,66,0.7)",
              letterSpacing: "0.14em",
            }}
          >
            {eyebrow}
          </p>

          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/30">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function Stat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-[-0.03em] text-white">
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
        include: {
          reviews: {
            orderBy: {
              createdAt: "asc",
            },
          },
          videoComments: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },

      sections: {
        orderBy: {
          displayOrder: "asc",
        },
        include: {
          media: {
            where: {
              folderId: null,
            },
            orderBy: {
              displayOrder: "asc",
            },
            include: {
              reviews: {
                orderBy: {
                  createdAt: "asc",
                },
              },
              videoComments: {
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          },

          folders: {
            orderBy: {
              displayOrder: "asc",
            },
            include: {
              media: {
                orderBy: {
                  displayOrder: "asc",
                },
                include: {
                  reviews: {
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
                  videoComments: {
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
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
    where: {
      projectId: project.id,
    },
    orderBy: {
      viewedAt: "desc",
    },
  });

  const isLive = true;

  const liveUrl = `${appUrl()}/${project.slug}`;

  const totalFiles = project.media.length;

  const approvedCount = project.media.filter(
    (m) => m.approvalStatus === "APPROVED"
  ).length;

  const needsRevisionCount = project.media.filter(
    (m) => m.approvalStatus === "NEEDS_REVISION"
  ).length;

  const pendingCount =
    totalFiles - approvedCount - needsRevisionCount;

  const allApproved =
    totalFiles > 0 && approvedCount === totalFiles;

  const ungroupedMedia = project.media.filter(
    (m) => !m.sectionId
  );

  const uploadSessionsRemaining =
    creator.subscriptionActive || creator.isComped
      ? Infinity
      : MAX_ADDITIONAL_UPLOAD_BATCHES -
        project.additionalUploadCount;

  const sectionsWithFiles = project.sections.filter(
    (section) =>
      section.media.length > 0 ||
      section.folders.some((folder) => folder.media.length > 0)
  ).length;

  const progressPercent =
    totalFiles > 0
      ? Math.round((approvedCount / totalFiles) * 100)
      : 0;

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background: COLOR.black,
      }}
    >
      {/* =====================================================
          SOFT ATMOSPHERE
      ====================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -left-48 -top-48 h-[650px] w-[650px] rounded-full blur-[160px]"
          style={{
            background:
              "radial-gradient(circle, rgba(245,200,66,0.07), transparent 68%)",
          }}
        />

        <div
          className="absolute right-[-220px] top-[25%] h-[600px] w-[600px] rounded-full blur-[170px]"
          style={{
            background:
              "radial-gradient(circle, rgba(232,136,26,0.035), transparent 70%)",
          }}
        />
      </div>

      {/* =====================================================
          TOP NAV
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

          <div className="flex items-center gap-3">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: isLive
                  ? "#4ADE80"
                  : COLOR.gold,
              }}
            />

            <span className="text-xs text-white/35">
              {isLive ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 pb-28 pt-8 md:px-10 md:pt-14">
        {/* ===================================================
            PROJECT HEADER
        ==================================================== */}

        <section>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p
                className="mb-5 text-[10px] font-semibold uppercase"
                style={{
                  color: COLOR.goldSoft,
                  letterSpacing: "0.16em",
                }}
              >
                Project
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <EditableField
                  projectId={project.id}
                  field="clientName"
                  value={project.clientName}
                  displayClassName="text-4xl font-semibold leading-none tracking-[-0.04em] text-white sm:text-5xl md:text-6xl"
                  inputClassName="rounded-xl px-3 py-2 text-3xl font-semibold text-white sm:text-4xl"
                  confirmMessage="Renaming this project will also change its link. Any link you've already sent your client will stop working. Continue?"
                />

                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>

              <p className="mt-6 max-w-2xl text-sm leading-6 text-white/35">
                Your client-facing delivery space. Manage the
                work, collect feedback and keep everything in one
                place.
              </p>
            </div>

            <a
              href={`/api/projects/${project.id}/report`}
              download
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white/[0.07] px-5 py-3 text-xs font-semibold text-white/65 transition-all hover:bg-white/[0.12] hover:text-white"
            >
              <IconDownload className="h-4 w-4" />
              Download report
            </a>
          </div>

          {/* Lightweight project summary */}

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/[0.035] p-5">
              <Stat
                value={totalFiles}
                label="Files"
              />
            </div>

            <div className="rounded-2xl bg-white/[0.035] p-5">
              <Stat
                value={approvedCount}
                label="Approved"
              />
            </div>

            <div className="rounded-2xl bg-white/[0.035] p-5">
              <Stat
                value={needsRevisionCount}
                label="Revisions"
              />
            </div>

            <div className="rounded-2xl bg-white/[0.035] p-5">
              <Stat
                value={viewerEmails.length}
                label="Client visits"
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            STATUS
        ==================================================== */}

        <section className="mt-8">
          <DeliveryStatusControl
            projectId={project.id}
            currentStatus={project.deliveryStatus}
          />
        </section>

        {/* ===================================================
            CLIENT ACCESS
        ==================================================== */}

        <section className="mt-10">
          <SectionIntro
            eyebrow="Client access"
            title="Your delivery space"
            description="Everything your client needs to access this project."
            icon={<IconGlobe className="h-5 w-5" />}
          />

          <div className="overflow-hidden rounded-[28px] bg-[#121419]">
            <div className="flex flex-col gap-8 p-7 md:p-9">
              {/* Portal */}

              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Client portal
                    </span>

                    <span className="text-[10px] font-medium text-emerald-400">
                      Live
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/30">
                    Share this link with your client to give them
                    access to the delivery.
                  </p>

                  <div className="mt-4 flex min-w-0 items-center gap-2">
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[min(600px,75vw)] truncate text-xs font-medium transition-colors hover:text-white"
                      style={{
                        color: COLOR.goldSoft,
                      }}
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
                  className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-semibold text-black transition-all hover:bg-white/90"
                >
                  Open portal

                  <IconExternal className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>

              {/* Access code */}

              <div className="rounded-2xl bg-white/[0.035] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                      Client access code
                    </p>

                    <p className="mt-1 text-xs text-white/25">
                      Your client uses this code to unlock the
                      delivery.
                    </p>
                  </div>

                  {project.accessCode ? (
                    <div className="flex items-center gap-3">
                      <EditableField
                        projectId={project.id}
                        field="accessCode"
                        value={project.accessCode}
                        displayClassName="rounded-xl bg-white/[0.06] px-4 py-2.5 font-mono text-sm font-semibold tracking-[0.12em] text-white"
                        displayStyle={{
                          background:
                            "rgba(255,255,255,0.06)",
                        }}
                        inputClassName="rounded-xl px-4 py-2.5 font-mono text-sm font-semibold text-white"
                        monospace
                      />

                      <CopyLinkButton
                        url={project.accessCode}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-white/25">
                        No access code set
                      </span>

                      <EditableField
                        projectId={project.id}
                        field="accessCode"
                        value=""
                        displayClassName="rounded-xl bg-[#F5C842]/10 px-4 py-2.5 text-xs font-semibold text-[#F5C842]"
                        displayStyle={{
                          background:
                            "rgba(245,200,66,0.10)",
                          color: COLOR.gold,
                        }}
                        inputClassName="rounded-xl px-4 py-2.5 font-mono text-sm font-semibold text-white"
                        monospace
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            TEAM
        ==================================================== */}

        <section className="mt-14">
          <SectionIntro
            eyebrow="Team"
            title="People on this project"
            description="Manage who can collaborate on this delivery."
            icon={<IconUsers className="h-5 w-5" />}
          />

          <div>
            <CollaboratorsPanel projectId={project.id} />
          </div>
        </section>

        {/* ===================================================
            ADD FILES
        ==================================================== */}

        <section className="mt-14">
          <div className="relative overflow-hidden rounded-[28px] bg-[#171518]">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-28 h-[300px] w-[300px] rounded-full blur-[100px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(245,200,66,0.11), transparent 70%)",
              }}
            />

            <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: COLOR.goldSoft,
                  }}
                >
                  Keep the project moving.
                </p>

                <p className="mt-2 max-w-xl text-xs leading-5 text-white/35">
                  Add new files or sections whenever the work
                  evolves. Your client will always see the latest
                  version here.
                </p>
              </div>

              <AddMoreFilesButton
                projectId={project.id}
                remaining={uploadSessionsRemaining}
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            FEEDBACK BANNER
        ==================================================== */}

        {needsRevisionCount > 0 && (
          <div className="mt-8 rounded-[22px] bg-orange-400/[0.07] px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-400/10 text-orange-300">
                ✎
              </div>

              <div>
                <p className="text-sm font-semibold text-orange-200">
                  {needsRevisionCount} file
                  {needsRevisionCount === 1 ? "" : "s"} need
                  {needsRevisionCount === 1 ? "s" : ""} attention.
                </p>

                <p className="mt-1 text-xs leading-5 text-orange-200/45">
                  Your client has requested changes. Review the
                  notes attached to the affected files below.
                </p>
              </div>
            </div>
          </div>
        )}

        {allApproved && needsRevisionCount === 0 && (
          <div className="mt-8 rounded-[22px] bg-emerald-400/[0.06] px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                ✓
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  Everything is approved.
                </p>

                <p className="mt-1 text-xs text-emerald-200/40">
                  Your client has approved every file in this
                  project.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            FILES
        ==================================================== */}

        <section className="mt-16">
          <SectionIntro
            eyebrow="The work"
            title="Project files"
            description={
              totalFiles > 0
                ? `${approvedCount} approved · ${needsRevisionCount} revision${
                    needsRevisionCount === 1 ? "" : "s"
                  } · ${pendingCount} awaiting review`
                : "Everything you're delivering to the client."
            }
            icon={<IconFiles className="h-5 w-5" />}
            action={
              totalFiles > 0 ? (
                <div className="hidden items-center gap-3 sm:flex">
                  <span className="text-xs text-white/20">
                    {sectionsWithFiles} section
                    {sectionsWithFiles === 1 ? "" : "s"}
                  </span>

                  {totalFiles > 0 && (
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progressPercent}%`,
                          background: COLOR.gold,
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : undefined
            }
          />

          {totalFiles === 0 ? (
            <div className="rounded-[28px] bg-[#121419] px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                <IconFiles className="h-6 w-6 text-white/25" />
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                Nothing here yet.
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/25">
                Add your first section and start uploading the
                work you want your client to see.
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
              {/* =================================================
                  NAMED SECTIONS
              ================================================== */}

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
                        (sum, folder) =>
                          sum + folder.media.length,
                        0
                      )
                    }
                    uploadSessionsRemaining={
                      uploadSessionsRemaining
                    }
                  />

                  {/* Direct files */}

                  {section.media.length > 0 && (
                    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {section.media.map((m) => (
                        <FileGridItem
                          key={m.id}
                          mediaId={m.id}
                          url={publicUrlFor(m.fileKey)}
                          filename={
                            m.fileKey.split("/").pop() ??
                            "file"
                          }
                          caption={m.caption}
                          type={m.type}
                          approvalStatus={m.approvalStatus}
                          approvalNote={m.approvalNote}
                          reviews={m.reviews.map((r) => ({
                            reviewerName: r.reviewerName,
                            reviewerEmail: r.reviewerEmail,
                            status:
                              r.status as
                                | "APPROVED"
                                | "NEEDS_REVISION",
                            note: r.note,
                            createdAt:
                              r.createdAt.toISOString(),
                          }))}
                          comments={m.videoComments.map(
                            (c) => ({
                              id: c.id,
                              reviewerName:
                                c.reviewerName,
                              reviewerEmail:
                                c.reviewerEmail,
                              note: c.note,
                              videoTimestampSeconds:
                                c.videoTimestampSeconds,
                              createdAt:
                                c.createdAt.toISOString(),
                            })
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Sub-sections */}

                  {section.folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="mt-8 rounded-[24px] bg-white/[0.025] p-5 sm:p-6"
                    >
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white/70">
                            {folder.name}
                          </p>

                          <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-white/20">
                            {folder.media.length} file
                            {folder.media.length === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {folder.media.map((m) => (
                          <FileGridItem
                            key={m.id}
                            mediaId={m.id}
                            url={publicUrlFor(m.fileKey)}
                            filename={
                              m.fileKey.split("/").pop() ??
                              "file"
                            }
                            caption={m.caption}
                            type={m.type}
                            approvalStatus={
                              m.approvalStatus
                            }
                            approvalNote={m.approvalNote}
                            reviews={m.reviews.map((r) => ({
                              reviewerName:
                                r.reviewerName,
                              reviewerEmail:
                                r.reviewerEmail,
                              status:
                                r.status as
                                  | "APPROVED"
                                  | "NEEDS_REVISION",
                              note: r.note,
                              createdAt:
                                r.createdAt.toISOString(),
                            }))}
                            comments={m.videoComments.map(
                              (c) => ({
                                id: c.id,
                                reviewerName:
                                  c.reviewerName,
                                reviewerEmail:
                                  c.reviewerEmail,
                                note: c.note,
                                videoTimestampSeconds:
                                  c.videoTimestampSeconds,
                                createdAt:
                                  c.createdAt.toISOString(),
                              })
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* =================================================
                  UNGROUPED FILES
              ================================================== */}

              {ungroupedMedia.length > 0 && (
                <div>
                  <div className="mb-5">
                    <p className="text-sm font-semibold text-white/70">
                      Other files
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-white/20">
                      {ungroupedMedia.length} file
                      {ungroupedMedia.length === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {ungroupedMedia.map((m) => (
                      <FileGridItem
                        key={m.id}
                        mediaId={m.id}
                        url={publicUrlFor(m.fileKey)}
                        filename={
                          m.fileKey.split("/").pop() ??
                          "file"
                        }
                        caption={m.caption}
                        type={m.type}
                        approvalStatus={m.approvalStatus}
                        approvalNote={m.approvalNote}
                        reviews={m.reviews.map((r) => ({
                          reviewerName: r.reviewerName,
                          reviewerEmail: r.reviewerEmail,
                          status:
                            r.status as
                              | "APPROVED"
                              | "NEEDS_REVISION",
                          note: r.note,
                          createdAt:
                            r.createdAt.toISOString(),
                        }))}
                        comments={m.videoComments.map((c) => ({
                          id: c.id,
                          reviewerName: c.reviewerName,
                          reviewerEmail: c.reviewerEmail,
                          note: c.note,
                          videoTimestampSeconds:
                            c.videoTimestampSeconds,
                          createdAt:
                            c.createdAt.toISOString(),
                        }))}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            CLIENT ACTIVITY
        ==================================================== */}

        <section className="mt-20">
          <SectionIntro
            eyebrow="Client activity"
            title="Who's viewing"
            description="See who has accessed this delivery."
            icon={<IconActivity className="h-5 w-5" />}
          />

          {viewerEmails.length === 0 ? (
            <div className="rounded-[24px] bg-white/[0.025] px-6 py-10 text-center">
              <p className="text-sm text-white/30">
                No one has viewed this delivery yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] bg-white/[0.025]">
              <div className="divide-y divide-white/[0.04]">
                {viewerEmails.map((viewer) => (
                  <div
                    key={viewer.id}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      {viewer.name ? (
                        <p className="truncate text-sm font-medium text-white/75">
                          {viewer.name}
                        </p>
                      ) : null}

                      <p
                        className={`truncate text-xs ${
                          viewer.name
                            ? "mt-0.5 text-white/30"
                            : "text-white/65"
                        }`}
                      >
                        {viewer.email}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] text-white/20">
                      {new Date(
                        viewer.viewedAt
                      ).toLocaleDateString("en-NG", {
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
        </section>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-white/20">
            {project.clientName} · Showwork
          </p>

          <Link
            href="/dashboard/projects"
            className="text-xs text-white/25 transition-colors hover:text-white/60"
          >
            Back to all projects
          </Link>
        </div>
      </div>
    </main>
  );
}