# Publishing bottlenecks and architecture decision — 12 October 2026

**Production remains NO-GO. No publishing implementation, production configuration or infrastructure was changed for this assessment.** This report re-analyzes the retained staging traces and current code. New measurements are not claimed. Current performance source hashes still match the recorded manifest.

**Recommendation:** retain one host-independent durable publishing core and redesign its pipeline before choosing hosting. Prefer a continuously running, database-near publishing worker as the eventual operating model, keeping the Next.js application on Netlify initially. The unconfigured InterServer VPS is only a candidate for that worker; it is not qualified. An improved Netlify worker is also viable if it implements due-aware look-ahead/wake behavior and proves bounded worker rotation. Both options require the same database and lifecycle changes. Moving the existing worker unchanged cannot meet the measured targets.

## Evidence, definitions and limitations

Source runs: warm `000b2369-db60-43b3-929c-55a9825a5146`, tail `c641eb16-dc4f-4645-bf6e-8f0c9323823a`, in `docs/assessments/publishing-performance/`. Derived arithmetic is saved in `docs/assessments/publishing-architecture/bottleneck-analysis.json`.

These were actual local PostgreSQL/Prisma/PgBouncer executions with 1,380 / 1,923 ms injected heavy-transaction latency and 320 ms coordinator-call latency, synthetic photos, healthy tokens, equal platform counts, distinct TikTok accounts and mocked APIs. They are not production or hosted Netlify/VPS measurements. The five backend connections were enforced by the pooler and synthetic PostgreSQL role. The publishing budget allows three heavy operations; the other capacity supports short coordination operations. Customer-facing database traffic was not included.

An attempt begins at the first irreversible platform create/init request. Admission, preflight, media preparation and creator-info reads do not count as attempts. TikTok acceptance is not confirmed publication. Normal means five due posts in the previous benchmark, one per platform, aligned with a scheduler tick; it is not a sustained-load or worst-tick-phase guarantee.

| Existing result | Warm | Tail | Target |
|---|---:|---:|---:|
| Five posts: all attempts started | 22.57 s | 27.02 s | 60 s |
| Fifty posts: all attempts started | 169.87 s | 214.58 s | 120 s |
| 250 posts: all attempts started | 898.17 s | 1,119.59 s | 300 s |
| 250 posts: all confirmed/reported | 918.38 s | 1,149.68 s | No confirmation SLO specified |

Every optimized workload completed with no recorded errors or duplicate create/init attempts. Those correctness passes do not establish peak speed compliance.

### What is and is not measured

- SQL/protocol command events are measured; exact TCP exchanges or a separately attributed physical wire round-trip count for each post are not. Some commands can share transport framing. Shared polling/batch work cannot be assigned uniquely to a single post.
- Native facade entry waiting and refusal-backoff waiting are measured. **Physical connection acquisition wait is not separately measured.** The saved traces cannot separate Prisma connection checkout, BEGIN/reset protocol, node-postgres pool-client waiting and PgBouncer backend assignment waiting. The previous 8.1–9.7 s per post is not an actual connection-pool-wait measurement.
- Whole native unit durations and method wall times are measured. Reporting is nested in some completion units; its exclusive duration was not recorded. Adding all method totals would double-count work.
- Transaction latency is injected once per transaction, not per SQL command. A larger batched production transaction can have a different duration. The model may understate production network cost for multi-query ORM units.
- Pooler/backend lock samples at 100 ms intervals were zero. Brief locks can be missed; this does not demonstrate zero lock contention.

