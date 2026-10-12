# Failed 250-post lifecycle investigation

Next performance phase: [publishing-performance-assessment.md](publishing-performance-assessment.md). Peak attempt-start targets remain unmet; production remains NO-GO.

## Final decision and measured results

**Both final 250-post correctness tests PASS. Production remains NO-GO because peak publishing timeliness and hosted runtime behavior are not established.** Neither pass certifies production deployment. No production access, deployment or real publishing occurred.

| Final measurement | Warm scenario | Tail scenario |
|---|---:|---:|
| Injected transaction / control latency | 1,380 / 320 ms | 1,923 / 320 ms |
| Admission of all 250 | 67.97 s | 69.59 s |
| Full confirmation of all 250 | 22m55.12s | 34m14.53s |
| Maximum recorded publishing delay | 23m01.98s | 34m21.32s |
| Native PUBLISHED / durable CONFIRMED / reporting rows | 250 / 250 / 250 | 250 / 250 / 250 |
| Recorded database / operational errors | 0 / 0 | 0 / 0 |
| Duplicate final publishing attempts | 0 | 0 |
| Maximum heavy operations / backend connections | 3 / 5 | 3 / 5 |
| Transaction p50 / p95 / maximum | 1,396.87 / 1,410.74 / 1,522.43 ms | 1,940.56 / 1,953.50 / 2,095.75 ms |
| Measured transactions | 1,945 | 2,123 |
| Completion throughput | 10.91 posts/min | 7.30 posts/min |
| Largest measured admission tick | 15.57 s | 16.65 s |
| Final unresolved / cancelled / rejected jobs | 0 / 0 / 0 | 0 / 0 / 0 |
| Seven independent acceptance checks | All pass | All pass |

These are **actual local elapsed measurements with injected latency and mocked social APIs**, not actual Netlify or production measurements. “Publishing delay” is the difference between scheduled postDate and the native published timestamp, including confirmation/polling delay. It is not an observed real platform visibility timestamp. Duplicate counters track final create/init operations; status reads and repeated media preparation are not duplicate publications. All five platforms finished 50 distinct posts and reporting records each. Admission and successful confirmation are separate measurements.

Final run IDs: warm `62c6526c-2433-4fa3-8f70-062eefc2ab3a`; tail `a5b9d505-eccf-4dac-8b61-a7948d0776b0`. Their JSON artifacts and matching source hashes are under `docs/assessments/publishing-failure-investigation/`. Both temporary clusters and their credentials/certificates were removed; assessment runner processes exited.

Reconciliation remains a material architecture cost even in passing runs. Initial worker outcomes were warm: 194 confirmed, 33 provider-pending, 23 outcome-unknown; tail: 156 confirmed, 42 provider-pending, 52 outcome-unknown, plus six retryable and two deferred events. These are **worker events**, not terminal failures or unique failed posts. Durable reconciliation completed the remaining confirmations without new creates. No mock platform rejection remained. They show that constrained finalization can move otherwise successful native results into additional recovery work; zero PostgreSQL errors does not mean zero budget contention.

The architecture demonstrated safe completion of this finite burst, but cannot deliver these tested peaks close to their scheduled minute at the supplied latency. A one-minute admission cadence is preserved; timely publication of 250 simultaneously due posts is not. No agreed maximum-delay SLO or sustained arrival-rate capacity has been demonstrated. Moving unchanged to a VPS would not fix the measured database/coordination bottleneck.

**Exact next step:** profile native database phases and guarded finalization in isolated staging; reduce avoidable round trips/reconciliation writes while preserving committed claims, proof and account reservations, then validate a defined publishing-delay target. Do not increase the five-backend budget or request production activation. Hosted cold-start/worker rotation/wake tests, production permission/security review, real provider contract validation and extended database-outage testing remain blockers.

Production remains NO-GO. This work uses disposable local PostgreSQL, Prisma and a TLS-verified transaction pooler capped at five backend connections; all posts/accounts/media are synthetic and every social API is mocked. Latency is injected. No production credentials, queries, publishing or deployment are involved.

## Historical acceptance failures

