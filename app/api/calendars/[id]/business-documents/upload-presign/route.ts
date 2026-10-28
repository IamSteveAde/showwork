import { measureUploadStage, timeWorkspaceUpload } from "@/lib/workspaceUploadTiming";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedUploadUrl } from "@/lib/r2";
import { isAllowedBusinessDocumentType } from "@/lib/documentExtraction";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import {
  reserveContentWorkspaceStorage,
  releaseContentWorkspaceStorageReservation,
} from "@/lib/contentWorkspaceUsage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return timeWorkspaceUpload(() => handleUpload(req, { params }));
}

async function handleUpload(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await measureUploadStage("auth", () => getCurrentCreator());

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (
    !(await measureUploadStage("permission", () => hasCalendarPermission(
      creator.id,
      id,
      "knowledge.manage"
    )))
  ) {
    return NextResponse.json(
      {
        error:
          "You don't have permission to add business documents to this calendar",
      },
      { status: 403 }
    );
  }

  const calendar = await measureUploadStage("lookup", () => db.socialCalendar.findUnique({
    where: { id },
    select: {
      id: true,
      managerId: true,
    },
  }));

  if (!calendar) {
    return NextResponse.json(
      { error: "Calendar not found" },
      { status: 404 }
    );
  }

  // hasCalendarPermission already validates owner billing and workspace coverage.
  // Reservation creation independently checks current owner entitlement and quota.

  let body: {
    filename?: unknown;
    contentType?: unknown;
    fileSize?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { filename, contentType, fileSize } = body;

  if (
    typeof filename !== "string" ||
    !filename ||
    typeof contentType !== "string" ||
    !contentType ||
    fileSize === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "filename, contentType and fileSize are required",
      },
      { status: 400 }
    );
  }

  if (
    typeof fileSize !== "number" ||
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "fileSize must be a valid positive number",
      },
      { status: 400 }
    );
  }

  if (!isAllowedBusinessDocumentType(contentType)) {
    return NextResponse.json(
      {
        error:
          "That file type isn't supported — upload a PDF, Word document, Excel sheet, CSV, or plain text file",
      },
      { status: 400 }
    );
  }

  /*
   * Sanitize the filename before using it in the R2 key.
   *
   * We only need a safe filename here; the reservation itself is
   * tied to the complete generated file key.
   */
  const safeFilename = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180);

  if (!safeFilename) {
    return NextResponse.json(
      { error: "Invalid filename" },
      { status: 400 }
    );
  }

  const fileKey =
    `calendars/${id}/business-documents/${randomUUID()}-${safeFilename}`;

  /*
   * Reserve the exact number of bytes before giving the client an
   * upload URL.
   *
   * This prevents concurrent uploads from collectively exceeding the
   * Marketing Workspace storage allowance.
   */
  let reservation;

  try {
    reservation = await measureUploadStage("reservation", () => reserveContentWorkspaceStorage(
      calendar.managerId,
      id,
      fileKey,
      fileSize
    ));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to reserve Marketing Workspace storage";

    console.error(
      "Failed to reserve Marketing Workspace storage for business document:",
      error
    );

    return NextResponse.json(
      { error: message },
      { status: 413 }
    );
  }

  /*
   * Generate the R2 upload URL only after the storage reservation
   * succeeds.
   *
   * If presigning fails, immediately release the reservation so the
   * user's available storage is not unnecessarily locked.
   */
  try {
    const uploadUrl = await measureUploadStage("signing", () => getPresignedUploadUrl(
      fileKey,
      contentType
    ));

    return NextResponse.json({
      uploadUrl,
      fileKey,
      fileSize,
      reservationId: reservation.reservationId!,
    });
  } catch (error) {
    console.error(
      "Failed to create business document upload URL:",
      error
    );

    try {
      await releaseContentWorkspaceStorageReservation(
        reservation.reservationId!,
        calendar.managerId,
        id,
        fileKey
      );
    } catch (releaseError) {
      console.error(
        "Failed to release Marketing Workspace storage reservation after presign failure:",
        releaseError
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to prepare the document upload. Please try again.",
      },
      { status: 500 }
    );
  }
}