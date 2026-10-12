# Publishing scheduler throughput assessment

**Recommendation: NO-GO for the current consolidated scheduler.**

Assessment date: 11 October 2026 (Africa/Lagos). Production access was read-only.
No production posts were claimed, no publishing providers were called, and nothing
was deployed. Application implementation files were unchanged during this assessment.

## Evidence and limitations

Production configuration and measurements were obtained with the Netlify CLI and
Prisma using the production Functions-scope database URL. Secret values remained
in process memory. Probes used SELECT, EXPLAIN ANALYZE SELECT, transaction settings,
and connection establishment only. The concurrency checks used at most five
connections. None executed UPDATE, row-locking SELECT, or publishing worker requests.

The database measurements originate from the local workstation, not Netlify Lambda.
Configured function region is us-east-2 (Ohio); the database pooler hostname indicates
eu-central-1 (Frankfurt). This is evidence of configured cross-region placement, not
a measured Lambda-to-database round-trip time. The production selections currently
returned zero due rows; their plans do not establish write/lock performance for real
100-post bursts. Actual writes were simulated, never benchmarked in production.

Workload tests execute the current TypeScript cron and scheduler through isolated
transpilation with an in-memory database, five-slot connection pool, synthetic
conditional claims, synthetic worker acknowledgements, and controlled transaction
latency. Background dispatch is entirely mocked. Five real-time synthetic tests and
73 deterministic scenarios were run. Alternative admission gates exist only in the
test harness, never in the application source.

## Why the earlier read-only transactions took 1.3 seconds

| Measurement | Results |
| --- | --- |
| PrismaClient construction, three samples | 2.8–3.4 ms |
| Prisma connection establishment, three samples | 1,063.4–2,421.6 ms; median 1,405.9 ms |
| First SELECT after connection | 842.0–1,057.6 ms |
| Seven warm Prisma standalone SELECT 1 calls | 761.4–900.0 ms; median 805.1 ms |
| Five warm verification transactions | 1,347.7–1,922.8 ms; median 1,524.8 ms |
| Scheduler-equivalent transaction, three samples | 1,044.2–1,112.0 ms; median 1,055.3 ms |
| Server execution of five scheduler SELECT plans | 0.040–1.302 ms |
| Server planning | 0.160–2.661 ms |
| Raw PostgreSQL transport DNS | About 10 ms |
| Raw PostgreSQL TCP connection | About 146–162 ms |
| Raw PostgreSQL warm SELECT 1 | 132.5–252.2 ms |

The verification-only SET TRANSACTION READ ONLY adds a database operation. Its
median measured cost was 356.9 ms. Scheduler-equivalent transactions omit that
extra command and contain only the existing timeout setup and SELECT, so they
are closer to 1.05 seconds in this small warm sample. It is incorrect to assume
every production scheduler operation intrinsically costs exactly 1.38 seconds.
It is also incorrect to extrapolate the old 120 ms simulation to deployment.

Median verification stages, measured individually:

| Stage | Median |
| --- | ---: |
| Transaction BEGIN and connection checkout | 316.8 ms |
| Verification-only read-only setup | 356.9 ms |
| Transaction-local statement timeout setup | 289.3 ms |
| SELECT client round trip | 339.8 ms |
| COMMIT | 151.8 ms |

These independent medians should not be added as though they describe one sample.
Prisma query events also show the protocol sequence BEGIN, DEALLOCATE, SET,
SELECT, COMMIT. One captured scheduler-equivalent trace reported 193, 181, 383,
380, and 239 ms respectively. Production uses pgbouncer=true; the pooler-compatible
protocol incurs extra work and round trips. Query-event duration is client/engine
timing, whereas EXPLAIN ANALYZE reports server execution time.

The observed latency is predominantly connection/protocol/network overhead, not
slow execution of the current SELECT plans. Index changes are not the first fix.
Do not remove pooler compatibility or transaction-local timeout protection blindly.

A separate strict-TLS node-postgres probe could not validate the certificate chain
(SELF_SIGNED_CERT_IN_CHAIN); verification was not weakened to obtain a timing.
Prisma connectivity succeeded. Consequently, TLS handshake and authentication costs
cannot be completely separated from Prisma's measured connection establishment.

## Production concurrency measurements

Each request was a scheduler-equivalent transaction containing timeout setup and
SELECT 1, with maxWait 1,500 ms and transaction timeout 2,500 ms.

