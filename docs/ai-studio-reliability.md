# AI Studio generation and polling reliability — 26 October 2026

## Evidence

The supplied logs include one generation returning HTTP 200 with its drafts subsequently loading, followed by intermittent Prisma P1001 errors on inbox handoff polling. Other batches complete model planning, writing and review and then return a generic application error. Those old logs omit the application exception message/code, so they cannot establish which particular post-review validator rejected each historical result. No live model replay was performed to infer missing evidence.

## Changes

- `lib/content/briefReview.ts`: validates editorial replacements as a complete set and applies valid replacements. Review rejection, malformed reviews/replacements or an unavailable review retain the validated original writing as drafts explicitly needing editorial review. No automatic additional paid model call.
- `lib/content/briefGeneration.ts`: uses safe review recovery; repetition and restrictive production instructions create internal warnings instead of discarding the whole batch. Required fields and supported formats remain enforced. Application-generated contract errors now have safe codes.
- `lib/content/generationError.ts`: typed, application-authored generation diagnostics.
- `lib/content/brief.ts`: validates and preserves internal review warnings in saved brief JSON. These are excluded from public caption/CTA projection.
- `components/calendars/CreativeBriefEditor.tsx`: visibly displays Needs editorial review; warnings are not represented as quality approval.
- `lib/calendarAiGeneration.ts`: preserves safe error codes, records generation/validation/persistence phase without content, handles storage outages explicitly and retains allowance refund behaviour. Incomplete required fields still cannot be saved.
- `lib/databaseAvailability.ts`: one bounded retry for transient connectivity codes. Use only for reads and explicitly idempotent job-status writes, never paid generation or draft insertion.
- `lib/auth.ts`: optional propagation of database-unavailable errors, enabled only by the two polling routes. Default authentication behaviour and JWT validation remain unchanged.
- `app/api/calendars/[id]/inbox/handoffs/route.ts` and `app/api/calendars/[id]/ai-generate/[jobId]/route.ts`: retry reads once and return safe 503 + Retry-After on persistent connectivity problems, preserving authentication, workspace permissions and job ownership checks. No fabricated zero count/completion.
- `components/calendars/InboxHandoffAlert.tsx`: backs off failed polling and retains the last confirmed count.
- `lib/aiGenerationResponse.ts`: status polling tolerates temporary database/network failures without resubmitting generation. Lost progress checks do not falsely imply model failure.
- `lib/aiGenerationJobs.ts`: bounded retry of identical final job-status writes. Claim operations, paid model calls and draft creation are not automatically replayed.

Valid recovered content remains an AI draft, behind the existing internal/client approval workflow. Recovery does not automatically publish or assert factual/creative approval. Bad required fields, unsupported original formats and invalid slot identities still fail explicitly.

## Validation

78 regression tests passed and one existing test was skipped, covering review recovery, native bulk persistence and snapshots, required-field rejection/refunds, status ownership, local execution replay, transient database responses/backoff, permissions, internal review and publishing eligibility. An additional internal-warning UI/projection test passed. TypeScript and diff checks passed.

No paid live generation, migration, VPS change, deployment or production record mutation was performed. Test storage is mocked/isolated. Existing failed jobs were not reset or replayed; already discarded model responses cannot be recovered from the supplied logs.

## Limits and next validation

The code handles P1001 outages; it does not repair Supabase's network or pooler. Sustained failures require checking database/project health, network reachability and connection pressure. Do not change database credentials/ports or run destructive schema commands speculatively. Restart local development to load changes, then validate the next user-triggered batch. If it fails, the new safe code and phase identify whether generation, contract validation or storage failed. Future production adoption also requires the matching VPS worker update; no automatic rollout was performed.