The old runner used sequential assertions. Once one failed, later checks were not executed; those checks cannot be reported as having passed merely because they were never reached. Several exception handlers replaced the actual message with `FULL_PLATFORM_CHECK_FAILED` and stored only an error code. Some runs did not retain terminal states. Exact historical SQL/error messages are irretrievably missing; the reproductions below establish concrete failure mechanisms without fabricating lost logs.

| Historical run prefix | Known failing check / outcome | What evidence establishes |
|---|---|---|
| e2b4ad2b | `errors.length === 0` | All 250 published, confirmed and reported; zero duplicate creates; peaks 3 heavy / 5 backend connections. Its seven entries were `PUBLISHING_DEFERRED`, expected capacity backpressure misclassified by the harness as database errors. 28m28s completion and 28m33s maximum delay are real timeliness concerns, independent of the assertion defect. |
| e06d44dd | Published count: 249 rather than 250 | Interrupted run with 49 Instagram and 50 on each other platform; confirmed/reporting 249, zero duplicate creates, zero recorded DB errors. Later assertions were not reached. Interrupted elapsed time must not be called successful completion. |
| 25aa88f0 | Published count: 225 rather than 250 | Interrupted tail run: confirmed 223, reporting 225, one P2028, zero duplicate creates. Later checks were not reached. Reporting/status existing without ledger confirmation is unfinished lifecycle, not an additional successful confirmation. |
| 311da01b | Explicit rejection in happy-path load | TikTok `Publishing lease changed before sending`, zero recorded DB errors. Earlier composition returned false after exhausting capacity retries, incorrectly treating a capacity refusal as a changed lease. Composition now throws PUBLISHING_DEFERRED; current candidate distinguishes that known-no-send condition from uncertainty. |
| 30339c9c | Unhandled loop failure; terminal metrics missing | P2028 and two initialization-error entries; admission 67.85 s. Last observed 249 confirmed / one prepared is not a terminal outcome. |
| 130f5d40 | Unhandled loop failure; terminal metrics missing | Four P2028 and six initialization-error entries; admission 70.76 s. Exact failed statement and primary exception message not retained. |
| 8826003a | Unhandled loop failure; terminal metrics missing | Four P2028, three initialization errors and numeric code 23; admission 69.83 s. Code 23 alone does not establish its originating operation. It is consistent with a DOM timeout but cannot be retroactively identified without its name/message. |

No historical evidence shows a duplicate external create in the runs which retained attempt counts. Runs lacking attempt snapshots cannot be assigned a verified zero.

## Reproduced causes and fixes

1. **Overlapping claims and an undersized deadline.** Instrumented tail reproduction df5eeb2f captured a Prisma P2028 at COMMIT: 3,267 ms elapsed against a 2,500 ms interactive deadline. Trace: statement timeout setup, advisory-slot validation, consumer lease FOR SHARE, conditional batch preparation. A competing preparation could wait for an already-held job row before re-evaluating ownership. At 1,923 ms injected transaction latency, the remaining deadline was only 577 ms. Preparation now locks candidate job rows with FOR UPDATE SKIP LOCKED before updating; both single and batch entry points use the same guard. Exact IDs, leases, approval, unstarted post checks, tokens and live consumer exclusion remain. Default bounded heavy transaction timeout is 5 seconds; maxWait stays 2.5 seconds and statement timeout stays 2 seconds. Slot lease duration still exceeds transaction duration. A held-row staging probe showed the losing consumer returning zero claims in 23.28 ms while the first transaction still held its claim; ownership remained unique.

2. **Temporary native failure stranded by retry persistence.** Tail reproduction 38251bc8 showed Instagram native-10 failing before any final publishing request with `Database capacity unavailable before publishing`. The native helper saved FAILED and the facade synchronized its owned lease, but worker rejection/retry persistence required an available heavy slot. A refusal was swallowed. Cleanup released the prepared actor; invalid-job recovery then cancelled the claim, while the post remained FAILED. This is an architecture/recovery defect, not a mock-platform rejection. Retry/rejection persistence is now one exact-token, phase-guarded autocommit coordination CTE using reserved backend capacity, like uncertain-result checkpoints. It never creates a platform post and does not authorize replay of an uncertain outcome. The staging fault test occupies all three heavy slots and verifies that native temporary FAILED becomes durable READY/PUBLISHING with its minute backoff. Pending external states remain excluded from prepared cleanup.

