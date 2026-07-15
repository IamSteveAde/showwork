import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createViewerToken } from "@/lib/auth";

// PUBLIC route — called by anonymous viewers on the delivery page.
// Never expose the passwordHash itself to the client; only this
// yes/no verdict.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { password, viewerEmail } = await req.json();

  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const valid = await verifyPassword(password ?? "", project.passwordHash);
  const response = NextResponse.json({ valid });

  // On success, remember this browser as already-unlocked for this
  // project for 30 days — so a refresh doesn't force re-entering the
  // email and password every time.
  if (valid && viewerEmail) {
    const token = createViewerToken(id, viewerEmail);
    response.cookies.set(`viewer_${id}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return response;
}