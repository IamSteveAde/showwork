# Publishing performance assessment — 12 October 2026

**Production NO-GO.** Reliability checks pass after optimization, but the two-minute and five-minute attempt-start targets fail. Normal-load results pass only for workloads aligned with a scheduler tick. No deployment, production access or actual social publishing occurred.

## Target definition and measured results

An attempt begins when the first irreversible platform create/init request reaches the mock API, after the database claim/permission boundary commits. Media preparation, creator-info lookup, admission and worker dispatch are separate work. TikTok init acceptance never counts as confirmed publication. Measurements start from the synthetic scheduled time, aligned with the first scheduler tick; fixture setup is excluded. All five platforms have equal post counts and separate TikTok accounts.

These are actual local PostgreSQL/Prisma/PgBouncer runs with injected 1,380 ms warm or 1,923 ms tail transaction latency and 320 ms coordinator round-trip latency. External APIs take approximately 5 ms; photos undergo actual native preparation. They are not hosted or production measurements. The pooler and synthetic non-superuser role enforce five backend connections, with three global heavy-operation slots.

| Workload / latency | First attempt | All attempts started | All confirmed | Start target | Result |
|---|---:|---:|---:|---:|---|
| Normal: 5 / warm | 8.37 s | 22.57 s | 43.34 s | 60 s | PASS at tick alignment |
| Normal: 5 / tail | 11.48 s | 27.02 s | 51.70 s | 60 s | PASS at tick alignment |
| 50 / warm | 6.34 s | 2m49.87s | 3m12.74s | 2m | FAIL |
| 50 / tail | 11.43 s | 3m34.58s | 4m15.09s | 2m | FAIL |
| 250 / warm | 8.44 s | 14m58.17s | 15m18.38s | 5m | FAIL |
| 250 / tail | 11.50 s | 18m39.59s | 19m09.68s | 5m | FAIL |

Every optimized case ended with exactly the workload count confirmed and reported, zero recorded errors, zero duplicate create/init attempts and no remaining unresolved jobs. The 250-post runs each confirmed 50 posts per platform, with peak heavy operations three and backend connections five. Reliability acceptance and performance acceptance are independent: the seven reliability checks pass; peak SLO checks fail.

250-post source artifacts: warm `000b2369-db60-43b3-929c-55a9825a5146`, tail `c641eb16-dc4f-4645-bf6e-8f0c9323823a`. Sanitized JSON and source hashes are in `docs/assessments/publishing-performance/`. Temporary clusters, certificates and test credentials were removed.

The previous complete tests took 22m55s warm and 34m15s tail; the revised tests take 15m18s and 19m10s. That is approximately 33% and 44% shorter total processing. This comparison includes corrected idle polling/transport behavior and is not a controlled production A/B benchmark. Historical runs did not record first-attempt timestamps, so no invented before/after attempt-start improvement is claimed.

## Database work and capacity

| 250-post measurement | Warm | Tail |
|---|---:|---:|
| Heavy transactions | 1,267 | 1,265 |
| Heavy transactions per original post | 5.07 | 5.06 |
| Application SQL/protocol statement events | 18,677 | 19,219 |
| Amortized application SQL/protocol events per post | 74.71 | 76.88 |
| Separate harness SQL events | 530 | 751 |
| Transaction duration p50 | 1,399.30 ms | 1,942.49 ms |
| Transaction duration p95 | 1,411.47 ms | 1,954.95 ms |
| Maximum transaction duration | 1,524.84 ms | 2,157.89 ms |
| Cumulative local database-entry wait | 1,272.88 s | 1,588.53 s |
| Cumulative refused-capacity retry wait | 747.74 s | 845.76 s |
| Entry wait + retry wait per original post | 8.08 s | 9.74 s |
| Sampled SQL lock waits at 100 ms intervals | 0 | 0 |

SQL command events are measured client database requests, including transaction setup and connection reset commands; they are not TCP packet counts or a promise of one packet per event. Per-post totals are amortized across the workload and include application scheduling/polling coordination. They are not an exact count for each individual job. Per-post ORM method counts are separately retained; relation includes can emit several SQL commands per ORM call. Query parameters and token values are not logged.

Local entry waits are measured at the native facade's two-operation entry gate. Capacity retry waits are measured when a global slot/account-lock refusal causes its existing one-second backoff. Their cumulative sums span concurrent posts and reconciliation; they cannot be added to elapsed scenario duration. The global budget method's cumulative wall time includes reservation, execution and release; it is not a second independent queue-wait total. Brief locks can escape 100 ms sampling, so zero lock samples does not prove zero lock contention. The separate held-row claim test returned promptly with no duplicate owner.

