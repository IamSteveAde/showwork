# Publishing performance optimization: isolated staging assessment

Production: **NO-GO**. The offline candidate meets the attempt-start targets in the main simulated-latency matrix, with all posts eventually confirmed by mocked providers. It is suitable for preparing controlled hosted staging validation, but hosted activation should wait for the outstanding forced database-timeout validation. No production access, credentials, real publishing, deployment or live infrastructure change was performed in this phase.

## What changed

- Bounded preflight and reconciliation snapshots: at most five jobs, 30-second TTL. Existing workspace entitlement policy remains authoritative. Exact live connection, permissions, token, expiry, post/approval and ownership checks precede irreversible publishing.
- Account-aware dispatch: different accounts can progress concurrently; an exact job/token account lease serializes the same platform/account across consumers. Fair platform/account selection replaces platform-wide serialization. Tested configuration: two consumers, eight attempt slots each, three globally budgeted heavy database operations and five backend connections.
- Publication proof is durably journaled before releasing attempt capacity. Final status/reporting can finish separately. A lost acknowledgement is resolved by exact-token readback; an unknown external outcome without proof stays quarantined. TikTok acceptance is pending until confirmed status; terminal provider failure retains its operation ID and cannot silently republish.
- Live authorization and TikTok rate reservations use bounded coordinator operations. Native token refresh, consent, media handling, scopes and shared pacing remain in use. Redundant TikTok reporting upserts are avoided using committed reporting receipts.
- Consumers wait for nearby eligible durable work instead of issuing a new function wake for every status check. This does not implement full future-post lookahead or prove a hosted invocation reduction.

## Measurement conditions

Actual local PostgreSQL 17.6, Prisma 5.22 and PgBouncer 1.26 transaction pooling; synthetic database role capped at five backends. Heavy transactions receive 1,380 ms injected warm latency or 1,923 ms tail latency. Coordinator calls normally receive 320 ms injected latency. Social APIs are mocks (approximately 5 ms per call), with actual native publishing code and small synthetic media. These are measured local executions under simulated latency, **not hosted or production measurements**.

Two consumers are already available at workload start. Posts are due at the scheduler tick. Each main workload is evenly divided across five platforms with distinct accounts. TikTok mock status first returns processing and subsequently completes; the one-minute follow-up backoff is Showwork-controlled, not a measured provider delay. Results are individual runs, not statistical confidence bounds.

## Lifecycle results

All times below are seconds. “Maximum attempt delay” is measured from the scheduled timestamp; admission is durable queue entry, not publication. “All confirmed” includes durable status completion and is distinct from first external acceptance.

| Workload | Admit all | First attempt | Maximum attempt delay | All confirmed | Confirmed | Duplicate attempts | DB errors |
|---|---:|---:|---:|---:|---:|---:|---:|
| 50 warm | 7.37 | 7.96 | 39.19 | 188.43 | 50 | 0 | 0 |
| 50 tail | 8.82 | 10.88 | 42.39 | 216.44 | 50 | 0 | 0 |
| 250 warm | 67.78 | 7.74 | 195.15 | 718.14 | 250 | 0 | 0 |
| 250 tail | 68.76 | 8.25 | 221.26 | 853.55 | 250 | 0 | 0 |
| 50 shared accounts | 7.14 | 7.65 | 103.57 | 204.35 | 50 | 0 | 0 |
| 5 normal | 7.13 | 7.63 | 13.01 | 90.35 | 5 | 0 | 0 |
| 50 slow coordinator | 16.71 | 27.03 | 120.30 | 387.03 | 50 | 0 | 0 |

The main 50-post runs pass 120 seconds; both 250-post runs pass 300 seconds. The normal five-post run passes 60 seconds from an aligned tick. All seven runs complete without recorded database errors, duplicate attempts or platform failures. The high-coordinator-latency run passes reliability but **fails the 120-second speed target** at 120.30 seconds, with effectively no margin. Its `success` flag records lifecycle acceptance, not speed acceptance.

The shared-account workload has ten posts on each platform's single account. Its 103.57-second maximum is TikTok. Recorded explicit pacing wait totals 15.94 seconds across reservations, but this is not the entire platform pacing impact: other work and serialization overlap the mandated spacing. Distinct-account runs have zero recorded rate-reservation wait. Preserving the existing 10.1-second TikTok initialization interval means 50 posts on one TikTok account need at least 494.9 seconds between first and last initialization, even before other work. Account concentration therefore prevents an unconditional five-minute promise.

## Maximum attempt delay by platform and account

Seconds; each main row's platform maximum is also the worst social account on that platform because each account has one post. Every individual account's maximum is retained in `summary.json` and the raw artifacts. The shared-account row contains the exact five account maxima.

