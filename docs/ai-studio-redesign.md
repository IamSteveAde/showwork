## Confirmed planning failure: exhausted API credit

One explicitly approved, synthetic, output-capped diagnostic reproduced the planning rejection: HTTP 429, code credit_balance_exhausted, type insufficient_quota. No business documents or database data were sent. The configured model's read-only availability check had succeeded; availability does not imply generation credit.

Provider error handling now classifies both insufficient_quota and credit_balance_exhausted (including type insufficient_quota) as billing/quota failures instead of suggesting a short rate-limit retry. Safe diagnostics retain status, code, parameter, type and request ID without provider message bodies, prompts or credentials. No automatic retry or model downgrade was added. API credit must be restored for the configured project/account before live generation can be validated again. No second diagnostic was made.

## Local missing-objective persistence fix

Read-only metadata inspection confirmed recent draft rows lacked creativeBrief JSON entirely, so their objective/audience were absent in storage. It did not identify which executable created them. Code inspection found a shared-queue race: localhost previously admitted PENDING jobs that a remote worker could claim before the local runner.

Development admission now atomically creates RUNNING jobs with a local namespace and executes only on successful first insertion. No PENDING local row is exposed to remote workers; replay cannot execute it twice. Production queue admission is unchanged and no VPS process was updated. Local generation validates every returned version 2 brief before writing rows, so legacy-shaped results cannot silently become drafts.

The editor now reconciles later server values into unchanged fields while preserving unsaved edits. Missing objective/audience in a successful creative-save response produces a visible error instead of silently clearing the form. Existing incomplete drafts still require the content-grounded completion request; this fix does not invent or bulk-backfill values.

Verification: 43 focused tests and TypeScript passed, including isolated local admission/replay, saved-field propagation and unsaved-edit preservation. No paid live completion, production writes, migrations or deployment were performed.

## Current requirement: one developed concept and full extracted documents

This section supersedes the earlier alternative-selection and passage-retrieval defaults below.

The campaign planner now develops exactly one concept per slot: a recognisable situation, a memorable premise, a treatment and one source-grounding excerpt. It produces no alternatives or self-scores. Whole-campaign diversity and creative-quality review remain in place.

For content generation, business knowledge now supplies every character of every stored extracted source, with source boundaries and a source-revision check. It bypasses passage ranking and omits the condensed overview because original text is authoritative. Planning and full-batch review no longer trim that evidence to 8,000/6,500 tokens; writing also receives the complete evidence. Inbox and analytics continue their existing passage-based context. Hybrid indexes remain available for other retrieval consumers; indexing is not required by this full-document generation path.

The full-context builder checks available model capacity with a 64,000-token overhead reserve. Oversize requests fail explicitly without silently omitting source text; per-model-call checks still validate the complete serialized request. Missing extracted text fails with an OCR/processing message. This includes stored website text, not pages never crawled. PDF extraction already uses complete raw-text output and does not impose a first-pages cutoff; scanned images, diagrams or image-only text are not decoded by that extractor. Full extraction is not a guarantee of exhaustive reasoning or creative quality.

No migrations, deployments, new paid live tests or saved-content changes were performed. Longer sources increase token usage and can increase latency. Tests cover one-concept schema, unchanged scheduling/fields, grounding and duplication checks, late-text retention at all generation stages, full multi-document inclusion, missing-extraction/overflow errors and actual multi-page PDF extraction.

## Concept-first campaign selection

Before caption writing, the existing planner now returns two compact concept alternatives per slot. Each includes a recognisable situation, a creative premise, an editorial treatment, an exact supporting excerpt from the supplied evidence and estimated specificity/memorability/brand-fit scores. Code validates the alternatives and verifies the excerpt exists in the actual planning evidence. An excerpt establishes a connection to the source, not truth of every claim; factual review remains necessary.

Selection ranks estimated strength with soft penalties for repeated treatments and overlapping situations/premises. Exact duplicate premises cannot be selected twice. These are editorial heuristics, not measured performance or a guarantee of originality. No fixed treatment quotas, extra model stage, automatic retry or production mutation were added. The planning response is larger and may increase latency/token usage.

