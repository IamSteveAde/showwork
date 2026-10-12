# Full platform integration readiness — 12 October 2026

Latest failure investigation and final rerun results: [publishing-failed-tests-investigation.md](publishing-failed-tests-investigation.md). Both final correctness tests passed; production remains NO-GO for timeliness and other blockers. The results below document the preceding assessment.

**Production NO-GO.** Nothing was deployed, no production database was accessed, and no real social content was published. Existing live entry points remain unwired to the candidate. The undeployed cron/config changes from earlier phases are still in the working tree; they must not be deployed accidentally.

## Measurements and limitations

These are actual local PostgreSQL/Prisma/PgBouncer executions with synthetic records and mocked external APIs, with latency deliberately injected into transactions. They are **not production or hosted Netlify measurements**. The pooler and synthetic non-superuser role cap backend connections at five; the shared heavy-operation budget is three. Four independent Prisma clients, overlapping scheduler starts, two leased consumers and a reconciliation loop exercise contention. Fixtures contain 50 posts per platform, photos, 50 distinct TikTok accounts and valid non-expired synthetic tokens. Mock API latency is only 5 ms. Real upload duration, API limits, token refresh frequency, production schema policies and cold starts can make production slower.

| Measurement | Earlier complete native run | Latest warm run | Latest tail run |
|---|---:|---:|---:|
| Injected data/control latency | 1,380 / 320 ms | 1,380 / 320 ms | 1,923 / 320 ms |
| Admission of all 250 original posts | 71.56 s | 67.85 s | 69.83 s |
| Confirmed publication + reporting of all 250 | 1,708.07 s (28m28s) | Not established; run failed | Not established; run failed |
| Maximum publishing delay | 1,713.15 s (28m33s) | Not retained in failure artifact | Not retained in failure artifact |
| Backend / heavy-operation peaks | 5 / 3 | 5 / 3 | 5 / 3 |
| Duplicate external create attempts | 0 | Not retained in failure artifact | Not retained in failure artifact |
| Recorded errors | 7 capacity deferrals | P2028 + 2 initialization errors | numeric code 23 + 4 P2028 + 3 initialization errors |
| Acceptance outcome | FAIL: strict no-error assertion | FAIL | FAIL |

The earlier completed run's seven `PUBLISHING_DEFERRED` entries are budget backpressure, **not seven PostgreSQL failures**. Its transaction timings were p50 1,400.94 ms, p95 1,630.31 ms, max 2,080.36 ms across 2,031 measured transactions. Each platform confirmed 50 posts and reporting contained 250 rows. It is useful throughput evidence, but is an earlier code revision and cannot certify the current candidate.

The latest warm run was observed at 249 confirmed and one PREPARED before its terminal failure. The latest tail run was observed at 223 confirmed with remaining READY, PREPARED, PROVIDER_PENDING and OUTCOME_UNKNOWN jobs. These are intermediate observations, not final totals. The old runner did not retain its final state snapshot on failure. The runner now persists aggregate checkpoints and duplicate counts while running, so a failed repeat retains evidence. Error origin needs correlation: the recorded initialization errors must not be assumed to be publishing failures or dismissed as cleanup without evidence. `platformFailures` in those artifacts is indexed by consumer, not platform; it cannot establish a platform-specific failure rate.

Admission is not publication. The 250-post throughput is approximately 8.8 confirmed posts/minute in the completed native run. There is no demonstrated improvement over the earlier simplified 10-minute test: the native run exercises substantially more database and platform steps. Its peak delay is not acceptable evidence of timely production publishing. No successful full 250-post rerun exists after the final recovery patch.

## Integrated candidate

Existing publishers are reused through optional database injection, retaining default callers. The candidate uses the same calendar access checks, workspace entitlement, approval, connection selection, token refresh, media preparation, TikTok consent and request reservations, platform providers and publication reporting. Its database facade budgets native ORM operations and joins only short database units of work. No external media/publishing call is moved into an admission transaction.

Conditional batch admission preserves exact IDs and leases. Private worker tokens and consumer epochs fence overlapping actors. The external boundary commits immediately before the irreversible platform request, after native validation/preparation. A provider acceptance is stored separately from confirmed publication. TikTok requires PUBLISH_COMPLETE; restart recovery uses the existing operation ID and status reads, never a new upload init.

Native publication metadata and reporting use a short unit of work with a reporting savepoint. Reporting failure can be repaired without reposting. Confirmed remote results retain whitelisted durable proof when final acknowledgement is lost. A response lost before any recoverable provider reference remains quarantined; no automatic retry creates a second post.

Two final hardening changes were made after the failed load runs:

- When an actor finishes, its signal is aborted and only its exact-token PREPARED claim has its worker lease expired and consumer ownership cleared. This prevents a still-live consumer lease protecting a dead pre-send actor indefinitely. The conditional update cannot change EXTERNAL_PENDING or unknown outcomes. If that cleanup itself fails, durable expiry/consumer recovery still applies; this must be tested during extended outages.
- Failure to finish database confirmation retains the known remote reference and optional proof rather than discarding them when quarantining the outcome.

These changes are targeted fixes, not proof that every observed load failure has been resolved.

## Verified isolated tests

Sanitized JSON evidence is in `docs/assessments/publishing-full-platform/`.

