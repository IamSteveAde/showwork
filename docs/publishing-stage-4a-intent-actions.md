# Stage 4A — transactional publishing-intent actions

Local implementation only, completed 2026-10-13. Stage 4A stops here for review.
No publishing activation or production readiness approval is implied.

Files created:

- `lib/publishing/intentActions.ts`
- `tests/publishing-intent-actions.integration.test.cjs`
- `tsconfig.publishing-intent-actions.json`
- `docs/publishing-stage-4a-intent-actions.md`

File modified: `scripts/publishing-reliability/intent-actions-schema.sql`, an
existing, uninstalled local proposal. No Stage 3A/3B source/schema file changed.
Pre-existing workspace changes were retained. No package or dependency changes.

## Semantics and transaction boundaries

The factory takes a database transaction adapter and four mandatory validators:
post locking/eligibility, due-time policy, transactional edit persistence, and
trusted retry-evidence verification. Nothing imports an application database,
route, Netlify function, social provider, scheduler or worker. Callers must supply
existing permission, approval, entitlement and platform checks; the test adapter
uses synthetic permission/approval/entitlement state only.

Each action uses one top-level READ COMMITTED transaction. The adapter must return
only after COMMIT, roll back on failure, and never automatically retry uncertain
commits. Repeatable-read and serializable adapters are explicitly rejected. The
SQL proposal also rejects unsupported isolation in its guards. Savepoints and
PgBouncer have not been validated.

Lock order for actions: operation advisory lock, injected post-row lock, all
intents for that post in sorted ID order, then affected jobs/generations. Initial
external authorization takes ownership SHARE, intent UPDATE, then job UPDATE.
Retries must use the same ownership/intent/job ordering when integrated. Raw row
updates can acquire locks in different order and deadlock; PostgreSQL aborts one
transaction. A transaction error returns ACTION_TRANSACTION_UNCONFIRMED, never a
send grant. Expected input errors use IntentActionError codes; injected validators
should use that class for expected permission/eligibility denials.

| Action | Atomic effects |
| --- | --- |
| Schedule | Validate locked intended post/platform, expected revision (0 for a new intent), due time and eligibility; append intent revision, admission and READY durable job; append immutable action result. Existing ACTIVE intent conflicts. A cancelled, never-attempted intent may receive a new revision. |
| Cancel | Invalidate the current unsent revision, cancel READY/PREPARED jobs and READY retry generations, append cancellation events, and set intent CANCELLED. No evidence is deleted. Repeated cancellation with a new operation is harmless. |
| Reschedule | Invalidate and cancel old unsent work; append revision N+1 and its new durable job in the same transaction. A stale revision conflicts. Any historical attempt requires the retry protocol instead. |
| Edit | Lock and inspect every platform intent for the post before changing anything; invalidate/cancel all eligible current unsent revisions and persist content through the injected edit callback in the same transaction. An external conflict on any platform prevents the whole edit. |
| Retry | Require ACTIVE intent, current expected revision, current terminal predecessor and matching durable evidence; invalidate prior revision, append revision/job, generation N+1 and approved action atomically. A second contender receives a stale-revision conflict. |

APPLIED, CONFLICT, PENDING_RECONCILIATION and NEW_AUTHORIZED_INTENT_REQUIRED are
explicit result outcomes. AUTHORIZED/ACCEPTED/UNKNOWN attempts or unsafe job phases
block cancellation, editing, rescheduling and retry. CONFIRMED evidence takes
precedence and always requires a separately authorized new intent. No operation
returns permission to send. Replaying an operation returns its stored result,
even after a lost COMMIT acknowledgement; it does not recreate work. Reusing its
ID with a different actor or request hash is rejected. Replays still check current
post access. A stored pending/conflict outcome is final for that operation ID;
a later reconciliation or changed request needs a new operation ID.

CalendarPost is never queried or updated by this module. Its existing production
status fields retain their current behavior. The synthetic edit test verifies its
status field is unchanged. The injected production edit callback, when separately
reviewed, must persist only validated content, preserving publishing evidence and
status semantics.

## Additive local schema proposal

The Stage 4A proposal supplies PublishingAction, PublishingRevisionInvalidation,
PublishingRetryEvidence, PublishingRetryGeneration and PublishingRetryEvent.
It keeps the Stage 3B UNIQUE(intentId) and UNIQUE(jobId) on PublishingExternalAttempt
and the unique job-per-intent-revision constraint unchanged. Initial attempts are
generation 1; generations 2+ live in the separate retry table and get a new revision
and durable job. This implements the predecessor protocol without weakening the
original single-initial-attempt constraints. No production DDL or Prisma migration
was created or executed.

Generation constraints include unique (intentId,generation), (intentId,revision),
job, evidence, operation and successor-per-predecessor identities; XOR root versus
immediate-generation predecessor; foreign keys to preserved history; exact N+1
allocation; immutable identity; and a READY-only initial state. Deferred audit
foreign keys allow the action record to be inserted last in the same transaction.
Authorization requires active/current/non-invalidated intent, ownership epoch,
due PREPARED job, immutable authorization identity, a same-transaction event and
EXTERNAL_PENDING job at commit. Ownership cannot transfer past unresolved retries.

