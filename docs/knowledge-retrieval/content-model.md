# Content model: GPT-6.1 Sol

Implemented locally, 26 October 2026. Content planning, calendar drafting, creative editing, single-post regeneration and spoken-video repair now use `gpt-6.1-sol` with `reasoning.effort: medium` by default. This setting is independent of `OPENAI_MODEL`; inbox replies, summaries, analytics, research, document interpretation, embedding and retrieval-reranking models keep their existing settings.

## Configuration

```env
OPENAI_CONTENT_MODEL=gpt-6.1-sol
OPENAI_CONTENT_REASONING_EFFORT=medium
CONTENT_CREATIVE_PIPELINE_ENABLED=true
# Optional: additional shared reasoning/output allowance per content call
OPENAI_CONTENT_REASONING_TOKENS=8192
```

The first three values have been set in the local `.env.local`, preserving other values. Restart `npm run dev` for local use. That file is not a production deployment. The creative flag controls planning/review; ordinary content writing uses the new model even with the flag off. Clarification and hybrid-index feature flags remain separate.

`OPENAI_CONTENT_MODEL` does not inherit `OPENAI_MODEL`. Supported rollback models are the GPT-4.1 family. Medium is the default content reasoning level; accepted Sol values are low, medium, high, xhigh and max. Invalid configuration fails before a content request. Do not set the general model variable to switch content only.

## Request changes

- Use the existing Responses endpoint and structured JSON output contracts.
- Send `reasoning: { effort: "medium" }` on Sol content calls. No temperature, top-p or logprobs parameters are added.
- Add 8,192 tokens to each content call's existing visible-output allowance because `max_output_tokens` covers both reasoning and final output. This is a ceiling, not a guaranteed reasoning reservation or actual spend. The optional allowance accepts integers from 2,048 to 24,000; Sol total is capped at 128,000.
- Use the actual request model for context-window checks: Sol has a 1,050,000-token context window. Content retrieval budgets also reserve reasoning headroom. This prevents `OPENAI_MODEL` for another workload from incorrectly determining a content prompt's limit.
- Give reasoning content calls at least 180 seconds by default (`OPENAI_CONTENT_TIMEOUT_MS` may set 30,000–600,000 milliseconds; existing longer stage timeouts still apply), preserve any longer requested timeout, and use one attempt to avoid silently multiplying reasoning costs. Worker-level timeout/capacity still needs deployment verification. Long batches can involve several review calls and the existing video repairs.
- An incomplete reasoning response returns a content-specific error suggesting a smaller batch, rather than the old document-interpretation error. It is not accepted as valid generated content.

Token accounting remains the existing `o200k_base` estimate with a safety margin; exact tokenizer parity for every Sol snapshot is not claimed. The large context window is not used as a reason to load all source documents. Existing bounded retrieval still applies.

## Deployment / rollback

No VPS or hosted runtime was changed, no live model call was made, and no customer document was sent for this migration. Deploy the code and these settings to the service actually running generation; a website-only deployment does not update a separate functions worker. Confirm the configured API project can access `gpt-6.1-sol` before enabling production jobs. No database migration is required for the model switch itself.

Rollback content model:

```env
OPENAI_CONTENT_MODEL=gpt-4.1
```

The rollback omits reasoning parameters and additional reasoning tokens. Set `CONTENT_CREATIVE_PIPELINE_ENABLED=false` separately to restore the earlier single-pass generation flow. Other AI model settings are unaffected.

## Verification

The model migration’s 93 automated tests passed across content-model selection, all three platform-sharing modes, business knowledge, clarification, PostgreSQL index lifecycle, generation jobs and customer-care regression. TypeScript validation also passes. Tests inspect actual mocked Responses request payloads for Sol/medium and verify that summary calls keep the general model without content reasoning parameters.

No live model access, output quality, actual token cost or production latency was verified. Those remain deferred. A stronger model is not itself evidence of better business content; compare representative outputs before making quality claims.

Changed in this increment: `lib/content/model.ts`, `lib/openai.ts`, `lib/knowledge/hybrid/engine.ts`, `tests/content-model.test.cjs`, `tests/creative-generation.test.cjs`, and this guide; local `.env.local` has the three activation settings above.

References: [Sol model specification](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [GPT-6 request compatibility and reasoning](https://developers.openai.com/api/docs/guides/latest-model).

## Follow-up: calendar-writing timeout

The reported timeout occurred in the calendar-writing call. That call previously requested every independent calendar item at once. Writing now sends at most three canonical items per call, with two calls in flight at most. Review also processes three items per call. Every writer receives the shared plan and source context plus its exact assigned slot/platform pairs; returned identities are validated before merge. Existing final validation and platform expansion remain in place. No partial calendar is returned when a batch fails, and failed paid calls are not automatically retried.

Batching reduces the response size per call but repeats some input context and reasoning, so it can increase token cost. It does not establish a latency guarantee; complete-calendar duration includes planning, writing, review and video repair. No live retry was made by the coding agent. Restart the local development server before retrying; hosted generation requires deployment to the actual worker runtime.

Timeout-fix verification: 95 focused regression tests passed, including bounded concurrency, complete slot preservation, rejection of duplicate/foreign items, no automatic timeout retries and all sharing modes. TypeScript and whitespace checks passed.

## Follow-up: end-to-end generation latency

Planning retains medium reasoning. Writing, single-post regeneration, video repair and creative editing now default to low reasoning on the same Sol model. Set `OPENAI_CONTENT_WRITING_REASONING_EFFORT=medium` and/or `OPENAI_CONTENT_REVIEW_REASONING_EFFORT=medium` to restore medium on those stages. Both variables have been set to `low` in local `.env.local`; restart the local development server. Low-effort writing/review add at most 4,096 reasoning allowance tokens instead of the planning allowance.

Creative review now returns sparse field changes, including an empty changes array for strong posts, rather than reproducing every field. All posts are still reviewed. Two three-item review batches run concurrently per wave; the next wave sees edits from previous waves. IDs, editable-field allowlists, text bounds and final sharing validation are enforced.

`CONTENT_AI_STAGE` logs record stage, model, effort, elapsed milliseconds and completion/failure only. No content or credentials are included. These timings identify whether planning, writing or review dominates a real request. They do not include knowledge/database time outside model calls.

Verification: 98 regression tests passed, including sparse review, protected fields, bounded review concurrency, per-stage effort and existing knowledge/inbox/generation paths. TypeScript passed. No live speed or creative-quality comparison was run. Lower effort is an explicit speed/quality tradeoff and no generation-time guarantee is made.
