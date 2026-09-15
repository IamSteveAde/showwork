import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
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

  const commissions =
    await db.referralCommission.findMany({
      orderBy: {
        earnedAt: "desc",
      },
      include: {
        referral: {
          select: {
            id: true,
            status: true,
            partner: {
              select: {
                id: true,
                referralCode: true,
                creator: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            referredCreator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payoutAllocation: {
          select: {
            id: true,
            payoutId: true,
            amountNgn: true,
          },
        },
      },
    });

  return NextResponse.json({
    commissions,
  });
}

export async function PATCH(req: NextRequest) {
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

  const commissionId =
    typeof body?.commissionId === "string"
      ? body.commissionId.trim()
      : "";

  const action =
    typeof body?.action === "string"
      ? body.action.trim().toUpperCase()
      : "";

  if (!commissionId || !action) {
    return NextResponse.json(
      {
        error:
          "Commission ID and action are required",
      },
      { status: 400 }
    );
  }

  if (action !== "APPROVE" && action !== "VOID") {
    return NextResponse.json(
      {
        error:
          "Action must be APPROVE or VOID",
      },
      { status: 400 }
    );
  }

  try {
    const commission =
      await db.$transaction(async (tx) => {
        const existing =
          await tx.referralCommission.findUnique({
            where: {
              id: commissionId,
            },
            select: {
              id: true,
              status: true,
              payoutAllocation: {
                select: {
                  id: true,
                },
              },
            },
          });

        if (!existing) {
          throw new Error(
            "COMMISSION_NOT_FOUND"
          );
        }

        /*
         * A commission can only be reviewed while it is
         * still pending.
         *
         * Once approved, paid, or voided, its financial
         * state must not be silently changed.
         */
        if (existing.status !== "PENDING") {
          throw new Error(
            "COMMISSION_ALREADY_REVIEWED"
          );
        }

        if (existing.payoutAllocation) {
          throw new Error(
            "COMMISSION_ALREADY_ALLOCATED"
          );
        }

        const updated =
          await tx.referralCommission.update({
            where: {
              id: commissionId,
            },
            data:
              action === "APPROVE"
                ? {
                    status: "APPROVED",
                    approvedAt: new Date(),
                  }
                : {
                    status: "VOIDED",
                  },
          });

        return updated;
      });

    return NextResponse.json({
      ok: true,
      commission,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "COMMISSION_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "COMMISSION_ALREADY_REVIEWED"
    ) {
      return NextResponse.json(
        {
          error:
            "This commission has already been reviewed.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "COMMISSION_ALREADY_ALLOCATED"
    ) {
      return NextResponse.json(
        {
          error:
            "This commission has already been allocated to a payout.",
        },
        { status: 409 }
      );
    }

    console.error(
      "Admin partner commission update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update commission",
      },
      { status: 500 }
    );
  }
}