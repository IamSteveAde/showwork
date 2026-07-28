import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

// Wraps a value in quotes and escapes any internal quotes, only when
// actually needed (a comma, quote, or newline in the value) — keeps
// the output clean for the common case while staying correct CSV for
// names that do contain a comma.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator || !isAdminEmail(creator.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creators = await db.creator.findMany({
    orderBy: { createdAt: "asc" },
    select: { name: true, email: true, phone: true },
  });

  const header = "Name,Email,Phone";
  const rows = creators.map((c) =>
    [csvField(c.name || ""), csvField(c.email), csvField(c.phone || "")].join(",")
  );
  const csv = [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="showwork-creators-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}