# Publishing consumer: staging-only assessment

Production remains **NO-GO**. No deployment, production credential activation,
production query or live publishing change is authorized or performed.

## Candidate architecture

The scheduled admission transaction writes the claim and its durable job together.
A wake-up is only a hint; the job table is the queue authority. The host-independent
consumer selects the oldest eligible job on each platform in a rotating order.
Conditional preparation and the external boundary recheck the exact post lease,
approval, AI-draft exclusion and ownership token. Provider work runs outside a
database transaction. Cancellation takes the same job-row lock as the external
boundary, so only the side that commits first can proceed.

```
READY -> PREPARED -> EXTERNAL_PENDING -> CONFIRMED
                   |                 -> PROVIDER_PENDING -> CONFIRMED
                   |                 -> OUTCOME_UNKNOWN  -> CONFIRMED
                   -> CANCELLED
```

`PROVIDER_PENDING` means an accepted operation, not a published post. Neither it nor
`OUTCOME_UNKNOWN` returns to READY automatically. Reconciliation reads an existing
provider operation/result and never creates a post. A lost acknowledgement is
resolved from committed state using the same token; storage retries do not repeat
the external operation. Expired PREPARED work can resume because no external call
is allowed in that state. Termination after the external boundary requires
reconciliation, even if the process might have died just before making its call.

The staging adapter factory is outside `netlify/functions` and has no registered
route. It requires an injected staging authenticator, accepts an empty POST only,
rejects caller-selected jobs, SQL and destinations, and drains its worker before
returning. Its default work deadline is ten minutes. It is a foundation for an
eventual background function, not a deployed or production-complete Netlify entry
point. A VPS supervisor can call the same consumer core; the VPS is still unset up.

## Global connection budget and writes

The retained default is **three global data operations**, enforced by shared database
slot rows and transaction-scoped advisory locks across independent clients and
processes. Admission reserves two lanes; workers borrow those lanes only when no
admission leader is active. Two of the five backend connections remain available
for coordination. Lease expiry cannot reclaim a slot while its original transaction
still holds its advisory lock. All participants must use the same budget policy.

Disposable PgBouncer 1.26.0 runs in transaction mode, with pool size, maximum database
and user connections set to five and no reserve pool. A synthetic non-superuser
backend role also has PostgreSQL CONNECTION LIMIT 5. Client certificate verification
is strict and server-side TLS uses verify-full against the disposable local CA.
The localhost trust authentication fixture is **not** a production authentication
configuration. No production secrets are supplied to it.

Five platform queue selections now share one control query instead of five queries.
Successful guarded confirmation avoids a redundant read-back; ambiguous commits
still require one. There are no per-post heartbeat/progress writes. Preparation,
external-boundary and confirmation writes remain for recovery and auditability;
global slot reservation/release also remain. A write-saving variant that reserved
slots only inside interactive transactions failed sustained load: unsuccessful
contenders occupied pool capacity before obtaining a slot. It was rejected and
the pre-transaction reservations restored. This phase does not claim a measured
reduction in total write volume. Empty admission-ledger writes and further batching
remain potential optimizations after the correctness blockers are resolved.

## Measurement method

The 250-post test uses actual PostgreSQL 17.6 transactions and a real PgBouncer
transaction pooler, four independent Prisma clients, overlapping admission and two
consumer loops. The production-realistic stress profile injects **1,923 ms per data
transaction** and **320 ms per control transaction**, holding actual connections.
These are artificial delays, not measurements of production networking or hosted
cold starts. One-minute admission ticks use actual elapsed time. Each consumer work
slice has a ten-minute admission deadline; subsequent local slices simulate later
wake-ups rather than actual Netlify invocations.
The capacity runner explicitly permits four local lifecycle tasks per consumer,
while the shared database gate permits only three reserved data transactions.
The worker factory's conservative default remains two local lifecycle tasks;
benchmark throughput must not be assigned to a different concurrency configuration.

All fetch calls in the social contract fixture are intercepted in-process and have
no network fallback. Existing Facebook, LinkedIn and X text-post helpers, Instagram
single-photo helpers and TikTok photo-init/status helpers execute unchanged. TikTok
settings, scopes, caption and consent-hash helpers run on synthetic values. The
test does not execute the full production worker or its database-dependent account,
subscription, token-refresh, throttle, media-conversion and reporting integrations.
No sensitive records or actual social tokens are used.

## Results

All timings below are local wall-clock measurements with injected latency and
mock APIs, **not production or hosted measurements**. The job and post status
queries independently verified 250 confirmations and 250 PUBLISHED statuses;
admitted posts alone were never counted as published. Each platform completed 50.

