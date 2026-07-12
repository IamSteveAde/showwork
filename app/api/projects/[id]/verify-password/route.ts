import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";

// PUBLIC route — called by anonymous viewers on the delivery page.
// Never expose the passwordHash itself to the client; only this
// yes/no verdict.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { password } = await req.json();

  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const valid = await verifyPassword(password ?? "", project.passwordHash);
  return NextResponse.json({ valid });
}
