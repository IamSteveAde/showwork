  // ─────────────────────────────────────────────
  // OPENAI RESPONSES API — the AI content assistant's core calls:
  // folding new business documents into a calendar's rolling summary,
  // running weekly research with live web search, and generating a
  // batch of real posts from everything learned so far.
  //
  // Uses the Responses API (/v1/responses), not the older Chat
  // Completions API — this is required for the built-in web_search
  // tool, which Chat Completions' older web_search_options parameter
  // does not support on current models.
  //
  // OPENAI_MODEL is configurable via env var rather than hardcoded, so
  // upgrading to a newer model later is a one-line environment change,
  // not a code change.
  // ─────────────────────────────────────────────

  const API_URL = "https://api.openai.com/v1/responses";
  const DEFAULT_MODEL = "gpt-4.1";

  function requireApiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OPENAI_API_KEY is not set — the AI content assistant isn't configured yet."
      );
    }
    return key;
  }

  interface ResponsesApiOutputItem {
    type: string;
    content?: { type: string; text?: string }[];
  }

  interface ResponsesApiResult {
    output: ResponsesApiOutputItem[];
  }

  /**
   * Extracts the model's text from the real, raw Responses API output
   * array. `output_text` (used in every OpenAI code example) is
   * explicitly documented as a convenience property their official
   * SDKs compute on top of this array — it does not exist on the raw
   * HTTP JSON response, which is all a plain fetch() call like this
   * one ever receives. The output array can also contain non-message
   * items (tool calls, reasoning), so this searches it properly
   * rather than assuming the text sits at a fixed position.
   */
  function extractOutputText(data: ResponsesApiResult): string {
    const textParts: string[] = [];

    for (const item of data.output ?? []) {
      if (item.type !== "message" || !item.content) continue;

      for (const part of item.content) {
        if (part.type === "output_text" && part.text) {
          textParts.push(part.text);
        }
      }
    }

    return textParts.join("\n").trim();
  }

  /**
   * One call to the Responses API. `webSearch` enables live web
   * search for this call specifically — only needed for the weekly
   * research step, not for folding an uploaded document into the
   * summary (which needs no outside information).
   */
  async function callOpenAI({
    instructions,
    input,
    webSearch = false,
    jsonSchema,
    maxOutputTokens = 4096,
  }: {
    instructions: string;
    input: string;
    webSearch?: boolean;
    jsonSchema?: { name: string; schema: Record<string, unknown> };
    maxOutputTokens?: number;
  }): Promise<string> {
    const apiKey = requireApiKey();
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

    const body: Record<string, unknown> = {
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
    };

    if (jsonSchema) {
      body.text = {
        format: {
          type: "json_schema",
          name: jsonSchema.name,
          strict: true,
          schema: jsonSchema.schema,
        },
      };
    }

    if (webSearch) {
      body.tools = [{ type: "web_search" }];
    }

    let res: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        });
        if (res.status < 500 && res.status !== 429) break;
      } catch (error) {
        if (attempt === 2) throw error;
      }
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
    if (!res) throw new Error("The AI service could not be reached. Please try again.");

    let data: ResponsesApiResult & {
      error?: { message: string };
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      throw new Error(`OpenAI returned an unreadable response (${res.status}).`);
    }

    if (!res.ok || (data as any).error) {
      throw new Error(
        (data as any).error?.message ?? `OpenAI request failed (${res.status})`
      );
    }

    const text = extractOutputText(data);

    if (!text) {
      throw new Error("OpenAI returned no text output for this request.");
    }

    return text;
  }

  /**
   * Folds a newly uploaded business document into the calendar's
   * existing rolling summary — never just appends the raw document
   * text, since the summary is meant to stay a single, current,
   * readable picture of the business, not a growing pile of source
   * material. Safe to call with existingSummary === null for the very
   * first document.
   */
  export async function updateBusinessSummaryWithDocument({
    existingSummary,
    clientName,
    documentText,
  }: {
    existingSummary: string | null;
    clientName: string;
    documentText: string;
  }): Promise<string> {
    const instructions = `You maintain a single, current working summary of a business for a social media agency's internal use — covering what the business does, its products or services, its brand voice, its target audience, and anything else relevant to planning social media content for it. You are given the current summary (which may be empty) and the text of a newly uploaded document. Rewrite the summary to incorporate whatever new, relevant information the document adds, keeping it concise and well-organized. Do not simply append the document — genuinely integrate it. Output only the updated summary, nothing else.`;

    const input = `Client name: ${clientName}\n\nCurrent summary:\n${
      existingSummary ?? "(none yet — this is the first document)"
    }\n\nNewly uploaded document:\n${documentText}`;

    return callOpenAI({ instructions, input });
  }

  /**
   * The weekly research step — uses live web search to look into the
   * business's industry, competitors, and current trends, then folds
   * whatever's genuinely useful into the same rolling summary. Kept as
   * a completely separate function from the document-folding one above
   * even though both update the same field, since this one needs
   * web_search enabled and the other explicitly should not.
   */
  export async function runWeeklyBusinessResearch({
    existingSummary,
    clientName,
  }: {
    existingSummary: string | null;
    clientName: string;
  }): Promise<string> {
    const instructions = `You maintain a single, current working summary of a business for a social media agency's internal use, covering what the business does, its industry, its target audience, its brand voice, and anything relevant to planning social media content for it. You are given the current summary. Search the web for current, relevant information about this business, its industry, competitors, and any recent trends worth knowing about. Then rewrite the summary to fold in whatever you learn that's genuinely useful — don't pad it with generic industry facts that don't help plan content. Keep the summary concise and well-organized. Output only the updated summary, nothing else.`;

    const input = `Client name: ${clientName}\n\nCurrent summary:\n${
      existingSummary ?? "(none yet)"
    }`;

    return callOpenAI({ instructions, input, webSearch: true });
  }

  export interface GeneratedPostIdea {
    postDate: string; // ISO date, no time — the day this post is for
    platform:
      | "INSTAGRAM"
      | "TIKTOK"
      | "YOUTUBE"
      | "FACEBOOK"
      | "X"
      | "LINKEDIN";
    postType: string;
    category: string;
    hook: string;
    script: string;
    caption: string;
    contentIdea: string;
    cta: string;
    hashtags: string;
  }

  /**
   * The on-demand generation step — turns the accumulated business
   * summary into a real batch of post ideas across a date range.
   *
   * Video-specific behavior:
   * - If a generated video/reel involves speaking or narration,
   *   generate both a strong hook and a complete usable script.
   * - If the video is purely visual and does not involve speaking,
   *   hook and script should be empty strings.
   * - Images and carousels should normally have empty hook/script fields.
   *
   * Returns structured data (parsed from the model's JSON output), not
   * prose, since these need to become real CalendarPost rows.
   */

  async function repairSpokenVideoFields(
    post: GeneratedPostIdea
  ): Promise<GeneratedPostIdea> {
    const postType = post.postType.toLowerCase();

    const isVideo =
      postType.includes("reel") ||
      postType.includes("video");

    if (!isVideo) {
      return post;
    }

    const hookMissing = !post.hook?.trim();
    const scriptMissing = !post.script?.trim();

    if (!hookMissing && !scriptMissing) {
      return post;
    }

    const instructions = `You are completing a social media video draft.

  This post is a Reel or Video.

  Every Reel or Video MUST have both:
  1. A strong opening hook.
  2. A complete, natural, ready-to-record script.

  There are NO exceptions.

  Even if the original creative direction is visual, create a suitable hook and script that fits the concept.

  The hook should be attention-grabbing and appropriate for the target audience.

  The script must contain the actual words the speaker or narrator should say. Do not describe what should be said. Write the actual spoken words.

  The hook and script must be specific to the business, audience, topic, and creative direction.

  Return ONLY a JSON object with exactly these two fields:

  {
    "hook": "...",
    "script": "..."
  }`;

    const input = `Video post:

  Post type:
  ${post.postType}

  Category:
  ${post.category}

  Creative direction:
  ${post.contentIdea}

  Current hook:
  ${post.hook || "(missing)"}

  Current script:
  ${post.script || "(missing)"}

  Caption:
  ${post.caption}

  Call to action:
  ${post.cta}

  Hashtags:
  ${post.hashtags}`;

    const raw = await callOpenAI({
      instructions,
      input,
      jsonSchema: {
        name: "video_fields",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["hook", "script"],
          properties: { hook: { type: "string" }, script: { type: "string" } },
        },
      },
    });

    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/, "")
      .replace(/```\s*$/, "");

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        "The AI could not complete the hook and script for a video post. Please try generating again."
      );
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "The AI returned an invalid hook and script response. Please try generating again."
      );
    }

    const value = parsed as Record<string, unknown>;

    const hook =
      typeof value.hook === "string"
        ? value.hook.trim()
        : "";

    const script =
      typeof value.script === "string"
        ? value.script.trim()
        : "";

    if (!hook || !script) {
      throw new Error(
        "The AI returned an empty hook or script for a video post. Please try generating again."
      );
    }

    return {
      ...post,
      hook,
      script,
    };
  }
  export async function generateContentCalendar({
  clientName,
  businessSummary,
  startDate,
  endDate,
  postsPerWeek,
  platforms,
  customInstructions,
  contentStrategy,
  contentGroups,
  scheduleStrategy,
  platformSchedules,
}: {
  clientName: string;
  businessSummary: string;
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  platforms: string[];
  customInstructions?: string;
  contentStrategy?: "SAME_CONTENT" | "DIFFERENT_CONTENT" | "CUSTOM_GROUPS";
  contentGroups?: string[][];
  scheduleStrategy?: "SAME_TIME" | "SAME_DAY" | "CUSTOM";
  platformSchedules?: Record<
    string,
    {
      date: string;
      time: string;
    }
  >;
}): Promise<GeneratedPostIdea[]> {
  if (platforms.length === 0) {
    throw new Error("At least one platform is required.");
  }

  const strategy = contentStrategy ?? "SAME_CONTENT";
  const scheduling = scheduleStrategy ?? "SAME_TIME";

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end.getTime() < start.getTime()
  ) {
    throw new Error("The selected content date range is invalid.");
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  const totalDays =
    Math.floor(
      (end.getTime() - start.getTime()) / millisecondsPerDay
    ) + 1;

  /*
   * Determine how many content units should exist in the
   * requested date range.
   *
   * Example:
   * 7 days × 3 posts/week = 3 content units
   * 14 days × 3 posts/week = 6 content units
   */
  /*
 * Build the publishing rhythm week by week.
 *
 * postsPerWeek means exactly that:
 *
 * 3 posts/week
 *   → 3 publishing days in week 1
 *   → 3 publishing days in week 2
 *   → 3 publishing days in week 3
 *
 * The AI does NOT decide publishing dates.
 * Showwork does.
 *
 * We deliberately schedule on different days within each week
 * instead of spreading the total number of posts across the
 * entire date range.
 */
const buildWeeklyDates = (
  rangeStart: string,
  rangeEnd: string,
  weeklyFrequency: number
): string[] => {
  const rangeStartDate = new Date(
    `${rangeStart}T00:00:00Z`
  );

  const rangeEndDate = new Date(
    `${rangeEnd}T00:00:00Z`
  );

  if (
    Number.isNaN(rangeStartDate.getTime()) ||
    Number.isNaN(rangeEndDate.getTime()) ||
    rangeEndDate.getTime() < rangeStartDate.getTime()
  ) {
    return [];
  }

  const dates: string[] = [];

  /*
   * Monday = 1
   * Tuesday = 2
   * ...
   * Sunday = 7
   */
  const getMonday = (date: Date): Date => {
    const day = date.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(date);
    monday.setUTCDate(
      monday.getUTCDate() + mondayOffset
    );

    return monday;
  };

  /*
   * These are the preferred publishing days for each
   * supported weekly frequency.
   *
   * The goal is to keep posts naturally spaced throughout
   * the week rather than placing them beside each other.
   */
  const preferredWeekdays: Record<number, number[]> = {
    1: [3],              // Wednesday
    2: [2, 5],           // Tuesday, Friday
    3: [1, 3, 5],        // Monday, Wednesday, Friday
    4: [1, 3, 5, 7],     // Monday, Wednesday, Friday, Sunday
    5: [1, 2, 3, 4, 5],  // Monday-Friday
    6: [1, 2, 3, 4, 5, 6],// Monday-Saturday
    7: [1, 2, 3, 4, 5, 6, 7],
  };

  /*
   * Clamp the requested frequency to the range we support.
   * The UI currently allows 1-14, so frequencies above 7
   * need two publishing slots on some days.
   */
  const frequency = Math.max(
    1,
    Math.min(14, Math.round(weeklyFrequency))
  );

  /*
   * For 8-14 posts/week, use every day first and then
   * add a second slot to the earliest days.
   *
   * Dates themselves remain unique. The time layer can
   * later distinguish multiple posts on the same day.
   */
  const baseWeekdays =
    preferredWeekdays[Math.min(frequency, 7)] ??
    preferredWeekdays[7];

  let currentMonday = getMonday(rangeStartDate);

  while (
    currentMonday.getTime() <= rangeEndDate.getTime()
  ) {
    const availableDays: Date[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(currentMonday);
      date.setUTCDate(
        currentMonday.getUTCDate() + offset
      );

      if (
        date.getTime() >= rangeStartDate.getTime() &&
        date.getTime() <= rangeEndDate.getTime()
      ) {
        availableDays.push(date);
      }
    }

    /*
     * For a normal 1-7 posts/week frequency, choose the
     * preferred weekdays that fall inside the selected range.
     */
    if (frequency <= 7) {
      for (const weekday of baseWeekdays) {
        const date = new Date(currentMonday);
        date.setUTCDate(
          currentMonday.getUTCDate() + (weekday - 1)
        );

        if (
          date.getTime() >= rangeStartDate.getTime() &&
          date.getTime() <= rangeEndDate.getTime()
        ) {
          dates.push(
            date.toISOString().slice(0, 10)
          );
        }
      }
    } else {
      /*
       * 8-14 posts/week.
       *
       * Every available day gets one post first.
       * Additional posts are assigned from Monday onward.
       *
       * The actual duplicate-day handling will be represented
       * by multiple content units sharing the same date.
       */
      for (const date of availableDays) {
        dates.push(
          date.toISOString().slice(0, 10)
        );
      }

      const additionalPosts = frequency - 7;

      for (
        let index = 0;
        index < additionalPosts;
        index += 1
      ) {
        if (availableDays.length === 0) {
          break;
        }

        const date =
          availableDays[index % availableDays.length];

        dates.push(
          date.toISOString().slice(0, 10)
        );
      }
    }

    currentMonday.setUTCDate(
      currentMonday.getUTCDate() + 7
    );
  }

  return dates;
};

const sharedDates = buildWeeklyDates(
  startDate,
  endDate,
  postsPerWeek
);

const unitCount = sharedDates.length;

if (unitCount === 0) {
  throw new Error(
    "Could not build the content publishing schedule for the selected date range."
  );
}
  if (sharedDates.length !== unitCount) {
    throw new Error(
      "Could not build the content publishing dates."
    );
  }

  /*
   * Normalize custom content groups so only currently
   * selected platforms are used.
   */
  const normalizedGroups =
    strategy === "CUSTOM_GROUPS"
      ? (contentGroups ?? [])
          .map((group) =>
            group.filter((platform) =>
              platforms.includes(platform)
            )
          )
          .filter(
            (group) => group.length > 0
          )
      : [];

  if (
    strategy === "CUSTOM_GROUPS" &&
    normalizedGroups.length === 0
  ) {
    throw new Error(
      "At least one valid content group is required."
    );
  }

  /*
   * A stream represents one independent content source.
   *
   * SAME_CONTENT:
   *   One stream containing every platform.
   *
   * DIFFERENT_CONTENT:
   *   One stream per platform.
   *
   * CUSTOM_GROUPS:
   *   One stream per content group.
   */
  const streams =
    strategy === "SAME_CONTENT"
      ? [
          {
            id: "ALL",
            platforms,
          },
        ]
      : strategy === "DIFFERENT_CONTENT"
        ? platforms.map((platform) => ({
            id: platform,
            platforms: [platform],
          }))
        : normalizedGroups.map(
            (group, index) => ({
              id: `GROUP_${index + 1}`,
              platforms: group,
            })
          );

  const streamInstructions = streams
    .map(
      (stream) =>
        `${stream.id}: ${stream.platforms.join(", ")}`
    )
    .join("\n");

  /*
   * The AI generates one canonical content object
   * for every stream × content unit.
   */
  const expectedCanonicalPosts =
    unitCount * streams.length;

  const instructions = `You are a senior social media content strategist.

Generate a realistic and varied content calendar for the business below.

IMPORTANT:
Showwork controls publishing dates and platform distribution.

You are responsible for creating the actual content.
Showwork is responsible for deciding where and when that content is published.

CONTENT UNITS:

A content unit is one piece of content created for one publishing slot.

There are exactly ${unitCount} content units.

Each content unit has a contentUnit number from 1 to ${unitCount}.

CONTENT STREAMS:

${streamInstructions}

The final response MUST contain exactly ${expectedCanonicalPosts} canonical content objects.

For every contentUnit from 1 through ${unitCount}, create exactly one object for every content stream.

Each object MUST contain exactly these fields:

contentUnit
platform
postType
category
hook
script
caption
contentIdea
cta
hashtags

The platform field MUST contain the first platform listed for that content stream.

Do NOT create platform copies yourself.

Showwork will automatically distribute each canonical content unit to the platforms belonging to its stream.

CONTENT STRATEGY:

${
  strategy === "SAME_CONTENT"
    ? `
SAME_CONTENT is selected.

Create ONE canonical piece of content for every content unit.

The application will automatically publish that exact content on every selected platform.

Do NOT create separate Instagram, Facebook, TikTok, YouTube, X, or LinkedIn versions.

Do NOT create extra objects for any platform.

If there are 3 content units and 2 selected platforms, generate exactly 3 canonical objects, not 6.

Every platform will receive the same content after the application distributes it.
`
    : strategy === "DIFFERENT_CONTENT"
      ? `
DIFFERENT_CONTENT is selected.

Create one independent content stream for every selected platform.

Each platform must receive exactly one distinct content object for every content unit.

If there are 3 content units and 2 selected platforms, generate exactly 6 canonical objects:

3 for the first platform
3 for the second platform.

The content should be genuinely appropriate to each platform rather than duplicated.
`
      : `
CUSTOM_GROUPS is selected.

Create one canonical content object for every content group for every content unit.

Platforms inside the same group will automatically receive the same content.

Platforms in different groups must receive different content.

Do not create separate objects for platforms within the same group.
`
}

CONTENT DATES:

Do NOT invent dates.

Do NOT return dates such as:

September 23
23/09/2026
September 23rd
2026/09/23

The application will assign the actual publishing date using contentUnit.

VIDEO RULE:

Every Reel or Video MUST have both a Hook and a Script.

There are NO exceptions.

For every Reel or Video:

- hook must be a strong opening hook.
- script must be a complete, natural, ready-to-record spoken script.
- script must contain the actual words the speaker or narrator should say.
- hook and script must fit the business, audience, topic, and content idea.
- the AI decides the execution style.
- the manager does not need to specify talking-head, voiceover, interview, presenter, or another format.

For image posts and carousels, hook and script may be empty strings unless the concept specifically requires them.

CONTENT QUALITY:

- Base every post on the business summary.
- Avoid generic filler.
- Vary topics and formats across content units.
- Keep the content coherent with the brand.
- Follow the manager's specific instructions when provided.
- Make every content unit meaningfully different from the previous content unit.

Return ONLY the JSON array.

Do not return markdown.
Do not return code fences.
Do not return explanations.
Do not return headings.
`;

  const scheduleInstructions =
    scheduling === "SAME_DAY"
      ? `
SCHEDULING:

All platforms belonging to the same content unit will use the same publishing date.

Each platform may use its configured publishing time.

Configured platform times:

${Object.entries(
  platformSchedules ?? {}
)
  .map(
    ([platform, schedule]) =>
      `${platform}: ${schedule.time}`
  )
  .join("\n")}
`
      : scheduling === "CUSTOM"
        ? `
SCHEDULING:

The application will apply the configured platform schedules after generation.

Configured platform schedules:

${Object.entries(
  platformSchedules ?? {}
)
  .map(
    ([platform, schedule]) =>
      `${platform}: ${schedule.date} at ${schedule.time}`
  )
  .join("\n")}
`
        : `
SCHEDULING:

All platforms belonging to the same content unit will use the same publishing date and time.

Default publishing time:

${
  Object.values(
    platformSchedules ?? {}
  )[0]?.time ?? "10:00"
}
`;

  const input = `Client: ${clientName}

Business summary:
${businessSummary}

Requested date range:
${startDate} to ${endDate}

Posts per week:
${postsPerWeek}

Number of content units:
${unitCount}

Selected platforms:
${platforms.join(", ")}

Content streams:
${streamInstructions}

${scheduleInstructions}

${
  customInstructions?.trim()
    ? `Manager's specific instructions:
${customInstructions.trim()}`
    : ""
}`;

  const raw = await callOpenAI({
    instructions,
    input,
    maxOutputTokens: Math.min(
      30000,
      Math.max(4096, expectedCanonicalPosts * 900 + 1024)
    ),
    jsonSchema: {
      name: "content_calendar",
      schema: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["contentUnit", "platform", "postType", "category", "hook", "script", "caption", "contentIdea", "cta", "hashtags"],
          properties: {
            contentUnit: { type: "integer" },
            platform: { type: "string", enum: [...new Set(streams.map((stream) => stream.platforms[0]))] },
            postType: { type: "string" },
            category: { type: "string" },
            hook: { type: "string" },
            script: { type: "string" },
            caption: { type: "string" },
            contentIdea: { type: "string" },
            cta: { type: "string" },
            hashtags: { type: "string" },
          },
        },
      },
    },
  });

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/```\s*$/, "");

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "The AI's response wasn't valid content data — try generating again."
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      "The AI's response wasn't in the expected format — try generating again."
    );
  }

  /*
   * The AI returns contentUnit internally.
   * It is removed before the final GeneratedPostIdea
   * objects are returned.
   */
  const canonicalPosts = parsed as Array<
    GeneratedPostIdea & {
      contentUnit: number;
    }
  >;

  if (
    canonicalPosts.length !==
    expectedCanonicalPosts
  ) {
    throw new Error(
      `The AI generated ${canonicalPosts.length} content items instead of the required ${expectedCanonicalPosts}. Please try generating again.`
    );
  }

  /*
   * Repair video hooks/scripts first, while the content
   * is still in canonical form.
   */
  const repairedCanonicalPosts =
    await Promise.all(
      canonicalPosts.map(async (post) => {
        if (
          !Number.isInteger(
            post.contentUnit
          ) ||
          post.contentUnit < 1 ||
          post.contentUnit > unitCount
        ) {
          throw new Error(
            "The AI returned an invalid content unit. Please try generating again."
          );
        }

        if (
          typeof post.platform !==
          "string"
        ) {
          throw new Error(
            "The AI returned an invalid platform. Please try generating again."
          );
        }

        const repaired =
          await repairSpokenVideoFields({
            ...post,
            postDate:
              sharedDates[
                post.contentUnit - 1
              ],
          });

        return {
          ...repaired,
          contentUnit:
            post.contentUnit,
        };
      })
    );

  /*
   * Validate that the AI produced exactly one
   * canonical object for every stream × unit.
   */
  const seenKeys = new Set<string>();

  for (const post of repairedCanonicalPosts) {
    const stream = streams.find(
      (item) =>
        item.platforms.includes(
          post.platform
        )
    );

    if (!stream) {
      throw new Error(
        `The AI returned an unexpected platform (${post.platform}). Please try generating again.`
      );
    }

    /*
     * The canonical platform must be the first
     * platform in the stream.
     */
    if (
      post.platform !==
      stream.platforms[0]
    ) {
      throw new Error(
        `The AI returned the wrong canonical platform for ${stream.id}. Please try generating again.`
      );
    }

    const key = `${stream.id}:${post.contentUnit}`;

    if (seenKeys.has(key)) {
      throw new Error(
        "The AI returned duplicate content units. Please try generating again."
      );
    }

    seenKeys.add(key);
  }

  if (
    seenKeys.size !==
    expectedCanonicalPosts
  ) {
    throw new Error(
      "The AI did not generate every required content unit. Please try generating again."
    );
  }

  /*
   * Expand canonical content into actual platform posts.
   *
   * This is the important part:
   *
   * SAME_CONTENT:
   *   1 AI post → every selected platform
   *
   * DIFFERENT_CONTENT:
   *   each platform keeps its own AI post
   *
   * CUSTOM_GROUPS:
   *   1 AI post → every platform in that group
   */
  const expandedPosts: GeneratedPostIdea[] =
    [];

  for (const stream of streams) {
    for (
      let unitIndex = 1;
      unitIndex <= unitCount;
      unitIndex += 1
    ) {
      const canonical =
        repairedCanonicalPosts.find(
          (post) =>
            post.contentUnit ===
              unitIndex &&
            post.platform ===
              stream.platforms[0]
        );

      if (!canonical) {
        throw new Error(
          `Missing content for ${stream.id}, content unit ${unitIndex}. Please try generating again.`
        );
      }

      for (const platform of stream.platforms) {
        expandedPosts.push({
          postDate:
            sharedDates[
              unitIndex - 1
            ],
          platform:
            platform as GeneratedPostIdea["platform"],
          postType:
            canonical.postType,
          category:
            canonical.category,
          hook:
            canonical.hook,
          script:
            canonical.script,
          caption:
            canonical.caption,
          contentIdea:
            canonical.contentIdea,
          cta:
            canonical.cta,
          hashtags:
            canonical.hashtags,
        });
      }
    }
  }

  return expandedPosts;
}

  export interface RegeneratedPost {
    postDate: string;
    platform:
      | "INSTAGRAM"
      | "TIKTOK"
      | "YOUTUBE"
      | "FACEBOOK"
      | "X"
      | "LINKEDIN";
    postType: string;
    category: string;
    hook: string;
    script: string;
    caption: string;
    contentIdea: string;
    cta: string;
    hashtags: string;
  }

  /**
   * Regenerates one existing draft using the client's accumulated business
   * context plus the current draft and the manager's requested direction.
   */
  export const AI_EDITABLE_FIELDS = [
  "hook",
  "script",
  "caption",
  "contentIdea",
  "cta",
  "hashtags",
] as const;

