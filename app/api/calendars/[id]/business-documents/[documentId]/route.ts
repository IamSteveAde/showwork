import { removeWorkspaceContent, WorkspaceDeletionConflict } from "@/lib/workspaceDeletion";
import { publishingIntegrationInstalled, invokePublishingEntrypoint, assertLegacyPublishingAllowed, nativePolicyExecutionAllowed } from "@/lib/publishing/applicationBoundary";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

// DELETE — removes a document and durably queues unused media for cleanup.
//
// The document's recorded size is also returned to the Content
// Workspace storage allowance. Invalidate the summary so deleted facts cannot remain.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { if (!nativePolicyExecutionAllowed("app/api/calendars/[id]/business-documents/[documentId]/route.ts#DELETE@14")) { return await invokePublishingEntrypoint<never>("app/api/calendars/[id]/business-documents/[documentId]/route.ts#DELETE@14",Array.from(arguments)); } } /* end-canonical-integration-boundary */

  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, documentId } = await params;

  if (
    !(await hasCalendarPermission(
      creator.id,
      id,
      "knowledge.manage"
    ))
  ) {
    return NextResponse.json(
      {
        error:
          "You don't have permission to remove business documents from this calendar",
      },
      { status: 403 }
    );
  }

  const document =
    await db.calendarBusinessDocument.findUnique({
      where: {
        id: documentId,
      },
      select: {
        id: true,
        calendarId: true,
        fileKey: true,
        sizeBytes: true,
        calendar: {
          select: {
            managerId: true,
          },
        },
      },
    });

  if (!document || document.calendarId !== id) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  try {
    return NextResponse.json(await removeWorkspaceContent({ actorId: creator.id, mode: "document", calendarId: id, documentId }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof WorkspaceDeletionConflict ? error.message : "Unable to remove this document. Please retry." }, { status: error instanceof WorkspaceDeletionConflict ? 409 : 500 });
  }
}