- All five native photo publishers save confirmed status, timestamps, references and reporting. TikTok acceptance stays pending until its status lookup confirms publication.
- Native video paths on all five platforms complete against mocks. TikTok runs actual ffprobe on generated H.264 bytes; photos use actual Sharp conversion. This does not validate large production media or real provider encodings.
- Invalid TikTok consent, insufficient X scopes and inactive workspace access prevent creates. Actual application route handlers reject anonymous/non-owner actors using synthetic authentication; real authentication sessions were not exercised.
- Synthetic X/LinkedIn refresh works; overlapping TikTok refresh rotates once per account with the existing shared request reservations.
- Lost native final commit acknowledgement recovers using proof without a second create. A real reporting FK failure rolls back reporting only, preserving publication status, and reporting repair succeeds.
- Cancellation/rescheduling fence old claims; accepted/confirmed TikTok outcomes cannot be reset by a checkbox. Existing explicit known-rejection retry checks remain. Production routes have not been wired to the proposed durable action guard.
- Actual SIGKILL/restart before sending resumes once. SIGKILL after mocked Facebook acceptance without a reference stays quarantined. SIGKILL after TikTok's durable operation checkpoint resumes status-only recovery. Recovery lease expiry is accelerated in these tests.
- A stalled TikTok media path does not stop 12 other-platform posts. Shutdown before send prevents a late init when media IO returns. This verifies isolation in a bounded workload, not sustained-arrival fairness under full production latency.
- Simulated duplicate/lost wake delivery, two-consumer leadership, old epoch fencing, authenticated hint-only requests and emergency disable pass. These are local adapter simulations, not actual Netlify delivery/shutdown observations.
- Legacy delayed envelopes are fenced by a revised lease; accepted TikTok operations migrate to status-only recovery; stale started work remains uncertain. This bridge has not been activated.
- New real staging fault test: pre-send database read and rejection-write failures do not strand a prepared job behind a live consumer lease; stale token cleanup fails safely; cleanup cannot requeue a committed external boundary.

The earlier regression suite passed 126 tests. After the recovery patch, 20 targeted reliability/consumer/runtime tests passed, TypeScript checking passed, and `git diff --check` passed. The 10-post native lifecycle smoke confirmed all 10 with zero recorded errors in 3.81 seconds using zero injected latency; it is not a realistic throughput assessment.

## Remaining blockers and exact next step

1. **Load reliability and evidence:** rerun both full 250-post scenarios after the recovery patch, with retained terminal snapshots and phase-specific transaction/error traces. Resolve any P2028 or stranded claims; require 250 distinct confirmed posts and reporting rows, zero duplicate creates, bounded connections and attributable error/recovery outcomes. Current failed results cannot certify this candidate.
2. **Timeliness:** profile database phases and coordination contention under realistic latency. Batch status/report persistence where safe; avoid polling idle reconciliation queues unnecessarily; retain account reservations and durable external boundaries. Determine an acceptable publishing-delay SLO before declaring peak capacity sufficient. Raising the budget beyond three is not validated as safe.
3. **Hosted runtime:** actual cold/warm starts, schedule delivery, durable wake retries, deadline cleanup and worker replacement remain unmeasured. No 30-second scheduled-function margin can be certified from admission alone; the maximum earlier admission tick was approximately 15.6 seconds but excludes hosted startup/cleanup. A backlog may span several worker invocations. Hosted validation requires a separately authorized isolated deployment; none is requested here.
4. **Integration rollout:** proposed ledger schema is not an installed production migration; production cancellation/repost routes and legacy worker ownership need an atomic rollout strategy. No live mixed old/new scheduler operation is acceptable.
5. **Production security/behavior:** production-specific effective permissions, RLS/custom triggers, egress, credential revocation and hosting isolation remain unverified. Real provider sandbox behavior and uncertain-outcome resolution require further validation.

**Next step is offline/staging work on item 1, not production activation.** The candidate remains outside Netlify function discovery. No production approval request is appropriate while these critical blockers remain.

## Future InterServer VPS

The core store, native integration, consumer, reconciliation and lifecycle controls are independent of Netlify handlers. A future continuously running process can reuse tick/consume with graceful signal handling and the same database budget. It may avoid repeated cold starts and wake HTTP delivery, and allow continuous draining, but does not remove database round-trip latency, account limits or uncertain outcomes. A VPS is not yet configured; region, CPU/RAM, process supervision, monitoring, durable restart and backups must be verified before comparing reliability. Moving now would relocate the current load/recovery blockers. Keep the five-backend global budget across application and workers, not five independent connections per process.

## Files changed in this continuation

- `lib/publishing/reliableStore.ts`: exact-token PREPARED ownership release.
- `lib/publishing/reliableWorker.ts`: abort-and-release cleanup; retain confirmation reference/proof.
- `scripts/publishing-reliability/full-platform-assessment.cjs`: persist intermediate aggregate failure evidence.
- `scripts/publishing-reliability/prepared-recovery-validation.cjs`: new real staging fault test.
- `tests/publishing-reliability.test.cjs`: confirmation guard/proof regression test.
- This report and sanitized JSON under `docs/assessments/publishing-full-platform/`.

The broader native integration files from the preceding work remain uncommitted in the workspace. This continuation did not edit Netlify deployment configuration or live function entry points.
