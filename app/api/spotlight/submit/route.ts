import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSpotlightSubmissionEmail } from "@/lib/resend";

const VALID_CATEGORIES = ["Video", "Graphics", "Photography", "Branding"];
const MAX_DESCRIPTION_LENGTH = 150;

// POST — anyone can submit, no account required. The deadline check
// here is the real enforcement — happens server-side against the
// database's own stored deadline, not trusted from anything the
// client sends, so a submission can never sneak through past the
// deadline via a direct API call even if the public page's own UI
// correctly disables the button.
export async function POST(req: NextRequest) {
  const activeCycle = await db.spotlightCycle.findFirst({ where: { isActive: true } });

  if (!activeCycle) {
    return NextResponse.json(
      { error: "There's no active Spotlight cycle right now. Check back soon!" },
      { status: 400 }
    );
  }

  const now = new Date();
  if (now < activeCycle.submissionOpensAt || now > activeCycle.submissionDeadline) {
    return NextResponse.json(
      { error: "Submissions for this month's Spotlight are closed. Check back next month to apply!" },
      { status: 400 }
    );
  }

  const { name, email, category, projectLink, description, note } = await req.json();

  if (!name?.trim() || !email?.trim() || !projectLink?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Name, email, project link, and description are all required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` }, { status: 400 });
  }

  // Optional — only set if the submitter happened to be logged in.
  // Never required, matching that anyone can submit without an
  // account at all.
  const loggedInCreator = await getCurrentCreator();

  const submission = await db.spotlightSubmission.create({
    data: {
      cycleId: activeCycle.id,
      creatorId: loggedInCreator?.id ?? null,
      name: name.trim(),
      email: email.trim(),
      category,
      projectLink: projectLink.trim(),
      description: description.trim(),
      note: note?.trim() || null,
    },
  });

  // Best-effort — a failed notification email should never mean the
  // submission itself gets rejected; the record is already safely
  // saved by this point regardless.
  try {
    await sendSpotlightSubmissionEmail({
      name: submission.name,
      email: submission.email,
      category: submission.category,
      projectLink: submission.projectLink,
      description: submission.description,
      note: submission.note,
    });
  } catch (err) {
    console.error("Failed to send Spotlight submission notification email:", err);
  }

  return NextResponse.json({ ok: true });
}