import { NextRequest, NextResponse } from "next/server";

import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { regeneratePost } from "@/lib/openai";

const VALID_PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
] as const;

type ValidPlatform = (typeof VALID_PLATFORMS)[number];

function isValidPlatform(value: string): value is ValidPlatform {
  return (VALID_PLATFORMS as readonly string[]).includes(value);
}

function isValidDate(value: string): boolean {
  const date = new Date(`${value}T09:00:00`);
  return !Number.isNaN(date.getTime());
}

/**
 * Checks that the current creator can edit this AI draft and that
 * the requested post is still an AI draft belonging to this calendar.
 */
async function getDraftAccess(
  creatorId: string,
  calendarId: string,
  postId: string
) {
  if (
    !(await hasCalendarPermission(
      creatorId,
      calendarId,
      "EDIT_CALENDAR"
    ))
  ) {
    return {
      error: "You don't have permission to edit AI drafts",
      status: 403 as const,
    };
  }

  const post = await db.calendarPost.findFirst({
    where: {
      id: postId,
      calendarId,
      isAiDraft: true,
    },
  });

  if (!post) {
    return {
      error: "AI draft not found",
      status: 404 as const,
    };
  }

  return { post };
}

/**
 * GET
 *
 * Returns every saved AI generation for this draft.
 *
 * The current CalendarPost remains the active version while these
 * records provide the manager with the ability to review previous
 * generations and restore one if needed.
 */
export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; postId: string }>;
  }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, postId } = await params;

  const access = await getDraftAccess(
    creator.id,
    id,
    postId
  );

  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const generations =
    await db.calendarPostAiGeneration.findMany({
      where: {
        postId,
      },
      orderBy: {
        generationNumber: "asc",
      },
    });

  return NextResponse.json({
    generations,
  });
}

/**
 * POST
 *
 * Regenerates the currently selected AI draft.
 *
 * Every regeneration is saved as a new CalendarPostAiGeneration
 * record and the current CalendarPost is updated to the newest
 * generated version.
 */
