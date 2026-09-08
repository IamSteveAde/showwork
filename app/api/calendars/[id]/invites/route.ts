import { NextRequest, NextResponse } from "next/server";
import { randomUUID, createHash } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendCalendarInviteEmail } from "@/lib/resend";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const VALID_ROLES = ["VIEW_ONLY", "ADD_CONTENT", "EDIT_CALENDAR"];

// GET — everyone currently on this calendar (accepted collaborators)
// plus anyone still waiting on an invite. Manager-only, since this is
// the list behind "who have I added" on the invite panel.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const [collaborators, pendingInvites] = await Promise.all([
    db.calendarCollaborator.findMany({
      where: { calendarId: id },
      orderBy: { addedAt: "desc" },
      include: { creator: { select: { name: true, email: true } } },
    }),
    db.calendarInvite.findMany({
      where: { calendarId: id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    collaborators: collaborators.map((c) => ({
      id: c.id,
      name: c.creator.name,
      email: c.creator.email,
      role: c.role,
    })),
    pendingInvites: pendingInvites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const { email, role } = await req.json();
  if (!email || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const finalRole = VALID_ROLES.includes(role) ? role : "ADD_CONTENT";

  const token = randomUUID() + randomUUID();
  const invite = await db.calendarInvite.create({
    data: {
      calendarId: calendar.id,
      invitedByCreatorId: creator.id,
      email: email.trim().toLowerCase(),
      role: finalRole,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  try {
    await sendCalendarInviteEmail({
      to: invite.email,
      invitedByName: creator.name || creator.email,
      clientName: calendar.clientName,
      token,
    });
  } catch (err) {
    console.error("Failed to send calendar invite email:", err);
  }

  return NextResponse.json({ ok: true, role: finalRole });
}