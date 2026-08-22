import { NextRequest, NextResponse } from "next/server";
import { sendWebinarHostApplicationEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const { name, email, category, proposedTopic, whyThem } = await req.json();

  if (!name?.trim() || !email?.trim() || !proposedTopic?.trim() || !whyThem?.trim()) {
    return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
  }

  try {
    await sendWebinarHostApplicationEmail({
      name: name.trim(),
      email: email.trim(),
      category: category?.trim() || "Not specified",
      proposedTopic: proposedTopic.trim(),
      whyThem: whyThem.trim(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to send application — try again" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}