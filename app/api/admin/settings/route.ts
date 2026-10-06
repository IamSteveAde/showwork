import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

// POST — sets the platform-wide discount percentage. Applies only to
// new subscriptions started while active — doesn't touch anyone
// already subscribed at their current price.
export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { globalDiscountPercent } = await req.json();
  if (globalDiscountPercent !== 0) return NextResponse.json({ error: "Create a global offer in Billing Benefits to specify its products, plans and duration.", manageUrl: "/admin/billing-offers" }, { status: 409 });
  if (typeof globalDiscountPercent !== "number" || globalDiscountPercent < 0 || globalDiscountPercent > 100) {
    return NextResponse.json({ error: "Discount must be between 0 and 100" }, { status: 400 });
  }

  await db.$transaction(async tx => {
    await tx.platformSettings.upsert({
      where: { id: "singleton" }, update: { globalDiscountPercent },
      create: { id: "singleton", globalDiscountPercent },
    });
    await tx.billingOffer.updateMany({
      where: { id: "legacy-global-delivery", revokedAt: null },
      data: { revokedAt: new Date(), revokedBy: admin.email },
    });
  });

  return NextResponse.json({ ok: true });
}