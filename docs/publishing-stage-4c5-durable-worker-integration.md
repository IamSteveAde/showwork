# Showwork Stage 4C.5 — inactive durable worker integration

Stage 4C.5 only. Production status: **NO-GO**. No deployment, production migration or activation is authorized or performed. The composition is explicitly `isolated-mock` and accepts only `local-mock` provider IO. It has no production factory, database creation, environment credential loading, scheduler registration, wake delivery, supervisor entrypoint or live publisher import.

## 1. Exact files created and modified

Created:

- `lib/publishing/canonicalWorkerStore.ts`: bounded canonical discovery, exact publication hints, acknowledged C1 claims and read-only recovery inspection.
- `lib/publishing/canonicalWorker.ts`: inactive finite worker composition, submission/reconciliation orchestration, deadlines, shutdown and status.
- `tests/helpers/canonical-worker-fixture.cjs`: synthetic canonical jobs, mock providers, temporary spool and journal/eligibility fault injection.
- `tests/helpers/canonical-worker-process.cjs`: isolated child worker with real COMMIT/SIGKILL checkpoints and fsynced synthetic provider-effect trace.
- `tests/publishing-canonical-worker.integration.test.cjs`: PostgreSQL lifecycle, contention, acknowledgement loss, crash/restart and shutdown scenarios.
- `tests/publishing-canonical-worker.test.cjs`: connection-free construction, bounds and inactive-only validation.
- `tsconfig.publishing-canonical-worker.json`: isolated no-emit checking of the new composition and earlier contracts.
- `docs/publishing-stage-4c5-durable-worker-integration.md`: this report.

Modified:

- `lib/publishing/canonicalStore.ts`: optional validated `preparedLeaseMs`, maximum three minutes. Original three-minute default retained; only the duration parameter of the existing preparation UPDATE changes. The immutable tuple, token replacement, eligibility locks and audit protocol are unchanged.
- `lib/publishing/validationAdapters.ts`: pass an optional preparation-duration setting into its canonical-store factory. Existing zero-argument behavior is retained.
- `lib/publishing/capabilityProviders.ts`: optional AbortSignal; guard each next injected provider operation. Already completed/in-flight provider responses still pass through durable journaling. Existing callers without a signal retain the Stage 4C.4 behavior.
- `tests/helpers/authorization-fixture.cjs`: additional real lost-acknowledgement injection for a canonical prepare transaction, alongside existing authorization/consumption injections. It pauses socket reads before COMMIT, observes that specific operation on another connection and destroys the unread socket.

No packages, schema scripts, Prisma schema/migration, old reliable worker/store/admission/batch/portable-runtime modules, worker build allowlist, normal-worker entrypoints, application routes, Netlify functions/configuration or production credentials changed. Pre-existing unrelated workspace modifications were retained.

## 2. Inspection and confirmed compatibility findings

Read local Stage 3A/3B/4A and 4C.1–4C.4 reports and reviewed their implementations, proposal schemas and test contracts. Reviewed `reliableAdmission.ts`, `reliableStore.ts`, `reliableWorker.ts`, `batchScheduler.ts`, `reliableConsumer.ts`, `platformIntegration.ts` and `portableRuntime.ts` for lifecycle/claim/shutdown assumptions. Prior suites were rerun against the local changes.

**Unavailable source:** no standalone Stage 4B report was found in the local repository, including an ignored-file search for stage-4b/4B and audit paths. Its full earlier integration inventory could not be reread. This report does not invent that inventory; the confirmed dormant-code conflicts below come from the current local source. Stage 4C.6 should retrieve/reconcile the accepted Stage 4B map before route/cutover work.