Only selected concepts reach the writer and full-batch reviewer. Writer guidance preserves concept-driven stories, observations, comparisons, opinions or teaching rather than converting everything to checklists. Final review now assesses repeated situations, messages, emotional effects, caption structures, CTA intent and brand interchangeability, while retaining factual and creative-freedom requirements.

Scheduling, seven default fields, optional execution API, permission/approval controls and publishing paths are unchanged. Verification: 36 focused tests and TypeScript passed, including grounding rejection, concept ranking/diversity, no duplicated premises, selected-concept propagation and existing content/schedule/editor tests. No new paid live batch was run for this change, so creative quality and latency remain to be assessed on real output. No deployment, migration or VPS update was performed.

## Missing-context completion

Editable posts containing saved content but missing Hook, Objective or Target Audience now request one automatic completion on editor opening. The server derives missing context from the saved caption, creative direction, historical script (context only) and current business knowledge. It preserves all nonempty saved brief/copy fields, does not generate a script, and persists via the existing optimistic-concurrency, approval-lock, permission and snapshot checks. A complete saved post returns without a model call or allowance charge. Errors remain visible with an explicit retry control; opening an approved/read-only post does not trigger generation. This uses the existing AI regeneration allowance and configured AI service. No live backfill or production data mutation was run during implementation.

## Post editor correction

The review queue and calendar now use the seven-field editor for all post types, including legacy posts. Script is absent from the visible editor and optional tools. Existing script columns/history remain untouched. Older posts are adapted in the browser: Objective and Target Audience remain blank until entered; no script is relabelled as an objective. Saving the completed form writes the version 2 JSON through the existing permission, lock, snapshot and concurrency checks. The creative-brief migration is still required for storage. No database changes are performed by opening the editor.

# Updated default content contract — 26 October 2026

This correction supersedes the earlier brief-only defaults described below.

New generations use creativeBrief version 2. The editor presents Hook, Objective, Target Audience, Caption, Creative Direction, Call to Action and Hashtags in that order. All are generated by default; hashtags may be empty where inappropriate. Objective and audience describe the individual post. Creative direction describes concept, message, effect and brand connection without prescribing filming or design execution.

Captions are complete audience-facing copy. Hook, caption, CTA and hashtags are projected into the existing publishing columns on generation and brief edits. Scripts are not in the default schema and remain explicitly requested development artifacts. Optional script requests receive the current complete brief and preserve copy. Version 1 briefs and historical scripts remain readable and editable without bulk conversion. No additional database columns or migrations were introduced for version 2.

The full editorial plan and whole-batch semantic quality pass now assess specific audience insights, meaningful individual objectives, complete brand-aligned captions, distinct concepts and flexible directions. These are model-assisted checks, not a guarantee of subjective creative quality. Existing scheduling and platform count validation are unchanged.

Application path: AI generator card → POST /api/calendars/[id]/ai-generate → preflight/auth + durable job (or canonical application adapter) → generateCalendarDrafts / canonical generate action → generateContentCalendar → generateBriefCalendar. Native and canonical persistence receive public copy plus structured JSON. The review queue and calendar share CreativeBriefEditor. Field regeneration uses the scoped creative route, retains optimistic concurrency and resets internal review through existing rules.

Verification:
- Focused regression tests cover version 2 required copy, version 1 compatibility, editor ordering, publication-column projection, optional scripts, field-only changes and exact scheduling.
- TypeScript checks pass.
- No saved customer content, production migrations or deployments were changed.
- After explicit approval, one live 14-post Instagram batch ran successfully against the populated Showwork workspace's actual knowledge. All 14 contained the seven default fields; no automatic scripts; public-copy projection matched; exact 14 schedule preserved. Results were saved only to a private local JSON file; zero calendar posts were inserted.
- Human review found distinct topics (capacity, audience questions, handoffs, portfolio selection/attribution, AI judgment, evaluation, responsibilities, scope, peer learning and experimentation). It also found long captions and repeated save CTAs, plus older product vocabulary inherited from business evidence. Prompt guidance was subsequently tightened for caption economy and CTA/structure variety; that adjustment has local test coverage but has NOT had a second paid live run.
- This was a real context/model-generation test, not an authenticated browser/save/provider-publishing end-to-end test. Existing production migrations, saving and external publishing were not exercised or changed.
- To run the isolated live audit after authorization: node scripts/audit-content-generation.cjs WORKSPACE_ID PRIVATE_OUTPUT_FILE. It reads actual business context, uses the production generator, writes private local JSON, and does not insert posts or consume workspace allowances. External AI usage is billable.
- Browser/mobile visual acceptance and real provider publishing remain separate checks.