These limitations prevent an exact packet-level, physical-pool-wait or exclusive-reporting breakdown from being reconstructed retrospectively. They are not replaced with invented estimates. Before implementing the next optimization, the minimum telemetry additions are: native transaction submission-to-callback timing; explicit coordinator pool checkout timing; isolated PgBouncer queue statistics; separate native completion/reporting spans; and per-job transaction/command IDs. Client checkout and pooler server assignment must be recorded separately. [node-postgres pool acquisition](https://node-postgres.com/apis/pool), [PgBouncer pooling configuration](https://www.pgbouncer.org/config.html).

## 1. Database command inventory per post

| Inventory | Warm total | Tail total | Warm / tail per original post |
|---|---:|---:|---:|
| Application command events | 18,677 | 19,219 | 74.71 / 76.88 |
| Separate harness command events | 530 | 751 | Excluded from application average |
| Heavy transactions | 1,267 | 1,265 | 5.07 / 5.06 |
| Native heavy transaction BEGIN/reset/COMMIT overhead | 3,801 | 3,795 | 15.20 / 15.18 |
| SET LOCAL statement-timeout commands | 1,267 | 1,265 | 5.07 / 5.06 |
| Heavy-slot advisory validation commands | 1,267 | 1,265 | 5.07 / 5.06 |
| Distributed slot reservation attempts | 2,017 | 2,115 | 8.07 / 8.46 |
| Slot release commands | 1,267 | 1,265 | 5.07 / 5.06 |
| Native private-owner fence reads | 650 | 650 | 2.60 / 2.60 |
| Reporting SAVEPOINT + RELEASE commands | 600 | 600 | 2.40 / 2.40 |
| Fair readiness scans | 954 | 1,333 | 3.82 / 5.33 |

These are component counts within the application totals, not additional totals to add to 74.71/76.88. Native ownership and slot validation are safety checks, not disposable queries. The overhead attribution uses one observed BEGIN, DEALLOCATE ALL and COMMIT per heavy transaction. All-run protocol counts are larger because harness Prisma calls also use that protocol; they are not counted as application overhead here. Standalone SELECT 1 health/reset probes are present but cannot be assigned perfectly from the aggregate first-token categories.

The healthy mixed workload accounts for 1,250 native transactions in both runs; 17 warm / 15 tail admission transactions explain the remainder:

| Native work | Transactions | Interpretation |
|---|---:|---|
| Per-post preflight snapshot/access validation | 250 | Before attempts |
| Other-platform native completion units | 200 | Status plus reporting for Instagram/Facebook/LinkedIn/X |
| Initial TikTok native work | 450 | Nine units per post: stored connection, locked freshness, creator reservation, init reservation, last connection read, operation checkpoint, status reservation, pending update, saved-status read |
| TikTok status-only reconciliation | 250 | Five units per post: read, freshness, status reservation, status write, report |
| Additional reporting repair | 100 | Fifty successful TikTok reports are revisited: read plus report unit |

The code and traces agree on **300 publishedSocialPost upserts for 250 posts**. Reconciliation already reports the 50 TikTok completions, but `reconcileReliableJob` calls `finish` without a committed reporting receipt, leaving reporting pending. The repair pass repeats the work. This is 20% excess upsert calls and 100 extra native transactions; it is not duplicate publishing.

Relevant source: `lib/publishing/budgetedDatabase.ts`, `lib/publishing/reliableStore.ts`, `lib/publishing/reliableWorker.ts`, `lib/publishing/platformIntegration.ts`, `lib/socialReporting.ts`, and the SQL counters in `scripts/publishing-reliability/lifecycle-performance.cjs`.

## 2. Waiting and transaction service

| Measurement | Warm | Tail |
|---|---:|---:|
| Cumulative local native-entry wait | 1,272.88 s | 1,588.53 s |
| Cumulative capacity/account-refusal backoff | 747.74 s | 845.76 s |
| Combined recorded waits per original post | 8.08 s | 9.74 s |
| Physical pool checkout/backend-assignment wait | Not separately recorded | Not separately recorded |
| Transaction p50 | 1,399.30 ms | 1,942.49 ms |
| Transaction p95 | 1,411.47 ms | 1,954.95 ms |
| Maximum transaction | 1,524.84 ms | 2,157.89 ms |
| Sampled lock-blocked backends | 0 | 0 |

The native entry gate admits two operations per facade. Distributed refusals then use a one-second backoff. Jobs can wait at both levels even when SQL itself executes quickly. Those sums span concurrent jobs and reconciliation; they are not serial elapsed scenario time. The budget-method totals include reservation/execution/release, not another independent connection-wait total.

Using transaction count × p50 only as an approximation, heavy service is about 1,773 backend-seconds warm and 2,457 tail. Dividing by three produces approximately 591 / 819 seconds of fully utilized service time. This is an explanatory capacity calculation, not a measured lower bound on exact total duration: p50 is not the mean, and not all work is continuously parallelizable.

## 3. Lifecycle timing

The following values are cumulative caller wall times; methods overlap with native spans.

| Phase | Warm cumulative / calls | Tail cumulative / calls |
|---|---:|---:|
| Admission | 35.95 s / 20 | 40.38 s / 18 |
| Preparation batches | 65.41 s / 200 | 60.02 s / 184 |
| External-boundary claim | 81.32 s / 250 | 81.23 s / 250 |
| Live permission/account/consumer verification | 81.43 s / 250 | 81.36 s / 250 |
| Final confirmation | 81.19 s / 250 | 81.39 s / 250 |
| Accepted TikTok checkpoint | 16.24 s / 50 | 16.23 s / 50 |
| Reconciliation claim + release | 32.48 s / 100 | 32.43 s / 100 |
| Report-complete marker | 16.17 s / 50 | 16.17 s / 50 |

Atomic boundary and finalization calls average about 0.325 seconds; the large remaining delay is not inside those individual conditional updates. Preparation counts include overlapping consumers that lose or return empty claims. Native status/report persistence remains in longer budgeted units.

Average per-job native occupancy, including database and queue time:

| Platform | Warm preflight / native publish | Tail preflight / native publish | Last attempt warm / tail |
|---|---:|---:|---:|
| Instagram | 4.97 / 6.15 s | 8.12 / 7.42 s | 473.10 / 544.44 s |
| TikTok | 3.46 / 29.35 s | 4.36 / 36.26 s | 898.19 / 1,119.60 s |
| Facebook | 6.24 / 5.99 s | 6.99 / 6.40 s | 491.44 / 527.47 s |
| LinkedIn | 6.04 / 6.29 s | 6.95 / 7.03 s | 546.03 / 566.41 s |
| X | 5.22 / 6.05 s | 7.22 / 7.06 s | 501.61 / 596.91 s |

TikTok reconciliation adds 15.08 / 17.77 seconds average wall occupancy for each of its 50 jobs. The other four platforms also miss five minutes; TikTok is the longest tail, not the only bottleneck. The worker's platform Set and consumer's active Map allow one lifecycle per platform per consumer. With two consumers, only two TikTok lifecycles run concurrently. Their approximately 33–41-second preflight-plus-publish occupancy consumes most of those lanes before they can start the next job. Reconciliation runs separately but competes for the same three heavy slots.

The 1,050 mocked HTTP operations took only 6.26 / 6.18 cumulative seconds across the run. Real APIs, large videos, refresh-heavy traffic and per-account limits can be much slower. Exclusive CPU/media-processing time and exclusive reporting duration cannot be recovered from these spans.

## 4. Safe batching and transaction boundaries

| Operation | Proposed change | Reliability condition |
|---|---|---|
| Read post/assets/connections and calendar entitlement | Snapshot 5–10 immediately eligible jobs; deduplicate calendar/access reads within that snapshot | Keep exact job IDs/leases; reuse existing access logic; bound snapshot lifetime; revalidate live approval, due time, account, workspace entitlement and consumer fence before each send |
| TikTok initial stored-connection lookup | Trusted preflight preload can remove the duplicate lookup | Existing locked freshness/rotation and scope checks remain; no long-lived token cache |
| TikTok last connection read | Fold its identity/status validation into the last guarded claim/send check | Same exact connection/account identity and disconnect semantics; test replacement/disconnection races; do not simply delete the check |
| Account rate reservations | One conditional server statement per required API reservation | Preserve per-account serialization, 3.1/10.1/2.1-second application intervals and conservative limits; creator calls and init calls remain separate reservations |
| Known SDK result/accepted operation | Persist durable whitelisted proof/reference immediately, then release the attempt lane | Success proof only from native confirmation; TikTok init remains pending until PUBLISH_COMPLETE; no new attempt after uncertainty |
| Post status and report projection | Small conditional batch finalizer, with exact tokens/references and returned successful IDs | Proof committed first; preserve timestamps/platform IDs; isolate reporting failures and repair only reporting; do not roll back real publication into a retry |
| Duplicate reporting repair | Carry a committed report receipt through reconciliation or verify exact stored report before marking complete | A swallowed report error must not be mistaken for a successful report; only acknowledge after commit |
| Queue readiness/canonical reads | Fetch/prepare a small fair batch; suppress redundant empty scans | Queue hints never gain authority over post/platform/lease; database remains canonical; new arrivals and older eligible jobs get bounded opportunities |
| Media transformation and network calls | Preprocess immutable media ahead of due time; keep network/CPU waits outside database transactions | Content hash and authorization must match the final post; edits invalidate preparation; publishing cannot begin before due |
| Token refresh network call | Do not naively move the existing refresh callback outside its account transaction | Current refresh rotation is serialized; a lease/fencing redesign needs independent validation before this can change |

Immediate low-risk reporting-receipt work removes up to 50 redundant upserts, 50 report readbacks and 100 heavy native transactions in this workload. At injected latency, that saves 138 / 192.3 backend-seconds, or approximately 46 / 64 seconds at ideal three-slot utilization. Those are resource savings, not a guaranteed elapsed reduction. Repair/reporting also needs to be prevented from taking an unbounded share of attempt-start capacity.

Do not remove advisory locks, lease/epoch checks, approval checks, consent hashes or scope validation to lower command counts. Do not hold a batch database transaction across HTTP publishing. Batching must preserve per-platform error isolation and exact successful IDs rather than claiming every selected row succeeded.

## 5. Five-connection feasibility and quantitative estimates

For the healthy photo mix, before irreversible requests there is one snapshot per other-platform post and approximately six heavy units per TikTok post. That is about 500 pre-send heavy transactions for 250 posts, or 100 for 50. Post-send reporting/finalization compete with them today.

Analytic database service floors only, excluding queue inefficiency, coordination, cold starts, real APIs and account waits:

| Candidate | Pre-send units for 50 / 250 | Warm floor for 250, three slots | Tail floor for 250, three slots | Tail floor for 50, three slots |
|---|---:|---:|---:|---:|
| Current native path | 100 / 500 | 230.0 s | 320.5 s | 64.1 s |
| Snapshot batches of ten only | 55 / 275 | 126.5 s | 176.3 s | 35.3 s |
| Batches of ten + two redundant TikTok reads removed | 35 / 175 | 80.5 s | 112.2 s | 22.4 s |

The last row is a **conditional design estimate**, not implemented or measured. It represents 65% less pre-send heavy work than the current path. Batch transactions may take longer than single-post snapshots, so the floor must be recalibrated after implementation. If one of the three heavy slots is guaranteed to recovery/finalization, the last-row tail floor becomes approximately 168.3 seconds for 250 / 33.7 seconds for 50 using two start slots. This leaves a plausible budget for other work while preventing recovery starvation, but is not a predicted completion time.

Targets require all-attempt throughput of at least 25 posts/minute for 50 and 50 posts/minute for 250. Current all-attempt burst throughput is about 17.7 / 14.0 posts/minute for 50 and 16.7 / 13.4 for 250. Achieving the 250 target requires roughly 3.0× warm / 3.7× tail end-to-end attempt throughput, not merely a modest coordinator speedup.

Five physical connections are not inherently proven insufficient. The current work per post, three-heavy-slot allocation and full-lifecycle platform gating are insufficient. Do not simply allocate five heavy transactions: coordination, recovery and customer-facing traffic would lose headroom. A production shared hard cap and mixed customer traffic still need verification; per-instance Prisma connection_limit=5 is not a cross-instance global cap.

Latency reduction alone lowers resource demand but does not remove polling/platform-lane constraints. As an illustration only, 500 units at 0.6 seconds use an ideal 100 seconds with three slots; no evidence establishes that latency on InterServer or a different Netlify region. A database-near deployment must be measured, not assumed.

Two hard limits apply regardless of hosting:

1. A post due just after a minute tick can wait almost 60 seconds plus positive preparation time. Strict normal-load 60 seconds needs a due-aware warm consumer/look-ahead wake or event-driven admission. An aligned test cannot certify it.
2. Existing TikTok init reservations are 10.1 seconds per account. Fifty TikTok posts on one account need at least 49 × 10.1 = 494.9 seconds from first to last init. A five-minute promise for that workload is incompatible with preserving the current pacing. SLOs must specify eligible account distribution and platform constraints.

## 6. Two viable hosting architectures

Both use the same durable database jobs, claims, proof journal, per-account controls, finalizer and reconciliation. Neither changes billing/payment/email/inbox behavior.

| Dimension | Improved Netlify worker | Persistent VPS publishing worker |
|---|---|---|
| Application hosting | Keep Next.js on Netlify | Keep Next.js on Netlify initially; move publishing worker only |
| Scheduling | Minute cron enqueues upcoming work and wakes a bounded consumer early; live not-before-due guard; event wake for newly scheduled imminent posts | Leader-elected continuous due-aware loop with short bounded sleep and optional event wake |
| Processing | Small fair snapshot batches; account-aware attempt lanes; durable finalizer/reconciler | Same pipeline and limits; persistent process avoids periodic function rotation |
| Database budget | Same verified five-backend cap and heavy-slot allocation | Same cap; no extra pool per worker or process |
| Expected benefit from host alone | Region/warmth may help if measured; existing local delays are not Netlify cold-start evidence | Current benchmarks already used long-lived consumers, so unchanged VPS at the same latency should retain similar core delay; no automatic database gain |
| Lifecycle cost | Cold start, signed wake delivery, retries, generation acknowledgement and deadline replacement must be proven | Supervision, automatic restart, graceful shutdown, leader fencing, monitoring and failure drills must be proven |
| Host limits | Scheduled 30 s; background 15 min; current candidate chooses a shorter work deadline | No imposed function cutoff, but bounded job deadlines and leases still required |
| Current qualification | No actual hosted timing or full-load rotation measurement | InterServer region, CPU/RAM, supervision and monitoring unverified; not configured |
| Target assessment | Plausible after common pipeline changes and early/due-aware wake; not certified | Plausible after common pipeline changes and verified hosting/RTT; not certified |

Netlify limits and per-function region configuration are documented officially; a region change need not alter every function. It is not performed here. [Netlify configuration](https://docs.netlify.com/build/functions/configuration/), [scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/).

**Recommended operating model:** persistent due-aware publishing consumers close to the database, with the database as durable authority and independently paced finalization/reconciliation. This is a worker-only architectural preference, not an InterServer migration approval. If the VPS cannot provide verified location, supervision and reliability, qualify the improved Netlify adapter instead. Improve the common core first so a later host transition needs an adapter/supervision change rather than another publishing rewrite.

## 7. Minimum credible change set and validation budget

There is no measured proof of a sufficient minimum change set yet. The smallest credible candidate contains:

1. Snapshot batching plus removal/folding of the two redundant TikTok reads, retaining fresh scope/token/connection and entitlement checks. Target the conditional 175 pre-send units rather than 500.
2. Separate attempt-start lanes from post-send status/reporting work after proof/operation ID is committed. Fix committed reporting receipts and batch idempotent projections; keep recovery's guaranteed share and reporting delay bounded.
3. Permit a bounded number of independent-account same-platform attempts, with round-robin opportunities across all five platforms. Do not let one account create a waiting convoy; preserve account rate/refresh locks. Raising this concurrency alone cannot bypass the database floor.
4. Due-aware execution: look-ahead preparation with a strict not-before-due/version check, or a persistent warm loop. Preserve scheduled UI semantics and cancellation/rescheduling; late new schedules need an event wake/fallback.
5. Complete physical-pool, pooler-queue and exclusive reporting telemetry before attributing further delay to connections or changing allocations. Compare models with measured multi-job snapshot duration.

An engineering budget to validate—not a performance forecast—is: normal detection/wake ≤10 seconds, pre-send path ≤40 seconds, with 10 seconds margin; for 50, active attempt-start work ≤60–90 seconds depending on wake offset; for 250, active work ≤210 seconds if up to 60 seconds wake delay and 30 seconds other overhead are allowed. The modeled 112–168-second tail service floor provides potential headroom for the last budget. None of those wall-time budgets has passed in a new implementation.

The staged qualification must cover aligned and just-after-tick schedules, continuous arrivals, shared and distinct accounts, refresh-heavy traffic, large/preprocessed media, competing application queries and partial database outages. Repeat lost acknowledgements, actual process termination, stale consumer fencing, consent/permission changes, cancellation/rescheduling/repost, status/report repair and fairness. Record zero duplicate creates and retain reference-less uncertainty in quarantine; never trade those checks for speed.

**Decision:** NO-GO for production and for claiming the provisional SLOs. The five-connection architecture has a plausible route to the targets for defined healthy multi-account workloads, but the unchanged pipeline cannot meet them, and account pacing rules make an unconditional target impossible. Next work is narrowly scoped staging instrumentation and the common pipeline candidate, not deployment or a VPS migration.
