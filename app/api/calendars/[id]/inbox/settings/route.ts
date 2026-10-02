import { normalizeReplyProfile, validateReplyProfile } from "@/lib/socialMessaging/replyProfile";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: calendarId } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id: calendarId }, select: { managerId: true } });
  if (!calendar || calendar.managerId !== creator.id) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const body = await req.json().catch(() => null) as { clientAccessEnabled?: unknown; aiAutoReplyEnabled?: unknown; aiAutoReplyInstructions?: unknown; aiReplyProfile?: unknown } | null;
  if (typeof body?.clientAccessEnabled !== "boolean" || typeof body.aiAutoReplyEnabled !== "boolean" || typeof body.aiAutoReplyInstructions !== "string") {
    return NextResponse.json({ error: "Inbox settings are invalid." }, { status: 400 });
  }
  if (body.aiAutoReplyInstructions.length > 1200) return NextResponse.json({ error: "AI reply guidance must be 1,200 characters or less." }, { status: 400 });
  if (body.aiReplyProfile !== undefined) {
    const validation = validateReplyProfile(body.aiReplyProfile);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  }
  const profileUpdate = body.aiReplyProfile === undefined ? {} : { aiReplyProfile: normalizeReplyProfile(body.aiReplyProfile) };
  const settings = await db.$transaction(async (tx) => {
    const saved = await tx.socialInboxSettings.upsert({
      where: { calendarId },
      create: { ...profileUpdate, calendarId, clientAccessEnabled: body.clientAccessEnabled as boolean, aiAutoReplyEnabled: body.aiAutoReplyEnabled as boolean, aiAutoReplyInstructions: (body.aiAutoReplyInstructions as string).trim() || null },
      update: { ...profileUpdate, clientAccessEnabled: body.clientAccessEnabled as boolean, aiAutoReplyEnabled: body.aiAutoReplyEnabled as boolean, aiAutoReplyInstructions: (body.aiAutoReplyInstructions as string).trim() || null },
    });
    if (!saved.aiAutoReplyEnabled) {
      await tx.socialLeadMessage.updateMany({
        where: { autoReplyEligible: true, autoReplyHandledAt: null, conversation: { calendarId } },
        data: { autoReplyHandledAt: new Date(), autoReplyClaimedAt: null, autoReplyHandoffReason: "Automatic replies were disabled by the workspace manager." },
      });
    }
    return saved;
  });
  return NextResponse.json({ clientAccessEnabled: settings.clientAccessEnabled, aiAutoReplyEnabled: settings.aiAutoReplyEnabled, aiAutoReplyInstructions: settings.aiAutoReplyInstructions, aiReplyProfile: normalizeReplyProfile(settings.aiReplyProfile) });
}
