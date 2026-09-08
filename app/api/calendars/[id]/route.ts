import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { deleteObject } from "@/lib/r2";

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

  const {
    action,
    clientName,
    password,
    headerBannerDesktopUrl,
    headerBannerMobileUrl,
    headerTitle,
    headerDescription,
  } = await req.json();

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
    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        headerBannerDesktopUrl:
          headerBannerDesktopUrl !== undefined
            ? headerBannerDesktopUrl || null
            : undefined,

        headerBannerMobileUrl:
          headerBannerMobileUrl !== undefined
            ? headerBannerMobileUrl || null
            : undefined,

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

    return NextResponse.json({ calendar: updated });
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