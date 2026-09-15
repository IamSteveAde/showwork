import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
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
        payoutAccount: {
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!partner) {
      return NextResponse.json(
        {
          error:
            "You need to join the Partner Program first.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      payoutAccount: partner.payoutAccount,
    });
  } catch (error) {
    console.error(
      "Partner payout account GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load payout account. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
      },
    });

    if (!partner) {
      return NextResponse.json(
        {
          error:
            "You need to join the Partner Program first.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const bankName = normalize(body.bankName);
    const accountNumber = normalize(body.accountNumber);
    const accountName = normalize(body.accountName);

    if (!bankName) {
      return NextResponse.json(
        {
          error: "Bank name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        {
          error: "Account number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid 10-digit Nigerian bank account number.",
        },
        { status: 400 }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        {
          error: "Account name is required.",
        },
        { status: 400 }
      );
    }

    const payoutAccount =
      await db.partnerPayoutAccount.upsert({
        where: {
          partnerId: partner.id,
        },
        create: {
          partnerId: partner.id,
          bankName,
          accountNumber,
          accountName,
        },
        update: {
          bankName,
          accountNumber,
          accountName,
        },
        select: {
          id: true,
          bankName: true,
          accountNumber: true,
          accountName: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      ok: true,
      payoutAccount,
    });
  } catch (error) {
    console.error(
      "Partner payout account PUT error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save payout account. Please try again.",
      },
      { status: 500 }
    );
  }
}