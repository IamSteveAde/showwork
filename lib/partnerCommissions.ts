import { db } from "@/lib/db";

const PARTNER_COMMISSION_PERCENT = 10;

const QUALIFYING_PAYMENT_TYPES = new Set([
  "SUBSCRIPTION_INITIAL",
  "SUBSCRIPTION_RENEWAL",
  "CONTENT_WORKSPACE_SUBSCRIPTION_INITIAL",
  "CONTENT_WORKSPACE_SUBSCRIPTION_RENEWAL",
]);

function addTwelveMonths(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 12);
  return result;
}

type PaymentForCommission = {
  id: string;
  creatorId: string;
  amountNgn: number;
  type: string;
  createdAt: Date;
};

export async function processReferralCommission(
  payment: PaymentForCommission
): Promise<void> {
  // Only qualifying Showwork and Content Workspace
  // subscription payments can generate partner commissions.
  if (!QUALIFYING_PAYMENT_TYPES.has(payment.type)) {
    return;
  }

  // Never create a commission for a zero or negative payment.
  if (payment.amountNgn <= 0) {
    return;
  }

  const referral = await db.referral.findUnique({
    where: {
      referredCreatorId: payment.creatorId,
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      commissionEndsAt: true,
    },
  });

  // This creator was not referred by a partner.
  if (!referral) {
    return;
  }

  const paymentDate = payment.createdAt;

  // ---------------------------------------------------------------------------
  // FIRST QUALIFYING PAYMENT
  // ---------------------------------------------------------------------------
  //
  // The first successful qualifying payment activates the referral and starts
  // the 12-month commission window.
  //
  if (referral.status === "PENDING") {
    const commissionEndsAt = addTwelveMonths(paymentDate);

    await db.$transaction(async (tx) => {
      // Prevent the same PaymentRecord from creating another commission.
      const existingCommission =
        await tx.referralCommission.findUnique({
          where: {
            paymentRecordId: payment.id,
          },
          select: {
            id: true,
          },
        });

      if (existingCommission) {
        return;
      }

      await tx.referral.update({
        where: {
          id: referral.id,
        },
        data: {
          status: "ACTIVE",
          startedAt: paymentDate,
          commissionEndsAt,
        },
      });

      await tx.referralCommission.create({
        data: {
          referralId: referral.id,
          paymentRecordId: payment.id,
          paymentAmountNgn: payment.amountNgn,
          commissionPercent: PARTNER_COMMISSION_PERCENT,
          commissionAmountNgn: Math.floor(
            (payment.amountNgn * PARTNER_COMMISSION_PERCENT) / 100
          ),
          status: "PENDING",
          earnedAt: paymentDate,
        },
      });
    });

    return;
  }

  // Only ACTIVE referrals can continue earning commissions.
  //
  // IMPORTANT:
  // We deliberately do NOT check PartnerProfile.isActive here.
  //
  // This implements the policy we just agreed on:
  // deactivating a partner stops new referrals, but existing referred
  // customers continue generating commissions during their valid
  // 12-month commission window.
  if (referral.status !== "ACTIVE") {
    return;
  }

  // Once the 12-month window has ended, no further commission is earned.
  if (
    !referral.commissionEndsAt ||
    paymentDate > referral.commissionEndsAt
  ) {
    return;
  }

  // Prevent duplicate commission creation for the same payment.
  const existingCommission =
    await db.referralCommission.findUnique({
      where: {
        paymentRecordId: payment.id,
      },
      select: {
        id: true,
      },
    });

  if (existingCommission) {
    return;
  }

  await db.referralCommission.create({
    data: {
      referralId: referral.id,
      paymentRecordId: payment.id,
      paymentAmountNgn: payment.amountNgn,
      commissionPercent: PARTNER_COMMISSION_PERCENT,
      commissionAmountNgn: Math.floor(
        (payment.amountNgn * PARTNER_COMMISSION_PERCENT) / 100
      ),
      status: "PENDING",
      earnedAt: paymentDate,
    },
  });
}