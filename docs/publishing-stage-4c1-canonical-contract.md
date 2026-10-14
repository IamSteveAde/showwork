# Stage 4C.1 — canonical publishing contract and transaction adapter

Completed locally on 2026-10-13; inactive and stopped for review. No production
migration, route integration, Netlify configuration change or worker activation.

## Exact file changes

Created:

- `lib/publishing/canonicalContract.ts` — identity, phase and legacy projection types.
- `lib/publishing/canonicalStore.ts` — canonical revision binding, account versioning,
  existing-job admission/preparation and immutable operation receipts.
- `lib/publishing/transactionDatabase.ts` — injected top-level PostgreSQL adapter.
- `scripts/publishing-reliability/canonical-schema.sql` — additive, uninstalled local proposal.
- `tests/publishing-canonical.integration.test.cjs` — synthetic PostgreSQL verification.
- `tsconfig.publishing-canonical.json` — isolated no-emit typecheck.
- `docs/publishing-stage-4c1-canonical-contract.md` — this report.

Modified:

- `lib/publishing/intentActions.ts` — optional same-transaction `bindRevision` hook
  and optional destination input (part of the existing stable request hash). The
  canonical factory requires exact explicit destination/version; original callers
  supply no hook and retain their behavior.
- `tests/publishing-intent-actions.integration.test.cjs` — optional
  `SHOWWORK_TEST_CANONICAL_SCHEMA=1` installs the additional proposal in disposable
  fixtures, allowing the existing 26 scenarios to verify compatibility.

No existing reliableAdmission/reliableStore/reliableWorker/portableRuntime source,
Stage 3A/3B module/schema, Stage 4A schema, Prisma schema/migration, application API,
Netlify function/configuration, package or normal-worker entrypoint was modified.
Pre-existing workspace changes were left intact.

## Canonical identity and CalendarPost relationship

A publication execution is identified by immutable `(intentId, revision, generation)`.
`publicationKey` validates and renders that tuple. The immutable job ID is a lookup
key for exactly that execution; it does not itself grant permission to publish.

- Intent identity retains the Stage 3A immutable post ID/platform/creation fields.
  Its ACTIVE/CANCELLED state and current-revision pointer remain mutable controls.
- Revision is an append-only authorization/scheduling snapshot: existing immutable
  due time plus new immutable account/version, content hash and job/action linkage.
- Generation counts external-attempt lineage, not worker claims, scheduler ticks or
  retries of a database request. Generation 1 belongs to the initial external attempt;
  generations 2+ retain the Stage 4A immediate predecessor/evidence protocol.
- Unsent revisions before any initial attempt can each have a generation-1 execution.
  They are distinguished by revision and job ID. Stage 3A's UNIQUE(intentId) still
  permits only one initial external attempt across those revisions. Earlier unsent
  revisions must be invalidated/cancelled before the new revision becomes current.
- A safe retry appends a revision, new job and N+1 generation; it never mutates the
  prior job lease, resets an external attempt or reuses a predecessor approval.

CalendarPost remains the content/planning record and legacy UI projection, linked by
PublishingIntent.postId and PublishingJob.postId. The injected validator locks that
post and checks calendar/platform, exact content hash, approval, entitlement and
permissions. CP.updatedAt and its publishing status are not execution identity.
This stage deliberately adds no foreign key to the production CalendarPost model;
these are local proposal tables using logical IDs. Post retirement/deletion and
reconciliation retention require later integration, not cascade deletion here.

The trusted content hash must ultimately cover the exact approved provider payload:
caption/settings, ordered media identities/versions and other publishable content.
The tests use a synthetic content string. The hash identifies the historical snapshot;
this stage does not store a complete payload or implement physical media retention.

## READY jobs, admission and lifecycle

`createCanonicalIntentActions` uses Stage 4A's transaction and job creation, appending
its revision binding through the hook before the action commits. A missing/stale
explicit destination or failed capture rolls back intent, revision, admission, job,
binding and audit together. No binding is inferred later from whichever account
happens to be connected. Ordinary old unbound jobs fail closed in this adapter; an
explicit legacy import is a later stage.