| Concurrency | Successful requests | Batch wall-time range |
| --- | ---: | ---: |
| 2 | 6 / 6 | 1.305–1.985 s |
| 3 | 9 / 9 | 1.307–2.625 s |
| 4 | 12 / 12 | 1.300–2.015 s |
| 5 | 14 / 15 | 1.900–3.141 s |

One five-way request failed with Prisma P2028. The sample is small and includes
pool expansion/connection acquisition. A per-client connection_limit of five is
not five guaranteed independent server backends or a global application limit.
Other functions have separate clients and share the production pooler/database.
Bounded concurrency of two or three is a candidate, not a proven reliability limit.

## Current implementation: admission throughput

The shared WeakMap admission queue serializes normal database operations across
all platforms. Every tick performs five stale checks and five due selections
before its queued claims can proceed. At 1.38 s each, setup consumes 13.8 s of
the 15 s admission window. The handler still runs each minute, but post admission
capacity is much lower than its per-platform batch limits suggest.

Real-time synthetic tests at 1,380 ms per transaction, a five-slot pool, and
500 ms mock worker acknowledgement:

| Simultaneously due posts | Admitted on first tick | Still scheduled | Handler wall time | Peak database connections |
| --- | ---: | ---: | ---: | ---: |
| 10 | 1 | 9 | 15.726 s | 1 |
| 25 | 1 | 24 | 15.727 s | 1 |
| 50 | 1 | 49 | 15.731 s | 1 |
| 100 | 1 | 99 | 15.724 s | 1 |

The function stops admitting work at the existing checks; the last admitted
transaction and dispatch may finish after 15 s. No duplicate dispatches occurred.

Deterministic continuation results assume balanced platform distribution, all
posts due before the first tick, 60-second ticks, no new arrivals, no failures,
and warm runs after the first run. Delay is time to the last background dispatch
acknowledgement, not time to confirmed provider publication. A post becoming due
just after a tick can add almost another minute.

| Due posts | At 1.38 s: ticks to drain | Last dispatch delay | At calibrated 1.07 s: ticks to drain | Last dispatch delay |
| --- | ---: | ---: | ---: | ---: |
| 10 | 10 | 9m 15.7s | 3 | 2m 13.3s |
| 25 | 25 | 24m 15.7s | 7 | 6m 12.3s |
| 50 | 50 | 49m 15.7s | 13 | 12m 13.3s |
| 100 | 100 | 99m 15.7s | 25 | 24m 15.5s |

At 1.30 and 1.38 s the current queue admitted one post per warm tick. At 1.07 s
it admitted four. At conservative 1.525 and 1.923 s latency-tail settings it
admitted zero in every simulated tick. A 2.4 s cold connection delay plus 1.38 s
transactions admitted zero on the cold tick. Repeating that cold profile every
minute admitted zero across 130 simulated ticks. Therefore there is no defensible
nonzero guaranteed admission count across the assessed latency/cold scenarios.

## Deferral, duplicate prevention, and fairness

Finite fixtures eventually drained at 1.30, 1.38, and 1.07 s, with zero duplicate
dispatches. Two overlapping invocations also produced zero duplicate dispatches.
The mocks enforce conditional updatedAt/status claims and worker lease matching;
these results complement, rather than replace, the existing idempotency tests.

Fairness fails in the current queue. With one initially pending post on each
platform and one new Instagram post each subsequent minute, the 1.38 s profile
admitted only Instagram in all 12 runs. The other four initial posts remained
scheduled. Sustaining this pattern sustains starvation even at one new post per
minute. Platform failures remain caught independently, but this fixed admission
priority prevents prompt progress for later platforms without any failure.

For a balanced 100-post burst, X's first dispatch occurred after about 80 minutes
at 1.38 s. This is incompatible with publishing accuracy expectations.

## Candidate improvements compared without changing source

The harness replaced only the admission gate in memory and retained the current
deadline, SQL predicates, optimistic claims, worker payloads, and recovery paths.
It compared FIFO bounded concurrency and round-robin platform fairness. Bounded
concurrency alone improves aggregate capacity but does not guarantee fairness
under sustained early-platform load. Fairness should be explicit.

At 1.38 s, the fair two-slot candidate admitted 12 posts in a saturated warm tick;
the fair three-slot candidate admitted 23. The latter distributed admission across
all five platforms. Its real-time 100-post test admitted 23, used three connections,
and completed in 15.743 s, with zero duplicate dispatches.

