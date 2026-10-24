
import { NextRequest, NextResponse } from "next/server";

import {
  sendDemoBookingNotificationEmail,
  sendDemoBookingAcknowledgementEmail,
  type ShowworkDemoBooking,
} from "@/lib/resend";

export const runtime = "nodejs";

const TEAM_SIZES = [
  "Just me",
  "2–5 people",
  "6–20 people",
  "21+ people",
];

const INTERESTS = [
  "Marketing & Content Management",
  "AI Inbox & Automatic Replies",
  "Team Collaboration & Approvals",
  "Analytics & AI Recommendations",
  "Everything Showwork Offers",
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T12:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function isValidTime(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format.",
        },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid booking information.",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const readString = (key: string, maxLength = 254) => {
      const value = data[key];

      return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
    };

    // Basic bot protection.
    if (readString("website")) {
      return NextResponse.json({
        success: true,
      });
    }

    const booking: ShowworkDemoBooking = {
      fullName: readString("fullName", 120),
      email: readString("email"),
      company: readString("company", 150),
      teamSize: readString("teamSize", 50),
      interest: readString("interest", 100),
      preferredDate: readString("preferredDate", 10),
      preferredTime: readString("preferredTime", 5),
      timezone: readString("timezone", 80),
    };

    const {
      fullName,
      email,
      company,
      teamSize,
      interest,
      preferredDate,
      preferredTime,
      timezone,
    } = booking;

    if (!fullName || !company || !isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter your name, company, and a valid email address.",
        },
        { status: 400 }
      );
    }

    if (!TEAM_SIZES.includes(teamSize)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select a valid team size.",
        },
        { status: 400 }
      );
    }

    if (!INTERESTS.includes(interest)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select what you'd like to explore.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidDate(preferredDate) ||
      !isValidTime(preferredTime) ||
      !timezone
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select a valid demo date and time.",
        },
        { status: 400 }
      );
    }

    // Send the booking notification to the Showwork team.
    await sendDemoBookingNotificationEmail(booking);

    // Send an acknowledgement to the prospective customer.
    // A failure here shouldn't turn an already-delivered
    // team notification into a failed submission.
    try {
      await sendDemoBookingAcknowledgementEmail(booking);
    } catch (emailError) {
      console.error(
        "[BOOK_DEMO_CUSTOMER_EMAIL_FAILED]",
        emailError
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Your demo request has been received. Our team will confirm your meeting details by email.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BOOK_DEMO_API_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "We couldn't process your demo request. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}