| Workload | Instagram | TikTok | Facebook | LinkedIn | X |
|---|---:|---:|---:|---:|---:|
| 50 warm | 33.77 | 36.52 | 37.87 | 39.18 | 39.19 |
| 50 tail | 37.89 | 41.16 | 42.38 | 42.39 | 42.29 |
| 250 warm | 178.01 | 186.09 | 195.15 | 194.04 | 187.42 |
| 250 tail | 215.39 | 210.03 | 215.39 | 219.78 | 221.26 |
| 50 shared accounts | 45.80 | 103.57 | 45.80 | 45.82 | 53.66 |
| 5 normal | 7.64 | 13.01 | 11.68 | 11.70 | 11.71 |
| 50 slow coordinator | 120.27 | 119.75 | 112.79 | 110.95 | 120.30 |

## Database work and capacity

Heavy transactions below include shared batch transactions, allocated across the workload. Coordinator autocommit SQL is included in application SQL command counts, not in the heavy-transaction count. SQL command events include Prisma/PgBouncer transaction protocol commands where logged; they are **not exact network packet or wire-round-trip counts**. Harness sampling is excluded from application counts. Idle polling makes small-workload per-post counts relatively high.

| Workload | Heavy transactions | Heavy transactions/post | Application SQL commands | SQL commands/post | Heavy transaction p95 (ms) | Backend peak |
|---|---:|---:|---:|---:|---:|---:|
| 50 warm | 115 | 2.300 | 2629 | 52.580 | 1429.9 | 5 |
| 50 tail | 115 | 2.300 | 2731 | 54.620 | 1966.9 | 5 |
| 250 warm | 549 | 2.196 | 12015 | 48.060 | 1426.4 | 5 |
| 250 tail | 543 | 2.172 | 12357 | 49.428 | 1968.5 | 5 |
| 50 shared accounts | 139 | 2.780 | 2903 | 58.060 | 1416.7 | 5 |
| 5 normal | 19 | 3.800 | 675 | 135.000 | 1413.3 | 4 |
| 50 slow coordinator | 114 | 2.280 | 2480 | 49.580 | 1417.7 | 5 |

Against the archived 250-post baseline:

| Metric | Warm baseline → optimized | Tail baseline → optimized |
|---|---:|---:|
| All attempts begun (s) | 898.17 → 195.15 (78.3% reduction) | 1119.59 → 221.26 (80.2% reduction) |
| All confirmed (s) | 918.38 → 718.14 (21.8% reduction) | 1149.68 → 853.55 (25.8% reduction) |
| Heavy transactions | 1267.00 → 549.00 (56.7% reduction) | 1265.00 → 543.00 (57.1% reduction) |
| Application SQL commands | 18677.00 → 12015.00 (35.7% reduction) | 19219.00 → 12357.00 (35.7% reduction) |

Reporting upserts fall from 300 to 250 per 250-post run: 16.7% fewer writes of that type, retaining 250 reporting rows. This is not a 16.7% reduction in all database writes. The warm and tail heavy transaction reductions are approximately 57%; application SQL reductions approximately 36%. Normal five-post confirmation is slower than the previous baseline because deferred TikTok reconciliation now includes the simulated processing/backoff cycle; this is not a universal latency improvement.

## Where time remains

The figures below are aggregate operation time divided by post count; concurrent and nested operations overlap and must not be summed as wall-clock duration. Preflight cache-hit timings exclude the shared snapshot transaction, which remains counted in the transaction totals.

| Operation, seconds/post | 250 warm | 250 tail |
|---|---:|---:|
| Local heavy-capacity queue wait | 2.417 | 3.089 |
| Preparation claim | 0.095 | 0.090 |
| Live authorization | 0.326 | 0.325 |
| External-attempt fence | 0.655 | 0.653 |
| Native publish path | 1.926 | 2.188 |
| Reconciliation/finalization | 5.636 | 6.985 |

Local capacity-queue wait totals 604.27 / 772.17 aggregate seconds for warm/tail 250 workloads, distinct from physical connection checkout. Prisma transaction acquisition p95 is 5.27 / 4.76 ms; coordinator checkout p95 is 1.96 / 1.70 ms. These are local measurements; transaction acquisition includes protocol/setup work and is not pure PgBouncer waiting. No sampled lock waits were recorded; sampling does not prove contention is impossible. Heavy transaction p95 is 1.426 / 1.968 seconds, dominated by injected latency.

Attempt throughput improved because slow finalization no longer occupies attempt slots. Confirmation is still constrained by database-heavy finalization, bounded reconciliation and Showwork's TikTok status backoff. Removing required proof/permission checks to shorten this would be unsafe. The sensitivity run demonstrates that coordinator network latency can become the next bottleneck even with five backend connections. A persistent VPS worker removes cold starts and consumer rotation, but does not remove these SQL/network costs unless its placement and connectivity actually improve them.

## Reliability evidence

