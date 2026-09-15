import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

const MINIMUM_PAYOUT_NGN = 5000;

export async function POST() {
  try {
    const creator = await getCurrentCreator();

    if (!creator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const partner = await db.partnerProfile.findUnique({
      where: {
        creatorId: creator.id,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!partner) {
      return NextResponse.json(
        {
          error:
            "You need to join the Partner Program before requesting a payout.",
        },
        { status: 403 }
      );
    }

    /*
     * Partner deactivation only stops new referrals.
     * Existing eligible commissions remain payable.
     *
     * Therefore, we intentionally do NOT reject payouts
     * when partner.isActive is false.
     */

    const payout = await db.$transaction(async (tx) => {
      /*
       * Prevent another payout request from being created while
       * an existing payout is still being processed.
       */
      const activePayout = await tx.partnerPayout.findFirst({
        where: {
          partnerId: partner.id,
          status: {
            in: ["PENDING", "APPROVED"],
          },
        },
        select: {
          id: true,
          amountNgn: true,
          status: true,
          requestedAt: true,
        },
      });

      if (activePayout) {
        throw new Error("ACTIVE_PAYOUT_EXISTS");
      }

      /*
       * Only approved commissions that have not already been
       * allocated to a payout are available for withdrawal.
       */
      const approvedCommissions =
        await tx.referralCommission.findMany({
          where: {
            referral: {
              partnerId: partner.id,
            },
            status: "APPROVED",
            payoutAllocation: null,
          },
          select: {
            id: true,
            commissionAmountNgn: true,
          },
          orderBy: {
            earnedAt: "asc",
          },
        });

      if (approvedCommissions.length === 0) {
        throw new Error("NO_APPROVED_COMMISSIONS");
      }

      const availableNgn = approvedCommissions.reduce(
        (total, commission) =>
          total + commission.commissionAmountNgn,
        0
      );

      if (availableNgn < MINIMUM_PAYOUT_NGN) {
        throw new Error(
          `MINIMUM_PAYOUT:${availableNgn}`
        );
      }

      /*
       * Create the payout and allocate every currently
       * available approved commission to it.
       *
       * This happens inside the same transaction, so the payout
       * cannot exist without its commission allocations.
       */
      const createdPayout = await tx.partnerPayout.create({
        data: {
          partnerId: partner.id,
          amountNgn: availableNgn,
          status: "PENDING",

          payoutCommissions: {
            create: approvedCommissions.map(
              (commission) => ({
                commissionId: commission.id,
                amountNgn: commission.commissionAmountNgn,
              })
            ),
          },
        },
        include: {
          payoutCommissions: {
            select: {
              id: true,
              commissionId: true,
              amountNgn: true,
            },
          },
        },
      });

      return createdPayout;
    });

    return NextResponse.json({
      ok: true,
      payout: {
        id: payout.id,
        amountNgn: payout.amountNgn,
        status: payout.status,
        requestedAt: payout.requestedAt,
        commissionCount:
          payout.payoutCommissions.length,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ACTIVE_PAYOUT_EXISTS"
    ) {
      return NextResponse.json(
        {
          error:
            "You already have a payout request being processed.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "NO_APPROVED_COMMISSIONS"
    ) {
      return NextResponse.json(
        {
          error:
            "You don't have any approved commissions available for payout.",
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("MINIMUM_PAYOUT:")
    ) {
      const availableNgn = Number(
        error.message.split(":")[1]
      );

      return NextResponse.json(
        {
          error: `The minimum payout amount is ₦${MINIMUM_PAYOUT_NGN.toLocaleString(
            "en-NG"
          )}.`,
          availableNgn,
          minimumPayoutNgn: MINIMUM_PAYOUT_NGN,
        },
        { status: 400 }
      );
    }

    console.error(
      "Partner payout request error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create payout request. Please try again.",
      },
      { status: 500 }
    );
  }
}