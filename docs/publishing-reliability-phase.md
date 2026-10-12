# Publishing reliability phase — staging result

**NO-GO for production. GO for the next staging integration step.**
No production scheduler/worker/configuration was modified, no production credentials
were activated, and no infrastructure was deployed. This phase adds a separate,
unwired publishing candidate; its SQL proposal was applied only to disposable staging.
No diagnostic infrastructure was expanded.

## What changed

- **Database-backed leadership and fencing:** one owner admits per database minute.
  Duplicate invocations skip. Each claim transaction verifies owner/epoch/expiry;
  a replaced owner cannot commit new claims. Leadership uses durable rows rather than
  a connection held for the whole function or a process-local mutex.
- **Global publishing data budget:** two admission slots plus two worker slots;
  workers may borrow idle admission capacity after leadership is released. One of
  the five pooled connections remains available for short coordination queries.
  Slot allocation is conditional and nonblocking. Transaction-level advisory locks
  protect active slots even if their reservation lease expires. This works with
  transaction pooling; it does not depend on session advisory locks.
- **Atomic claim/outbox:** exact claimed IDs/leases and READY job records commit
  together. A lost admission acknowledgement is resolved by reading durable facts.
  A crash before worker dispatch leaves an observable READY job, not an orphaned claim.
- **Separated recovery states:** READY → PREPARED → EXTERNAL_PENDING → CONFIRMED.
  Expired PREPARED can be resumed because no publish request is allowed in that state.
  An expired or failed EXTERNAL_PENDING becomes OUTCOME_UNKNOWN and is never reset
  for automatic publishing. Reconciliation can read an existing provider result;
  a missing/uncertain result remains quarantined.
- **Worker control:** the same live attempt can reconcile a lost preparation/boundary
  acknowledgement before making its first external call. Confirmation retries are
  database-only. Workers load the canonical post/platform/lease from the stored job
  ID rather than trusting caller-supplied envelope fields. Provider timeout and shutdown abort are treated as uncertain outcomes,
  including when the provider ignores cancellation. New work is refused on shutdown;
  in-flight confirmation drains, or stalled requests are quarantined after grace.
- **Fairness and visibility:** rotated platform rounds, bounded retries for transient
  DB failures, visible errors/deferred counts and durable backlog counts/age. Provider
  I/O holds no database slot. A busy platform leaves its next job durable instead of
  occupying a worker lifecycle slot. Existing/uncertain jobs block a new automatic
  claim even if the CalendarPost status is reset to SCHEDULED.

This candidate is not imported by the current Netlify handler or existing publishing
worker. Their approval, consent, paid-access, media, provider and recovery implementations
remain unchanged. The new worker's provider callback is a staging seam; integration
with those real implementations is still required before release.

## Evidence

PostgreSQL **17.6**, strict local TLS, fsync enabled, synthetic fixtures, Prisma **5.22.0**.
All provider calls were stubs. No hosted/current production measurements are claimed.

**Independent-process budget test:** four separate Node processes held four real
transactions for 1,800 ms. PostgreSQL reported exactly five connections to the staging
publishing database, including coordination. A fifth data operation was deferred.
After forcibly expiring reservation timestamps, active advisory-protected slots were
still not stolen. Capacity recovered after the processes exited. No shared JavaScript
semaphore was used to enforce those four processes' data slots.

**Overlap/failure tests:** duplicate scheduler owners, durable claim replay, lost commit
acknowledgements at admission/preparation/external-boundary/confirmation, full coordinator
outage, worker DB outage before preparation, stale preparation recovery, crash at the
external boundary, leadership replacement, shutdown and unknown-result reconciliation
passed. The final network-latency run recorded **zero unexpected Prisma transaction
errors**, zero control errors in its workload matrix and zero duplicate provider calls.
Actual process-kill tests also passed: the scheduler was SIGKILLed after durable
commit and before dispatch; a worker was killed before the external boundary and
restarted in a fresh process; another worker was killed after the fake provider
persisted acceptance but before confirmation. The pre-boundary job resumed once;
the post-boundary job was quarantined and confirmed only by reading the existing
fake provider result. Lease expiry was accelerated in staging. No real API was used.
Unknown outcomes did not issue a second publish. Resetting the post's status did not
create a second durable job while the prior outcome was unresolved.

**Latency model:** 1,923 ms injected per publishing data transaction and **320 ms per
coordination/read roundtrip**, with the sleeps holding actual pooled staging connections.
The 320-ms value is a modeling assumption, roughly the per-roundtrip cost consistent
with a 1.3-second four-roundtrip transaction; it is not independently measured production
network latency. Actual native query work and pool waits are included in elapsed time.

| Balanced due posts | Admitted per cycle | Measured admission runtime |
| --- | --- | ---: |
| 10 | 10 | 8.46 s |
| 25 | 25 | 8.44 s |
| 50 | 50 | 8.46 s |
| 100 | 100 | 16.24 s |
| 250 | 200, then 50 | 16.22 s, then 8.43 s |

The 15-second window stops starting new admissions; already-started work/cleanup can
finish afterward. These modeled runs remain below the separate 27-second candidate
finish target, but there is no current hosted cold-start certification. With actual
minute ticks, last admission for the 250-post burst is **estimated** around 68.4 seconds
from the first tick, plus up to a minute if work becomes due just after a tick.
Provider processing is additional.

