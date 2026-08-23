import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const activeCycle = await db.spotlightCycle.findFirst({ where: { isActive: true } });
  if (!activeCycle) {
    return NextResponse.json({ error: "No active cycle to export" }, { status: 400 });
  }

  const submissions = await db.spotlightSubmission.findMany({
    where: { cycleId: activeCycle.id },
    orderBy: { submittedAt: "desc" },
  });

  const header = ["Name", "Email", "Category", "Project link", "Description", "Note", "Shortlisted", "Rank", "Submitted at"];
  const rows = submissions.map((s) => [
    s.name,
    s.email,
    s.category,
    s.projectLink,
    s.description,
    s.note ?? "",
    s.isShortlisted ? "Yes" : "No",
    s.rank ? String(s.rank) : "",
    s.submittedAt.toISOString(),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="spotlight-${activeCycle.monthLabel.replace(/\s+/g, "-").toLowerCase()}.csv"`,
    },
  });
}