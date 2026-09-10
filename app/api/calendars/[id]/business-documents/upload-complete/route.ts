import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";
import { extractTextFromDocument } from "@/lib/documentExtraction";
import { updateBusinessSummaryWithDocument } from "@/lib/openai";
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

  const { fileKey, originalName, contentType } = await req.json();
  if (!fileKey || !originalName || !contentType) {
    return NextResponse.json({ error: "fileKey, originalName and contentType are required" }, { status: 400 });
  }

  let extractedText: string;
  try {
    extractedText = await extractTextFromDocument(publicUrlFor(fileKey), contentType);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read the uploaded document";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "No readable text was found in that document" }, { status: 422 });
  }

  const document = await db.calendarBusinessDocument.create({
    data: {
      calendarId: id,
      fileKey,
      originalName,
      extractedText,
    },
  });

  // Fold this document into the calendar's rolling summary right
  // away, rather than deferring it — the manager should be able to
  // generate content immediately after uploading, without a separate
  // "process documents" step.
  try {
    const updatedSummary = await updateBusinessSummaryWithDocument({
      existingSummary: calendar.aiBusinessSummary,
      clientName: calendar.clientName,
      documentText: extractedText,
    });

    await db.socialCalendar.update({
      where: { id },
      data: {
        aiBusinessSummary: updatedSummary,
        aiBusinessSummaryUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ document, summaryUpdated: true });
  } catch (err) {
    // The document itself is already saved successfully at this
    // point — a failure folding it into the summary shouldn't make
    // the whole upload look like it failed. The manager can retry
    // the summary update later; the raw document and its extracted
    // text are safely preserved either way.
    console.error(`Failed to fold business document into AI summary for calendar ${id}:`, err);
    return NextResponse.json({ document, summaryUpdated: false });
  }
}