`admit` inserts one immutable PublishingCanonicalExecution for the existing READY
job and an operation receipt. It does not create another PublishingJob or mark CP
PUBLISHING. Concurrent admissions produce one execution; distinct operation receipts
can acknowledge the same admitted work. Repeated operation IDs return the original
receipt, including after actual lost socket acknowledgements.

`prepare` requires admitted, current, active, non-invalidated, due work; current
owner/epoch and exact bound account version; and injected live post validation. It
assigns a worker token/deadline/ownership epoch/account to the existing job. A READY
job can prepare while CP's UI status is SCHEDULED. Reclaiming expired PREPARED work
changes the claim token, not the immutable publication tuple. PREPARED has no send
permission. Admission/preparation receipts always carry `maySend:false`, even when
replayed after cancellation. A replay neither renews the lease nor changes state.

| Durable job phase | Meaning | Legacy projection |
| --- | --- | --- |
| READY | Scheduled durable work; admission is the execution/receipt record | SCHEDULED |
| PREPARED | Bounded local claim; no external attempt authorized | SCHEDULED |
| EXTERNAL_PENDING | Initial/retry authorization committed; a send may occur | PUBLISHING |
| PROVIDER_PENDING | Provider accepted an operation; confirmation pending | PUBLISHING |
| CONFIRMED | Verified publication; immutable terminal result | PUBLISHED |
| REJECTED | Recorded terminal rejection/no-send resolution; successor needs evidence | FAILED |
| OUTCOME_UNKNOWN | External effect unresolved; reconciliation only | PUBLISHING |
| CANCELLED | Terminal unsent work invalidated/cancelled | NOT_SCHEDULED |

Allowed transitions: READY → PREPARED/CANCELLED; PREPARED → PREPARED (claim recovery),
EXTERNAL_PENDING or CANCELLED; EXTERNAL_PENDING → PROVIDER_PENDING/CONFIRMED/REJECTED/
OUTCOME_UNKNOWN; PROVIDER_PENDING → CONFIRMED/REJECTED/OUTCOME_UNKNOWN; OUTCOME_UNKNOWN
→ PROVIDER_PENDING/CONFIRMED/REJECTED. Terminal phases cannot return to READY.
Failed preflight leaves unsent work for a later validated claim/cancellation; it
cannot fabricate a terminal provider rejection or an external retry generation.

The existing attempt/generation tables remain authoritative external evidence.
Deferred constraints require their outcome and the job phase/reference to agree at
commit. Initial authorization still uses Stage 3A's audited ownership API. Retry
records retain Stage 4A's authorization/event/job constraints. SQL rejects a raw
EXTERNAL_PENDING transition without the corresponding attempt. Synthetic tests
compose existing outcome recording and job changes inside one top-level transaction.
No new provider execution, send-capability service or retry-authorizer API is exposed
by this stage; those belong to later reviewed stages.

The projection helper returns a UI value only. It does not write CalendarPost, and
legacy status/timestamp changes alone cannot manufacture admission or authorization.
UNKNOWN deliberately projects PUBLISHING to preserve uncertainty rather than make
it appear retryable. Production status behavior remains unchanged because no existing
reader/writer calls this helper.

## Durable account binding

PublishingAccountBinding is a stable calendar/platform slot with CONNECTED or
DISCONNECTED state and an increasing current version. PublishingAccountVersion
preserves provider account ID, normalized connection identity and a non-secret hash
of the authorization context. PublishingAccountEvent records each change atomically.
No access/refresh tokens are copied into these tables.

Any destination or authorization-context change appends a version; disconnect also
advances it. Token rotation without a destination/grant change need not change this
identity, but live credentials still require later validation. Production callbacks
and refreshers are not integrated here.

Every canonical revision explicitly binds the requested slot/version and a trusted
snapshot. Account replacement leaves old metadata untouched. Old revisions fail
admission/preparation and SQL authorization checks; they never resolve to the new
provider account. A new explicitly authorized revision with the new destination can
proceed. Outcome recording for an already-authorized old destination remains possible
for reconciliation after replacement; it never grants another send.

