import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const webinar = await db.creativoWebinar.findUnique({ where: { id }, select: { topic: true } });
  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  const rsvps = await db.webinarRsvp.findMany({
    where: { webinarId: id },
    orderBy: { createdAt: "desc" },
  });

  const header = ["Name", "Email", "WhatsApp number", "Field", "Joined community", "RSVP'd at"];
  const rows = rsvps.map((r) => [
    r.name,
    r.email,
    r.whatsappNumber,
    r.field,
    r.joinedCommunity ? "Yes" : "No",
    r.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${webinar.topic.replace(/\s+/g, "-").toLowerCase()}-rsvps.csv"`,
    },
  });
}