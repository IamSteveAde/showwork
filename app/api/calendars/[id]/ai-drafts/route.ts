import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

// GET — every AI-generated post on this calendar still awaiting the
// manager's review. Manager-only, same as everything else touching
// drafts — a collaborator with lesser access shouldn't be the one
// deciding whether AI content is good enough to show the client.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to view drafts on this calendar" }, { status: 403 });
  }

  const drafts = await db.calendarPost.findMany({
    where: { calendarId: id, isAiDraft: true },
    orderBy: { postDate: "asc" },
    include: { assets: { orderBy: { displayOrder: "asc" } } },
  });

  return NextResponse.json({
    drafts: drafts.map((d) => ({
      ...d,
      assets: d.assets.map((a) => ({ ...a, contentUrl: publicUrlFor(a.fileKey) })),
    })),
  });
}