import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import {
  consumeAiGeneration,
  getContentWorkspacePlan,
} from "@/lib/contentWorkspaceUsage";
import { generateContentCalendar } from "@/lib/openai";
import type { SocialPlatform } from "@prisma/client";

const VALID_PLATFORMS: SocialPlatform[] = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
];

// POST — the "create content for me" trigger.
//
// AI Studio is included in the Content Workspace subscription.
// Each successful generation request consumes one AI generation
// from the account's monthly allowance.
//
// Creator: 100 AI generations/month
// Studio: 500 AI generations/month
//
// Every generated CalendarPost is still created as an AI draft and
// remains invisible to the client until reviewed and confirmed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (
    !(await hasCalendarPermission(
      creator.id,
      id,
      "EDIT_CALENDAR"
    ))
  ) {
    return NextResponse.json(
      {
        error:
          "You don't have permission to generate content on this calendar",
      },
      { status: 403 }
    );
  }

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
  });

  if (!calendar) {
    return NextResponse.json(
      { error: "Calendar not found" },
      { status: 404 }
    );
  }

  /*
   * Confirm that the calendar owner has an active Content Workspace
   * subscription or a valid trial.
   *
   * The calendar manager is the billing owner, not the collaborator
   * making the request.
   */
  const owner = await db.creator.findUnique({
    where: {
      id: calendar.managerId,
    },
    select: {
      id: true,
      contentWorkspacePlan: true,
      contentWorkspaceBillingStatus: true,
      contentWorkspaceBillingCycle: true,
      contentWorkspaceTrialEndsAt: true,
      isComped: true,
    },
  });

  if (!owner) {
    return NextResponse.json(
      { error: "Calendar owner not found" },
      { status: 404 }
    );
  }

  const contentWorkspacePlan =
    getContentWorkspacePlan(owner);

  /*
   * consumeAiGeneration() also checks whether the Content Workspace
   * is currently accessible and whether the monthly generation
   * allowance has been exhausted.
   */
  const consumed = await consumeAiGeneration(owner.id);

  if (!consumed) {
    return NextResponse.json(
      {
        error:
          contentWorkspacePlan === "CREATOR"
            ? "You've reached your 100 AI generations for this month. Your allowance resets at the start of your next billing cycle."
            : "You've reached your 500 AI generations for this month. Your allowance resets at the start of your next billing cycle.",
        code: "AI_GENERATION_LIMIT_REACHED",
        plan: contentWorkspacePlan,
      },
      { status: 403 }
    );
  }

  if (!calendar.aiBusinessSummary) {
    /*
     * No generation should be consumed when the request cannot
     * actually be processed because the required business context
     * is missing.
     */
    await db.contentWorkspaceUsage.updateMany({
      where: {
        creatorId: owner.id,
      },
      data: {
        aiGenerationsUsed: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json(
      {
        error:
          "Upload at least one business document first, so the AI understands what to create content about",
      },
      { status: 400 }
    );
  }

  const {
    startDate,
    endDate,
    postsPerWeek,
    platforms,
    customInstructions,
  } = await req.json();

  if (!startDate || !endDate) {
    await db.contentWorkspaceUsage.updateMany({
      where: {
        creatorId: owner.id,
      },
      data: {
        aiGenerationsUsed: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json(
      {
        error:
          "A start and end date are required",
      },
      { status: 400 }
    );
  }

  const validPlatforms: SocialPlatform[] =
    Array.isArray(platforms)
      ? platforms.filter(
          (platform): platform is SocialPlatform =>
            (VALID_PLATFORMS as string[]).includes(platform)
        )
      : [];

  if (validPlatforms.length === 0) {
    await db.contentWorkspaceUsage.updateMany({
      where: {
        creatorId: owner.id,
      },
      data: {
        aiGenerationsUsed: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json(
      {
        error:
          "At least one valid platform is required",
      },
      { status: 400 }
    );
  }

  const targetPostsPerWeek =
    typeof postsPerWeek === "number" &&
    postsPerWeek > 0
      ? postsPerWeek
      : 3;

  let ideas;

  try {
    ideas = await generateContentCalendar({
      clientName: calendar.clientName,
      businessSummary: calendar.aiBusinessSummary,
      startDate,
      endDate,
      postsPerWeek: targetPostsPerWeek,
      platforms: validPlatforms,
      customInstructions:
        typeof customInstructions === "string" &&
        customInstructions.trim()
          ? customInstructions.trim()
          : undefined,
    });
  } catch (error) {
    /*
     * The AI request failed, so return the consumed generation to
     * the customer's allowance.
     */
    await db.contentWorkspaceUsage.updateMany({
      where: {
        creatorId: owner.id,
      },
      data: {
        aiGenerationsUsed: {
          decrement: 1,
        },
      },
    });

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate content";

    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }

  if (ideas.length === 0) {
    await db.contentWorkspaceUsage.updateMany({
      where: {
        creatorId: owner.id,
      },
      data: {
        aiGenerationsUsed: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json(
      {
        error:
          "The AI didn't generate any posts — try again, or widen the date range",
      },
      { status: 502 }
    );
  }

  const created = await Promise.all(
    ideas.map((idea) =>
      db.calendarPost.create({
        data: {
          calendarId: id,
          postDate: new Date(
            `${idea.postDate}T09:00:00`
          ),
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

  return NextResponse.json({
    created: created.length,
    posts: created,
    aiGenerationsRemaining: null,
  });
}