| Existing module/path | Confirmed incompatibility | Inactive resolution / later gate |
|---|---|---|
| `reliableAdmission.runReliableAdmission` and store admission | Builds publishing jobs from scheduled CalendarPost state, mutating legacy publishing/timestamp claims | Discover already-created canonical jobs and acknowledge them using C1. Do not run both admissions for a canonical post. Legacy import is not implemented. |
| `reliableStore.prepareMany`, `recoverPrepared`, `releasePrepared` | Requires CP PUBLISHING and timestamp equality; recovers caller tokens and expires prepared leases through raw job UPDATEs | C1 transactions validate immutable bindings and assign a fresh token only after acknowledged prepare COMMIT. Lost claim acknowledgement waits for lease expiry and a new audited claim. No generic release/reset UPDATE. |
| `reliableWorker.beginExternal` recovery | May infer an external boundary from read-back phase/token and call its external callback | C3 fresh acknowledged capability is mandatory. Read-back never yields permission to send. |
| `reliableStore.reject`, `recoverExpired`, rejected-retry helper | Can reset READY/mutate timestamp leases, or perform job-only cancellation/unknown changes without canonical attempt audits | Never invoke on canonical jobs. Reuse C4/C3 for outcome projections and Stage 4A actions for cancellation/rescheduling/evidence-approved new generations. |
| `platformIntegration` | Requires CP PUBLISHING/updatedAt match, composes native entrypoints and optional execution-context hooks | Use C4 protected mock ports. No native publisher/global-fetch fallback in this worker. |
| `batchScheduler`, old batch preparation | Fairness/budget/dispatch logic assumes legacy claims; old prepareMany does not append canonical audit records | Bounded hint discovery plus individual C1 admission/prepare transactions. No second batch claim authority. Shared database budgets, account rate coordination and fair batches need a reviewed canonical bridge in 4C.6. |
| `portableRuntime` | Old store interface, consumer leases, heartbeat, wake delivery and recovery/reset protocol | Preserve the bounded lifecycle idea through explicit `pollOnce`, finite `drain`, `close`; do not instantiate that old runtime or its scheduler/consumer. Wake hints/consumer leases must not substitute for PublishingOwnership. |

These are confirmed source findings, not claims about deployment or current production traffic. The new worker is not a drop-in implementation of the old `ReliablePublishingStore` interface. It resolves the conflicts inside its inactive composition and intentionally leaves live/dormant legacy pathways unchanged.

## 3. Worker lifecycle and states

`createInactiveCanonicalWorker` is connection-free and timer-free at construction. Trusted dependencies supply an existing transaction port, C2 validators, a C4 spool, mock IO and a fixed worker actor/owner/epoch. Caller mutation cannot retarget the copied owner/epoch. Creating it does not start a scheduler or worker.

Public operations:

- `run(exactHint)`: at most one bounded attempt for a full immutable target; never accepts a legacy timestamp lease or caller provider payload.
- `recover(exactHint)`: reconciliation only. Even a READY job passed here cannot publish.
- `pollOnce(limit)`: discover bounded DB hints, reconcile unresolved work and claim eligible fresh work. Hints are not authority; every claim rechecks in PostgreSQL.
- `drain({durationMs,maxRounds})`: explicit finite polling, at most 60 seconds and 100 rounds. A job’s timeout is reduced to the remaining drain budget. No recurring timer, HTTP wake or scheduler is registered.
- `close()`: stop new work immediately; allow a bounded grace interval, then abort cooperative continuations. Returns `quiescent` and `pendingOperations` rather than falsely claiming all external work stopped.
- `status()`: local capacity, stop state and outstanding raw operations.

Default local concurrency is two, maximum three; job timeout defaults to 30 seconds, maximum 60 seconds; shutdown grace defaults to five seconds, maximum ten. Discovery is at most five hints per category and the worker narrows it to available local slots. Individual DB transactions retain the existing statement/lock timeouts. Polling DB calls must also use a pool with bounded connection acquisition; the synthetic helper does. Drain duration is a cooperative job budget, not a guarantee that an already-started PostgreSQL statement finishes exactly at that millisecond.

| Phase | Worker behavior / transition authority |
|---|---|
| READY | C1 admission inserts/reuses immutable execution; C1 prepare commits a fresh claim/token. CP may remain SCHEDULED. |
| PREPARED | C4 media preparation outside transactions; C3 revalidation and fresh authorization. An expired unsent claim may receive a new audited C1 token. |
| EXTERNAL_PENDING | Authorization committed. Fresh in-process capability can be consumed once and submitted. Recovery does not restore it. |
| PROVIDER_PENDING | C4 recorded acceptance. Read-only provider status lookup may confirm; no create/init. |
| OUTCOME_UNKNOWN | Reconciliation only; no automatic retry, READY reset or replacement capability. |
| CONFIRMED | Historical confirmation returned without a provider call. A repost requires a new explicitly authorized intent. |
| REJECTED | Historical rejection returned. Successor publication requires Stage 4A trusted evidence, approved new revision/generation and C3’s separate authorization. |
| CANCELLED | No claim/submission. Historical revision/job/evidence preserved. |