export type AiEditableField = (typeof AI_EDITABLE_FIELDS)[number];
  export async function regeneratePost({
  clientName,
  businessSummary,
  currentPost,
  instruction,
  fields,
}: {
  clientName: string;
  businessSummary: string;
  currentPost: RegeneratedPost;
  instruction?: string;
  fields?: AiEditableField[];
}): Promise<RegeneratedPost> {
    const instructions = `You are a senior social media strategist editing one existing draft for a client.

The manager wants to edit specific fields of the existing post.

FIELDS TO EDIT:
${fields?.length ? fields.join(", ") : "entire post"}

STRICT EDITING RULE:

If specific fields are provided, ONLY change those fields.

Every field NOT listed in FIELDS TO EDIT must be returned EXACTLY as provided in the current draft.

Do not rewrite, improve, shorten, expand, rephrase, or otherwise modify unselected fields.

For example:
- If only "hook" is selected, change ONLY the hook.
- If "hook" and "caption" are selected, change ONLY the hook and caption.
- If "script" and "cta" are selected, change ONLY the script and CTA.

If "entire post" is selected, you may improve all fields.

Return ONE JSON object with exactly these fields:
postDate, platform, postType, category, hook, script, caption, contentIdea, cta, hashtags.

Do not return an array.
Do not use markdown fences.

VIDEO RULE:

Every Reel or Video MUST have both:
- a strong hook
- a complete, ready-to-record spoken script

There are NO exceptions.

If the selected fields do not include hook or script, preserve the existing hook and script exactly as provided.

If the selected fields include hook or script, improve them while keeping them consistent with the post.

The script must contain the actual words the speaker or narrator should say.

For image and carousel content, preserve hook and script unless they are explicitly selected for editing.

The manager's instruction is the highest priority.`;
    const input = `Client: ${clientName}

  Business context:
  ${businessSummary}

  Current draft:
  ${JSON.stringify(currentPost, null, 2)}

    Selected fields:
  ${fields?.length ? fields.join(", ") : "entire post"}

  ${
    instruction?.trim()
      ? `Manager's request:
  ${instruction.trim()}`
      : "Manager's request: Improve the selected fields while keeping the strategy, brand voice and intent strong."
  }`;

    const raw = await callOpenAI({ instructions, input });

    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/, "")
      .replace(/```\s*$/, "");

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        "The AI's response wasn't valid content data — try regenerating again."
      );
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(
        "The AI's response wasn't in the expected format — try regenerating again."
      );
    }

    const value = parsed as Record<string, unknown>;

    const required = [
      "postDate",
      "platform",
      "postType",
      "category",
      "hook",
      "script",
      "caption",
      "contentIdea",
      "cta",
      "hashtags",
    ];

    for (const key of required) {
      if (!(key in value)) {
        throw new Error(
          `The AI response is missing "${key}" — try regenerating again.`
        );
      }
    }

    return {
      postDate: String(value.postDate),
      platform: value.platform as RegeneratedPost["platform"],
      postType: String(value.postType ?? ""),
      category: String(value.category ?? ""),
      hook: String(value.hook ?? ""),
      script: String(value.script ?? ""),
      caption: String(value.caption ?? ""),
      contentIdea: String(value.contentIdea ?? ""),
      cta: String(value.cta ?? ""),
      hashtags: String(value.hashtags ?? ""),
    };
  }
