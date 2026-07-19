import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

async function requireAdmin() {
  const creator = await getCurrentCreator();
  if (!creator || !isAdminEmail(creator.email)) return null;
  return creator;
}

// PATCH — comp status and/or discount percent for one creator
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { isComped, discountPercent } = await req.json();

  const data: { isComped?: boolean; discountPercent?: number } = {};
  if (typeof isComped === "boolean") data.isComped = isComped;
  if (typeof discountPercent === "number") {
    if (discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json({ error: "Discount must be between 0 and 100" }, { status: 400 });
    }
    data.discountPercent = discountPercent;
  }

  const updated = await db.creator.update({ where: { id }, data });
  return NextResponse.json({ creator: updated });
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