| Retained three-slot budget | 1,380 ms data latency | 1,923 ms stress latency |
| --- | ---: | ---: |
| Time to admit all 250, from test start | 66.97 s | 72.57 s |
| Time to finish all 250, from test start | 637.48 s (10m 37s) | 780.70 s (13m 01s) |
| Maximum mock publishing delay, approximate fixture-offset estimate | 645.09 s (10m 45s) | 787.75 s (13m 08s) |
| Database errors | 0 | 0 |
| Duplicate provider-adapter attempts | 0 | 0 |
| Maximum reserved data transactions | 3 | 3 |
| Client backend peak | 5, separately measured | Counter included maintenance processes; client peak not separately measured for this run |
| Operation wall-clock p95, including injected delay | 1,398 ms | 1,941 ms |
| Longest measured operation | 2,031 ms | 2,289 ms |

The stress run independently observed all 250 confirmations/status updates, no
duplicate adapter attempts and zero database errors, but its overall runner result
is **failed**, because the initial
monitor counted every `pg_stat_activity` row, including maintenance workers, against
the five-client limit. Its raw peak was six. That result is not labelled a passing
connection-cap test. The subsequent 1,380 ms run distinguished client backends from
maintenance processes, measured a five-client peak, and passed every assertion.
The synthetic backend role is separately verified non-superuser with connection
limit five. The original tail-run artifact was subsequently overwritten by an
interrupted comparison. Its timings above are retained from captured tool output,
are **provisional**, and must not be treated as a passing reproducible cap test.
Interruption cleanup was fixed and tested to preserve completed artifacts and
remove its synthetic cluster. A correctly instrumented repeat at tail latency
remains required.

Four reserved operations were rejected: all 250 eventually confirmed in 640.80 s,
but nine `P2028` errors occurred. The budget was reduced to three. Capacity comparisons
are not production guarantees or acceptable publishing-delay commitments.

The lock-only, write-saving variant was also rejected: it completed 250 mock
publications in 613.74 seconds with **102 P2028 errors**, zero duplicate adapter
attempts and a five-client backend peak. Its callback data counter reached five;
expired Prisma callbacks can outlive their rolled-back transactions, so that
counter is not proof of five simultaneously held database locks. The transaction
errors alone are sufficient to reject the variant. The retained implementation
reserves a slot before opening an interactive transaction.

The valid warm run's longest admission invocation took 15.62 seconds, leaving
14.38 seconds of the user's 30-second scheduled-function budget **before unmeasured
hosting cold starts and other overhead**. The longest local consumer slice took
606.11 seconds, leaving about 294 seconds of Netlify's 900-second background limit.
These local margins do not establish hosted safety. In-flight work can finish after
the admission deadline; the adapter also requests shutdown at its work deadline.

Raw reviewable evidence: [valid warm 250-post run](assessments/publishing-consumer/warm-250.json),
[rejected four-slot run](assessments/publishing-consumer/rejected-four-slot-250.json),
[rejected lock-only run](assessments/publishing-consumer/rejected-lock-only-250.json),
[workflow checks](assessments/publishing-consumer/workflows.json),
[actual process termination](assessments/publishing-consumer/process-termination.json),
[continuous arrivals](assessments/publishing-consumer/continuous-arrivals.json),
[independent-process budget](assessments/publishing-consumer/global-budget.json),
and [automated test output](assessments/publishing-consumer/tests.log).
The provisional tail observations are preserved as a clearly labelled
[console snapshot](assessments/publishing-consumer/provisional-tail-console-snapshot.json),
not an original passing raw artifact. [Interruption checks](assessments/publishing-consumer/interruption.json)
and [teardown verification](assessments/publishing-consumer/teardown.json) confirm
completed artifacts are now preserved and no synthetic pooler clusters remain.

The observed aggregate service rates are approximately 23.5 and 19.2 mock posts per
minute. **Estimates** assuming the same balanced mix, helpers and latency: a backlog
of 25 posts needs roughly 64–78 seconds, 50 roughly 127–156 seconds, and 100 roughly
255–312 seconds, plus any wait for the next admission tick. These are extrapolations,
not additional completed workload measurements. Actual video processing, media
conversion, provider throttling and unrelated application database traffic can make
production slower. An acceptable peak publishing-lateness target is not verified.

Completed auxiliary validation:

- 55 automated publishing/security/consumer tests passed, including existing
  localhost HTTP tests. The initial sandbox run failed one localhost-listen test;
  the permitted localhost rerun passed all 55.
- Cross-process budget: three held data transactions, four observed backend
  connections; a fourth data operation deferred. Artificially expired slot leases
  could not steal active transaction locks. Slots recovered after process exit.