Under a hot Instagram backlog and repeated mixed arrivals, all four other platforms
received five admissions on each tested arrival cycle. Instagram received 80 per cycle
in the full coordination-latency model. The remaining hot backlog drained in a subsequent
cycle; it was not discarded. Cycles were accelerated tests, not actual minute scheduling.

**Worker capacity is a remaining concern:** ten synthetic jobs drained in **53.24 seconds**
under the same conservative DB/coordination model and a 100-ms fake provider delay,
including concurrent admission. This single worker instance has two lifecycle slots.
All ten confirmed exactly once; capacity deferrals stayed durable. Extrapolating that
single-instance result gives roughly **22 minutes for 250 jobs**; this is only an estimate,
not a tested 250-job worker run or a prediction for real provider performance. It shows
that admission throughput alone cannot establish timely publishing. More worker instances
still share the global DB budget and cannot be assumed to improve throughput linearly.

## Remaining blockers

1. **Real-worker integration:** all publishing DB operations, including existing token,
   content, consent, entitlement and reporting reads/writes, must participate in the
   same budget. Existing helpers currently use their own database access. The staging
   provider seam cannot replace the existing worker as-is: its ownership boundary and
   native worker guard must be integrated deliberately without double-claiming.
2. **Timeliness:** the measured worker cost is too high to certify peak publishing
   accuracy. Reduce safe worker-state/coordination roundtrips and validate batched
   preparation/confirmation where possible; keep the final external-call ownership
   boundary and uncertain-outcome quarantine. Retest the full 250-job path.
3. **Deployment-wide pool enforcement:** durable global *data-slot* coordination passed.
   A shared five-connection pool and a five-connection independent-process fixture passed.
   Netlify instances each have their own client pools; a client connection_limit is not
   a server-wide cap. The target transaction pooler/backend budget must be verified with
   independent, realistically scaled clients and unrelated application pressure. No
   production pooler configuration was inspected or changed in this phase.
   [PgBouncer documents backend pool limits separately from client limits](https://www.pgbouncer.org/config.html).
4. **Durable consumer/cutover policy:** bounded fair Netlify consumers must resume READY
   work after wake-up loss/crashes; the VPS can run the same consumer continuously.
   Validate cancellation, edited/stale leases, explicitly authorized reposts, existing
   TikTok accepted-operation reconciliation and legacy in-flight jobs. The conservative
   candidate currently blocks a second automatic intent for an already-associated post;
   a reviewed explicit intent/cancellation policy is required for legitimate reposts.
5. **Hosted/Supabase evidence and release controls:** actual hosted cold starts, production
   query/index behavior, provider cancellation/reconciliation contracts, monitoring and
   schema/permission/cutover/rollback review remain pending. No production migration or
   activation is authorized. Unknown provider outcomes always require reliable existing-
   result confirmation or operator reconciliation; “not found” is not permission to retry.

**Exact next step:** build a **staging-only Netlify worker/consumer integration** using
mocked platform HTTP endpoints and the existing platform validators/providers, route
every worker DB operation through the global budget, reduce safe state-write overhead,
and run the complete 250-job path through a transaction pooler capped at five backend
connections. Include crash/restart, wake loss, consent/approval changes, cancellation,
reposts and TikTok recovery. Reuse that same consumer for the future VPS. This is an
integration/reliability step, not another diagnostic-infrastructure phase or a deployment.

## Files and checks

Added: `lib/publishing/reliableStore.ts`, `reliableAdmission.ts`, `reliableWorker.ts`;
`scripts/publishing-reliability/schema.sql`, `assess.cjs`, `budget-actor.cjs`,
`global-budget-assessment.cjs`, `job-actor.cjs`, `job-crash-assessment.cjs`;
`tests/publishing-reliability.test.cjs`; this report.
No production entry point, existing scheduler/worker, Prisma schema, billing/payment
or notification file was edited. The SQL file is a proposal, not an installed migration.

Repository suite: **452 tests passed**; TypeScript no-emit and whitespace checks passed.
Final staging smoke, full network-latency assessment and independent-process budget
and actual process-crash assessments passed and removed their synthetic clusters. The timeout/abort fault tests
use shortened timers; full provider durations/cancellation are not certified by them.

Evidence: `/tmp/showwork-publishing-network-latency-results.json`,
`/tmp/showwork-publishing-reliability-smoke-results.json`,
`/tmp/showwork-global-budget-results.json`, `/tmp/showwork-worker-latency-results.json`,
`/tmp/showwork-durable-crash-results.json`, `/tmp/showwork-reliable-final-tests.log`.

```sh
node --test tests/*.test.cjs
npx tsc --noEmit --incremental false
SHOWWORK_POSTGRES17_ROOT=/path/to/postgres17 node scripts/publishing-reliability/assess.cjs --network-latency
SHOWWORK_POSTGRES17_ROOT=/path/to/postgres17 node scripts/publishing-reliability/global-budget-assessment.cjs
SHOWWORK_POSTGRES17_ROOT=/path/to/postgres17 node scripts/publishing-reliability/job-crash-assessment.cjs
SHOWWORK_POSTGRES17_ROOT=/path/to/postgres17 node scripts/publishing-reliability/assess.cjs --worker-latency --network-latency
```
