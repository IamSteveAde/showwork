import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { consumeAiGeneration, getContentWorkspacePlan } from "@/lib/contentWorkspaceUsage";
import { generateContentCalendar } from "@/lib/openai";
import type { SocialPlatform } from "@prisma/client";

const VALID_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X", "LINKEDIN"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to generate content on this calendar" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "The generation request must contain valid JSON." }, { status: 400 });
  }

  const { startDate, endDate, platforms, postsPerWeek, customInstructions, contentStrategy, contentGroups, scheduleStrategy, platformSchedules } = body;
  if (!isRealDate(startDate) || !isRealDate(endDate) || endDate < startDate) {
    return NextResponse.json({ error: "Choose a valid start and end date." }, { status: 400 });
  }
  if (!Array.isArray(platforms) || platforms.length === 0 || platforms.some((value) => !VALID_PLATFORMS.includes(value as SocialPlatform))) {
    return NextResponse.json({ error: "Choose at least one valid platform." }, { status: 400 });
  }
  if (postsPerWeek !== undefined && (typeof postsPerWeek !== "number" || !Number.isFinite(postsPerWeek) || postsPerWeek < 1 || postsPerWeek > 14)) {
    return NextResponse.json({ error: "Posts per week must be between 1 and 14." }, { status: 400 });
  }
  if (customInstructions !== undefined && typeof customInstructions !== "string") {
    return NextResponse.json({ error: "Custom instructions must be text." }, { status: 400 });
  }
  if (contentStrategy !== undefined && !["SAME_CONTENT", "DIFFERENT_CONTENT", "CUSTOM_GROUPS"].includes(contentStrategy as string)) {
    return NextResponse.json({ error: "Choose a valid content strategy." }, { status: 400 });
  }
  if (scheduleStrategy !== undefined && !["SAME_TIME", "SAME_DAY", "CUSTOM"].includes(scheduleStrategy as string)) {
    return NextResponse.json({ error: "Choose a valid schedule strategy." }, { status: 400 });
  }
  const schedules = platformSchedules && typeof platformSchedules === "object" && !Array.isArray(platformSchedules)
    ? platformSchedules as Record<string, { date?: unknown; time?: unknown }>
    : {};
  for (const platform of platforms as string[]) {
    const schedule = schedules[platform];
    if (schedule && (typeof schedule !== "object" || (schedule.time !== undefined && (typeof schedule.time !== "string" || !TIME_RE.test(schedule.time))) || (schedule.date !== undefined && !isRealDate(schedule.date)))) {
      return NextResponse.json({ error: `Choose a valid date and time for ${platform}.` }, { status: 400 });
    }
  }
  if (contentGroups !== undefined && (!Array.isArray(contentGroups) || contentGroups.some((group) => !Array.isArray(group) || group.some((platform) => typeof platform !== "string")))) {
    return NextResponse.json({ error: "Content groups are malformed." }, { status: 400 });
  }

  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  if (!calendar.aiBusinessSummary?.trim()) {
    return NextResponse.json({ error: "Upload at least one business document first, so the AI understands what to create content about" }, { status: 400 });
  }
  const owner = await db.creator.findUnique({
    where: { id: calendar.managerId },
    select: { id: true, contentWorkspacePlan: true, contentWorkspaceBillingStatus: true, contentWorkspaceBillingCycle: true, contentWorkspaceTrialEndsAt: true, isComped: true, compedUntil: true },
  });
  if (!owner) return NextResponse.json({ error: "Calendar owner not found" }, { status: 404 });

  const plan = getContentWorkspacePlan(owner);
  if (!(await consumeAiGeneration(owner.id))) {
    return NextResponse.json({
      error: plan === "CREATOR"
        ? "You've reached your 100 AI generations for this month. Your allowance resets at the start of your next billing cycle."
        : "You've reached your 500 AI generations for this month. Your allowance resets at the start of your next billing cycle.",
      code: "AI_GENERATION_LIMIT_REACHED", plan,
    }, { status: 403 });
  }

  try {
    const ideas = await generateContentCalendar({
      clientName: calendar.clientName,
      businessSummary: calendar.aiBusinessSummary,
      startDate,
      endDate,
      postsPerWeek: (postsPerWeek as number | undefined) ?? 3,
      platforms: platforms as SocialPlatform[],
      customInstructions: typeof customInstructions === "string" && customInstructions.trim() ? customInstructions.trim() : undefined,
      contentStrategy: contentStrategy as "SAME_CONTENT" | "DIFFERENT_CONTENT" | "CUSTOM_GROUPS" | undefined,
      contentGroups: contentGroups as string[][] | undefined,
      scheduleStrategy: scheduleStrategy as "SAME_TIME" | "SAME_DAY" | "CUSTOM" | undefined,
      platformSchedules: schedules as Record<string, { date: string; time: string }>,
    });
    if (ideas.length === 0) throw new Error("The AI returned no content. Please try again.");

    const rows = ideas.map((idea) => {
      if (!isRealDate(idea.postDate)) throw new Error("The generated content contains an invalid date. Please try again.");
      const postTime = schedules[idea.platform]?.time ?? "09:00";
      if (typeof postTime !== "string" || !TIME_RE.test(postTime)) throw new Error(`The scheduled time for ${idea.platform} is invalid.`);
      const postDate = new Date(`${idea.postDate}T${postTime}:00.000Z`);
      if (!Number.isFinite(postDate.getTime())) throw new Error(`The scheduled date for ${idea.platform} is invalid.`);
      return {
        calendarId: id, postDate, platform: idea.platform,
        postType: idea.postType || null, category: idea.category || null,
        hook: idea.hook || null, script: idea.script || null,
        caption: idea.caption || null, contentIdea: idea.contentIdea || null,
        cta: idea.cta || null, hashtags: idea.hashtags || null, isAiDraft: true,
      };
    });

    const posts = await db.$transaction(async (tx) => {
      const created = [];
      for (const data of rows) created.push(await tx.calendarPost.create({ data }));
      return created;
    });
    return NextResponse.json({ created: posts.length, posts, aiGenerationsRemaining: null });
  } catch (error) {
    await db.contentWorkspaceUsage.updateMany({ where: { creatorId: owner.id }, data: { aiGenerationsUsed: { decrement: 1 } } });
    const message = error instanceof Error ? error.message : "Failed to generate content";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
