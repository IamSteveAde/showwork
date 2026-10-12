# Timeout validation and hosted readiness

Production NO-GO. Local timeout gate PASS for the tested row-lock failure cases. Hosted validation NOT RUN: the user requires review and approval before even isolated staging deployment.

## Actual forced-timeout evidence

`scripts/publishing-reliability/performance-timeout-validation.cjs` starts disposable local PostgreSQL/PgBouncer with the existing five-backend setup, synthetic fixtures and mocked native publishing. No production credentials or network publishing.

| Fault | Observed result |
|---|---|
| Held job-row lock; blocked UPDATE | PostgreSQL SQLSTATE 57014 / Prisma P2010 after 2,008 ms |
| Worker tries same locked job | Claim skips locked row; no external attempt; durable READY job retained |
| Lock released | Native mocked Facebook publish occurs once; proof journal persisted |
| Held post-row lock during finalization | PrismaClientUnknownRequestError with verified timeout text after 2,039 ms |
| Lock released; reconciliation retried | CONFIRMED, one reporting row, one external attempt, zero duplicates |

The test advances only the synthetic reconciliation backoff to avoid waiting one minute. Assertions retain proof during the failure and require exactly one publish attempt. Test cluster was removed. Raw [evidence](assessments/publishing-hosted-preparation/showwork-timeout-37084754-f411-41d8-8d3d-fddf17511d4c.json).

An initial harness incorrectly expected a SKIP LOCKED claim to block; its missing-rejection assertion failed, then the harness was corrected to force an actual UPDATE timeout. This was a harness failure, not a scheduler publishing failure. The final test explicitly rejects assertion errors as evidence of database failure. This focused test does not establish behavior for every outage or five-platform combination; prior SIGKILL/lost-acknowledgement tests remain separate evidence. No reliability-core change was needed for these cases.

## The 120.30-second boundary

The prior slow-coordinator 50-post run took 120.298 seconds from scheduled time to the final attempt, versus 39.188 seconds with 320 ms coordinator injection: +81.11 seconds, approximately 3.07x. First attempt moved from 7.956 to 27.027 seconds. Full confirmation moved from 188.43 to 387.03 seconds. Both had five-backend peak, three-heavy-operation peak, zero recorded database errors and zero duplicates.

| Aggregate operation time across 50 posts | 320 ms coordination | 1,380 ms coordination |
|---|---:|---:|
| Account ownership acquisition | 16.31 s | 69.40 s |
| Live authorization | 16.22 s | 69.30 s |
| External transition | 16.22 s | 69.29 s |
| Final publication fence | 16.30 s | 69.22 s |
| Local heavy-capacity queue waiting | 99.75 s | 216.56 s |
| Batch preparation claims | 14 calls / 4.56 s | 21 calls / 29.14 s |
| Fair readiness queries | 148 calls / 48.42 s | 114 calls / 158.06 s |

These concurrent/nested aggregate times must not be added to reconstruct elapsed time. The four per-post guard/ownership operations each cost roughly another 1.06 seconds per post; different accounts overlap, explaining why cumulative extra work is larger than the wall-time increase. More preparation batches at slower coordination reduce amortization. Readiness/recovery polling continues while work is outstanding. Checkout p95 in the slow run remained about 2.13 ms locally: this is an injected coordinator/network-path sensitivity, not proof of a backend lock bottleneck.

Verdict: FAIL against 120 seconds, not an acceptable production boundary. The 0.30-second miss alone is smaller than expected run-to-run variation, but absence of headroom is the issue; cold starts and tick phase are additional. A single run cannot estimate a reliable p95/SLO. Do not optimize by dropping live authorization or durable fences, or by increasing the five-backend ceiling.

Recommended sequence: measure actual hosted coordinator RTT/checkout/query/commit first, run repeated slow-path workloads and inspect batch occupancy. If latency is near 1.38 seconds, evaluate combining exact-token account/claim transitions into a single conditional operation where semantics permit, retaining final live authorization; reduce redundant readiness/recovery scans with due-aware bounded waits. Those are potential next changes, not implemented or benchmarked improvements. Prefer a provisional staging headroom gate of <=100 seconds for 50 posts and <=250 seconds for 250 posts, in addition to the user's hard targets; these stricter thresholds are recommendations, not revised user requirements.

## Decision and next step

Production NO-GO. GO to review the [isolated hosted proposal](publishing-hosted-staging-proposal.md); NO-GO to deploy until approval and the unresolved hosting manifest fields are complete. No actual hosting latency, cold-start, cron, restart or global hosted-budget measurements exist yet. A final post-hosting readiness decision would be premature.

Changed this phase: the new timeout script; this report; the hosted proposal; one archived timeout artifact. No production handler, scheduler core or infrastructure configuration changed.
