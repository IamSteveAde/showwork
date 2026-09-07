import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { deleteObject } from "@/lib/r2";
import { cancelSubscription } from "@/lib/paystack";

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
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to edit this calendar" }, { status: 403 });
  }

  const { action, clientName, password, headerBannerDesktopUrl, headerBannerMobileUrl, headerTitle, headerDescription } = await req.json();

  // "publish" — marks the plan skeleton as ready. Allowed from
  // BUILDING (the first time) or PLAN_NEEDS_CHANGES (re-submitting
  // after the client asked for changes) — never from PLAN_APPROVED,
  // since that would silently re-open something the client already
  // signed off on.
  if (action === "publish") {
    if (calendar.planStatus !== "BUILDING" && calendar.planStatus !== "PLAN_NEEDS_CHANGES") {
      return NextResponse.json({ error: "This plan can't be published from its current state" }, { status: 400 });
    }
    const updated = await db.socialCalendar.update({
      where: { id },
      data: { planStatus: "AWAITING_APPROVAL", planSubmittedAt: new Date() },
    });
    return NextResponse.json({ calendar: updated });
  }

  // "update_details" — renaming the calendar (the client-facing name
  // shown throughout, not the URL slug, which stays stable so the
  // client's saved link never breaks).
  if (action === "update_details") {
    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }
    const updated = await db.socialCalendar.update({
      where: { id },
      data: { clientName: clientName.trim() },
    });
    return NextResponse.json({ calendar: updated });
  }

  // "regenerate_password" — replaces the client's access code with a
  // fresh random one. No composition rules apply here (nobody types
  // this in by hand), so a plain random string is exactly right.
  if (action === "regenerate_password") {
    const newCode = generateAccessCode();
    const updated = await db.socialCalendar.update({
      where: { id },
      data: { passwordHash: await hashPassword(newCode), accessCode: newCode },
    });
    return NextResponse.json({ calendar: updated, newPassword: newCode });
  }

  // "set_password" — lets the manager choose their own password
  // instead, with genuinely no rules on what it can be — even a
  // single character is accepted, since the whole point is
  // flexibility, not enforced security policy on a shared client
  // link.
  if (action === "set_password") {
    if (!password) {
      return NextResponse.json({ error: "A password is required" }, { status: 400 });
    }
    const updated = await db.socialCalendar.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), accessCode: password },
    });
    return NextResponse.json({ calendar: updated, newPassword: password });
  }

  // "update_header" — the optional hero banner, title, and
  // description shown on the client-facing page. Every field is
  // independently optional and editable at any time, not just when
  // publishing.
  if (action === "update_header") {
    const updated = await db.socialCalendar.update({
      where: { id },
      data: {
        headerBannerDesktopUrl: headerBannerDesktopUrl !== undefined ? headerBannerDesktopUrl || null : undefined,
        headerBannerMobileUrl: headerBannerMobileUrl !== undefined ? headerBannerMobileUrl || null : undefined,
        headerTitle: headerTitle !== undefined ? headerTitle?.trim() || null : undefined,
        headerDescription: headerDescription !== undefined ? headerDescription?.trim() || null : undefined,
      },
    });
    return NextResponse.json({ calendar: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE — removes the whole calendar, permanently. Restricted to the
// manager (owner) only, never an EDIT_CALENDAR collaborator: this
// destroys billing history and every post at once, which is a bigger
// decision than anything a collaborator role should be trusted with.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    include: { posts: { include: { assets: true } } },
  });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  // Stop the recurring charge before deleting anything — an active
  // subscription left running after the calendar itself is gone would
  // keep billing the manager for something that no longer exists.
  if (calendar.paystackSubscriptionCode && calendar.paystackEmailToken) {
    try {
      await cancelSubscription(calendar.paystackSubscriptionCode, calendar.paystackEmailToken);
    } catch (err) {
      console.error(`Failed to cancel subscription while deleting calendar ${calendar.id}:`, err);
    }
  }

  for (const post of calendar.posts) {
    for (const asset of post.assets) {
      try {
        await deleteObject(asset.fileKey);
      } catch (err) {
        console.error(`Failed to delete R2 object for asset ${asset.id}:`, err);
      }
    }
  }

  await db.socialCalendar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}