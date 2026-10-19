import { publishingIntegrationInstalled, invokePublishingEntrypoint, assertLegacyPublishingAllowed } from "@/lib/publishing/applicationBoundary";
import { complimentaryAccessSelect } from "@/lib/complimentaryAccess";
import { calendarFeatureGate } from "@/lib/calendarPermissions";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { consumeAiGeneration, getContentWorkspacePlan } from "@/lib/contentWorkspaceUsage";
import { createAiGenerationJob, getAiGenerationJob } from "@/lib/aiGenerationJob";
import type { SocialPlatform } from "@prisma/client";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const VALID_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X", "LINKEDIN"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "ai.generate"))) {
    return NextResponse.json({ error: "You don't have permission to view content on this calendar" }, { status: 403 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await getAiGenerationJob(jobId);
  if (!job || job.calendarId !== id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { return await invokePublishingEntrypoint<never>("app/api/calendars/[id]/ai-generate/route.ts#POST@21",Array.from(arguments)); } /* end-canonical-integration-boundary */

  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "ai.generate"))) {
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

  if (body.usePerformanceRecommendations === true) {
    const featureLock = await calendarFeatureGate(id, "performanceRecommendations");
    if (featureLock) return featureLock;
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
    select: { id: true, contentWorkspacePlan: true, contentWorkspaceBillingStatus: true, contentWorkspaceBillingCycle: true, contentWorkspaceTrialEndsAt: true, ...complimentaryAccessSelect, isComped: true, compedUntil: true },
  });
  if (!owner) return NextResponse.json({ error: "Calendar owner not found" }, { status: 404 });

  const plan = getContentWorkspacePlan(owner);
  const consumed = await consumeAiGeneration(owner.id);
  if (!consumed.allowed) {
    return NextResponse.json({
      error: `Your AI allowance of ${consumed.limit} generations is unavailable or used up. Upgrade your plan or wait for your next monthly allowance.`,
      code: "AI_GENERATION_LIMIT_REACHED", plan,
    }, { status: 403 });
  }

  try {
    const job = await createAiGenerationJob({
      calendarId: id,
      creatorId: creator.id,
      payload: body,
    });

    return NextResponse.json({
      queued: true,
      jobId: job.id,
      status: "PENDING",
    }, { status: 202 });
  } catch (error) {
    await db.contentWorkspaceUsage.updateMany({ where: { creatorId: owner.id }, data: { aiGenerationsUsed: { decrement: 1 } } });
    const message = error instanceof Error ? error.message : "Failed to queue content generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
