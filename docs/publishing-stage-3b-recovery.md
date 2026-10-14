# Stage 3B — local concurrency, crashes and recovery

Scope: synthetic data in NEW disposable local PostgreSQL 17.6 clusters. No
production/Supabase/VPS connections, no platform API, no installed infrastructure,
no route/function changes, no worker activation, no existing database migration.

## Mechanisms and corrections

Stage 3A's application API serialized authorization correctly, but raw table
writes could bypass some eligibility checks. The proposal now has:

1. BEFORE INSERT attempt guard: shared ownership lock, owner/epoch validation,
   intent lock/current revision, matching prepared due job, AUTHORIZED-only initial
   outcome and no preloaded remote reference. This also establishes lock ordering
   for raw inserts. Uniqueness still forbids a second attempt for an intent.
2. Ownership trigger: inactive activation must select NETLIFY; unresolved attempts
   and legacy durable work block transfer out of DRAINING at the SQL level too.
3. Deferred ownership audit constraint: epoch/state update cannot commit without
   its matching event. Epochs must increment by one; deletion/reuse is prohibited.
4. Deferred attempt constraint: initial authorization requires job EXTERNAL_PENDING
   in the same transaction. An outcome update requires matching event evidence
   inserted in that transaction. This uses the current transaction ID; adapters
   must use top-level transactions (savepoint/subtransaction compatibility is not
   validated and may fail closed). Native role grants still need separate review.

These are corrections to the uninstalled proposal, not applied production DDL.
An operator/table owner can still disable triggers or TRUNCATE. No runtime role
should have those capabilities. Audit rows establish what a trusted caller
recorded, not independent proof that a social API actually published/rejected.

## Integration scenarios

`publishing-ownership-process.integration.test.cjs` uses real child Node processes
with independent PostgreSQL sessions and IPC start barriers. No child can publish.
Each fixture has a fresh schema inside the private disposable cluster; TCP is
disabled. Child environment contains no application credentials. Tests execute:

1. Two independent simultaneous authorization callers: exactly one send grant.
2. Two independent conflicting transitions: one committed new epoch.
3. SIGKILL before COMMIT: authorization and job change roll back.
4. Pause client PostgreSQL reads BEFORE issuing COMMIT, verify committed row via
   another connection, SIGKILL without receiving COMMIT confirmation: recovery
   returns no send grant. This is real transport acknowledgement suppression,
   not a post-COMMIT thrown-error simulation.
5. Terminate the PostgreSQL backend during an uncommitted authorization: no grant,
   no durable attempt. This tests actual connection loss on a Unix socket.
6. Stale Netlify process after transfer to VPS: fenced.
7. Stale VPS process after transfer back to Netlify: fenced.
8. Unresolved attempt prevents transfer, with no partial epoch/event update.
9. Three independent requests after lost acknowledgement: no resend grant.
10. Rolled-back attempt followed by fresh authorization: exactly one committed attempt.
11. Recovery of CONFIRMED, REJECTED and UNKNOWN (three separate fixtures): never
    grants resend; references/state retained.
12. Synthetic cancellation, prohibited evidence/job deletion and transaction
    rollback: evidence survives. No application cancellation behavior is changed.
13. Failure after ownership UPDATE but before audit insertion: full rollback.
14. Raw SQL epoch reuse, missing audit, bad owner/epoch/job/outcome, missing job
    boundary, unaudited outcome and unresolved transfer: rejected independently
    of application validation.
15. Ownership transition waits on an authorization transaction's shared lock;
    after authorization commits, DRAINING succeeds but takeover remains blocked.

This is 17 scenarios (item 11 runs three). The Stage 3A integration suite is also
rerun against the strengthened schema. These are correctness tests, not throughput
benchmarks or proof of Supabase/PgBouncer behavior. No external publication occurred.

## Safe retry-generation proposal (not a schema migration)

The current UNIQUE(intentId) intentionally blocks ALL further attempts, including
potentially safe retries. Do not weaken it until an explicit generation protocol
is approved. `lib/publishing/retryPolicy.ts` tests decision logic only:

