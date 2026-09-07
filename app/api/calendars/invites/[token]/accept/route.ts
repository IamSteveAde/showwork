import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "You need to be logged in to accept this" }, { status: 401 });

  const { token } = await params;
  const invite = await db.calendarInvite.findUnique({ where: { tokenHash: hashToken(token) } });

  if (!invite) return NextResponse.json({ error: "This invite is invalid" }, { status: 404 });
  if (invite.status !== "PENDING") return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
  if (invite.email.toLowerCase() !== creator.email.toLowerCase()) {
    return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
  }

  await db.$transaction([
    db.calendarCollaborator.upsert({
      where: { calendarId_creatorId: { calendarId: invite.calendarId, creatorId: creator.id } },
      create: { calendarId: invite.calendarId, creatorId: creator.id, role: invite.role },
      update: { role: invite.role },
    }),
    db.calendarInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ calendarId: invite.calendarId });
}