Prisma's PgBouncer mode emits BEGIN, DEALLOCATE ALL and COMMIT around raw calls. A protocol-count probe verified this instead of assuming one raw call was one wire exchange. The new coordinator uses parameterized, unnamed node-postgres statements to avoid that reset protocol; native ORM transactions retain Prisma, advisory locks and the global budget. TLS verification remains mandatory. [node-postgres parameterized pool queries](https://node-postgres.com/apis/pool), [TLS configuration](https://node-postgres.com/features/ssl).

The initial five-post baseline started all requests in 26.31 s warm / 27.91 s tail, finishing in 49.75 s / 57.59 s. Its raw SQL averages include the old harness idle-loop traffic and are not directly compared with the optimized application-only averages. An initial profiling-hook variable-shadowing error caused synthetic preflight rejections; it was corrected and those runs are excluded. An initial coordinator teardown race produced a late pool-closed heartbeat error; heartbeat work is now joined before closing pools and final cases contain zero errors.

## Claiming, preparation and finalization

The baseline five-post global begin/finalize transactions averaged approximately 2.05 s warm and 2.6 s tail. Revised 250-post begin, permission verification and finalization calls average approximately 0.325 s, close to the injected coordinator latency.

| Revised cumulative method time | Warm | Tail |
|---|---:|---:|
| Admission batches | 35.95 s / 20 calls | 40.38 s / 18 calls |
| Preparation | 65.41 s / 200 batches | 60.02 s / 184 batches |
| External-boundary claim | 81.32 s / 250 calls | 81.23 s / 250 calls |
| Final permission/consumer verification | 81.43 s / 250 calls | 81.36 s / 250 calls |
| Final confirmation | 81.19 s / 250 calls | 81.39 s / 250 calls |
| TikTok acceptance checkpoint | 16.24 s / 50 calls | 16.23 s / 50 calls |

Preparation includes losing/empty claim batches from overlapping consumers. A call count is not a published-post count. Timings include client wait/transport and overlap with the native lifecycle timings below.

## Platform lifecycle occupancy

Average job wall seconds, including database/queue waits and native preparation:

| Platform | Warm preflight | Warm native publish | Tail preflight | Tail native publish |
|---|---:|---:|---:|---:|
| Instagram | 4.97 | 6.15 | 8.12 | 7.42 |
| TikTok | 3.46 | 29.35 | 4.36 | 36.26 |
| Facebook | 6.24 | 5.99 | 6.99 | 6.40 |
| LinkedIn | 6.04 | 6.29 | 6.95 | 7.03 |
| X | 5.22 | 6.05 | 7.22 | 7.06 |

All 50 TikTok posts required status-only reconciliation, averaging 15.08 s warm / 17.77 s tail per job. No other platform needed reconciliation in these successful cases. With one active lifecycle per platform per consumer and two consumers, TikTok has only two simultaneous lifecycles. This accounts for the slow end of the burst even after other platforms finish. It is an architecture constraint rather than observed long SQL row locks.

The 1,050 mock HTTP operations consumed only approximately 6.26 cumulative seconds warm / 6.18 seconds tail. Those are mocked request durations, not real platform service times. Native publish wall time includes database/rate/media work; subtracting mock request time does not produce an exact CPU time because database and job phases overlap. Large videos and real API latency are not benchmarked here.

## Implemented changes and safety

- Preparation, external boundary, acceptance and finalization use single atomic conditional statements rather than requiring heavy transaction slots. Exact IDs, tokens, approval/lease checks and SKIP LOCKED remain. Consumer epoch/owner checks are inside the guarded statements with shared lease-row locks.
- Final account/approval/consumer verification combines its live checks in one statement; no permission snapshot is cached across jobs.
- The injected coordinator transport uses bound SQL values, unnamed queries, UTC date serialization and bigint epoch parsing. It loads no environment variables and creates no production connection. Native ORM reads/writes, reporting savepoints and token refresh retain their existing transaction budget/locks.
- The benchmark avoids repeatedly spinning empty consumer rounds and joins heartbeat work during cleanup. These are harness corrections, not production infrastructure changes.
- SDK dispatch remains after committed claims. Confirmation proof, uncertain-outcome quarantine, cancellation/rescheduling guards and accepted-TikTok status recovery remain intact.