Additional guards require invalidation, durable-job cancellation and a current
transaction action audit before an intent state/revision change commits. They
prevent raw invalidation of externally busy intents, admission of stale revisions,
unaudited retry authorization, alteration of job identities or publication evidence,
and deletion of intent-associated jobs, revisions, approvals and events.

A separate recordRetryEvidence operation calls the trusted verifier using only an
evidence reference and predecessor identity. Client booleans are never accepted.
It requires actor stoppage/fencing, durable verification, retryability and explicit
approval from that dependency. Verified NOT_SENT may resolve AUTHORIZED/UNKNOWN to
the existing REJECTED terminal enum, with an attempt event; NOT_SENT is distinguished
by its immutable evidence kind. Definitive provider rejection must already be
REJECTED. The predecessor/job resolution and evidence append commit together.
Missing verification leaves UNKNOWN unresolved; publication references, acceptance
or confirmation conflict with safe retry. A timeout/process exit alone is no proof.
New generations retain their immediate predecessor and evidence IDs, operation,
approver and job. Third-generation allocation is tested.

## Verification and defects corrected

Final verification:

- Stage 4A: 26/26 PostgreSQL scenarios passed (Node counts the parent: 27/27),
  approximately 5.8 seconds for the final run; not a throughput measurement.
- Stage 3A: 7/7 PostgreSQL regression scenarios passed.
- Stage 3B: 17/17 process/crash/recovery regression scenarios passed.
- Ownership/retry-policy unit tests: 8/8 passed.
- `tsc --project tsconfig.publishing-intent-actions.json`: passed.

Stage 4A scenarios: validation/rollback; concurrent initial schedules; scheduling
versus cancellation; scheduling versus rescheduling; editing versus authorization;
cancellation versus authorization; rescheduling versus admission; simultaneous
retries; verified no-send; definitive rejection; uncertain outcome; confirmed
publication; real lost schedule acknowledgement; real lost retry acknowledgement;
held authorization versus cancellation/rescheduling/edit (three scenarios);
failed-edit rollback; all-platform edit invalidation; historical preservation;
third generation; cancellation of a READY generation; job-only uncertain evidence;
unsupported isolation; raw state/audit omission; raw retry generation/authorization
constraints. Held-authorization tests observe actual PostgreSQL lock waits before
releasing the winner. Lost-ack tests pause PostgreSQL socket reads BEFORE COMMIT,
observe the specific operation from another connection, destroy the unread socket,
and replay requests; this is not a thrown error after receiving COMMIT success.

Corrections made during implementation/review:

1. Confirmed attempt evidence now outranks a job's stale EXTERNAL_PENDING phase;
   the first run exposed this wrong result classification.
2. Job-only uncertainty and stored references are inspected, preventing cancellation
   when the attempt row is absent.
3. Cancel-then-schedule preserves an existing immutable invalidation; deferred
   checks require a fresh action audit without rewriting the old invalidation.
4. READ COMMITTED is mandatory to avoid stale-snapshot eligibility after lock waits.
5. Raw initial authorization locks ownership and intent before checking invalidation.
6. Audit/predecessor/reference/job preservation guards were strengthened.
7. The lost-ack harness handles the deliberately destroyed client's error event;
   the first run also corrected a test expectation: unresolved job state correctly
   returns pending before trusted rejection evidence is recorded.

Initial database runs were blocked first by the missing Stage 3B temporary binary,
then by sandbox initdb restrictions. User-approved temporary build and approved
local execution resolved both. Final suites have no failures or skipped scenarios.

## Temporary infrastructure and cleanup

PostgreSQL 17.6 source and SHA-256 checksum came from the official PostgreSQL source
archive: https://ftp.postgresql.org/pub/source/v17.6/ . The archive verified as
`e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`.
The build prefix and source were under /private/tmp/showwork-postgres17-build;
no system installation or service was modified. All clusters used new temporary
directories, synthetic data, TCP disabled, and Unix sockets in owner-only directories.
Cleanup stopped every cluster and removed the source archive, checksum, build,
binaries, database/socket files and temporary test outputs. Cleanup was verified.
The tests require a newly approved temporary build at the helper's fixed path to
run again; no PostgreSQL infrastructure remains installed by this stage.

## Remaining integration risks

The layer protects no existing publisher until a separately authorized integration.
Production post validation/edit adapters and a trusted evidence verifier still need
implementation/review. Retry-generation worker consumption is deliberately absent;
the tests use synthetic raw authorization transactions to exercise its SQL boundary.
Role/RLS grants must prevent untrusted direct evidence writes, trigger disabling or
TRUNCATE. Database constraints cannot independently prove that an actor stopped or
that provider evidence is truthful. Existing legacy admission and routes do not
share these locks today. Production pooler/isolation behavior, real provider
reconciliation/idempotency, account/token races and repost identity remain unverified.
With the preserved unique post/platform identity, a confirmed repost must use a new
explicitly approved post/intent; same-post repost identity needs later design review.
PostgreSQL cannot atomically commit a remote API send; exactly-once publication is
not claimed.

Production remains untouched: no Supabase, Netlify or VPS connection; no live social
API call; no existing API route/Netlify function modification; no production migration,
deployment, publishing activation or normal VPS worker execution. Stop at Stage 4A.
