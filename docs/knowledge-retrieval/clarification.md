# Missing-information handling

Implemented locally; not deployed. Enable with `KNOWLEDGE_CLARIFICATION_ENABLED=true` on the web runtime. Optional `KNOWLEDGE_CLARIFICATION_MODEL` overrides `OPENAI_MODEL` (fallback is the existing GPT-4.1 default). This gate is separate from hybrid indexing: it can assess current extracted text with lexical retrieval even while semantic indexing is unavailable.

## Behaviour

- Before enqueueing a content batch, authenticate and check `ai.generate` permission.
- Assess available source evidence against the actual request, including any user answers. External research and source-derived summaries are excluded from this factual check.
- If essential gaps remain, perform **one** targeted lexical search across current source chunks and reassess once. Carry checked passages into generation so facts found during the follow-up are not lost.
- Return structured HTTP 422 questions for unresolved essential facts or contradictions. No draft job is queued and no generation allowance is consumed on this path. API assessment calls still incur provider costs.
- Optional missing details do not block generation: explicit omission instructions accompany the request.
- The UI supports answering for this request, explicitly omitting unresolved details, or waiting/retrying when some source text is unavailable. Missing extraction is described as unreadable/not yet ready rather than asserting active processing. Semantic indexing alone does not block access to extracted text.
- Provider failure, malformed assessment output or concurrent source changes return a retryable 503 rather than fabricated questions. There is no bypass for an unavailable factual check.
- Answers can be saved separately by a user with `knowledge.manage`. Saves append an idempotent source containing the author ID and timestamp; existing sources are not replaced. Fingerprints invalidate old summaries/research, and the existing indexing trigger queues the entry when the prior migration is installed.
- The standard queued worker checks the supplied source fingerprint before charging/generating. If knowledge changed while queued, it asks the user to retry. No new worker or VPS operation was performed.

## Deployment

Deploy the web changes and the updated generation code to the service that actually runs jobs. The external functions repository/runtime is not modified by this checkout. Do not assume a Vercel deployment updates that service. The prior hybrid-index migration remains required for semantic indexing; this clarification feature adds no schema migration.

Enable for staging first. Keep `KNOWLEDGE_CLARIFICATION_ENABLED` unset/false to preserve the old request path or roll back. Both route and worker must use compatible code before enabling. The canonical local rehearsal boundary receives the enriched request, but separately deployed/custom generation executors need their own verification of request-field preservation and source freshness.

Assessment calls have a 15-second deadline each and no retry, at most two per request; hybrid retrieval may add its own latency. The route allows 60 seconds, subject to hosting plan limits. On repeated 503s, investigate provider configuration/latency instead of treating them as missing knowledge. No document text or answers are logged by the new code.

## Validation and limits

`node --test tests/knowledge-clarification.test.cjs` covers the targeted-search recovery, optional gaps, essential gaps, missing extraction, omission policy, authorisation before source access, provider failures, response validation, and attributed idempotent saving. The combined knowledge/document/generation suite passed 60 tests; two additional route/queued-snapshot tests also passed (62 unique tests). These tests mock model decisions: they verify control flow, not perfect semantic judgement. A real model and browser/worker staging trial remains required before enabling broadly; no live customer document test was run.

The model can still misclassify what is essential or overlook evidence. This is not a factual guarantee or full conflict-resolution system. Answers explicitly resolve facts for the current request only; saving a new answer does not establish a global source-precedence policy. A generated-output factual audit remains future work. Current page extraction and selected-passage budgets still bound what the model can inspect.

Suggested staging cases: priced promotion without currency; price found deep in a second document; awareness content with no price; conflicting refund policies; explicit user resolution; source edit while queued; provider timeout; member without knowledge-management permission; narrow/mobile screen with several questions.

## Changed files for this increment

- `lib/knowledge/clarification.ts`: bounded factual assessment, follow-up retrieval, answer validation and generation restrictions.
- `lib/knowledge/generationPreflight.ts`: authenticated request gate and 422/503 responses before job creation.
- `lib/knowledge/hybrid/provider.ts`: export the existing bounded provider request adapter for reuse.
- `app/api/calendars/[id]/ai-generate/route.ts`: preflight before both generation routes; 60-second duration.
- `app/api/calendars/[id]/business-documents/clarification/route.ts`: attributed append-only answer saving with permission check.
- `lib/calendarAiGeneration.ts`: pre-charge source snapshot verification for queued requests.
- `components/calendars/KnowledgeClarification.tsx`: responsive questions, request-only answers, save and omit actions.
- `components/calendars/AiContentGeneratorCard.tsx`: clarification state, resubmission and accessible focus handling.
- `tests/knowledge-clarification.test.cjs`: focused regression tests.

The structured response uses the existing Responses API adapter and validates the returned data in addition to the schema. Reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
