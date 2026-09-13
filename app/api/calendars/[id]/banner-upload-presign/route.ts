import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { getPresignedUploadUrl, isAllowedContentType } from "@/lib/r2";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import {
  releaseContentWorkspaceStorageReservation,
  reserveContentWorkspaceStorage,
} from "@/lib/contentWorkspaceUsage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (
    !(await hasCalendarPermission(
      creator.id,
      id,
      "EDIT_CALENDAR"
    ))
  ) {
    return NextResponse.json(
      { error: "You don't have permission to edit this calendar" },
      { status: 403 }
    );
  }

  let body: {
    filename?: string;
    contentType?: string;
    variant?: "desktop" | "mobile";
    fileSize?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const {
    filename,
    contentType,
    variant,
    fileSize,
  } = body;

  if (!filename || !contentType || !fileSize) {
    return NextResponse.json(
      {
        error:
          "filename, contentType and fileSize are required",
      },
      { status: 400 }
    );
  }

  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0
  ) {
    return NextResponse.json(
      { error: "A valid file size is required" },
      { status: 400 }
    );
  }

  if (!isAllowedContentType(contentType)) {
    return NextResponse.json(
      { error: "That file type isn't supported" },
      { status: 400 }
    );
  }

  if (
    variant !== "desktop" &&
    variant !== "mobile"
  ) {
    return NextResponse.json(
      {
        error:
          "variant must be 'desktop' or 'mobile'",
      },
      { status: 400 }
    );
  }

  const safeFilename = filename.replace(
    /[^a-zA-Z0-9.\-_]/g,
    "_"
  );

  const fileKey = `calendars/${id}/banner-${variant}/${Date.now()}-${safeFilename}`;

  const reservation =
    await reserveContentWorkspaceStorage(
      creator.id,
      id,
      fileKey,
      fileSize
    );

  if (!reservation.allowed || !reservation.reservationId) {
    return NextResponse.json(
      {
        error:
          reservation.reason ??
          "There isn't enough Content Workspace storage for this upload.",
      },
      { status: 400 }
    );
  }

  try {
    const uploadUrl = await getPresignedUploadUrl(
      fileKey,
      contentType
    );

    return NextResponse.json({
      uploadUrl,
      fileKey,
      fileSize,
      reservationId: reservation.reservationId,
    });
  } catch (error) {
    await releaseContentWorkspaceStorageReservation(
      reservation.reservationId,
      creator.id,
      id,
      fileKey
    );

    console.error(
      "Failed to create banner upload URL:",
      error
    );

    return NextResponse.json(
      { error: "Failed to prepare banner upload" },
      { status: 500 }
    );
  }
}