Eligibility denial before authorization leaves unsent work and history intact; it does not fabricate a provider rejection or trusted no-send proof. Cancellation/edit/rescheduling remain Stage 4A operations. The worker does not write CalendarPost UI status or timestamp fields.

Worker result labels describe the call outcome, not a new durable state machine. Once authorization begins, an exception/deadline is reported conservatively as `outcome-unknown`; that local marker proves neither COMMIT nor submission. Durable phases remain authoritative. In particular an ISSUED or REVOKED authorization may remain EXTERNAL_PENDING/AUTHORIZED while the worker reports unresolved uncertainty. It is not downgraded through an unaudited job-only UPDATE.

## 4. Canonical identity, authorization and ownership

Each hint preserves `(intentId, revision, generation)`, immutable job ID, platform, account binding/version, provider account, connection and content hash. Store inspection compares the whole target against the canonical database record. It never interprets CP.updatedAt, job legacy lease or CP PUBLISHING as authorization.

Discovery checks enabled PublishingOwnership state/epoch before fresh work. C1 independently takes ownership SHARE, current eligibility fence/post/account locks, current intent and job locks, due time and invalidation checks. Competing workers may discover the same hint; C1’s locked preparation transaction grants only one live claim. There is no additional send-claim table or independent publishing authority.

Provider preparation has no send grant. The worker invokes C3 with the exact claimed token/target and fixed epoch. C3 repeats current eligibility/ownership/account/content validation, appends its current-transaction witness and atomically commits attempt/generation, EXTERNAL_PENDING job, capability and audit. Only a newly acknowledged COMMIT yields a capability; the worker never calls `recover` on that authorization to obtain one.

C4 transport consumes that exact capability through C3’s second transaction, rechecks ownership and policy, and guards the next provider operation. C4 journals the response before optional reporting/permalink work and projects it through C3. Acceptance is distinct from confirmation; the TikTok worker test stays pending until PUBLISH_COMPLETE. Media processing, preparation receipts and submission markers prove no provider delivery.

DRAINING/stale epochs stop fresh claims/authorization/consumption; already-authorized external work may remain unresolved. A VPS epoch can reclaim only expired **unsent** PREPARED work using a new token. Any external attempt blocks generic takeover/retry through the existing ownership/generation constraints. Read-only reconciliation of historical provider references can continue while DRAINING. The worker never switches its configured epoch automatically.

The durable authorization COMMIT is the conservative cancellation boundary, capability consumption COMMIT reserves one invocation, and actual typed provider request initiation crosses the physical irreversible boundary. None of these can be made atomic with the remote provider. A request already initiated cannot be revoked atomically by shutdown, permission changes or ownership transition.

## 5. Crash, shutdown and recovery behavior

| Interruption | Restart behavior |
|---|---|
| During claim transaction | Uncommitted work rolls back; an ambiguous acknowledgement yields no usable claim token. |
| After claim / during media preparation | PREPARED lease remains; after expiry C1 revalidates and assigns a fresh token. A suspended old actor cannot authorize with its obsolete token. |
| After authorization COMMIT / lost authorization ACK | Existing ISSUED authorization is unresolved. No capability restoration, replacement mint or resend. Trusted actor-fencing/evidence resolution is required. |
| After consumption COMMIT / lost consumption ACK | Capability remains CONSUMED; no provider call is granted by read-back. After the job lease expires, no-reference C4 reconciliation projects UNKNOWN. |
| Provider effect occurred but response lost | UNKNOWN/no-reference remains quarantined. Status search by caption/time is not invented; no automatic resend. |
| Provider response captured but DB journal/projection fails | Fsynced C4 spool retains known ID. After expiry, DB recovery imports/project evidence without creating a post. |
| Crash after durable journal | Recovery returns/projects confirmation or acceptance from evidence; no new provider create. |
| Graceful close during settled request | Response is still durably journaled/projected. No new job starts. |
| Deadline/forced close during preparation | Public operation returns within its deadline; aborted continuations cannot call the next provider operation or authorize after a worker checkpoint. |
| Deadline/forced close during already-started provider call | Public result is conservative; `quiescent:false` reports the outstanding raw task. Late response can still be journaled. No local capacity slot is freed until the raw task settles, avoiding unbounded orphan IO. |

