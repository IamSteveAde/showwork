import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const VALID_ROLES = ["VIEW_ONLY", "ADD_CONTENT", "EDIT_CALENDAR"] as const;

type Role = (typeof VALID_ROLES)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const creator = await getCurrentCreator();

    if (!creator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 }
      );
    }

    /*
     * Invite tokens are never stored in plain text.
     * The original token sent in the invitation email is hashed
     * and compared against the stored tokenHash.
     */
    const tokenHash = hashToken(token);

    const invite = await db.calendarInvite.findFirst({
      where: {
        tokenHash,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "This invite is invalid or no longer exists." },
        { status: 404 }
      );
    }

    /*
     * An invite can only be accepted once.
     */
    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invite has already been accepted or is no longer active." },
        { status: 400 }
      );
    }

    /*
     * Invitations expire after 7 days.
     */
    if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This invite has expired. Ask the workspace manager to send a new invite." },
        { status: 410 }
      );
    }

    /*
     * The invited email must match the currently authenticated
     * creator's email. This prevents somebody who obtains a token
     * from accepting an invitation intended for another account.
     */
    const creatorEmail = creator.email?.trim().toLowerCase();
    const invitedEmail = invite.email?.trim().toLowerCase();

    if (!creatorEmail || creatorEmail !== invitedEmail) {
      return NextResponse.json(
        {
          error:
            "This invitation was sent to a different email address. Sign in with the invited account to accept it.",
        },
        { status: 403 }
      );
    }

    /*
     * Make sure the target calendar still exists.
     */
    const calendar = await db.socialCalendar.findUnique({
      where: {
        id: invite.calendarId,
      },
      select: {
        id: true,
        clientName: true,
        managerId: true,
      },
    });

    if (!calendar) {
      return NextResponse.json(
        { error: "The client workspace no longer exists." },
        { status: 404 }
      );
    }

    /*
     * The manager cannot accept their own collaborator invite.
     */
    if (calendar.managerId === creator.id) {
      return NextResponse.json(
        { error: "The workspace manager cannot accept a collaborator invite." },
        { status: 400 }
      );
    }

    /*
     * If this creator is already a collaborator on the workspace,
     * don't create a duplicate relationship.
     */
    const existingCollaborator =
      await db.calendarCollaborator.findFirst({
        where: {
          calendarId: calendar.id,
          creatorId: creator.id,
        },
        select: {
          id: true,
          role: true,
        },
      });

    if (existingCollaborator) {
      /*
       * The relationship already exists, so make sure the invitation
       * itself is no longer pending.
       */
      await db.calendarInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "ACCEPTED",
        },
      });

      return NextResponse.json({
        ok: true,
        alreadyMember: true,
        calendarId: calendar.id,
        role: existingCollaborator.role,
      });
    }

    /*
     * Validate the stored role before creating the collaborator.
     * The role should already be valid because it was created through
     * the invite API, but this keeps the acceptance route defensive.
     */
    const role = VALID_ROLES.includes(invite.role as Role)
      ? (invite.role as Role)
      : "ADD_CONTENT";

    /*
     * Create the collaborator and mark the invite as accepted
     * atomically so we don't end up with a collaborator created
     * while the invite remains pending, or vice versa.
     */
    await db.$transaction(async (tx) => {
      await tx.calendarCollaborator.create({
        data: {
          calendarId: calendar.id,
          creatorId: creator.id,
          role,
        },
      });

      await tx.calendarInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "ACCEPTED",
        },
      });
    });

    return NextResponse.json({
      ok: true,
      calendarId: calendar.id,
      role,
    });
  } catch (error) {
    console.error("Failed to accept calendar invite:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while accepting the invite.",
      },
      { status: 500 }
    );
  }
}