`changeAccount` is a trusted local database port, not an authenticated production
connection-management route. Production callers must supply separately reviewed
connection/permission validation and synchronize the binding with SocialConnection.

## Additive SQL and preserved guarantees

Apply the canonical proposal only after the existing three proposal scripts in a
NEW disposable database. It adds six tables: AccountBinding, AccountVersion,
AccountEvent, CanonicalRevision, CanonicalExecution and CanonicalOperation, all with
Publishing prefixes. Historical versions, bindings, execution identities and events/
receipts are immutable and deletion-protected. Foreign keys retain job/revision,
account-version and action provenance. Execution uniqueness includes the immutable
intent/revision/generation tuple and the job ID.

The proposal adds guards only for canonically bound jobs/attempts. Existing unbound
Stage 3A/3B/4A fixtures remain valid. It removes no original uniqueness, evidence,
ownership, invalidation or retry-generation constraint. The legacy lease column is
retained for SQL compatibility but is never selected as canonical authority.

SQL enforces audited account updates, valid bindings, exact generation linkage,
admission/preparation audit records in the current transaction, job transition rules,
prepared owner/account/deadline eligibility, immutable executor metadata after the
external boundary, matching outcome/reference at commit and account fencing for both
initial and retry authorization. Deferred final-state checks inspect the final job
row, allowing audited preparation plus initial authorization to compose in one
transaction. Confirmed results and prior-generation evidence remain preserved.

## Transaction adapter and ordering

`createPublishingTransactionDatabase` receives an already supplied pool; it creates
no client or pool on import/factory construction and reads no destination/credentials.
Tests supply the existing private-socket cluster helper. No application/global DB is
imported. Every method callback receives a scoped parameterized query port.

- Explicit top-level BEGIN ISOLATION LEVEL READ COMMITTED; local UTC/search_path,
  statement timeout and lock timeout; result returned only after COMMIT resolves.
- Errors before COMMIT roll back. A COMMIT error destroys the client and returns
  PUBLISHING_COMMIT_UNCONFIRMED; it never retries mutation or assumes rollback.
- Scoped queries reject transaction control, savepoints, SQL batching and statements
  outside SELECT/INSERT/UPDATE/DELETE/WITH/SHOW. Nested adapter transactions are
  rejected through AsyncLocalStorage. Escaped query ports close after the callback.
- All queries must be awaited by trusted callbacks. The restricted port is not a
  general SQL parser or security boundary for untrusted SQL.
- One top-level transaction ID is shared with existing xmin/pg_current_xact_id audit
  triggers. Savepoints/subtransactions and automatic transaction retries are unsupported.
  Future production PgBouncer/role/session behavior requires separate verification.

Canonical admission/preparation order: operation advisory lock → ownership SHARE →
injected post lock → account SHARE → intent UPDATE → job UPDATE. Stage 4A actions use
operation lock → injected post lock → sorted post intents; binding adds account SHARE.
Account changes lock the calendar/platform slot and account head, without taking post/
intent/job locks. Initial authorization's additional guard locks ownership/account
before Stage 3A intent/job locks. Retry row UPDATE inherently locks the generation
row before its trigger; future composition must establish the surrounding owner/post/
account/intent locks first. Raw writers can invert ordering and deadlock; abort is safe,
no partial mutation/send grant is returned, and this adapter never automatically retries.

Trusted helpers may join a supplied existing tx port without issuing nested BEGIN;
tests demonstrate preparation/authorization and outcome/job composition this way.
Existing budgeted-database transaction joining or reporting savepoints must not be
assumed compatible with this port.

## Compatibility decisions