A timeout/close/process exit alone is **not** trusted NOT_SENT evidence or proof that an old actor stopped. There is no automatic retry-generation allocation in this worker. Verified retry approvals remain Stage 4A’s durable evidence protocol. The approved-generation test retains its root predecessor and creates a second unique capability for generation 2.

C4’s optional AbortSignal guards each next trusted IO-port invocation, including the exact create/init boundary. It does not discard an already received response. It cannot cancel a provider request that was already initiated, and cannot enforce timeouts inside a malicious/unbounded injected port. Live ports will need explicit bounded HTTP/media IO and supervisor-level stopping. A non-quiescent shutdown must never be treated as permission to activate a replacement sender or declare safe no-send.

## 6. PostgreSQL schema and transaction guarantees

**No schema changes or new migration in 4C.5.** Synthetic fixtures load the existing seven local proposals: base schema, ownership, intent actions, canonical, eligibility, authorization and provider journal. Short claim durations are a bounded service option, not rewritten database clock/history or disabled triggers.

All mutations reuse C1/C3/C4 services. Poll and recovery inspection are read-only DB transactions. Claim admission and preparation are separately committed audited C1 operations; provider preparation and external IO occur outside DB transactions. A lost preparation acknowledgement is not replayed into token authority; recovery waits for natural DB lease expiry and commits a new claim.

READ COMMITTED, UTC, scoped parameterized queries, original lock ordering, top-level transaction-ID/xmin audit checks and deferred commit constraints remain mandatory. No nested transactions, savepoints, callback retries or raw job status/reset updates are introduced. Exact generation/account constraints and immutable attempt/reference/history preservation are exercised by the earlier suites. Concurrent journal/reconciliation projections use C4’s idempotent event keys; they cannot mint a capability.

Reconciliation is externally read-only but may append journal evidence/project durable outcome through the existing services. It never creates provider posts. The current composition does not add a cross-host reconciliation lease; competing read-only reconciliations may duplicate lookups and safely conflict on terminal evidence. Rate budget and reconciliation coordination are Stage 4C.6 dependencies.

## 7. Verification

Synthetic PostgreSQL only, TCP disabled, private owner-only Unix socket directories. Provider calls were in-process mocks. Child worker tests receive only explicit private fixture paths/socket/schema; no application credentials or live provider client are loaded.

The archive came from the official PostgreSQL 17.6 source directory and was verified against its official SHA-256 **before extraction/build**. A mismatch aborts the build:

`e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`

Build/source/prefix: `/private/tmp/showwork-postgres17-build`; no system installation or service. Final result/cleanup record follows below.

Commands:

```sh
npx tsc -p tsconfig.publishing-canonical-worker.json --noEmit
node --test tests/publishing-canonical-worker.integration.test.cjs
SHOWWORK_TEST_CANONICAL_SCHEMA=1 node --test --test-concurrency=1 \
  tests/publishing-ownership.integration.test.cjs \
  tests/publishing-ownership-process.integration.test.cjs \
  tests/publishing-intent-actions.integration.test.cjs \
  tests/publishing-canonical.integration.test.cjs \
  tests/publishing-validation.integration.test.cjs \
  tests/publishing-authorization.integration.test.cjs \
  tests/publishing-providers.integration.test.cjs
node --test tests/publishing-canonical-worker.test.cjs \
  tests/publishing-ownership.test.cjs tests/publishing-retry-policy.test.cjs \
  tests/publishing-eligibility-policy.test.cjs tests/calendar-team.test.cjs \
  tests/worker-build.test.mjs tests/worker-lifecycle.test.mjs
```

Coverage: competing polling workers, local capacity/duplicate hints, stale tuple/account/hash/epoch, due time despite legacy timestamp/status changes, legacy job exclusion, real lost claim/authorization/consumption acknowledgements, rollback, accepted versus confirmed, approved generation 2, uncertain response and restart, journal persistence failure/recovery, ownership draining and VPS transfer, suspended prior-claim actor, account/scope/approval/content/entitlement changes, reschedule/cancel/edit invalidation, changes after authorization COMMIT, graceful/bounded close, late evidence after timeout, finite drain, and six independent-process SIGKILL checkpoints (claim, preparation, authorization COMMIT, consumption COMMIT, submission, journal).