export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; postId: string }>;
  }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, postId } = await params;

  const access = await getDraftAccess(
    creator.id,
    id,
    postId
  );

  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  /**
   * The AI assistant must still be active.
   *
   * We intentionally check the calendar owner because the AI
   * entitlement belongs to the account that owns the workspace.
   */
  const calendar = await db.socialCalendar.findUnique({
    where: {
      id,
    },
    select: {
      clientName: true,
      managerId: true,
      aiBusinessSummary: true,
      manager: {
        select: {
          aiAssistantBillingStatus: true,
          aiAssistantTrialEndsAt: true,
        },
      },
    },
  });

  if (!calendar) {
    return NextResponse.json(
      { error: "Calendar not found" },
      { status: 404 }
    );
  }

  const aiActive =
    calendar.manager.aiAssistantBillingStatus === "ACTIVE" ||
    (
      calendar.manager.aiAssistantBillingStatus === "TRIAL" &&
      !!calendar.manager.aiAssistantTrialEndsAt &&
      calendar.manager.aiAssistantTrialEndsAt.getTime() >
        Date.now()
    );

  if (!aiActive) {
    return NextResponse.json(
      {
        error:
          "The AI content assistant isn't active on this account yet",
      },
      { status: 403 }
    );
  }

  if (!calendar.aiBusinessSummary) {
    return NextResponse.json(
      {
        error:
          "Business context is not available yet",
      },
      { status: 400 }
    );
  }

  /**
   * The request body is optional.
   *
   * If no instruction is supplied, the AI will improve the
   * current version using the existing strategy and brand voice.
   */
  let body: {
    instruction?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const current = {
    postDate: access.post.postDate
      .toISOString()
      .slice(0, 10),

    platform: access.post.platform,

    postType:
      access.post.postType ?? "",

    category:
      access.post.category ?? "",

    caption:
      access.post.caption ?? "",

    contentIdea:
      access.post.contentIdea ?? "",

    cta:
      access.post.cta ?? "",

    hashtags:
      access.post.hashtags ?? "",
  };

  let generated;

  try {
    generated = await regeneratePost({
      clientName: calendar.clientName,
      businessSummary: calendar.aiBusinessSummary,
      currentPost: current,
      instruction:
        typeof body.instruction === "string" &&
        body.instruction.trim()
          ? body.instruction.trim()
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to regenerate this draft";

    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }

  /**
   * Validate the model's structured output before touching
   * the database.
   */
  if (!isValidPlatform(generated.platform)) {
    return NextResponse.json(
      {
        error:
          "The AI returned an unsupported platform. Please try regenerating again.",
      },
      { status: 502 }
    );
  }

  if (!isValidDate(generated.postDate)) {
    return NextResponse.json(
      {
        error:
          "The AI returned an invalid post date. Please try regenerating again.",
      },
      { status: 502 }
    );
  }

  /**
   * Find the most recent saved generation so we can assign the
   * next generation number.
   */
  const latest =
    await db.calendarPostAiGeneration.findFirst({
      where: {
        postId,
      },
      orderBy: {
        generationNumber: "desc",
      },
      select: {
        generationNumber: true,
      },
    });

  const nextGeneration =
    (latest?.generationNumber ?? 0) + 1;

  /**
   * Save the AI output as a permanent generation snapshot.
   */
  const generation =
    await db.calendarPostAiGeneration.create({
      data: {
        postId,

        generationNumber:
          nextGeneration,

        postDate:
          new Date(`${generated.postDate}T09:00:00`),

        platform:
          generated.platform,

        postType:
          generated.postType || null,

        category:
          generated.category || null,

        caption:
          generated.caption || null,

        contentIdea:
          generated.contentIdea || null,

        cta:
          generated.cta || null,

        hashtags:
          generated.hashtags || null,
      },
    });

  /**
   * Make this newest generation the active version of the
   * AI draft.
   */
  await db.calendarPost.update({
    where: {
      id: postId,
    },

    data: {
      postDate:
        generation.postDate,

      platform:
        generation.platform,

      postType:
        generation.postType,

      category:
        generation.category,

      caption:
        generation.caption,

      contentIdea:
        generation.contentIdea,

      cta:
        generation.cta,

      hashtags:
        generation.hashtags,
    },
  });

  return NextResponse.json({
    generation,
  });
}

/**
 * PATCH
 *
 * Confirms one AI draft.
 *
 * The manager may edit the generated content at the same time.
 * Once confirmed, isAiDraft becomes false and the post enters
 * the normal calendar/client approval flow.
 */
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; postId: string }>;
  }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, postId } = await params;

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
          "You don't have permission to review drafts on this calendar",
      },
      { status: 403 }
    );
  }

  const post = await db.calendarPost.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post || post.calendarId !== id) {
    return NextResponse.json(
      { error: "Draft not found" },
      { status: 404 }
    );
  }

  if (!post.isAiDraft) {
    return NextResponse.json(
      {
        error:
          "This post has already been confirmed",
      },
      { status: 400 }
    );
  }

  const body = await req
    .json()
    .catch(() => ({}));

  /**
   * Only fields explicitly supplied by the modal are changed.
   * This allows the manager to edit the draft before confirming.
   */
  let postDate:
    | Date
    | undefined;

  if (body.postDate !== undefined) {
    const parsedDate = new Date(body.postDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          error:
            "The supplied post date is invalid",
        },
        { status: 400 }
      );
    }

    postDate = parsedDate;
  }

  const updated =
    await db.calendarPost.update({
      where: {
        id: postId,
      },

      data: {
        isAiDraft: false,

        caption:
          body.caption !== undefined
            ? typeof body.caption === "string"
              ? body.caption.trim() || null
              : null
            : undefined,

        contentIdea:
          body.contentIdea !== undefined
            ? typeof body.contentIdea === "string"
              ? body.contentIdea.trim() || null
              : null
            : undefined,

        cta:
          body.cta !== undefined
            ? typeof body.cta === "string"
              ? body.cta.trim() || null
              : null
            : undefined,

        hashtags:
          body.hashtags !== undefined
            ? typeof body.hashtags === "string"
              ? body.hashtags.trim() || null
              : null
            : undefined,

        postDate,
      },
    });

  return NextResponse.json({
    post: updated,
  });
}

/**
 * DELETE
 *
 * Permanently discards one AI draft.
 *
 * Because the post is still an AI draft and has not been exposed
 * to the client, deleting it is safe.
 */
export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; postId: string }>;
  }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, postId } = await params;

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
          "You don't have permission to review drafts on this calendar",
      },
      { status: 403 }
    );
  }

  const post = await db.calendarPost.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post || post.calendarId !== id) {
    return NextResponse.json(
      { error: "Draft not found" },
      { status: 404 }
    );
  }

  if (!post.isAiDraft) {
    return NextResponse.json(
      {
        error:
          "This post has already been confirmed — delete it from the calendar instead",
      },
      { status: 400 }
    );
  }

  await db.calendarPost.delete({
    where: {
      id: postId,
    },
  });

  return NextResponse.json({
    ok: true,
  });
}