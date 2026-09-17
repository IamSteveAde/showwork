import { NextResponse } from "next/server";

import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendPartnerApplicationNotificationEmail, sendPartnerApplicationReceivedEmail } from "@/lib/resend";

export async function POST() {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const creator = await db.creator.findUnique({
    where: {
      id: session.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isDeactivated: true,
      partnerProfile: {
        select: {
          id: true,
          status: true,
          referralCode: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  if (!creator) {
    return NextResponse.json(
      { error: "Creator account not found" },
      { status: 404 }
    );
  }

  if (creator.isDeactivated) {
    return NextResponse.json(
      { error: "This account is deactivated" },
      { status: 403 }
    );
  }

  /*
   * A creator can only have one PartnerProfile because
   * creatorId is unique in the database.
   */
  if (creator.partnerProfile) {
    if (creator.partnerProfile.status === "ACTIVE") {
      return NextResponse.json(
        {
          error: "You are already an active Showwork partner",
          status: "ACTIVE",
        },
        { status: 409 }
      );
    }

    if (creator.partnerProfile.status === "PENDING") {
      return NextResponse.json(
        {
          error: "Your Partner Program application is already under review",
          status: "PENDING",
        },
        { status: 409 }
      );
    }

    if (creator.partnerProfile.status === "SUSPENDED") {
      return NextResponse.json(
        {
          error: "Your Partner Program access has been suspended",
          status: "403",
        },
        { status: 403 }
      );
    }

    /*
     * A previously rejected application can be submitted again.
     * We reuse the existing PartnerProfile rather than creating
     * another record.
     */
    if (creator.partnerProfile.status === "REJECTED") {
      await db.partnerProfile.update({
        where: {
          id: creator.partnerProfile.id,
        },
       data: {
  status: "PENDING",
  isActive: false,
},
      });

      await Promise.all([
        sendPartnerApplicationReceivedEmail({
          to: creator.email,
          name: creator.name,
        }),
        sendPartnerApplicationNotificationEmail({
  name: creator.name ?? "Unknown",
  email: creator.email,
})
      ]);

      return NextResponse.json({
        ok: true,
        status: "PENDING",
        resubmitted: true,
      });
    }
  }

  /*
   * First-time application.
   *
   * No referral code is generated here.
   * The profile remains inactive until an admin approves it.
   */
  const partner = await db.partnerProfile.create({
    data: {
      creatorId: creator.id,
      referralCode: `PENDING-${creator.id}`,
      status: "PENDING",
      isActive: false,
    },
    select: {
      id: true,
      status: true,
      isActive: true,
      createdAt: true,
    },
  });

  await Promise.all([
    sendPartnerApplicationReceivedEmail({
      to: creator.email,
      name: creator.name,
    }),
   sendPartnerApplicationNotificationEmail({
  name: creator.name ?? "Unknown",
  email: creator.email,
})
  ]);

  return NextResponse.json({
    ok: true,
    status: partner.status,
    resubmitted: false,
    application: {
      id: partner.id,
      status: partner.status,
      isActive: partner.isActive,
      createdAt: partner.createdAt,
    },
  });
}