- 130/130 regression tests passed: `node --test tests/publishing*.test.cjs tests/tiktok*.test.cjs tests/calendar-team.test.cjs`. TypeScript check passed: `npx tsc --noEmit --incremental false`.
- Optimized safety test: 35 jobs, two workers, all five platforms; no same-account external overlap, peak five different-account external operations. Revoked permission, token changes, cancellation, rescheduling, missing/stale account lease, entitlement-policy parity, lost journal acknowledgement and terminal TikTok failure assertions passed.
- Actual SIGKILL tests passed before send, after ambiguous provider acceptance, after TikTok operation persistence and after committed publication proof. Four recorded publish attempts, zero duplicates. Lease expiry was accelerated. Unknown acceptance stayed quarantined; committed proof resumed finalization only.
- Native integration regressions passed for token refresh, permissions/scopes/consent, reporting savepoint failure/repair, lost final commit acknowledgement and explicit known-rejection retry. Manual retry cannot authorize automatic replay of an uncertain outcome.
- Native video paths passed for all platforms with actual ffmpeg/ffprobe and a tiny synthetic H.264 file. This is not evidence for large-media memory or duration limits.
- Simulated lost wake delivery, duplicate delivery, consumer epoch fencing and maximum two consumers passed. These were adapter simulations, not hosted Netlify delivery measurements.
- A stalled TikTok media path did not block 12 healthy posts. Shutdown completed in 111 ms; a deferred pre-send job could not later initialize publishing.
- An additional held-row database-timeout test was **not executed**: automatic approval review failed because of a usage limit. Later test-helper configurations add a two-second staging statement timeout and 2.5-second coordinator query timeout, but the four main benchmarks started before those helper settings changed. They do not prove forced-lock timeout recovery under the final helper configuration.

## Readiness and exact next step

**Production NO-GO remains.** The five-backend architecture can meet the tested attempt-start targets with 320 ms coordinator latency and distributed accounts. It cannot yet guarantee the targets across unknown hosted latency, cron phase, cold starts, account concentration or large-media workloads.

The next step is to complete the isolated held-lock/connection-failure timeout test once tool approval review is available, then validate this exact candidate in an isolated hosted staging project using synthetic credentials and mocked social APIs. Do not connect it to production. Hosted validation must measure cold/warm wake latency, verify the five-backend budget across processes, rotate consumers at their configured ten-minute lifetime, and repeat the 250-post lifecycle with lost delivery and process termination.

The 250-post full lifecycles took 11m58s and 14m14s. The benchmark kept consumers alive; it did not exercise their ten-minute rotation during this load. Netlify's scheduled function is a short admission/wake handler, not the full lifecycle worker. Netlify documents a 30-second scheduled limit and 15-minute background execution limit; no hosted runtime margin is established by these local tests. See [Netlify configuration](https://docs.netlify.com/build/functions/configuration/) and [scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/).

A tick-only scheduler can add almost 60 seconds before admission, so the normal-load 60-second promise requires validated due-aware wake/lookahead behavior. The current nearby-work wait is useful but does not close that gap. Hosted tests must also establish coordinator latency rather than assume 320 ms, and include token-refresh bursts, realistic media and competing application database load. Continuing synthetic arrival fairness under sustained saturation remains a separate capacity test; these finite-burst results are not an unbounded starvation proof.

The portable store/provider/consumer core remains reusable by a persistent VPS loop; Netlify and VPS should differ in wake, process lifetime and shutdown adapters. The unconfigured VPS cannot yet be rated faster or safer. Region, actual RTT, supervision, restart policy, monitoring and resource limits need measurement before choosing it.

## Files changed in this phase

Core candidate: `lib/publishing/reliableStore.ts`, `reliableWorker.ts`, `reliableConsumer.ts`, `platformIntegration.ts`, `portableRuntime.ts`; optional native services in `lib/tiktokPublishing.ts`.

Staging schema/harnesses: `scripts/publishing-reliability/schema.sql`, `lifecycle-performance.cjs`, `performance-safety-validation.cjs`, `mock-social-apis.cjs`, `native-actor.cjs`, `native-crash-validation.cjs`, `runtime-validation.cjs`, `fair-shutdown-validation.cjs`, `video-validation.cjs`.

Test composition: `tests/helpers/native-publishing-composition.cjs`, `isolated-pooler.cjs`, `isolated-coordinator.cjs`.

Report/evidence: this file and `docs/assessments/publishing-performance-optimization/`. Pre-existing working-tree changes, including cron/configuration changes from earlier phases, are not attributed to this phase and were not deployed. No production database migration was applied.

## Evidence

[Derived summary including every account maximum, phase timings and source-hash checks](assessments/publishing-performance-optimization/summary.json). Raw run artifacts and regression output are adjacent. All seven final performance artifacts match current recorded source hashes. Preliminary interrupted or superseded runs are excluded. Security/recovery artifacts are separate from timing benchmarks. Baselines remain in `docs/assessments/publishing-performance/`; this report supersedes their performance conclusions, not their historical measurements.
