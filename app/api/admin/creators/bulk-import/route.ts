import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendAccountRecoveryEmail } from "@/lib/resend";

// Matches an email address anywhere in the file, regardless of which
// column it's in or what the CSV's headers are called — robust to
// whatever export format (Resend, Paystack, a plain list) actually
// produced it, rather than depending on a specific column name.
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function POST(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const matches = text.match(EMAIL_PATTERN) ?? [];
  const uniqueEmails = [...new Set(matches.map((e) => e.toLowerCase()))];

  if (uniqueEmails.length === 0) {
    return NextResponse.json({ error: "No email addresses found in that file" }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const emailFailed: string[] = [];

  for (const email of uniqueEmails) {
    const existing = await db.creator.findUnique({ where: { email } });
    if (existing) {
      skipped.push(email);
      continue;
    }

    // A long, random, never-communicated string — nobody can log in
    // with this, including the admin creating the account. No
    // password field is collected at all here; the only way in is
    // the real "Forgot password" flow, which the recovery email
    // below directs them to.
    const placeholderPassword = randomUUID() + randomUUID();
    const passwordHash = await bcrypt.hash(placeholderPassword, 10);

    await db.creator.create({ data: { email, passwordHash } });
    created.push(email);

    // Best-effort — the account is already safely created by this
    // point regardless of whether the email actually goes out.
    try {
      await sendAccountRecoveryEmail({ to: email });
    } catch (err) {
      console.error(`Failed to send recovery email to ${email}:`, err);
      emailFailed.push(email);
    }
  }

  return NextResponse.json({ created, skipped, emailFailed, totalFound: uniqueEmails.length });
}