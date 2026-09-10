import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { generateContentCalendar } from "@/lib/openai";
import type { SocialPlatform } from "@prisma/client";

const VALID_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X", "LINKEDIN"];

// POST — the "create content for me" trigger. Generates a batch of
// real CalendarPost rows, every one created with isAiDraft: true —
// none of them are visible to the client (the client-facing query
// explicitly excludes drafts) until the manager reviews and confirms
// each one individually via the drafts endpoints below.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to generate content on this calendar" }, { status: 403 });
  }

  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const owner = await db.creator.findUnique({
    where: { id: calendar.managerId },
    select: { aiAssistantBillingStatus: true, aiAssistantTrialEndsAt: true },
  });
  const aiActive =
    owner?.aiAssistantBillingStatus === "ACTIVE" ||
    (owner?.aiAssistantBillingStatus === "TRIAL" && !!owner.aiAssistantTrialEndsAt && owner.aiAssistantTrialEndsAt.getTime() > Date.now());
  if (!aiActive) {
    return NextResponse.json({ error: "The AI content assistant isn't active on this account yet" }, { status: 403 });
  }

  if (!calendar.aiBusinessSummary) {
    return NextResponse.json({ error: "Upload at least one business document first, so the AI understands what to create content about" }, { status: 400 });
  }

  const { startDate, endDate, postsPerWeek, platforms, customInstructions } = await req.json();
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "A start and end date are required" }, { status: 400 });
  }

  const validPlatforms: SocialPlatform[] = Array.isArray(platforms)
    ? platforms.filter((p): p is SocialPlatform => (VALID_PLATFORMS as string[]).includes(p))
    : [];
  if (validPlatforms.length === 0) {
    return NextResponse.json({ error: "At least one valid platform is required" }, { status: 400 });
  }

  const targetPostsPerWeek = typeof postsPerWeek === "number" && postsPerWeek > 0 ? postsPerWeek : 3;

  let ideas;
  try {
    ideas = await generateContentCalendar({
      clientName: calendar.clientName,
      businessSummary: calendar.aiBusinessSummary,
      startDate,
      endDate,
      postsPerWeek: targetPostsPerWeek,
      platforms: validPlatforms,
      customInstructions: typeof customInstructions === "string" && customInstructions.trim() ? customInstructions.trim() : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate content";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (ideas.length === 0) {
    return NextResponse.json({ error: "The AI didn't generate any posts — try again, or widen the date range" }, { status: 502 });
  }

  const created = await Promise.all(
    ideas.map((idea) =>
      db.calendarPost.create({
        data: {
          calendarId: id,
          postDate: new Date(`${idea.postDate}T09:00:00`),
          platform: idea.platform,
          postType: idea.postType || null,
          category: idea.category || null,
          caption: idea.caption || null,
          contentIdea: idea.contentIdea || null,
          cta: idea.cta || null,
          hashtags: idea.hashtags || null,
          isAiDraft: true,
        },
      })
    )
  );

  return NextResponse.json({ created: created.length, posts: created });
}