# Campaign-led content generation

Implemented locally; live model testing and deployment remain deferred at the user's request. Enable with `CONTENT_CREATIVE_PIPELINE_ENABLED=true` on the **actual generation runtime** after deploying this code. Unset/false preserves the previous generation path. No new database migration or VPS change is required by this increment, and no deployment was performed.

The content model has since been upgraded to GPT-6.1 Sol with medium reasoning. See [content model configuration](content-model.md) for current token budgets, timeout overrides and rollback settings; those override the original per-stage budgets below.

## What changes

1. Load up to 60 most recently created posts from the authorised workspace, including drafts. Deduplicate identical shared-platform copies and retain at most 30 compact examples. Memory captures hooks, ideas and caption excerpts; it is not a complete archive or a performance-based recommendation system.
2. Produce a structured campaign brief before drafting: audience, objective, central message, narrative progression and 4–10 candidate creative angles. Each angle describes an audience tension, distinct treatment, feasible visual execution and factual boundaries. The model chooses an editorial direction for broad requests, without claiming inferred goals were explicitly supplied by the business.
3. The existing generator develops that brief into the existing code-owned content units and streams. It is instructed to select/evolve angles rather than repeat a fixed content template. Existing business evidence, user clarifications and omission decisions remain inputs.
4. A creative editor reviews the complete batch overview and recent memory, working in groups of at most three posts. It rewrites weak hooks, repetitive substance and vague execution directions while retaining strong content. Later groups see earlier edits. Visual/shot/carousel directions go into the existing `contentIdea` field; spoken video text remains in `script`.
5. Existing spoken-video repair, canonical identity validation, date assignment and platform expansion run afterward. Only content fields can be changed by the editor. No draft is saved until generation/review returns successfully.

The planner/editor must not invent proof, results, testimonials, discounts, urgency, company policies or production resources. History and the creative plan are explicitly not factual sources. This is creative assistance, not an independent factual verification guarantee.

## Compatibility and bounds

- Same content: one reviewed canonical item is copied unchanged to every selected platform.
- Different content: separate canonical items permit platform-specific expression.
- Custom groups: shared content stays identical within each group.
- Dates, time settings, approvals, draft visibility and publishing are not model-controlled or changed by this feature.
- New planning/review calls use the dedicated content-model setting and existing Responses adapter. No additional provider or web research is introduced.
- One planning call: 45-second timeout, one attempt, maximum 3,500 output tokens.
- One editing call per three canonical items: one attempt; current content-model timeout and reasoning/output budgets are described in the content-model guide. At most 60 independent canonical items per creative request; the user is asked to shorten larger ranges. Platform copies within a shared stream do not count as extra independent items.
- Planning/review failures stop generation; there is no silent claim that failed creative review succeeded. The existing generation handler handles allowance reversal on failure. Provider token charges are separate from the application's generation allowance.
- Latency/cost increase versus one-pass generation. Worst-case total worker time includes drafting retries and existing video repair; validate deployed job timeouts before activation. The flag can be disabled without removing data.

## Validation

Automated tests cover workspace-scoped memory and deduplication, disabled behaviour, validated campaign plans, size bounds, review identity protection, invalid review responses, bounded review batches, and complete mocked generation through all three sharing strategies. The integration tests verify that reviewed content is used and code-owned dates remain correct.

No real model quality benchmark was run for this increment. Claims that output is measurably more creative, less repetitive or higher-performing would require human-reviewed comparisons on real representative briefs. No production/browser trial was performed.

```sh
node --test tests/creative-generation.test.cjs
npx tsc --noEmit --incremental false
```

Deployment must include both `lib/content/creativeGeneration.ts` and changes to `lib/openai.ts`, `lib/calendarAiGeneration.ts`, and `lib/publishing/showworkApplication.ts`. Updating the website alone does not update an external worker/functions checkout. All existing business-knowledge/clarification deployment requirements still apply separately.