| Previous state | Decision |
| --- | --- |
| Verified NOT_SENT, actor stopped, durable evidence | May propose next generation |
| Definitive REJECTED, retryable, actor stopped, explicit approval and evidence | May propose next generation |
| CONFIRMED | New explicitly authorized intent for repost; never retry old attempt |
| AUTHORIZED, ACCEPTED, UNKNOWN | Reconciliation only, even with override flags |
| Missing/contradictory evidence or invalid generation | Deny |

NOT_SENT must be stronger than a timeout, missing reference, process exit or
absence from a lookup. If no authorization transaction committed and no external
call was possible, a fresh initial authorization is safe (tested). After boundary
commit, a crash remains uncertain unless transport/operator evidence proves no
send AND the old actor can no longer send. A boolean from a client request is not
such proof. Definitive rejection must exclude delayed accepted operations and
ambiguous transport failures. TikTok ACCEPTED is never CONFIRMED or retryable init.

Future schema proposal:

- Add monotonically increasing attempt generation and predecessorAttemptId.
- UNIQUE(intentId,generation) plus unique successor/predecessor linkage.
- Immutable retry-approval record: evidence reference, reason, actor, operation ID.
- Track one current/open attempt per intent; immutable earlier attempts remain.
- Under the intent lock, validate prior terminal evidence, actor fencing,
  cancellation/approval/account state and idempotent retry operation; append next
  generation and approval atomically. Concurrent approvals produce one generation.
- Replace UNIQUE(intentId) and UNIQUE(jobId) only with this tested protocol; retain
  unique job-per-intent-revision and relate its multiple attempt generations.
- Reposting requires a separately modeled new authorized intent, not a revision
  trick. Current unique post/platform rule also needs an explicitly reviewed repost
  identity design (or a new post). No constraints are relaxed in Stage 3B.

The pure tests prove decisions and preservation of prior input; they do NOT prove
future generation allocation under PostgreSQL concurrency because it is unimplemented.

## PostgreSQL guarantees versus operational controls

PostgreSQL can serialize ownership and authorization, reject stale epochs, prevent
duplicate durable identities, atomically commit evidence, and roll back uncommitted
transactions after process/backend loss. Recovery of committed data is authoritative.

It cannot atomically couple COMMIT to a remote social API request. An authorized
actor can be paused after commit and send later, even after DRAINING begins. The
global unresolved-attempt barrier blocks the next owner, but a false operator
resolution could remove that protection. Stop/drain old actors, verify outcomes,
and never treat local timeout/cancellation as proof of no external effect.
Exactly-once external publication is not claimed; provider-supported idempotency
or trustworthy reconciliation is required wherever available.

Unverified: production role/RLS/function privileges, pooler transaction semantics,
TCP partitions/TLS failures, host power loss/WAL recovery, process termination while
media/provider work runs, live permission/token races, five-backend capacity under
production latency, and legacy CalendarPost-only work. All current publishers must
eventually share the guard; this isolated module protects none of them today.

## Verification commands

Local verification completed: 17/17 Stage 3B PostgreSQL scenarios, 7/7 Stage 3A
PostgreSQL scenarios, 4/4 ownership unit tests, 4/4 retry-policy tests and 10/10
worker-isolation tests passed. Typechecks, worker build and connection-free check
passed. Final Stage 3B scenario group took approximately 30.8 seconds (not a
publishing throughput measurement). Node's runner additionally counts the parent
integration test, reporting 18 and 8 tests respectively. No final test failures.

```sh
npm run test:publishing-ownership
npm run test:publishing-retry-policy
npm run typecheck:publishing-ownership
npm run test:publishing-ownership-integration
npm run test:publishing-ownership-process
npm run test:worker-build
npm run worker:build
npm run worker:check-built
```

No packages are installed. The already available PostgreSQL binary is used only
with new temporary data/socket directories. Restricted sandbox execution may need
approval for PostgreSQL shared memory/process creation. Cleanup stops the cluster
and removes synthetic data. The normal worker still exits 78; --check connects
nowhere. Stop after Stage 3B: production remains NO-GO.
