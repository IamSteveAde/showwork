import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedUploadUrl } from "@/lib/r2";
import { isAllowedBusinessDocumentType } from "@/lib/documentExtraction";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to add business documents to this calendar" }, { status: 403 });
  }

  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  // The AI content assistant is a paid, account-level add-on — gated
  // here the same way calendar access itself is gated on
  // calendarBillingStatus, since uploading documents is the entry
  // point into every other AI feature.
  const owner = await db.creator.findUnique({
    where: { id: calendar.managerId },
    select: { aiAssistantBillingStatus: true, aiAssistantTrialEndsAt: true },
  });
  const aiActive =
    owner?.aiAssistantBillingStatus === "ACTIVE" ||
    (owner?.aiAssistantBillingStatus === "TRIAL" && !!owner.aiAssistantTrialEndsAt && owner.aiAssistantTrialEndsAt.getTime() > Date.now());
  if (!aiActive) {
    return NextResponse.json({ error: "The AI content assistant isn't active on this account yet" }, { status: 403 });
  }

  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }
  if (!isAllowedBusinessDocumentType(contentType)) {
    return NextResponse.json({ error: "That file type isn't supported — upload a PDF, Word document, or plain text file" }, { status: 400 });
  }

  const fileKey = `calendars/${id}/business-documents/${Date.now()}-${filename}`;
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey });
}