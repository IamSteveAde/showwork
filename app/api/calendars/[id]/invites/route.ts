import { NextRequest, NextResponse } from "next/server";
import { randomUUID, createHash } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendCalendarInviteEmail } from "@/lib/resend";
import {
  canAddContentWorkspaceCollaborator,
  getContentWorkspacePlan,
} from "@/lib/contentWorkspaceUsage";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const VALID_ROLES = ["VIEW_ONLY", "ADD_CONTENT", "EDIT_CALENDAR"];

// GET — everyone currently on this calendar (accepted collaborators)
// plus anyone still waiting on an invite. Manager-only.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
  });

  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json(
      { error: "Calendar not found" },
      { status: 404 }
    );
  }

  const [collaborators, pendingInvites] = await Promise.all([
    db.calendarCollaborator.findMany({
      where: {
        calendarId: id,
      },
      orderBy: {
        addedAt: "desc",
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),

    db.calendarInvite.findMany({
      where: {
        calendarId: id,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
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

// POST — sends a new collaborator invite.
//
// Creator: up to 3 collaborators/invites across the account.
// Studio: up to 15 collaborators/invites across the account.
//
// Creator accounts ARE allowed to collaborate. The old
// Individual-only restriction has therefore been removed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
  });

  if (!calendar || calendar.managerId !== creator.id) {
    return NextResponse.json(
      { error: "Calendar not found" },
      { status: 404 }
    );
  }

  /*
   * Content Workspace access and collaborator entitlement are both
   * enforced server-side.
   */
  const canAddCollaborator =
    await canAddContentWorkspaceCollaborator(creator);

  if (!canAddCollaborator) {
    const plan = getContentWorkspacePlan(creator);

    const message =
      plan === "CREATOR"
        ? "Your Creator plan allows up to 3 collaborators, including pending invitations."
        : "Your Studio plan allows up to 15 collaborators, including pending invitations.";

    return NextResponse.json(
      {
        error: message,
        capReached: true,
        plan,
      },
      { status: 403 }
    );
  }

  const { email, role } = await req.json();

  if (!email || !email.trim()) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const finalRole = VALID_ROLES.includes(role)
    ? role
    : "ADD_CONTENT";

  /*
   * Re-check the account-level collaborator count immediately before
   * creating the invite.
   *
   * This prevents the route from relying only on the entitlement
   * helper's earlier read.
   */
  const [collaboratorCount, pendingInviteCount] =
    await Promise.all([
      db.calendarCollaborator.count({
        where: {
          calendar: {
            managerId: creator.id,
          },
        },
      }),

      db.calendarInvite.count({
        where: {
          calendar: {
            managerId: creator.id,
          },
          status: "PENDING",
        },
      }),
    ]);

  const plan = getContentWorkspacePlan(creator);
  const collaboratorLimit = plan === "CREATOR" ? 3 : 15;

  if (
    collaboratorCount + pendingInviteCount >=
    collaboratorLimit
  ) {
    return NextResponse.json(
      {
        error:
          plan === "CREATOR"
            ? "Your Creator plan allows up to 3 collaborators, including pending invitations."
            : "Your Studio plan allows up to 15 collaborators, including pending invitations.",
        capReached: true,
        plan,
        collaboratorLimit,
      },
      { status: 403 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  /*
   * Prevent inviting the same email repeatedly while an existing
   * invitation is still pending.
   */
  const existingPendingInvite =
    await db.calendarInvite.findFirst({
      where: {
        calendarId: calendar.id,
        email: normalizedEmail,
        status: "PENDING",
      },
      select: {
        id: true,
      },
    });

  if (existingPendingInvite) {
    return NextResponse.json(
      {
        error:
          "There is already a pending invitation for this email.",
      },
      { status: 400 }
    );
  }

  const token = randomUUID() + randomUUID();

  const invite = await db.calendarInvite.create({
    data: {
      calendarId: calendar.id,
      invitedByCreatorId: creator.id,
      email: normalizedEmail,
      role: finalRole,
      tokenHash: hashToken(token),
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
    },
  });

  try {
    await sendCalendarInviteEmail({
      to: invite.email,
      invitedByName: creator.name || creator.email,
      clientName: calendar.clientName,
      token,
    });
  } catch (error) {
    console.error(
      "Failed to send calendar invite email:",
      error
    );
  }

  return NextResponse.json({
    ok: true,
    role: finalRole,
  });
}