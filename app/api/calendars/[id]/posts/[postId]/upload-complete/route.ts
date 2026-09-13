import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { getObjectSize, publicUrlFor } from "@/lib/r2";
import { MediaType } from "@prisma/client";
import {
  releaseContentWorkspaceStorageReservation,
} from "@/lib/contentWorkspaceUsage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, postId } = await params;

  if (!(await hasCalendarPermission(creator.id, id, "ADD_CONTENT"))) {
    return NextResponse.json(
      {
        error:
          "You don't have permission to add content to this calendar",
      },
      { status: 403 }
    );
  }

  const post = await db.calendarPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      calendarId: true,
      calendar: {
        select: {
          managerId: true,
        },
      },
    },
  });

  if (!post || post.calendarId !== id) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 }
    );
  }

  const ownerId = post.calendar.managerId;

  let body: {
    fileKey?: unknown;
    mediaType?: unknown;
    fileSize?: unknown;
    reservationId?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { fileKey, mediaType, fileSize, reservationId } = body;
  if (
  typeof mediaType !== "string" ||
  !Object.values(MediaType).includes(mediaType as MediaType)
) {
  return NextResponse.json(
    { error: "Invalid mediaType" },
    { status: 400 }
  );
}

const validatedMediaType = mediaType as MediaType;

  if (
    typeof fileKey !== "string" ||
    !fileKey ||
    typeof mediaType !== "string" ||
    !mediaType ||
    typeof reservationId !== "string" ||
    !reservationId ||
    fileSize === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "fileKey, mediaType, fileSize and reservationId are required",
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
      { error: "fileSize must be a valid positive number" },
      { status: 400 }
    );
  }

  /*
   * Only accept objects created for this specific post.
   * This prevents callers from submitting arbitrary R2 objects.
   */
  const expectedPrefix = `calendars/${id}/${postId}/`;

  if (!fileKey.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "Invalid file key" },
      { status: 400 }
    );
  }

  /*
   * Find the exact reservation created by upload-presign.
   *
   * The reservation is the source of truth for storage accounting.
   */
  const reservation =
    await db.contentWorkspaceStorageReservation.findUnique({
      where: {
        id: reservationId,
      },
      select: {
        id: true,
        creatorId: true,
        calendarId: true,
        fileKey: true,
        bytes: true,
        status: true,
        expiresAt: true,
      },
    });

  if (!reservation) {
    return NextResponse.json(
      {
        error:
          "Upload reservation not found. Please start the upload again.",
      },
      { status: 404 }
    );
  }

  /*
   * The reservation must belong to this creator, calendar and file.
   */
  if (
    reservation.creatorId !== ownerId ||
    reservation.calendarId !== id ||
    reservation.fileKey !== fileKey
  ) {
    return NextResponse.json(
      { error: "Invalid upload reservation" },
      { status: 403 }
    );
  }

  /*
   * If this request was already completed, make the endpoint
   * idempotent by returning the existing asset instead of charging
   * storage again.
   */
  if (reservation.status === "COMPLETED") {
    const existingAsset = await db.calendarPostAsset.findFirst({
      where: {
        postId,
        fileKey,
      },
    });

    if (!existingAsset) {
      console.error(
        "Content Workspace storage reservation is COMPLETED but its asset is missing:",
        reservationId
      );

      return NextResponse.json(
        {
          error:
            "The upload is already marked as completed but its asset could not be found.",
        },
        { status: 409 }
      );
    }

    const updated = await db.calendarPost.findUnique({
      where: { id: postId },
      include: {
        assets: {
          orderBy: { displayOrder: "asc" },
        },
        videoComments: {
          orderBy: { videoTimestampSeconds: "asc" },
        },
        customFields: true,
      },
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      post: {
        ...updated,
        assets: updated.assets.map((asset) => ({
          ...asset,
          contentUrl: publicUrlFor(asset.fileKey),
        })),
      },
    });
  }

  /*
   * Only PENDING reservations can be finalized.
   */
  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      {
        error:
          "This upload reservation is no longer active. Please start the upload again.",
      },
      { status: 409 }
    );
  }

  /*
   * Do not allow an expired reservation to be finalized.
   */
  if (reservation.expiresAt.getTime() <= Date.now()) {
    try {
      await releaseContentWorkspaceStorageReservation(
        reservation.id,
        ownerId,
        id,
        fileKey
      );
    } catch (error) {
      console.error(
        "Failed to release expired Content Workspace storage reservation:",
        error
      );
    }

    return NextResponse.json(
      {
        error:
          "The upload reservation has expired. Please start the upload again.",
      },
      { status: 409 }
    );
  }

  /*
   * Verify that the object actually exists in R2 and obtain its
   * server-reported size.
   *
   * Browser-supplied fileSize is never trusted for final accounting.
   */
  let actualSizeBytes: number;

  try {
    actualSizeBytes = await getObjectSize(fileKey);
  } catch (error) {
    console.error(
      "Failed to verify uploaded calendar asset in R2:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The uploaded file could not be verified. Please try the upload again.",
      },
      { status: 422 }
    );
  }

  if (
    !Number.isSafeInteger(actualSizeBytes) ||
    actualSizeBytes <= 0
  ) {
    return NextResponse.json(
      {
        error: "The uploaded file has an invalid size.",
      },
      { status: 422 }
    );
  }

  const reservedBytes = Number(reservation.bytes);

  if (
    !Number.isSafeInteger(reservedBytes) ||
    reservedBytes <= 0
  ) {
    console.error(
      "Invalid Content Workspace storage reservation size:",
      reservation
    );

    return NextResponse.json(
      {
        error:
          "The upload reservation is invalid. Please start the upload again.",
      },
      { status: 409 }
    );
  }

  /*
   * The reservation and the actual object must agree exactly.
   *
   * If the browser supplied a different file size from the actual
   * object, reject the upload rather than allowing storage accounting
   * to become inaccurate.
   */
  if (actualSizeBytes !== reservedBytes) {
    try {
      await releaseContentWorkspaceStorageReservation(
        reservation.id,
        ownerId,
        id,
        fileKey
      );
    } catch (releaseError) {
      console.error(
        "Failed to release mismatched Content Workspace storage reservation:",
        releaseError
      );
    }

    return NextResponse.json(
      {
        error:
          "The uploaded file size does not match the reserved upload size. Please try the upload again.",
      },
      { status: 422 }
    );
  }

  /*
   * Also ensure the reservation agrees with the value supplied by the
   * client. This is not used as the source of truth; it is simply an
   * additional consistency check.
   */
  if (fileSize !== reservedBytes) {
    return NextResponse.json(
      {
        error:
          "The upload reservation does not match the requested file size.",
      },
      { status: 409 }
    );
  }

  /*
   * Finalize the reservation and create the asset in ONE database
   * transaction.
   *
   * This is important:
   *
   *   storageReservedBytes -= reservedBytes
   *   storageBytes        += reservedBytes
   *   reservation         = COMPLETED
   *   CalendarPostAsset   = created
   *
   * must succeed together.
   *
   * Otherwise we could count storage without creating the asset, or
   * create the asset without accounting for its storage.
   */
  try {
    const updated = await db.$transaction(async (tx) => {
      /*
       * Re-check the reservation inside the transaction to prevent
       * two simultaneous completion requests from both consuming it.
       */
      const currentReservation =
        await tx.contentWorkspaceStorageReservation.findUnique({
          where: {
            id: reservation.id,
          },
          select: {
            id: true,
            creatorId: true,
            calendarId: true,
            fileKey: true,
            bytes: true,
            status: true,
          },
        });

      if (!currentReservation) {
        throw new Error("UPLOAD_RESERVATION_NOT_FOUND");
      }

      if (
        currentReservation.creatorId !== ownerId ||
        currentReservation.calendarId !== id ||
        currentReservation.fileKey !== fileKey
      ) {
        throw new Error("UPLOAD_RESERVATION_INVALID");
      }

      /*
       * Another request may have completed the reservation while this
       * request was verifying the R2 object.
       */
      if (
        currentReservation.status === "COMPLETED"
      ) {
        const existingAsset =
          await tx.calendarPostAsset.findFirst({
            where: {
              postId,
              fileKey,
            },
          });

        if (!existingAsset) {
          throw new Error(
            "COMPLETED_RESERVATION_ASSET_NOT_FOUND"
          );
        }

        return tx.calendarPost.findUniqueOrThrow({
          where: { id: postId },
          include: {
            assets: {
              orderBy: { displayOrder: "asc" },
            },
            videoComments: {
              orderBy: { videoTimestampSeconds: "asc" },
            },
            customFields: true,
          },
        });
      }

      if (currentReservation.status !== "PENDING") {
        throw new Error("UPLOAD_RESERVATION_NOT_PENDING");
      }

      const bytes = currentReservation.bytes;

      /*
       * Find the next display order inside the transaction.
       */
      const existingCount =
        await tx.calendarPostAsset.count({
          where: { postId },
        });

      /*
       * Move the bytes from reserved storage into consumed storage.
       */
      const usage = await tx.contentWorkspaceUsage.updateMany({
        where: {
          creatorId: ownerId,
          storageReservedBytes: {
            gte: bytes,
          },
        },
        data: {
          storageReservedBytes: {
            decrement: bytes,
          },
          storageBytes: {
            increment: bytes,
          },
        },
      });

      if (usage.count !== 1) {
        throw new Error(
          "CONTENT_WORKSPACE_STORAGE_USAGE_UPDATE_FAILED"
        );
      }

      /*
       * Mark the reservation completed.
       */
      await tx.contentWorkspaceStorageReservation.update({
        where: {
          id: reservation.id,
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      /*
       * Create the actual post asset.
       */
      await tx.calendarPostAsset.create({
        data: {
          postId,
          fileKey,
         mediaType: validatedMediaType,
          sizeBytes: bytes,
          displayOrder: existingCount,
        },
      });

      /*
       * A fresh upload means the post needs a fresh client review,
       * even if it was previously approved.
       */
      return tx.calendarPost.update({
        where: { id: postId },
        data: {
          approvalStatus: "PENDING",
          approvalNote: null,
          reviewedAt: null,
        },
        include: {
          assets: {
            orderBy: { displayOrder: "asc" },
          },
          videoComments: {
            orderBy: { videoTimestampSeconds: "asc" },
          },
          customFields: true,
        },
      });
    });

    return NextResponse.json({
      post: {
        ...updated,
        assets: updated.assets.map((asset) => ({
          ...asset,
          contentUrl: publicUrlFor(asset.fileKey),
        })),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UPLOAD_RESERVATION_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          error:
            "Upload reservation not found. Please start the upload again.",
        },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "UPLOAD_RESERVATION_INVALID"
    ) {
      return NextResponse.json(
        { error: "Invalid upload reservation" },
        { status: 403 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "UPLOAD_RESERVATION_NOT_PENDING"
    ) {
      return NextResponse.json(
        {
          error:
            "This upload reservation is no longer active. Please start the upload again.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "COMPLETED_RESERVATION_ASSET_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          error:
            "The upload is marked as completed but its asset could not be found.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "CONTENT_WORKSPACE_STORAGE_USAGE_UPDATE_FAILED"
    ) {
      return NextResponse.json(
        {
          error:
            "There is not enough reserved storage to finalize this upload.",
        },
        { status: 409 }
      );
    }

    console.error(
      "Failed to finalize Content Workspace post upload:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to finalize the uploaded file. Please try again.",
      },
      { status: 500 }
    );
  }
}