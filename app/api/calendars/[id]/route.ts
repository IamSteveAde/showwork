import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import {
  deleteObject,
  getObjectSize,
} from "@/lib/r2";
import {
  releaseContentWorkspaceStorage,
} from "@/lib/contentWorkspaceUsage";

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";

  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

export async function PATCH(
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

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
  });

  if (!calendar) {
    return NextResponse.json(
      { error: "Calendar not found" },
      { status: 404 }
    );
  }

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

   const reqBody = await req.json();

  const {
    action,
    clientName,
    password,
    headerBannerDesktopUrl,
    headerBannerMobileUrl,
    headerTitle,
    headerDescription,
  } = reqBody;

  // ─────────────────────────────────────────────
  // PUBLISH
  // ─────────────────────────────────────────────

  if (action === "publish") {
    if (
      calendar.planStatus !== "BUILDING" &&
      calendar.planStatus !== "PLAN_NEEDS_CHANGES"
    ) {
      return NextResponse.json(
        {
          error:
            "This plan can't be published from its current state",
        },
        { status: 400 }
      );
    }

    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        planStatus: "AWAITING_APPROVAL",
        planSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({ calendar: updated });
  }

  // ─────────────────────────────────────────────
  // UPDATE DETAILS
  // ─────────────────────────────────────────────

  if (action === "update_details") {
    if (!clientName || !clientName.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        clientName: clientName.trim(),
      },
    });

    return NextResponse.json({ calendar: updated });
  }

  // ─────────────────────────────────────────────
  // REGENERATE PASSWORD
  // ─────────────────────────────────────────────

  if (action === "regenerate_password") {
    const newCode = generateAccessCode();

    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(newCode),
        accessCode: newCode,
      },
    });

    return NextResponse.json({
      calendar: updated,
      newPassword: newCode,
    });
  }

  // ─────────────────────────────────────────────
  // SET PASSWORD
  // ─────────────────────────────────────────────

  if (action === "set_password") {
    if (!password) {
      return NextResponse.json(
        { error: "A password is required" },
        { status: 400 }
      );
    }

    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password),
        accessCode: password,
      },
    });

    return NextResponse.json({
      calendar: updated,
      newPassword: password,
    });
  }

      // ─────────────────────────────────────────────
  // UPDATE HEADER
  // ─────────────────────────────────────────────

  if (action === "update_header") {
    const desktopReservationId =
      typeof reqBody?.desktopReservationId === "string"
        ? reqBody.desktopReservationId
        : null;

    const mobileReservationId =
      typeof reqBody?.mobileReservationId === "string"
        ? reqBody.mobileReservationId
        : null;

    const newDesktopBanner =
      headerBannerDesktopUrl !== undefined
        ? headerBannerDesktopUrl || null
        : undefined;

    const newMobileBanner =
      headerBannerMobileUrl !== undefined
        ? headerBannerMobileUrl || null
        : undefined;

    /*
     * Verify each newly uploaded banner before consuming its
     * reservation. The browser-provided file size is never
     * trusted here — R2 is the source of truth.
     */
    const verifyBannerUpload = async (
      reservationId: string | null,
      fileKey: string | null,
      variant: "desktop" | "mobile"
    ) => {
      if (!reservationId || !fileKey) {
        return {
          success: true,
          reservationId: null,
          fileKey: null,
          bytes: 0,
        };
      }

      try {
        const reservation =
          await db.contentWorkspaceStorageReservation.findUnique({
            where: {
              id: reservationId,
            },
            select: {
              creatorId: true,
              calendarId: true,
              fileKey: true,
              bytes: true,
              status: true,
              expiresAt: true,
            },
          });

        if (!reservation) {
          return {
            success: false,
            reservationId,
            fileKey,
            bytes: 0,
            error:
              `The ${variant} banner storage reservation was not found.`,
          };
        }

        if (
          reservation.creatorId !== creator.id ||
          reservation.calendarId !== id ||
          reservation.fileKey !== fileKey
        ) {
          return {
            success: false,
            reservationId,
            fileKey,
            bytes: 0,
            error:
              `The ${variant} banner storage reservation does not match this upload.`,
          };
        }

        if (reservation.status !== "PENDING") {
          return {
            success: false,
            reservationId,
            fileKey,
            bytes: 0,
            error:
              `The ${variant} banner upload is no longer available.`,
          };
        }

        if (reservation.expiresAt <= new Date()) {
          return {
            success: false,
            reservationId,
            fileKey,
            bytes: 0,
            error:
              `The ${variant} banner upload has expired. Please upload it again.`,
          };
        }

        const actualSize = await getObjectSize(fileKey);
        const reservedBytes = Number(reservation.bytes);

        if (
          !Number.isSafeInteger(reservedBytes) ||
          reservedBytes <= 0
        ) {
          return {
            success: false,
            reservationId,
            fileKey,
            bytes: 0,
            error:
              `The ${variant} banner has an invalid storage reservation.`,
          };
        }

        if (actualSize !== reservedBytes) {
          return {
            success: false,
            reservationId,
            fileKey,
            bytes: 0,
            error:
              `The uploaded ${variant} banner size does not match the reserved storage amount.`,
          };
        }

        return {
          success: true,
          reservationId,
          fileKey,
          bytes: actualSize,
        };
      } catch (error) {
        console.error(
          `Failed to verify ${variant} banner upload:`,
          error
        );

        return {
          success: false,
          reservationId,
          fileKey,
          bytes: 0,
          error:
            `Failed to verify the uploaded ${variant} banner.`,
        };
      }
    };

    const desktopResult =
      await verifyBannerUpload(
        desktopReservationId,
        newDesktopBanner,
        "desktop"
      );

    if (!desktopResult.success) {
      return NextResponse.json(
        {
          error: desktopResult.error,
        },
        { status: 400 }
      );
    }

    const mobileResult =
      await verifyBannerUpload(
        mobileReservationId,
        newMobileBanner,
        "mobile"
      );

    if (!mobileResult.success) {
      return NextResponse.json(
        {
          error: mobileResult.error,
        },
        { status: 400 }
      );
    }

    /*
     * Finalize verified reservations and update the banner
     * references together in one database transaction.
     */
    const updated = await db.$transaction(async (tx) => {
      const finalizeReservation = async (
        reservationId: string | null,
        expectedFileKey: string | null,
        expectedBytes: number
      ) => {
        if (
          !reservationId ||
          !expectedFileKey
        ) {
          return;
        }

        const reservation =
          await tx.contentWorkspaceStorageReservation.findUnique({
            where: {
              id: reservationId,
            },
            select: {
              creatorId: true,
              calendarId: true,
              fileKey: true,
              bytes: true,
              status: true,
              expiresAt: true,
            },
          });

        if (!reservation) {
          throw new Error(
            "Storage reservation not found."
          );
        }

        if (
          reservation.creatorId !== creator.id ||
          reservation.calendarId !== id ||
          reservation.fileKey !== expectedFileKey
        ) {
          throw new Error(
            "Storage reservation does not match this upload."
          );
        }

        if (reservation.status !== "PENDING") {
          throw new Error(
            "Storage reservation is no longer pending."
          );
        }

        if (reservation.expiresAt <= new Date()) {
          throw new Error(
            "Storage reservation has expired."
          );
        }

        const bytes = Number(reservation.bytes);

        if (
          !Number.isSafeInteger(bytes) ||
          bytes <= 0 ||
          bytes !== expectedBytes
        ) {
          throw new Error(
            "Storage reservation accounting is inconsistent."
          );
        }

        const usage =
          await tx.contentWorkspaceUsage.findUnique({
            where: {
              creatorId: creator.id,
            },
            select: {
              storageReservedBytes: true,
            },
          });

        if (
          !usage ||
          Number(usage.storageReservedBytes) < bytes
        ) {
          throw new Error(
            "Storage reservation accounting is inconsistent."
          );
        }

        await tx.contentWorkspaceUsage.update({
          where: {
            creatorId: creator.id,
          },
          data: {
            storageReservedBytes: {
              decrement: BigInt(bytes),
            },
            storageBytes: {
              increment: BigInt(bytes),
            },
          },
        });

        await tx.contentWorkspaceStorageReservation.update({
          where: {
            id: reservationId,
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      };

      await finalizeReservation(
        desktopResult.reservationId,
        desktopResult.fileKey,
        desktopResult.bytes
      );

      await finalizeReservation(
        mobileResult.reservationId,
        mobileResult.fileKey,
        mobileResult.bytes
      );

      return tx.socialCalendar.update({
        where: {
          id,
        },
        data: {
          headerBannerDesktopUrl:
            newDesktopBanner,

          headerBannerMobileUrl:
            newMobileBanner,

          headerTitle:
            headerTitle !== undefined
              ? headerTitle?.trim() || null
              : undefined,

          headerDescription:
            headerDescription !== undefined
              ? headerDescription?.trim() || null
              : undefined,
        },
      });
    });

    /*
     * The new banner references are now committed. The old
     * banner objects are no longer referenced, so delete them
     * from R2 and release their tracked storage.
     */
    const releaseOldBanner = async (
      oldFileKey: string | null,
      newFileKey: string | null | undefined,
      variant: "desktop" | "mobile"
    ) => {
      if (
        !oldFileKey ||
        oldFileKey === newFileKey
      ) {
        return;
      }

      try {
        const oldSize =
          await getObjectSize(oldFileKey);

        await deleteObject(oldFileKey);

        await releaseContentWorkspaceStorage(
          creator.id,
          oldSize
        );
      } catch (error) {
        /*
         * Do not undo a successful header update if cleanup
         * fails. The old object can be cleaned up separately.
         */
        console.error(
          `Failed to clean up old ${variant} banner:`,
          error
        );
      }
    };

    await releaseOldBanner(
      calendar.headerBannerDesktopUrl,
      newDesktopBanner,
      "desktop"
    );

        await releaseOldBanner(
      calendar.headerBannerMobileUrl,
      newMobileBanner,
      "mobile"
    );

    return NextResponse.json({
      calendar: updated,
    });
  }

  return NextResponse.json(
    { error: "Unknown action" },
    { status: 400 }
  );
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
//
// Deletes the client workspace and its content.
//
// IMPORTANT:
// Calendar billing is account-level. Deleting one workspace
// must NOT cancel the creator's calendar subscription because
// the creator may have other client workspaces covered by
// the same subscription.
//
// Billing remains attached to the Creator account.
// ─────────────────────────────────────────────

export async function DELETE(
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

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    include: {
      posts: {
        include: {
          assets: true,
        },
      },
    },
  });

  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json(
      { error: "Calendar not found" },
      { status: 404 }
    );
  }

  // Delete uploaded media from R2 before removing the
  // workspace records from the database.
  //
  // We intentionally DO NOT cancel Paystack here.
  // Calendar billing belongs to the Creator account and
  // one subscription covers all of the creator's workspaces.

  for (const post of calendar.posts) {
    for (const asset of post.assets) {
      try {
        await deleteObject(asset.fileKey);
      } catch (err) {
        console.error(
          `Failed to delete R2 object for asset ${asset.id}:`,
          err
        );
      }
    }
  }

  await db.socialCalendar.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}