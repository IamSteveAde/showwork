import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWebinarRsvpConfirmationEmail, sendWebinarRsvpNotificationEmail } from "@/lib/resend";

// Kept broad and general on purpose — this describes someone's
// professional discipline for the webinar's own context, not the
// Spotlight's submission-type categories, which serve a different
// question ("what kind of work is this project").
const FIELDS = [
  "Videography",
  "Photography",
  "Graphics Design",
  "Social Media Management",
  "Branding/Illustration",
  "Motion Design",
  "Other",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const webinar = await db.creativoWebinar.findUnique({ where: { id } });
  if (!webinar) {
    return NextResponse.json({ error: "This webinar could not be found" }, { status: 404 });
  }

  const { name, email, whatsappNumber, field, joinedCommunity } = await req.json();

  if (!name?.trim() || !email?.trim() || !whatsappNumber?.trim()) {
    return NextResponse.json({ error: "Name, email, and WhatsApp number are all required" }, { status: 400 });
  }
  if (!FIELDS.includes(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }
  if (typeof joinedCommunity !== "boolean") {
    return NextResponse.json({ error: "Please select whether you've joined the community" }, { status: 400 });
  }

  const rsvp = await db.webinarRsvp.create({
    data: {
      webinarId: webinar.id,
      name: name.trim(),
      email: email.trim(),
      whatsappNumber: whatsappNumber.trim(),
      field,
      joinedCommunity,
    },
  });

  // Best-effort — the RSVP itself is already safely saved by this
  // point regardless of whether either email actually goes out.
  try {
    await sendWebinarRsvpConfirmationEmail({
      to: rsvp.email,
      name: rsvp.name,
      topic: webinar.topic,
      startsAt: webinar.startsAt,
      venue: webinar.venue,
      meetingUrl: webinar.applyUrl,
    });
  } catch (err) {
    console.error("Failed to send webinar RSVP confirmation email:", err);
  }

  try {
    await sendWebinarRsvpNotificationEmail({
      webinarTopic: webinar.topic,
      name: rsvp.name,
      email: rsvp.email,
      whatsappNumber: rsvp.whatsappNumber,
    });
  } catch (err) {
    console.error("Failed to send webinar RSVP team notification email:", err);
  }

  return NextResponse.json({ ok: true });
}