All 130 regression tests and TypeScript checks pass. Actual synthetic PostgreSQL tests validate locked-row claims, confirmed proof recovery on all five platforms, SIGKILL recovery, UTC/bigint transport compatibility and lost committed PREPARED/EXTERNAL_PENDING/CONFIRMED/PROVIDER_PENDING acknowledgements with one create per post. The driver acknowledgement test uses the real new coordinator, not a substitute implementation.

## Are the targets achievable?

**Not with the currently tested native lifecycle and latency/budget settings.** Normal five-post behavior passes in the aligned case; 50 and 250 fail at both latencies. This does not prove that every possible implementation using the same database is incapable of meeting them.

The existing healthy photo path has at least one pre-send snapshot transaction for each generic/Instagram job and approximately six for each TikTok job (snapshot, connection lookup, locked freshness check, creator reservation, init reservation and last connection read). For 200 other-platform posts and 50 TikTok posts, that is about 500 pre-send heavy transactions. Even with no finalization, coordination, rate waits or cold start, three heavy slots at 1.923 s imply about **320.5 seconds**, exceeding the five-minute target. Batching/reducing pre-send transactions or reducing latency is therefore necessary at the tail setting; raising lifecycle concurrency alone cannot remove that lower bound.

A strict normal 60-second target also needs scheduler-phase validation. A post becoming due immediately after a minute tick can wait nearly 60 seconds before admission, then needs positive preparation time. The aligned normal result does not guarantee that target. Look-ahead admission with a strict not-before-due send guard, or a continuously draining due-aware consumer, needs separate reliability validation; neither is implemented or deployed here.

Per-account behavior matters: the existing TikTok init reservation is 10.1 seconds. Fifty due TikTok posts on one account require at least about 495 seconds between first and last init, before database work, so the unconditional 250-post five-minute target cannot cover that case while preserving its current rate policy. The benchmark deliberately uses distinct accounts.

## Prioritized next staging work

1. Batch native preflight reads by a small fair claimed batch, share calendar/entitlement reads only within that database snapshot, and retain live per-post approval/account/lease verification before send. Validate permission changes and cancellation races explicitly.
2. Eliminate duplicated TikTok connection reads by trusted preload plus existing locked freshness/current-account validation. Explore one atomic rate reservation per required API call without weakening account serialization or refresh rotation.
3. Separate prepared/attempt-start work from completion work where durable confirmed proof already permits safe finalization, avoiding reporting/finalization congestion delaying the next attempt.
4. Test bounded extra same-platform concurrency across distinct accounts with round-robin fairness; keep account reservations and the global database limit. More heavy slots are not validated and must not be enabled without testing.
5. Reduce redundant idle readiness scans and repair writes; verify already persisted exact-reference status/reporting before repeating writes.
6. Test a full tick-phase offset, sustained arrivals, refresh-heavy/shared-account/video workloads and concurrent customer database traffic. Then evaluate lower database RTT/region placement in isolated hosting when separately authorized.

Netlify did not cause the measured local delays. Its cold starts, 30-second scheduled limit, background worker rotation and wake delivery remain unmeasured. A VPS can reuse the core but does not remove native round trips or account pacing; InterServer specifications/region are still unavailable. A shared production five-backend cap, production permissions, TLS and hosted cleanup must be verified before using the coordinator there. No production activation request is appropriate while the peak targets remain unmet.

## Files changed in this phase

- `lib/publishing/reliableStore.ts`: atomic coordination statements and combined live consumer verification; budgeted comparison mode retained.
- `lib/publishing/coordinatorTransport.ts`: new injected, parameterized coordinator transport with UTC serialization and compatible error mapping.
- `lib/publishing/budgetedDatabase.ts`: optional entry/capacity timing observer.
- `scripts/publishing-reliability/lifecycle-performance.cjs`: profiled workloads and separate attempt/confirmation metrics.
- `scripts/publishing-reliability/mock-social-apis.cjs`: optional request-start and duration observers.
- `scripts/publishing-reliability/coordinator-validation.cjs`: real-driver lost-acknowledgement tests.
- `scripts/publishing-reliability/claim-contention-validation.cjs`: held-row test independent of removed transaction wrappers.
- `tests/helpers/isolated-pooler.cjs` and `tests/helpers/isolated-coordinator.cjs`: optional SQL event observation and strictly verified local coordinator pool.
- `package.json` and `package-lock.json`: node-postgres and type dependency.
- This report and sanitized assessment JSON. No production entry points or deployment configuration changed in this phase.
