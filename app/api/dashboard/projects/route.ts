import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

const PAGE_SIZE = 12;
const SHARED_DISPLAY_LIMIT = 12;

// Powers the dashboard's live search — same query logic that used to
// live directly in the page, extracted here so it can be called
// as-you-type instead of only on a full page reload.
export async function GET(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);

  const ownedWhere = {
    creatorId: creator.id,
    deletedAt: null,
    ...(q ? { clientName: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const totalCount = await db.project.count({ where: ownedWhere });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const projects = await db.project.findMany({
    where: ownedWhere,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { media: true, viewerEmails: true } } },
  });

  const collaboratorMemberships = await db.projectCollaborator.findMany({
    where: {
      creatorId: creator.id,
      project: {
        deletedAt: null,
        ...(q ? { clientName: { contains: q, mode: "insensitive" as const } } : {}),
      },
    },
    orderBy: { addedAt: "desc" },
    take: SHARED_DISPLAY_LIMIT + 1,
    include: {
      project: {
        include: {
          creator: { select: { name: true, email: true } },
          _count: { select: { media: true } },
        },
      },
    },
  });
  const sharedProjects = collaboratorMemberships.slice(0, SHARED_DISPLAY_LIMIT);
  const hasMoreShared = collaboratorMemberships.length > SHARED_DISPLAY_LIMIT;

  return NextResponse.json({
    ownedProjects: projects,
    totalCount,
    totalPages,
    currentPage,
    sharedProjects: sharedProjects.map((c) => c.project),
    hasMoreShared,
  });
}