---

# AI Studio: strategy, creative briefs and optional execution

Implemented in the local checkout, 26 October 2026. No production deployment, VPS changes or application-database migration was performed. Live generation and browser acceptance testing remain deferred. **Apply the reviewed additive migration before using the updated application/client against a database.**

## Audit and root causes

The previous calendar prompt asked for hook, script, caption, creative direction, CTA and hashtags for every item. It explicitly demanded production documents and detailed execution. `repairSpokenVideoFields` then filled empty video scripts automatically, making omission impossible. Regeneration repeated the production requirements. The editor displayed six large execution fields regardless of whether the team needed them. Creativity/review changes added calls without changing that output contract, and the old reviewer considered small batches independently.

Business knowledge is assembled through `getBusinessKnowledgeContext`; source fingerprints and research eligibility remain in place. Research is labelled as hypotheses, not verified business capabilities. Recent workspace content supplies repetition memory, not performance proof. The previous sparse writer batches had a shared general brief, but no distinct editorial assignment for every calendar slot, allowing separate batches to revisit the same easy topic.

The existing Monday-based frequency rule produces **14 slots** for October 26–November 25, 2026 at three posts/week: Monday, Wednesday and Friday where those weekdays fall inside the selected range. This is the existing partial-week contract, not a new four-week approximation. The reported 42 historical drafts were not queried, so their precise historical cause is **unconfirmed**. Duplicate platforms/overlapping content groups were previously accepted, and repeated local POSTs could start another synchronous generation. Both multiplication risks are now guarded. Existing drafts are not deleted or consolidated.

## New architecture and behaviour

### 1. Strategy and complete editorial plan

The default generator creates a compact strategy covering audience, objective, central message, progression and content pillars. It assigns a distinct topic, audience need, message, creative angle, pillar and format to every planned canonical slot/platform. Slot identities are validated before writing. Progression is adaptive; no fixed funnel or percentage mix is imposed.

### 2. Format-aware creative briefs

Three-item writing batches develop the assigned editorial plan, with at most two writer calls in flight. Brief fields are:

- Working title; format and platform.
- Objective and target audience/need.
- Core idea and key message.
- Flexible creative direction.
- Desired audience response.
- Brand connection, suggested CTA and content pillar.

Reels describe the storytelling opportunity without dialogue, timecodes or shot choreography. Carousels describe the conceptual progression without full slides. Graphics describe the communication opportunity rather than a prescribed layout. Text posts define an argument and takeaway. Formats must be valid for every platform in a shared stream.

No hook, script, caption or hashtags are generated by default. The legacy `contentIdea` column gets a readable title/core-idea/direction projection for existing calendar and client interfaces. The suggested CTA stays in the brief; it is not silently turned into public publishing copy. Separate existing execution columns remain nullable.

One compact semantic quality review sees the **entire batch** and recent history. It checks relevance, audience problems/messages, repetition of benefits, pillars/formats, brand voice, restrictive execution, unsupported claims and caveats. It can replace at most six weaker briefs once, preserving identities. An unacceptable batch or remaining exact duplicate core ideas fails explicitly; there is no unbounded regeneration loop. Semantic quality is model judgement, not an objective guarantee.

Factual checks remain internal to creative generation: unsupported optional claims should be omitted/rephrased, without recurring public disclaimers. Essential missing facts still use the earlier clarification flow. No source-truth resolver or automatic performance attribution is introduced.

### 3. Optional execution

Users explicitly request Script, Caption, Carousel structure, Visual approaches, Production notes or Hashtags from the current saved brief. They can instead write/save each section manually. Brief revision, whole-idea replacement and field-only “Reimagine” actions are separate from execution generation.

