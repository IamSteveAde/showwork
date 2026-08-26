import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rsvps = await db.webinarRsvp.findMany({
    where: { webinarId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rsvps });
}