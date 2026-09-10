import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/r2";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

// DELETE — removes one uploaded business document, both its database
// record and its underlying R2 file. Deliberately does NOT try to
// re-derive aiBusinessSummary from the remaining documents — the
// summary is a rolling, cumulative understanding built up over every
// document processed so far, not something tied to any one document
// still existing. Removing a document just removes it from the list;
// whatever it already contributed to the summary stays as-is.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, documentId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to remove business documents from this calendar" }, { status: 403 });
  }

  const document = await db.calendarBusinessDocument.findUnique({ where: { id: documentId } });
  if (!document || document.calendarId !== id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    await deleteObject(document.fileKey);
  } catch (err) {
    console.error(`Failed to delete R2 object for business document ${documentId}:`, err);
  }

  await db.calendarBusinessDocument.delete({ where: { id: documentId } });

  return NextResponse.json({ ok: true });
}