3. **Artificial control lock retention.** The old latency wrapper implemented each control query as an interactive transaction and slept after its statement, retaining locks for another 160 ms. Production control statements are autocommit. The harness now sleeps before/after the autocommit statement to simulate transport latency without inventing a transaction/lock lifetime. Heavy transaction latency continues to be injected inside its transaction, conservatively holding its backend throughout.

4. **Teardown races and lost error evidence.** Promise.all previously rejected on the first loop failure; teardown disconnected clients while sibling scheduler/consumer/reconciliation loops were still running. That can cause secondary initialization errors and erase the primary failure context. The harness now aborts and joins all loops before disconnecting, captures code/name/message, elapsed time and sanitized statement/model trace, persists checkpoints and final phase counts, and evaluates acceptance checks independently. Historical initialization errors cannot all be assigned to teardown with certainty; subsequent instrumented errors must be classified at their actual source.

5. **Finished pre-send actors remained protected by live consumer leases.** The prior continuation added exact-token PREPARED-only ownership release after aborting the actor. It cannot release a committed external boundary. A real staging test confirms a failed preflight/rejection-write actor becomes eligible again while its consumer lease remains alive; stale tokens cannot release replacement ownership. Combined with durable retry persistence above, native temporary status no longer becomes silently stranded during normal budget pressure. Extended full-database outages still require recovery validation rather than assuming a successful write.

6. **Publication confirmation and uncertainty are separate.** A published native status with ledger OUTCOME_UNKNOWN is a database-finalization/reconciliation delay, not proof of a failed platform publish. Known references/proofs are retained for DB-only/status-only reconciliation. TikTok PROVIDER_PENDING is acceptance, not PUBLISHED; it requires PUBLISH_COMPLETE. A reference-less uncertain response remains quarantined, with no automatic republish. These distinctions remain in acceptance reporting.

## Validation scope and hosting limits

The full assessments deliberately exercise actual local transactional SQL, native publishing code, private worker ownership and reconciliation. They do not exercise real external rate limits, production RLS/custom triggers, Netlify cold starts or actual scheduler/background delivery. The two publishing consumers remain alive across minute-long drain rounds during the load assessment; it does not emulate replacing their processes at every host deadline. Process termination is validated separately with actual SIGKILL and mocked external outcomes.

