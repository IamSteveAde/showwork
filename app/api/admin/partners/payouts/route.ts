import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendPartnerPayoutPaidEmail } from "@/lib/resend";

export async function GET() {
  try {
    const creator = await getCurrentCreator();

    if (!creator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isAdminEmail(creator.email)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const payouts = await db.partnerPayout.findMany({
      orderBy: {
        requestedAt: "desc",
      },
      include: {
    partner: {
  include: {
    creator: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    payoutAccount: {
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
      },
    },
  },
},
        payoutCommissions: {
          select: {
            id: true,
            commissionId: true,
            amountNgn: true,
            commission: {
              select: {
                id: true,
                paymentRecordId: true,
                paymentAmountNgn: true,
                commissionAmountNgn: true,
                earnedAt: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      payouts,
    });
  } catch (error) {
    console.error(
      "Admin partner payouts GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load partner payouts.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const creator = await getCurrentCreator();

    if (!creator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isAdminEmail(creator.email)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const payoutId =
      typeof body?.payoutId === "string"
        ? body.payoutId.trim()
        : "";

    const action =
      body?.action === "APPROVE" ||
      body?.action === "REJECT" ||
      body?.action === "MARK_PAID"
        ? body.action
        : null;

    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    const payoutReference =
      typeof body?.payoutReference === "string"
        ? body.payoutReference.trim()
        : "";

    if (!payoutId || !action) {
      return NextResponse.json(
        {
          error:
            "Payout ID and a valid action are required.",
        },
        { status: 400 }
      );
    }

    if (
      action === "MARK_PAID" &&
      !payoutReference
    ) {
      return NextResponse.json(
        {
          error:
            "A payout reference is required when marking a payout as paid.",
        },
        { status: 400 }
      );
    }

    if (
      action === "MARK_PAID" &&
      payoutReference.length > 200
    ) {
      return NextResponse.json(
        {
          error:
            "The payout reference is too long.",
        },
        { status: 400 }
      );
    }

    const payout = await db.$transaction(
      async (tx) => {
        const existingPayout =
          await tx.partnerPayout.findUnique({
            where: {
              id: payoutId,
            },
            select: {
              id: true,
              status: true,
              amountNgn: true,
              approvedAt: true,
              paidAt: true,
              payoutReference: true,
              payoutCommissions: {
                select: {
                  commissionId: true,
                  amountNgn: true,
                  commission: {
                    select: {
                      id: true,
                      status: true,
                      commissionAmountNgn: true,
                    },
                  },
                },
              },
            },
          });

        if (!existingPayout) {
          throw new Error("PAYOUT_NOT_FOUND");
        }

        if (action === "APPROVE") {
          if (existingPayout.status !== "PENDING") {
            throw new Error("PAYOUT_ALREADY_REVIEWED");
          }

          if (
            existingPayout.payoutCommissions.length === 0
          ) {
            throw new Error(
              "PAYOUT_HAS_NO_COMMISSIONS"
            );
          }

          const invalidCommission =
            existingPayout.payoutCommissions.find(
              (allocation) =>
                allocation.commission.status !== "APPROVED"
            );

          if (invalidCommission) {
            throw new Error(
              "PAYOUT_HAS_INVALID_COMMISSION"
            );
          }

          const allocationTotal =
            existingPayout.payoutCommissions.reduce(
              (total, allocation) =>
                total + allocation.amountNgn,
              0
            );

          if (
            allocationTotal !==
            existingPayout.amountNgn
          ) {
            throw new Error(
              "PAYOUT_AMOUNT_MISMATCH"
            );
          }

          return tx.partnerPayout.update({
            where: {
              id: existingPayout.id,
            },
            data: {
              status: "APPROVED",
              approvedAt: new Date(),
              ...(adminNote
                ? { adminNote }
                : {}),
            },
          });
        }

        if (action === "REJECT") {
  await tx.partnerPayoutCommission.deleteMany({
    where: {
      payoutId: existingPayout.id,
    },
  });

  return tx.partnerPayout.update({
    where: {
      id: existingPayout.id,
    },
    data: {
      status: "REJECTED",
      ...(adminNote
        ? { adminNote }
        : {}),
    },
  });
}

        /*
         * MARK_PAID
         *
         * This is the final settlement step.
         *
         * The payout must already be approved.
         * Every allocated commission must still be approved.
         * The allocation total must exactly equal the payout amount.
         *
         * Everything happens inside the same database transaction so
         * the payout and its commissions cannot end up with different
         * payment states.
         */

        if (existingPayout.status !== "APPROVED") {
          throw new Error(
            "PAYOUT_NOT_APPROVED"
          );
        }

        if (existingPayout.payoutCommissions.length === 0) {
          throw new Error(
            "PAYOUT_HAS_NO_COMMISSIONS"
          );
        }

        const invalidCommission =
          existingPayout.payoutCommissions.find(
            (allocation) =>
              allocation.commission.status !== "APPROVED"
          );

        if (invalidCommission) {
          throw new Error(
            "PAYOUT_HAS_INVALID_COMMISSION"
          );
        }

        const allocationTotal =
          existingPayout.payoutCommissions.reduce(
            (total, allocation) =>
              total + allocation.amountNgn,
            0
          );

        if (
          allocationTotal !==
          existingPayout.amountNgn
        ) {
          throw new Error(
            "PAYOUT_AMOUNT_MISMATCH"
          );
        }

        const commissionIds =
          existingPayout.payoutCommissions.map(
            (allocation) =>
              allocation.commissionId
          );

        const updatedCommissions =
          await tx.referralCommission.updateMany({
            where: {
              id: {
                in: commissionIds,
              },
              status: "APPROVED",
            },
            data: {
              status: "PAID",
              paidAt: new Date(),
              payoutReference,
            },
          });

        if (
          updatedCommissions.count !==
          commissionIds.length
        ) {
          throw new Error(
            "COMMISSION_SETTLEMENT_MISMATCH"
          );
        }

        return tx.partnerPayout.update({
          where: {
            id: existingPayout.id,
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
            payoutReference,
            ...(adminNote
              ? { adminNote }
              : {}),
          },
        });
      }
    );

    if (payout.status === "PAID") {
  try {
    const partner = await db.partnerProfile.findUnique({
      where: {
        id: payout.partnerId,
      },
      select: {
        creator: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (partner) {
      await sendPartnerPayoutPaidEmail({
        to: partner.creator.email,
        partnerName: partner.creator.name,
        amountNgn: payout.amountNgn,
        payoutReference:
          payout.payoutReference ?? "",
      });
    }
  } catch (err) {
    console.error(
      `Failed to send partner payout-paid email for payout ${payout.id}:`,
      err
    );
  }
}

return NextResponse.json({
  ok: true,
  payout,
});
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "PAYOUT_NOT_FOUND") {
      return NextResponse.json(
        {
          error:
            "Payout request not found.",
        },
        { status: 404 }
      );
    }

    if (
      message === "PAYOUT_ALREADY_REVIEWED"
    ) {
      return NextResponse.json(
        {
          error:
            "This payout request has already been reviewed.",
        },
        { status: 409 }
      );
    }

    if (
      message === "PAYOUT_NOT_APPROVED"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an approved payout can be marked as paid.",
        },
        { status: 409 }
      );
    }

    if (
      message === "PAYOUT_HAS_NO_COMMISSIONS"
    ) {
      return NextResponse.json(
        {
          error:
            "This payout has no commission allocations and cannot be processed.",
        },
        { status: 409 }
      );
    }

    if (
      message === "PAYOUT_HAS_INVALID_COMMISSION"
    ) {
      return NextResponse.json(
        {
          error:
            "One or more commissions in this payout are no longer approved.",
        },
        { status: 409 }
      );
    }

    if (
      message === "PAYOUT_AMOUNT_MISMATCH"
    ) {
      return NextResponse.json(
        {
          error:
            "The payout amount does not match its commission allocations.",
        },
        { status: 409 }
      );
    }

    if (
      message === "COMMISSION_SETTLEMENT_MISMATCH"
    ) {
      return NextResponse.json(
        {
          error:
            "The payout could not be fully settled because one or more commissions changed during processing.",
        },
        { status: 409 }
      );
    }

    console.error(
      "Admin partner payout PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update payout. Please try again.",
      },
      { status: 500 }
    );
  }
}