Execution artifacts store their text, source-brief snapshot, timestamp and manual/AI origin. Changing a brief preserves all execution text and marks artifacts from the previous version as stale in the editor. Generating a script does not overwrite captions or the brief. Single-field revision merges only that field even if the model changes others. Saving a brief does not clear manually edited execution or CTA fields.

AI development consumes one existing regeneration allowance; manual edits do not. Failed native AI actions return the reserved allowance. Saves use the post's `updatedAt` to reject stale work and recheck it in the transaction. Approved/publishing content remains locked. Edits return creative content to pending internal review. Original and subsequent snapshots are preserved in generation history.

## Editor

`CreativeBriefEditor` is used in AI draft review and confirmed calendar post details. The title, concept, purpose, audience and creative direction are primary. Message, response, brand context and pillar use progressive disclosure. Optional execution tools open individually and show whether saved text came from an older brief. The layout stacks on mobile and uses two-column sections on larger screens.

Legacy records without `creativeBrief` retain their existing editor and historical scripts/captions. No automatic conversion is performed. The calendar metadata editor for new briefs focuses on dates/platform/mentions/link instead of presenting another long execution form. Detailed brief/format edits go through the brief editor. Client approval still uses the established final-content readiness and locking rules; confirming a draft for planning does not itself publish it.

## Scheduling and duplicate protection

`contentSlots` and `contentStreams` are shared by the default generator, API validation and expected-count preview. The form displays canonical ideas versus actual platform drafts before generation. A month with 14 slots on two platforms yields 28 calendar drafts; “Same content” has 14 ideas, while “Different content” has 28 ideas. Sharing groups must partition selected platforms exactly once. Duplicate platforms and overlapping/missing group members are rejected.

Partial weeks retain only the established publishing weekdays. Frequencies above seven explicitly request second daily slots; the partial-week calculation now attaches those extra slots only to their intended weekdays. A second daily slot is one hour apart and stays within the selected local day. Final generated dates/platforms must match the planned slot multiset, not merely the total count.

The form submits the browser's IANA timezone and shows it alongside the preview. Requests without a timezone retain UTC behaviour. Dates are converted to instants using the selected platform time and timezone. DST uses Temporal's compatible disambiguation (nonexistent local times move forward). The form does not add a timezone picker or new custom-date-anchor contract; the weekly slot rhythm remains shared across streams.

Local generation now uses the existing durable job identity and existing polling API, with the job started in the local process. Production still queues work for the configured worker. Retrying the same operation cannot insert another complete calendar; interrupted/failed jobs are not automatically replayed. A local server restart can interrupt an in-process job and needs investigation rather than a blind replay. Intentionally starting a new operation still creates a new batch.

## Publishing compatibility

Publishing still reads caption/script/CTA/media from existing fields. Finished copy or actual media must be prepared before a planning-only brief can be published; this does not force a caption during planning or prohibit supported caption-free media posts. Existing platform/media requirements remain in force. Final client approval and publishing continue to use existing internal-review/client-review guards. No social credentials, OAuth scopes, provider endpoints or scheduled-post integrations were rebuilt.

## Database migration and rollout

Migration: `prisma/migrations/20261026090000_creative_briefs/migration.sql` adds nullable `creativeBrief` and `creativeDevelopment` JSONB columns to both `CalendarPost` and `CalendarPostAiGeneration`. It does not update, delete or convert historical records. Prisma client was generated locally; this is not a database migration.

1. Review the migration and all other pending migrations against staging, with a backup. Do not use `db push`, reset or destructive shortcuts.
2. Apply approved schema migrations through the normal developer-managed release process **before deploying the new Prisma client/application**. New generated Prisma queries expect the columns even when a generation feature flag is off.
3. Deploy the compatible code/client to the website and actual generation worker/functions service. Updating Vercel does not update a separate worker. No remote service was modified here.
4. Brief-first generation is the default. `CONTENT_BRIEF_GENERATION_ENABLED=false` restores the previous generation output behaviour for rollback; it does not remove/convert new records or avoid the schema prerequisite. The old creative pipeline flag applies to the legacy generation path; brief-first strategy and quality review always run.
5. Keep the existing content-model, reasoning and retrieval configuration. New briefs use Sol's stage settings: medium planning, low writing/review by default. Optional execution uses the writing setting. New behavior still needs live model/access/latency acceptance on representative businesses.

