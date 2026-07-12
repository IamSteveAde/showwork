import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUBLIC route — captures the viewing client's email before they see the
// password screen. This is the lead-gen mechanism for both the creator and
// Spotlite Africa.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { email } = await req.json();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.viewerEmail.create({ data: { projectId: id, email } });

  return NextResponse.json({ ok: true });
}
