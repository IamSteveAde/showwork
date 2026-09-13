import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/r2";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { releaseContentWorkspaceStorage } from "@/lib/contentWorkspaceUsage";

// DELETE — removes one uploaded business document, both its database
// record and its underlying R2 file.
//
// The document's recorded size is also returned to the Content
// Workspace storage allowance. The AI business summary deliberately
// remains unchanged because it is a rolling, cumulative understanding
// built from documents processed over time.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
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
      "EDIT_CALENDAR"
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

  const ownerId = document.calendar.managerId;

  /*
   * Delete the physical R2 object first.
   *
   * We intentionally preserve the existing behavior of allowing the
   * database document to be removed even if R2 deletion fails. This
   * prevents an inaccessible object from permanently blocking the
   * user's ability to remove the document from the workspace.
   */
  try {
    await deleteObject(document.fileKey);
  } catch (error) {
    console.error(
      `Failed to delete R2 object for business document ${documentId}:`,
      error
    );
  }

  /*
   * Remove the document and release its consumed storage in the same
   * database transaction.
   *
   * storageBytes -= document.sizeBytes
   *
   * This prevents the database record from disappearing while the
   * storage allowance remains permanently consumed.
   */
  try {
    await db.$transaction(async (tx) => {
      /*
       * Re-check the document inside the transaction so a concurrent
       * deletion cannot cause us to release the same storage twice.
       */
      const currentDocument =
        await tx.calendarBusinessDocument.findUnique({
          where: {
            id: documentId,
          },
          select: {
            id: true,
            calendarId: true,
            sizeBytes: true,
          },
        });

      if (!currentDocument) {
        throw new Error(
          "BUSINESS_DOCUMENT_ALREADY_DELETED"
        );
      }

      if (currentDocument.calendarId !== id) {
        throw new Error(
          "BUSINESS_DOCUMENT_INVALID_CALENDAR"
        );
      }

      const releasedBytes = currentDocument.sizeBytes;

      /*
       * Decrement consumed storage only when the usage record has
       * enough recorded storage to release.
       *
       * This protects the usage counter from becoming negative.
       */
      const usage =
        await tx.contentWorkspaceUsage.updateMany({
          where: {
            creatorId: ownerId,
            storageBytes: {
              gte: releasedBytes,
            },
          },
          data: {
            storageBytes: {
              decrement: releasedBytes,
            },
          },
        });

      if (usage.count !== 1) {
        throw new Error(
          "CONTENT_WORKSPACE_STORAGE_RELEASE_FAILED"
        );
      }

      await tx.calendarBusinessDocument.delete({
        where: {
          id: documentId,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_DOCUMENT_ALREADY_DELETED"
    ) {
      return NextResponse.json(
        { ok: true },
        { status: 200 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_DOCUMENT_INVALID_CALENDAR"
    ) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "CONTENT_WORKSPACE_STORAGE_RELEASE_FAILED"
    ) {
      console.error(
        `Failed to release Content Workspace storage for business document ${documentId}:`,
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to release the document's storage allowance. The document was not removed.",
        },
        { status: 409 }
      );
    }

    console.error(
      `Failed to remove business document ${documentId}:`,
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to remove the business document",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}