Netlify scheduled functions have a 30-second limit, and background functions have a 15-minute limit. Admission must fit the scheduled window; long publication backlogs belong to durable background consumers across multiple invocations. A local admission tick below 30 seconds is not a verified hosted runtime margin. The candidate portable consumer sets a shorter ten-minute working deadline, but rotation/wake delivery under a 250-post hosted load remains unverified. [Netlify function configuration](https://docs.netlify.com/build/functions/configuration/), [scheduled-function limitations](https://docs.netlify.com/build/functions/scheduled-functions/).

The reproduced P2028 happened in local Prisma/PostgreSQL and was caused by its transaction deadline and overlapping row-lock acquisition, not a Netlify execution cutoff. The native temporary failure stranded behind a heavy-slot refusal was a scheduler recovery defect. Artificial lock retention and concurrent teardown were harness defects. Long peak processing time reflects assumed database latency, many native/database coordination steps and bounded worker/account concurrency; it cannot be attributed to Netlify cold starts because none were measured.

A continuously running future VPS worker can reuse the publishing core and avoid function rotation/wake overhead, but it cannot erase database round trips or account throttles. A nearer region might lower RTT, subject to actual measurement. The InterServer VPS is unconfigured, so no measured VPS capacity or reliability claim is available.

Native permission, consent, refresh, savepoint/reporting, cancellation and known-rejection retry validation passed after the fixes. All 130 publishing/security/media/calendar regression tests passed with the local diagnostic parser listener allowed. The earlier EPERM listener failure was a sandbox restriction, not an application failure. TypeScript and syntax checks passed.

## Final warm result

Run `0b88f6e1-354b-4665-a789-5f1a5a1e17f8` passed all seven independent correctness acceptance checks: 250 native PUBLISHED records, 250 durable CONFIRMED jobs, 250 reporting rows, zero duplicate creates, zero recorded database errors, heavy-operation peak three, backend peak five. Every platform confirmed 50 posts; no READY, PREPARED, pending, unknown, cancelled or rejected jobs remained.

Admission of all 250 took 67.109 seconds. Full confirmation took 1,365.910 seconds (22m45.9s). Maximum publication delay, measured from each scheduled postDate to its native published timestamp, was 1,371.420 seconds (22m51.4s). These clocks differ: lifecycle completion includes ledger confirmation/polling, while publication delay includes fixture due-time offset and setup. Admission never counts as publication.

Database transaction durations: p50 1,399.90 ms, p95 1,411.51 ms, max 1,561.30 ms, 1,942 measured transactions. This is a real local timing measurement with 1,380 ms injected database transaction latency and 320 ms injected control round-trip latency, not production network latency measured during this run.

The completed earlier run took 28m28s; the new warm run takes 22m46s. This is not a clean production A/B optimization benchmark because the old harness's artificial control locks and teardown semantics were corrected. The new full native run still does not match the earlier simplified ten-minute estimate.

Actual SIGKILL recovery tests passed again after the fixes: restart before send publishes once; acceptance without a recoverable response stays quarantined; a durable TikTok operation resumes status-only recovery. Three mocked create attempts were recorded across those scenarios, with zero duplicates. Recovery lease expiry is accelerated; no real provider is contacted.
## Additional tail failure discovered and fixed

The subsequent tail run `72489a99` did **not** complete. Read-only inspection of its synthetic ledger identified LinkedIn `native-73` and `native-148` with known returned publication references, no persisted confirmation proof, and native status still PUBLISHING. These were not mock API rejections or database transaction errors. A budget refusal happened before the completion unit-of-work callback ran. Proof capture was inside that callback, so successful native SDK results lost their exact metadata before reaching durable quarantine. Generic reconciliation correctly refuses to infer confirmed publication from a bare LinkedIn ID, so these jobs could not finish automatically. The run was deliberately stopped, with zero duplicate creates; its interruption and final partial states are retained. It is a failed lifecycle, not a passed tail test.

The correction captures whitelisted native confirmed-result metadata **before** entering the database completion gate. Facebook, LinkedIn and X use the existing provider's successful result. Instagram gets an optional internal confirmed-result hook after native media publication/permalink processing. TikTok gets an optional hook only after native PUBLISH_COMPLETE, never after upload acceptance. Default production callers do not supply these hooks. Private proof remains tied to the validated account and job, and is persisted through exact-token quarantine before being forgotten. Known confirmed TikTok results whose database completion fails now carry proof into reconciliation, rather than degrading to acceptance-only state.

A failed accepted-operation checkpoint also now passes its known operation ID to quarantine. This does not create publication proof or mark it PUBLISHED; it avoids treating an operation with a known ID as a reference-less unknown result.

New staging fault validation forces database failure **before completion callback entry** on each of the five native publishers. Every confirmed outcome retains proof, then reconciles status/reporting with exactly one create. A separate TikTok acceptance-only fault retains the operation ID while confirmation remains null and published timestamp remains null. These tests passed. The earlier warm pass above predates this last correction; both realistic-latency assessments are repeated again below on the corrected code.
## Publishing capacity and remaining limits

A complete finite burst with no lost/duplicate posts is a correctness test. It is not an acceptable-delay SLO by itself. One-minute admission cadence does not imply that 250 due posts publish within one minute. The supplied database latency and current number of budgeted native transactions make large bursts take many minutes. Before production consideration, define the permitted delay by platform and expected bursts/arrival rate, and test it explicitly. Sustained arrivals above measured completion throughput would grow a queue rather than preserve timely publishing.

The current three-heavy-operation / five-backend configuration is the one validated here; increasing concurrency beyond that is not certified. Read-only snapshots, native account reservations, checkpoints, short completion units, job confirmation and reconciliation all contribute database round trips. Bounded concurrency and fairness preserve safety, but do not eliminate those costs. Core transition/finalization capacity refusals can add reconciliation work even without a database error; confirmed SDK results must retain proof through that pressure.

The complete native workload uses photos and 50 distinct TikTok accounts with healthy, non-expired synthetic tokens. Native refresh and video behavior is tested separately, not timed as part of the 250-post load. Existing TikTok init reservations are 10.1 seconds apart per account; bursts on one account have another rate constraint. Large videos, real API delays, refresh-heavy traffic, customer-facing queries and production permission policies can make this fixture optimistic. Fixed injected transaction latency does not reproduce the RTT of every query in a larger production transaction.

These tests do not prove recovery through an extended complete database outage spanning every coordination write and cleanup. The busy-slot recovery test proves the observed capacity failure is fixed, and SIGKILL tests prove specified durable states recover safely. A full-network/database-blackout fault assessment remains necessary before claiming comprehensive outage recovery. Unknown external results without recoverable references remain deliberately quarantined; manual or provider-specific reconciliation is required, never automatic republishing.
## Reconciliation diagnostic deadline

The first final-core tail run `ef1154fc` recorded numeric code 23 in the outer reconciliation catch, with no matching data/control transaction error. This path wraps the complete read-only status/confirmation chain in AbortSignal.timeout(60,000). In this mocked workload, provider requests take approximately 5 ms; the deadline covers database-budget/entry waits as well as queries. Its origin is an expired reconciliation operation, not a PostgreSQL query/commit error. Unlike historical logs, the instrumented run retained transaction traces, establishing that no transaction failure accompanied this event. The job remains pending for another status-only attempt; no second create was sent.

The staging diagnostic now bounds that chain at 120 seconds, below the three-minute reconciliation lease, and records the error name/message and job trace when it catches a timeout. This does not increase per-provider HTTP deadlines, admission windows, native publishing deadlines or production configuration. Both latency scenarios were restarted under the same diagnostic setting, with strict zero-recorded-error acceptance still in place. The interrupted runs are retained and are not called passing assessments. Hosted cleanup must independently demonstrate a complete function runtime below its host limit; this staging setting does not certify that margin.
## Files and change risks

| File | Change | Review concern |
|---|---|---|
| `lib/publishing/reliableStore.ts` | Nonblocking conditional claim acquisition; 5-second default heavy transaction deadline; short guarded retry/rejection coordination write | Longer transaction deadline can occupy a backend longer. Global budget/lease still bounds it. Locked candidates defer to later opportunities; exact lease/approval/token checks remain. Whole-database outage behavior is not established by the busy-slot test. |
| `lib/publishing/reliableWorker.ts` | Retain accepted TikTok operation reference when checkpoint fails; existing exact-token cleanup and confirmed-proof quarantine | Acceptance remains distinct from publication. No SDK create is retried to recover a storage acknowledgement. |
| `lib/publishing/platformIntegration.ts` | Capture private confirmed-result proof before database capacity wait; durable reconciliation receives exact native metadata | Proof must originate from successful native publishing, remain tied to the validated account/job, and never be fabricated for an ambiguous response. Native fault validation exercises all five platforms. |
| `lib/instagramPublishing.ts` | Optional confirmed-result callback after native publication/permalink processing | Existing default callers omit the callback. No new network request, permissions bypass or publishing retry. |
| `lib/tiktokPublishing.ts` | Optional confirmed-result callback after PUBLISH_COMPLETE | Upload acceptance does not invoke it. Native callback fault test verifies this distinction. |
| `scripts/publishing-reliability/full-platform-assessment.cjs` | Correct autocommit latency model, join loops before teardown, retain traces/checkpoints, independent acceptance checks, bounded reconciliation diagnostic | Injected timings are a model, not a hosted measurement. Strict zero-error checks remain; interrupted runs are retained as unsuccessful. |
| `scripts/publishing-reliability/claim-contention-validation.cjs` | Held-row concurrent-owner validation | Disposable synthetic SQL only. |
| `scripts/publishing-reliability/prepared-recovery-validation.cjs` | Native temporary FAILED status / all-heavy-slots-busy retry test | Validates the reproduced failure, not every possible outage. |
| `scripts/publishing-reliability/confirmation-proof-validation.cjs` | Database failure before completion callbacks; accepted TikTok checkpoint failure | Provider responses are mocked; verifies core handling, not real provider contract behavior. |
| This report and `docs/assessments/publishing-failure-investigation/` | Sanitized measured evidence and source hashes | Earlier/interrupted artifacts remain separate from final results. |

Production entry points, billing, payments, email notifications and inbox jobs were not changed in this investigation. Earlier undeployed cron/config edits remain in the workspace; no configuration was deployed. The portable store/integration/worker core remains reusable by a future continuously running VPS supervisor.