| Existing module | Decision |
| --- | --- |
| reliableAdmission | Canonical admission acknowledges an existing Stage 4A job. The old admit-created-job protocol must not run on the same canonical post/job. Future admission must use current intent due time/account binding and canonical readiness. |
| reliableStore | Existing timestamp equality, CP PUBLISHING prerequisite, mutable-lease reject/reset and job-only beginExternal are not valid for canonical jobs. New store resolves these locally; SQL rejects unsafe old mutations. Coordination/budget/wake/account-lease helpers may be reused only through a reviewed bridge. |
| reliableWorker | Keep provider work outside database transactions. Future worker must consume the canonical tuple and require a newly confirmed initial/retry attempt send grant. Preparation receipts are insufficient; a recovered authorization must not send again. Existing retryable → READY and lost-boundary recovery behavior is not adopted. |
| portableRuntime | May retain bounded tick/consume/shutdown lifecycle, but needs a canonical store/worker composition. Existing leader/consumer epochs do not replace PublishingOwnership epoch. Wake hints remain hints. No runtime composition is added here. |
| ownership / intentActions | Original initial attempt uniqueness and N+1 retry protocol retained. Existing actions gain only an optional inert same-transaction binding extension. |

This is a contract/database adapter, not a drop-in activation of the existing worker
interface. It intentionally does not implement production permission adapters, social
API execution, consumer heartbeat/wake wiring, legacy import or route projection writes.

## Verification

PostgreSQL 17.6 source was fetched from the official archive and verified against its
SHA-256 file: `e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`.
Source, build and installation prefix were solely /private/tmp/showwork-postgres17-build.
The existing helper created new private disposable clusters: synthetic data, owner-only
Unix socket directories and TCP disabled. No system installation/service was changed.

Final combined PostgreSQL run: 72 substantive scenarios passed, zero failures/skips;
Node counts four suite parents and reports 76/76, approximately 12.2 seconds. Breakdown:

- Canonical contract: 22/22 scenarios.
- Stage 4A with canonical proposal additionally installed: 26/26.
- Stage 3A original schema/regressions: 7/7.
- Stage 3B original process/crash/recovery regressions: 17/17.
- Existing ownership/retry-policy units: 8/8.
- `tsc --project tsconfig.publishing-canonical.json`: passed.

Canonical scenarios cover READY with SCHEDULED projection; concurrent admission and
preparation; stale timestamps/status not granting authority; content mismatch;
account replacement and explicit destination; cancellation/preparation; replay
including request-key order; snapshot/preflight rollback; actual lost COMMIT socket
acknowledgements for admission/preparation/initial authorization; nested transaction,
savepoint and escaped-port rejection; acceptance/unknown/confirmation plus historical
evidence; safe retry tuple/predecessor preservation; immutable leases/generation;
raw audit omissions; future due times/stale epoch; final-state composition; unbound
legacy fail-closed and projections. Lost-ack tests pause reads BEFORE COMMIT, verify
that specific record through another connection, then destroy the unread socket.
No post-COMMIT thrown-error simulation or provider call is used.

Review corrections verified: stable hashes ignore request-field order; deferred
checks inspect final job state; raw admission/preparation require audits; account,
claim deadline and reference contradictions fail closed. Initial canonical run passed
18 scenarios; the suite was expanded to test these additional constraints. No final
failures occurred. These are correctness checks, not throughput or production proofs.

## Remaining risks and cleanup

Production adapters must generate/validate the complete content snapshot, synchronize
account versions with real connections, and revalidate approval/entitlement/permissions
at external authorization. No production authentication is added to these trusted local
ports. Consumer/account lease integration, provider-specific evidence verification,
retry send capabilities and read-only reconciliation require subsequent review. Legacy
import, deletion/tombstones/media retention, cancelled retry-lineage policy, role/RLS
privileges and pooler behavior remain unimplemented/unverified. A cancelled retry is
not resurrected or assigned another successor from the same predecessor. Exactly-once
external publication is not claimed.

After the suites, every test cluster was stopped and its database/socket directory
removed. Temporary PostgreSQL source/archive/checksum/build/binaries and TAP artifacts
were removed; absence of processes/directories was verified. Re-running database tests
requires another explicitly approved temporary PostgreSQL build.

Production remains untouched: no Supabase, Netlify or VPS access, no live social API,
no deployment/configuration change, no production migration and no worker activation.
No existing application publishing behavior changed. Stop after Stage 4C.1 for review.