## 8. Defects discovered and corrected

- New store discovery row typing initially failed isolated TypeScript checking; corrected without relaxing exact hint validation.
- A 200ms timeout fixture sometimes expired before reaching provider submission; changed to a 1s deadline/3s preparation claim so it tests the intended hung-submission boundary. All final tests must pass; no skipped timing scenario.
- Explicit finite drain now passes its remaining budget to each job rather than letting the final job use a full timeout beyond the requested drain interval.
- Local capacity is retained until raw operations settle after timeout. Shutdown exposes non-quiescence; it does not silently free slots or imply that provider IO stopped.
- Renamed the in-memory classification marker to `authorizationStarted` and documented that it is not authorization, COMMIT evidence or proof of submission.

## 9. Remaining risks and Stage 4C.6 dependencies

Confirmed unresolved integration work:

1. Retrieve the accepted Stage 4B map; bridge/fence **every** live schedule/edit/approval/account/media/native publisher path before any activation. Current live entrypoints can still bypass this inactive contract.
2. Reviewed legacy scheduled-post import/adoption, UI projection compatibility and exclusion of canonical jobs from all old admission/recovery/retry paths. Canonical schema guards are not a substitute for disabling conflicting legacy execution.
3. Real provider/token/media adapters, bounded HTTP IO, immutable media retention, provider-side permission revocation, signed callbacks and trustworthy no-send evidence verification. C4 remains mock-only.
4. Deployment-grade shared journal storage, crash/power-loss/WAL recovery, observer authentication/attribution and actor-fencing procedures. The temporary synthetic spool is not a deployed journal.
5. Production authentication, database roles/RLS/grants preventing evidence forgery, trigger disabling or TRUNCATE; actual Supabase pooler/isolation/connection timeout behavior.
6. Canonical shared database budgets, account/rate coordination, fair batches, reconciliation throttling/leases and observability. Local concurrency does not prove global production capacity. Persistently policy-blocked/unknown early jobs can occupy polling priority; fair backoff needs reviewed design.
7. Ownership drain/cutover/rollback, stop-old-process checks and uncertain-attempt resolution. Expired ISSUED authorizations intentionally remain unresolved; a supervisor timeout cannot resolve them automatically.
8. Repost identity/product policies, consent delegation, original scheduler revocation/adoption and cancellation after entitlement expiry remain earlier-stage open decisions.

No exactly-once provider guarantee or production-readiness claim is made. Tests establish local database/worker invariants with synthetic mocks, not live provider behavior or deployed capacity.

## 10. Production confirmation and stopping point

No production Supabase/database, Netlify or VPS connection, live social API request, production migration, credential change, deployment or worker activation occurred. Existing live application behavior remains unchanged. Stage 4C.6 has not begun. Stop after Stage 4C.5 and wait for review.

### Final verification record

- Stage 4C.5 integration: **41 scenarios plus parent = 42/42 passed**; zero failures/skips. Six SIGKILL child checkpoints passed.
- Stage 3A–4C.4 PostgreSQL regressions: **168 scenarios plus seven parents = 175/175 passed**; zero failures/skips. Stage 4A additionally loaded the canonical proposal.
- Canonical worker units plus existing ownership/retry/policy/calendar-team/build/lifecycle suites: **61/61 passed**; zero failures/skips (four new units, 57 existing tests).
- `npx tsc -p tsconfig.publishing-canonical-worker.json --noEmit`: **passed**.
- Combined Node total: **278 passed**, including eight suite-parent tests; no final failures or skipped tests.
- Official PostgreSQL SHA-256 verified successfully before extraction/build. No real provider API was used.
- Cleanup **verified**: no disposable PostgreSQL or worker child processes remained, and no `sw-owner-*` cluster directories remained. Temporary source/archive/checksum/build/binaries/logs, clusters/sockets, synthetic spool/crash configs/traces and TAP outputs were removed. No system service or existing PostgreSQL installation was modified.
- Production remains **NO-GO and untouched**. Stage 4C.5 is complete and stopped for review.
