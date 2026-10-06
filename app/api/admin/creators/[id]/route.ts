import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
async function requireAdmin() {
  const creator = await getCurrentCreator();
  return creator && isAdminEmail(creator.email) ? creator : null;
}

// New financial benefits require scoped terms in the Billing Benefits API.
// This compatibility endpoint only removes legacy flags or changes Free quotas.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body;
  try { body = await req.json(); if (!body || typeof body !== "object") throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const { isComped, discountPercent, freeTierLimitOverride, resetBilling } = body;
  if (isComped === true || (typeof discountPercent === "number" && discountPercent > 0)) {
    return NextResponse.json({ error: "Create a product-specific benefit with a duration in Billing Benefits.", manageUrl: "/admin/billing-offers" }, { status: 409 });
  }
  if ((isComped !== undefined && typeof isComped !== "boolean") ||
      (discountPercent !== undefined && discountPercent !== 0) ||
      (freeTierLimitOverride !== undefined && freeTierLimitOverride !== null && (!Number.isSafeInteger(freeTierLimitOverride) || freeTierLimitOverride < 0 || freeTierLimitOverride > 2147483647))) {
    return NextResponse.json({ error: "Invalid account controls. Free project limits must be non-negative whole numbers." }, { status: 400 });
  }
  const account = await db.creator.findUnique({ where: { id }, select: { id: true, paystackSubscriptionCode: true } });
  if (!account) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  if (resetBilling === true && account.paystackSubscriptionCode) return NextResponse.json({ error: "Cancel the Delivery subscription before resetting billing. A reset must not leave provider charges running." }, { status: 409 });
  if (isComped === undefined && discountPercent === undefined && freeTierLimitOverride === undefined && resetBilling !== true) return NextResponse.json({ error: "No supported account changes supplied" }, { status: 400 });
  const creator = await db.$transaction(async tx => {
    if (discountPercent === 0 || resetBilling === true) await tx.billingOffer.updateMany({ where: { id: `legacy-delivery-${id}`, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: admin.email } });
    return tx.creator.update({ where: { id }, data: {
      ...(isComped === false ? { isComped: false, compedUntil: null } : {}),
      ...(discountPercent === 0 ? { discountPercent: 0 } : {}),
      ...(freeTierLimitOverride !== undefined ? { freeTierLimitOverride } : {}),
      ...(resetBilling === true ? { subscriptionActive: false, subscriptionTier: "FREE", subscriptionCycle: null,
        discountPercent: 0, paystackCustomerCode: null, paystackSubscriptionCode: null, paystackEmailToken: null,
        subscriptionRenewsAt: null, deliveryOfferSubscriptionId: null, currentCycleStart: new Date() } : {}),
    } });
  });
  return NextResponse.json({ creator });
}

// DELETE — removes the creator and, via cascade, every project/media/
// viewer email/payment record they have.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json({ error: "You can't delete your own account from here" }, { status: 400 });
  }

  await db.creator.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}