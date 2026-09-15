import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

const REFERRAL_CODE_LENGTH = 10;

function generateReferralCode(): string {
  return randomBytes(8)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, REFERRAL_CODE_LENGTH)
    .toUpperCase();
}

async function createUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();

    const existing = await db.partnerProfile.findUnique({
      where: {
        referralCode: code,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique referral code");
}

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
      isDeactivated: true,
      partnerProfile: {
        select: {
          id: true,
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
   * If the creator is already a partner, enrollment is idempotent.
   * We return the existing profile instead of creating another one.
   */
  if (creator.partnerProfile) {
    return NextResponse.json({
      ok: true,
      alreadyEnrolled: true,
      partner: {
        id: creator.partnerProfile.id,
        referralCode: creator.partnerProfile.referralCode,
        isActive: creator.partnerProfile.isActive,
        createdAt: creator.partnerProfile.createdAt,
      },
    });
  }

  const referralCode = await createUniqueReferralCode();

  const partner = await db.partnerProfile.create({
    data: {
      creatorId: creator.id,
      referralCode,
      isActive: true,
    },
    select: {
      id: true,
      referralCode: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    alreadyEnrolled: false,
    partner: {
      id: partner.id,
      referralCode: partner.referralCode,
      isActive: partner.isActive,
      createdAt: partner.createdAt,
    },
  });
}