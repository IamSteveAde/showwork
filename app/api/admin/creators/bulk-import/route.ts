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
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Matches a Nigerian phone number in the same +234-plus-10-digits
// format already used everywhere else in this app (see Creator.phone
// in the schema) — deliberately not a generic "any digits" pattern,
// so something like an amount in Naira or a random ID number in the
// same row doesn't get mistaken for a phone number.
const PHONE_PATTERN = /\+234\d{10}/;

interface ExtractedPerson {
  email: string;
  phone: string | null;
}

// Scans line by line rather than the whole file at once — an email
// and its phone number are almost always sitting in the same row of
// an export, so keeping them paired this way is what lets a phone
// number actually get attached to the right person instead of only
// ever extracting emails in isolation.
function extractPeople(text: string): ExtractedPerson[] {
  const byEmail = new Map<string, ExtractedPerson>();
  for (const line of text.split("\n")) {
    const emailMatch = line.match(EMAIL_PATTERN);
    if (!emailMatch) continue;
    const email = emailMatch[0].toLowerCase();
    const phoneMatch = line.match(PHONE_PATTERN);
    const phone = phoneMatch ? phoneMatch[0] : null;

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, { email, phone });
    } else if (!existing.phone && phone) {
      // Same email appears on more than one line (e.g. multiple past
      // emails sent to them) — keep whichever occurrence actually had
      // a phone number attached, rather than the first one seen.
      existing.phone = phone;
    }
  }
  return [...byEmail.values()];
}

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
  const people = extractPeople(text);

  if (people.length === 0) {
    return NextResponse.json({ error: "No email addresses found in that file" }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const emailFailed: string[] = [];

  for (const { email, phone } of people) {
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

    await db.creator.create({ data: { email, phone, passwordHash } });
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

  return NextResponse.json({ created, skipped, emailFailed, totalFound: people.length });
}