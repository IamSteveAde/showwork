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
    throw new Error("OPENAI_API_KEY is not set — the AI content assistant isn't configured yet.");
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
 * items (tool calls, reasoning), so this searches it properly rather
 * than assuming the text sits at a fixed position.
 */
function extractOutputText(data: ResponsesApiResult): string {
  const textParts: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type !== "message" || !item.content) continue;
    for (const part of item.content) {
      if (part.type === "output_text" && part.text) textParts.push(part.text);
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
}: {
  instructions: string;
  input: string;
  webSearch?: boolean;
}): Promise<string> {
  const apiKey = requireApiKey();
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model,
    instructions,
    input,
    max_output_tokens: 4096,
  };
  if (webSearch) {
    body.tools = [{ type: "web_search" }];
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as ResponsesApiResult & { error?: { message: string } };
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message ?? `OpenAI request failed (${res.status})`);
  }

  const text = extractOutputText(data);
  if (!text) {
    // A genuinely empty result — surfaced as a real error rather than
    // returned as an empty string, which would otherwise look like
    // success to every caller while silently saving nothing.
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

  const input = `Client name: ${clientName}\n\nCurrent summary:\n${existingSummary ?? "(none yet — this is the first document)"}\n\nNewly uploaded document:\n${documentText}`;

  return callOpenAI({ instructions, input });
}

/**
 * The weekly research step — uses live web search to look into the
 * business's industry, competitors, and current trends, then folds
 * whatever's genuinely useful into the same rolling summary. Kept as
 * a completely separate function from the document-folding one above
 * even though both update the same field, since this one needs
 * web_search enabled and the other explicitly should not (there's no
 * reason to pay for search when integrating a document that already
 * contains everything it needs).
 */
export async function runWeeklyBusinessResearch({
  existingSummary,
  clientName,
}: {
  existingSummary: string | null;
  clientName: string;
}): Promise<string> {
  const instructions = `You maintain a single, current working summary of a business for a social media agency's internal use, covering what the business does, its industry, its target audience, its brand voice, and anything relevant to planning social media content for it. You are given the current summary. Search the web for current, relevant information about this business, its industry, competitors, and any recent trends worth knowing about. Then rewrite the summary to fold in whatever you learn that's genuinely useful — don't pad it with generic industry facts that don't help plan content. Keep the summary concise and well-organized. Output only the updated summary, nothing else.`;

  const input = `Client name: ${clientName}\n\nCurrent summary:\n${existingSummary ?? "(none yet)"}`;

  return callOpenAI({ instructions, input, webSearch: true });
}

export interface GeneratedPostIdea {
  postDate: string; // ISO date, no time — the day this post is for
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "X" | "LINKEDIN";
  postType: string;
  category: string;
  caption: string;
  contentIdea: string;
  cta: string;
  hashtags: string;
}

/**
 * The on-demand generation step — turns the accumulated business
 * summary into a real batch of post ideas across a date range.
 * Returns structured data (parsed from the model's JSON output), not
 * prose, since these need to become real CalendarPost rows.
 */
export async function generateContentCalendar({
  clientName,
  businessSummary,
  startDate,
  endDate,
  postsPerWeek,
  platforms,
  customInstructions,
}: {
  clientName: string;
  businessSummary: string;
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  platforms: string[];
  customInstructions?: string;
}): Promise<GeneratedPostIdea[]> {
  const instructions = `You are a social media content strategist. Given a business's profile and a date range, generate a realistic, varied content calendar as a JSON array. Each item must have exactly these fields: postDate (an ISO date, YYYY-MM-DD, within the given range), platform (one of: ${platforms.join(", ")}), postType (e.g. "Single Image", "Reel", "Carousel"), category (e.g. "Educational", "Promotional", "Behind the Scenes"), caption (a real, ready-to-use caption in the business's voice), contentIdea (a short description of what the visual/video should actually show), cta (a short call to action), and hashtags (space-separated, relevant to the business). Space posts out sensibly across the date range rather than clustering them. If the manager has given specific instructions, follow them closely — they take priority over generic assumptions about the business. Output ONLY the JSON array, no other text, no markdown code fences.`;

  const input = `Client: ${clientName}\n\nBusiness summary:\n${businessSummary}\n\nDate range: ${startDate} to ${endDate}\nTarget: roughly ${postsPerWeek} posts per week\nPlatforms to use: ${platforms.join(", ")}${customInstructions ? `\n\nSpecific instructions from the manager for this batch:\n${customInstructions}` : ""}`;

  const raw = await callOpenAI({ instructions, input });

  // Defensive parsing — a model occasionally wraps JSON in a code
  // fence despite being told not to; this strips that if present
  // rather than failing outright on an otherwise-valid response.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("The AI's response wasn't valid content data — try generating again.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("The AI's response wasn't in the expected format — try generating again.");
  }

  return parsed as GeneratedPostIdea[];
}
export interface RegeneratedPost {
  postDate: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "X" | "LINKEDIN";
  postType: string;
  category: string;
  caption: string;
  contentIdea: string;
  cta: string;
  hashtags: string;
}

/**
 * Regenerates one existing draft using the client's accumulated business
 * context plus the current draft and the manager's requested direction.
 */
export async function regeneratePost({
  clientName,
  businessSummary,
  currentPost,
  instruction,
}: {
  clientName: string;
  businessSummary: string;
  currentPost: RegeneratedPost;
  instruction?: string;
}): Promise<RegeneratedPost> {
  const instructions = `You are a senior social media strategist editing one existing draft for a client.

Create ONE improved version of the draft. Preserve useful facts and the client's voice, but make meaningful improvements rather than simply changing a few words.

Return ONLY one JSON object with exactly these fields:
postDate, platform, postType, category, caption, contentIdea, cta, hashtags.

Do not return an array. Do not use markdown fences.

The manager's instruction is the highest priority.`;

  const input = `Client: ${clientName}

Business context:
${businessSummary}

Current draft:
${JSON.stringify(currentPost, null, 2)}

${instruction?.trim()
  ? `Manager's request:
${instruction.trim()}`
  : "Manager's request: Improve this draft while keeping the strategy, brand voice and intent strong."}`;

  const raw = await callOpenAI({ instructions, input });
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("The AI's response wasn't valid content data — try regenerating again.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The AI's response wasn't in the expected format — try regenerating again.");
  }

  const value = parsed as Record<string, unknown>;
  const required = [
    "postDate",
    "platform",
    "postType",
    "category",
    "caption",
    "contentIdea",
    "cta",
    "hashtags",
  ];

  for (const key of required) {
    if (!(key in value)) {
      throw new Error(`The AI response is missing "${key}" — try regenerating again.`);
    }
  }

  return {
    postDate: String(value.postDate),
    platform: value.platform as RegeneratedPost["platform"],
    postType: String(value.postType ?? ""),
    category: String(value.category ?? ""),
    caption: String(value.caption ?? ""),
    contentIdea: String(value.contentIdea ?? ""),
    cta: String(value.cta ?? ""),
    hashtags: String(value.hashtags ?? ""),
  };
}