| Due posts | Fair three-slot: first tick admitted | Ticks to drain | Last dispatch delay |
| --- | ---: | ---: | ---: |
| 10 | 10 | 1 | 10.2 s |
| 25 | 23 | 2 | 1m 7.4s |
| 50 | 23 | 3 | 2m 7.4s |
| 100 | 23 | 5 | 4m 8.8s |

At calibrated 1.07 s, the same candidate admitted 32 in a saturated tick, and
100 drained in four ticks, with last dispatch at 3m 5.9s. At a conservative
1.923 s tail setting it admitted 14 and drained 100 in eight ticks, with last
dispatch at 7m 10.1s. A 2.4 s cold connection delay at 1.38 s reduced first-tick
admission from 23 to 17; a 5 s delay reduced it to 11.

This is substantially better, but concurrency alone still delays large bursts
and is not enough to certify original publishing throughput.

## Runtime and recovery

Normal workload simulations completed in about 15.7 s or less per tick. Simulated
five-second ambiguous dispatch failures, with database cleanup, completed in
21.56 s. The current implementation preserved FAILED handling and did not
automatically resend uncertain deliveries. Recovery database operations retain
their timeout and bypass the admission queue. Existing TikTok accepted-operation
recovery and worker code were unchanged, and 140 relevant regression tests passed.

The existing 28 s envelope is arithmetic based on assumed timeout enforcement:
15 s admission + 4 s database + 5 s dispatch + 4 s cleanup. It is not a measured
production runtime guarantee. Netlify documents a 30 s scheduled-function limit.
Workstation tests cannot establish Lambda cold initialization, production worker
dispatch acknowledgement, pool saturation, cancellation timing, or cleanup tail
latency for the consolidated function. One actual five-way read transaction
already returned P2028 after 3.141 s including acquisition/connection overhead.

**The full Netlify cold-start-and-cleanup requirement is unconfirmed.** No invocation
of the existing publishing cron or deployment of a diagnostic function was attempted.

## Recommended next implementation and GO criteria

1. Replace global serial admission with a bounded gate and explicit round-robin
   platform fairness. Start assessment at two or three operations, not unlimited
   Promise.all and not an assumed five always-available connections. Reserve pool
   capacity for recovery and assess contention from other clients.
2. Batch per-platform conditional claims to reduce per-post transactions. Use
   database-returned IDs and actual lease timestamps; a bulk count is insufficient
   to know which posts this invocation owns. Preserve approval/isAiDraft predicates,
   optimistic claims, TikTok reconciliation, and independent platform error handling.
   Dispatch only committed claims and never hold a transaction open during HTTP.
3. Evaluate regional proximity for only the publishing scheduler/worker where
   available. Keep this a separate deployment/configuration decision; changing the
   site-wide region could affect billing and other workloads outside this phase.
4. Keep pooler compatibility and timeout protection. Optimize repeated round trips
   only after validating pooler protocol behavior and rollback semantics.
5. Re-run all workload, continuous-arrival fairness, overlap, platform-failure,
   ambiguous-dispatch, cancellation, and recovery scenarios against the revised
   implementation. Calibrate write/lock timings using an isolated staging database,
   never production mutations.
6. Before GO, measure a read-only/no-publish diagnostic using the same Netlify region,
   bundle, runtime, and schema. Deployment of that diagnostic is a separate step
   requiring authorization. Capture cold/warm and cleanup-tail runtime, target
   adequate headroom below 30 s, and define an acceptable backlog/delay objective.

References:

- Netlify scheduled-function limit: https://docs.netlify.com/build/functions/scheduled-functions/
- Netlify per-function region configuration: https://docs.netlify.com/build/functions/configuration/
- Prisma transactions: https://www.prisma.io/docs/orm/fundamentals/transactions
- Prisma/PgBouncer configuration: https://docs.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer

## Reproducible local evidence

The following assessment artifacts contain no credentials or customer records:

- /tmp/showwork-db-throughput-probe.cjs
- /tmp/showwork-db-stage-probe.cjs
- /tmp/showwork-publishing-throughput-sim.cjs
- /tmp/showwork-db-throughput-measurements.json
- /tmp/showwork-db-stage-measurements.json
- /tmp/showwork-publishing-throughput-results.json
- /tmp/showwork-wall-serialized-10.json
- /tmp/showwork-wall-serialized-25.json
- /tmp/showwork-wall-serialized-50.json
- /tmp/showwork-wall-serialized-100.json
- /tmp/showwork-wall-fair3-100.json

Production probes read Netlify configuration and keep credentials only in memory.
The simulator needs no production credentials or network access. Its variants
are comparisons, not changes to the implementation awaiting deployment.