- Actual SIGKILL after committed admission preserved READY jobs. SIGKILL before the
  external boundary recovered and called the mock provider once. SIGKILL after mock
  acceptance did not republish and confirmed through existing-result lookup.
  Lease expiry was accelerated in this test.
- All five platforms passed cancellation before the external boundary and
  rescheduling to a new lease. Cancellation after an accepted/uncertain operation
  was refused. A manually created new post ID published once; resetting a confirmed
  record's status did not bypass duplicate protection. This is not a new same-ID
  retry authorization workflow.
- TikTok accepted-but-pending remained PUBLISHING until read-only reconciliation;
  no second init occurred. A temporary database outage left the job READY and it
  published once on recovery.
- Continuous-arrival staging test: five arrival waves alongside 100 hot Instagram
  jobs. Each other platform confirmed its new arrival within each approximately
  1.5-second consumer slice, with zero duplicate mock publish calls. These short
  slices used local latency and accelerated admission minutes. Unit tests also
  isolate a continuously failing platform without starving healthy ones.

## Remaining production blockers and exact next step

1. Full production platform integration is incomplete. Inject the budgeted database
   port into the **existing** account/paid-access/approval/consent/token-refresh,
   TikTok account throttle, media preparation, provider checkpoint and reporting
   logic. Verify failure semantics before attaching it to the candidate worker.
   The mock contract tests alone cannot establish preservation of all these paths.
2. Real provider rejection, async video processing, upload checkpoint recovery,
   rate limits and reporting failure need the same staging lifecycle coverage.
   Definitively rejected/preflight failures currently remain conservative rather
   than providing the complete existing retry policy. Unknown outcomes must remain
   quarantined; same-ID manual retry needs an explicit audited reconciliation policy.
3. A real authenticated Netlify background entry point, bounded consumer leadership,
   durable future wake-ups/reconciliation and retry delivery need staging-hosted
   verification. An empty queue snapshot or a failed wake must not silently end
   recovery. Production plan eligibility, cold start, timeout/shutdown, egress and
   credential isolation are not verified by these localhost tests.
4. The five-connection production pool and its shared capacity with the rest of
   Showwork have not been validated by this fixture. The synthetic role cap does
   not alter or prove the production Supabase pool configuration.
5. The candidate schema is an offline SQL proposal, not an installed migration.
   No billing, email, inbox, live worker or production handler was changed here.

**Next step:** finish the budgeted platform integration in isolated staging and
repeat the same 250-post, cancellation/retry, asynchronous-provider and process-kill
tests with those complete paths. Do not request production activation on the basis
of this partial adapter or local capacity result. A later approved hosting-only
staging test can verify cold starts and background retry/wake behavior without
connecting to production or publishing real content.

Netlify documents a 15-minute background execution limit and automatic invocation
retries; neither an invocation acknowledgement nor admission is evidence of a
published post. See [Netlify background functions](https://docs.netlify.com/build/functions/background-functions/).
Pool settings are documented in [PgBouncer configuration](https://www.pgbouncer.org/config.html).

## Files changed in this phase

These changes are offline candidates/test fixtures; the earlier undeployed cron
changes already in the working tree were not changed in this phase.

- `lib/publishing/reliableStore.ts` — three-slot default, fair selection, pre-external
  cancellation/rescheduling, locked external boundary and accepted-operation state.
- `lib/publishing/reliableWorker.ts` — bounded concurrency, same-token budget retries,
  guarded confirmation read elimination, accepted-operation classification/reconciliation.
- `lib/publishing/reliableConsumer.ts` — new portable bounded fair consumer.
- `lib/publishing/stagingConsumerAdapter.ts` — new unregistered staging adapter factory.
- `scripts/publishing-reliability/schema.sql` — proposed PROVIDER_PENDING state.
- `scripts/publishing-reliability/lifecycle-assessment.cjs` — new end-to-end load runner.
- `scripts/publishing-reliability/mock-platforms.cjs` — new network-denying provider fixture.
- `scripts/publishing-reliability/workflow-assessment.cjs` — new workflow checks.
- `scripts/publishing-reliability/fairness-assessment.cjs` — new ongoing-arrival checks.
- `scripts/publishing-reliability/interruption-assessment.cjs` — new teardown/artifact check.
- `scripts/publishing-reliability/global-budget-assessment.cjs` — three-process pooler check.
- `scripts/publishing-reliability/job-crash-assessment.cjs` — pooler-backed actual kills.
- `tests/helpers/isolated-pooler.cjs` — new TLS pooler and synthetic non-superuser backend cap.
- `tests/publishing-consumer.test.cjs` — new consumer/adapter regression tests.
- This report and `docs/assessments/publishing-consumer/` — sanitized synthetic evidence.
