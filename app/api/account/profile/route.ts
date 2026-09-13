import { NextRequest, NextResponse } from "next/server";

import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

function cleanString(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function validatePhone(
  phone: string | null
): string | null {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[\s\-()]/g, "");

  if (!/^\+234\d{10}$/.test(normalized)) {
    return "Enter a valid Nigerian phone number, e.g. +2348012345678.";
  }

  return null;
}

export async function PATCH(req: NextRequest) {
  const session = await getCurrentCreator();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const payload = body as Record<string, unknown>;

  const name =
    payload.name === undefined
      ? undefined
      : cleanString(payload.name, 100);

  const companyName =
    payload.companyName === undefined
      ? undefined
      : cleanString(payload.companyName, 150);

  const rawPhone =
    payload.phone === undefined
      ? undefined
      : cleanString(payload.phone, 30);

  const notifyOnView =
    payload.notifyOnView === undefined
      ? undefined
      : payload.notifyOnView;

  if (
    notifyOnView !== undefined &&
    typeof notifyOnView !== "boolean"
  ) {
    return NextResponse.json(
      {
        error: "Invalid notification preference.",
      },
      { status: 400 }
    );
  }

  if (
    name !== undefined &&
    name !== null &&
    name.length < 2
  ) {
    return NextResponse.json(
      {
        error: "Name must be at least 2 characters.",
      },
      { status: 400 }
    );
  }

  const phoneError =
    rawPhone !== undefined
      ? validatePhone(rawPhone)
      : null;

  if (phoneError) {
    return NextResponse.json(
      { error: phoneError },
      { status: 400 }
    );
  }

  const normalizedPhone =
    rawPhone === undefined
      ? undefined
      : rawPhone
        ? rawPhone.replace(/[\s\-()]/g, "")
        : null;

  try {
    const updated = await db.creator.update({
      where: {
        id: session.id,
      },

      data: {
        ...(name !== undefined ? { name } : {}),
        ...(companyName !== undefined
          ? { companyName }
          : {}),
        ...(normalizedPhone !== undefined
          ? { phone: normalizedPhone }
          : {}),
        ...(notifyOnView !== undefined
          ? { notifyOnView }
          : {}),
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        avatarUrl: true,
        notifyOnView: true,
        emailVerified: true,
        accountType: true,
      },
    });

    return NextResponse.json({
      success: true,
      creator: updated,
    });
  } catch (error) {
    console.error(
      "Profile update failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "We couldn't save your changes. Please try again.",
      },
      { status: 500 }
    );
  }
}