A request-specific optional Campaign objective selector is included; custom objectives are described in Creative direction. No duplicate persistent workspace objective setting was added.

## Verification

- 129 tests passed and one existing conditional test skipped in the focused knowledge, content, scheduling, editor, publishing-policy and workflow suites.
- New tests cover default reels/carousels without scripts, whole-batch semantic review/replacement bounds, same/different/custom sharing, exact planned counts and date distribution, timezone conversion, partial weeks and duplicate-date intent, optional execution preserving other sections, field-only regeneration, stale-request rejection, permissions, publishing readiness, legacy editor compatibility and a non-destructive migration in isolated PostgreSQL/PGlite.
- TypeScript, Prisma schema validation and whitespace checks run separately.
- Broader canonical publishing integration could not start: its helper requires `/tmp/showwork-postgres17-build/install/bin/postgres`, absent in this environment (`DISPOSABLE_POSTGRES_UNAVAILABLE`). That integration must be run in the developer's disposable PostgreSQL environment before release.
- The separate repository-wide entrypoint snapshot check reports a hash mismatch for `app/admin/accounts/page.tsx`, which is unchanged by this work. It was not “fixed” by changing baseline hashes. This remains a failing repository check; the focused passing count above excludes that broader snapshot suite.
- Browser/mobile visual acceptance, live model quality/latency and deployed external-worker preservation are not verified. Server-rendered editor structure is tested, but no browser automation package was installed in this environment. The exact historical cause of the reported 42 drafts remains unverified.

## Files for this redesign increment

- `lib/content/brief.ts`: shared brief/artifact types, validation, projections and platform formats.
- `lib/content/schedule.ts`: shared slot counts, stream validation and timezone conversion.
- `lib/content/briefGeneration.ts`: complete editorial plan, default brief generation and bounded whole-batch quality review.
- `lib/content/creativeGeneration.ts`: current-history eligibility and flexible planning wording.
- `lib/openai.ts`: default brief path, internal factual checks and explicit optional development generation; existing generation retained for rollback.
- `lib/calendarAiGeneration.ts`: schedule/count validation, timezone-safe persistence, JSON briefs and atomic initial history snapshots.
- `app/api/calendars/[id]/ai-generate/route.ts`: durable local job orchestration.
- `app/api/calendars/[id]/posts/[postId]/creative/route.ts`: independent saved/generated creative sections, permissions, revision checks and history.
- `components/calendars/CreativeBriefEditor.tsx`: shared responsive brief/development editor.
- `components/calendars/AiDraftReviewModal.tsx`: new brief editor with legacy fallback and version history.
- `components/calendars/AiContentGeneratorCard.tsx`: expected-count preview, optional objective and timezone submission.
- `components/calendars/CalendarGrid.tsx`: confirmed-brief editing and legacy fallback.
- `app/api/calendars/[id]/posts/route.ts`: serialize brief/development and revision timestamp.
- `app/api/calendars/[id]/ai-drafts/[postId]/route.ts`: prevent old whole-post regeneration from rewriting new brief records.
- `app/api/calendars/[id]/ai-drafts/[postId]/restore/route.ts`: restore JSON state with historical snapshots.
- `lib/publishing/applicationActions.ts`, `applicationComposition.ts`: canonical JSON persistence, count validation, scheduling, stale edits, internal review invalidation and history.
- `lib/publishing/state.ts`, `validationAdapters.ts`, `capabilityProviders.ts`, `worker.ts`, `platformIntegration.ts`, `providers.ts`, `lib/tiktokAuthorization.ts`, `lib/tiktokPublishing.ts`, `lib/instagramPublishing.ts`, and the existing post publish route: planning-only readiness checks using existing provider rules.
- `prisma/schema.prisma` and the new additive migration: nullable structured storage.
- `tests/creative-briefs.test.cjs`, `tests/creative-development.test.cjs`: new behaviour and compatibility coverage. Existing legacy creative/model tests explicitly select the legacy output path.
