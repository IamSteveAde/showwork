# Stage 3A — inactive ownership and durable intent foundation

Stage 3B adds direct-SQL boundary/audit guards and independent-process failure
tests. See [publishing-stage-3b-recovery.md](publishing-stage-3b-recovery.md) for
the current guarantees, test evidence and proposed retry-generation policy.

No runtime, API route, Netlify function, Prisma model/migration, or worker build
allowlist is changed. `lib/publishing/ownership.ts` takes an injected transaction
adapter; it imports no database client and makes no provider requests.

## Schema proposal and coexistence

`scripts/publishing-reliability/ownership-schema.sql` is an additive proposal
applied after the existing candidate schema ONLY in a newly created disposable
local PostgreSQL cluster by the integration test. It is not installed by normal
builds or by Prisma. Do not run it on an existing database. Production privileges,
DDL locking, migration packaging and existing-data validation need later review.

- PublishingOwnership: singleton id 1, states NETLIFY/DRAINING/VPS, bigint epoch.
  Initial state DRAINING, epoch 0, enabled false. No existing publisher consults it.
- PublishingOwnershipEvent: append-only operation IDs, actor and unique epoch.
- PublishingIntent: stable ID and unique post/platform pair, current revision.
- PublishingIntentRevision: immutable numbered revisions and timestamptz due times;
  current revision uses a deferred composite foreign key so creation is atomic.
- PublishingJob: three additive nullable columns (intentId, intentRevision,
  ownershipEpoch). Pair validation, revision FK and unique intent/revision index.
  Existing IDs, leases, phases, references and proof remain untouched. Legacy
  rows retain null intent columns and remain readable by existing code.
- PublishingExternalAttempt: one attempt per intent (stricter than per revision),
  one per job, immutable identity/owner/epoch/actor/authorization timestamp, durable
  remote reference and outcome. This phase intentionally does not implement
  another attempt after rejection, or reposting the same post. A future explicit
  retry/repost policy is required; never evade uniqueness with a new revision.
- PublishingAttemptEvent: append-only outcome evidence with operation ID/actor.

Foreign keys use RESTRICT, not cascade deletion. Triggers prohibit evidence
updates/deletes, attempt identity changes, reference replacement and reopening a
terminal attempt. Ownership epoch updates must increase by exactly one. Intent
identity is immutable and revision updates may advance by one. No CalendarPost
FK is introduced: publication evidence must outlive content deletion. User-facing
deletion/cancellation handling is NOT implemented here.

These triggers are not protection against database owners/superusers or TRUNCATE.
Future runtime grants must exclude DDL, TRUNCATE and bypass access. Some invariants
(including actor authorization and live customer permission) require trusted
application logic. Stage 3B now enforces job/intent matching and audit linkage
at the database boundary too. A separately reviewed role/grant boundary is required.

## Transaction rules

The injected adapter supplies a dedicated transaction and resolves only AFTER
COMMIT. It must not retry callback execution. Production connection composition
is absent; the integration adapter uses pg and five client connections.

Initial activation is explicit DRAINING → NETLIFY with activate:true. It does not
start anything. Once enabled, only NETLIFY → DRAINING → VPS or the reverse are
allowed; same-state/direct host switches fail. Every transition locks the singleton
FOR UPDATE, checks the expected epoch, increments it, and appends an event.
Reusing an operation ID with matching actor/target/epoch returns the original
result without changing the current owner. Different payloads fail.

Leaving DRAINING is blocked by AUTHORIZED, ACCEPTED or UNKNOWN external attempts.
After initial activation it is also blocked by legacy durable jobs in
EXTERNAL_PENDING/PROVIDER_PENDING/OUTCOME_UNKNOWN. This does NOT inspect legacy
CalendarPost-only work: inventory/import/drain of that work remains a cutover gate.
Even a quarantined unresolved attempt blocks global transfer in this conservative
version. No automatic takeover or lease-expiry reset is implemented.

Intent creation and initial revision commit together. Revision changes lock the
intent, compare current revision and prohibit changes after any external attempt.
This is an isolated repository operation, not a change to application scheduling.

## External boundary

authorize locks ownership FOR SHARE, checks enabled owner/epoch, locks the intent,
checks its active revision, then locks the matching PREPARED job. It requires due
time <= database time and matching post/platform/revision/epoch. It inserts the
unique AUTHORIZED attempt and changes the job to EXTERNAL_PENDING in one commit.
Only a newly committed authorization returns maySend:true. A duplicate request
returns maySend:false or fails; a commit error grants no authority. recoverAttempt
is read-only at the data level and ALWAYS returns maySend:false.

This foundation does not yet verify live customer permission, account status,
token version, content approval or consumer leases. Those remain mandatory in a
future shared publisher composition. The actor is trusted injected identity, not
an authentication mechanism. No public endpoint exposes these functions.

A database commit cannot atomically execute a social API request. A crash after
authorization but before send is therefore conservatively ambiguous. Never retry
the create automatically. Reconcile the authorized operation; hold uncertainty
when absence cannot be proved. An owner change cannot retract a request already
sent or close the authorization-to-send gap. Draining and old-process shutdown
remain required, even after all publishers adopt this boundary.

Outcome writes lock the attempt, validate allowed transitions, preserve its remote
reference and append an idempotent event. ACCEPTED (including TikTok upload
acceptance) is NOT CONFIRMED. Confirmation requires a reference; the trusted
reconciler must verify it externally in a later stage. REJECTED is definitive,
not a transport timeout. UNKNOWN can only be resolved by evidence, never requeued.
The foundation does not synchronize all CalendarPost/job terminal statuses yet.

## Verification and limits

```sh
npm run test:publishing-ownership
npm run typecheck:publishing-ownership
npm run test:publishing-ownership-integration
npm run test:worker-build
npm run worker:build
npm run worker:check-built
```

Integration tests use the already installed PostgreSQL 17.6 binaries at
/tmp/showwork-postgres17-build/install/bin. They initialize a NEW private temporary
cluster with TCP disabled, connect only through its unique Unix socket, apply
synthetic schema/fixtures, then stop/remove the cluster. No destination or secret
is read from environment configuration. Missing binaries/provisioning failures
fail visibly, not silently skip. No service/package is installed. A restricted
sandbox may require approval for the ephemeral PostgreSQL process.

Tests cover conflicting owner changes, stale epochs, revision/job uniqueness,
concurrent authorization, immutable evidence, uncertain transfer blocking and
commit-then-throw fault injection. Lost acknowledgements are simulated AFTER a real
COMMIT; actual wire disconnects, process-kill recovery, Supabase pooler behavior,
high-load fairness and real provider effects are NOT established by these tests.

Production remains NO-GO. Stage 3B requires separate approval. Before any later
cutover: finish live permission/lease checks, adopt the boundary in every publisher,
resolve legacy untracked work, review runtime grants, establish shared DB budgets,
test process failure and ownership transfer, and approve additive migration and
reconciliation procedures. Rollback preserves all evidence and passes through
DRAINING; it never deletes queue state or resets uncertain work.
