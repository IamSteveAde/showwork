# Publishing scheduler Phase 2 assessment

**Current release recommendation: NO-GO pending the dedicated-role security review
and hosted database timing verification.**

Implementation and isolated write/throughput validation are complete. No Showwork
deployment or production customer/publishing records were changed. A credential-free
Netlify diagnostic was deployed, measured and removed. The user explicitly rejected
reuse of existing database credentials and requested a dedicated least-privilege
role with security review before project connection. That role is created with
login disabled and no password; see publishing-diagnostic-security-review.md.

## Implementation

- One minute-level cron calls the batch scheduler directly.
- Database work, including cleanup, is limited to three concurrent operations
  per invocation. The configured database client limit remains five connections.
- Each platform gets a batch of at most 20 posts per round. A round barrier and
  minute-based rotating starting order prevent a platform from taking repeat
  batches ahead of other platforms. Admission stops at 15 seconds; at most 300
  posts and 15 rounds are admitted per invocation.
- Atomic per-platform SQL performs bounded stale cleanup and conditional claims
  with FOR UPDATE SKIP LOCKED. It returns only exact claimed IDs and committed
  millisecond leases. Lease timestamps are strictly increasing and UTC-safe.
- Dispatch occurs after transaction commit. Existing background workers, manual
  API scheduler, platform provider code and worker lease guards remain unchanged.
- Per-run exclusions prevent repeating already-claimed TikTok recovery IDs.
  Accepted TikTok operations retain their provider-ID reconciliation behavior.
- Ambiguous dispatch cleanup is batched, matches the exact lease, and cannot
  overwrite a newer claim or an already-started worker. Existing stale recovery
  remains the fallback if cleanup cannot complete.
- Billing, payment, email and inbox jobs are unchanged.

## Actual isolated PostgreSQL validation

The assessment compiled official PostgreSQL 18.6 into a temporary directory and
started a disposable server bound only to localhost. A fresh synthetic schema
replicated the publishing fields and enum types. No production dump or customer
data was used. Prisma executed the real claim/cleanup SQL and the existing
worker-style conditional update using a five-connection client pool. Each test
cluster was removed after its run; no global PostgreSQL installation was made.

Latency was deliberately injected around real transactions while locks were held:
1,380 ms represents the earlier production-realistic profile; 1,923 ms is the
conservative observed verification tail. Background acknowledgement was simulated
at 500 ms, with fixture-only worker bookkeeping and no publishing provider calls.
The results below are real wall-clock staging measurements with injected network
delay, not measurements of production writes or Netlify cold starts.

| Simultaneously due posts, balanced across platforms | Runtime at 1.38 s transaction latency | Runtime at 1.923 s latency | Minute ticks required |
| --- | ---: | ---: | ---: |
| 10 | 3.283 s | 4.379 s | 1 |
| 25 | 3.281 s | 4.382 s | 1 |
| 50 | 3.312 s | 4.402 s | 1 |
| 100 | 6.090 s | 8.276 s | 1 |
| 250 | 10.019 s | 13.225 s | 1 |

Peak admitted database operations were three in every workload. All posts were
claimed and processed exactly once by fixture workers. A full batch requires
a following query to determine whether that platform has more work; the runtimes
include those empty follow-up checks where necessary.

For a skewed 250-post Instagram-only burst at 1.38 s, the first invocation
claimed 140 in 15.052 s and the next claimed the remaining 110 in 12.320 s.
With actual one-minute cron ticks, last-dispatch delay is conservatively estimated
at no more than about 1m 12.3s from the first tick. Any workload becoming due just
after a tick can add up to another minute. Provider processing is additional.

For balanced workloads, all five sizes fit in the first tick under both tested
latency settings. The function completion times above are conservative upper
bounds on final dispatch acknowledgement within those staging runs; they are not
confirmed provider-publication times.

## Fairness, overlap and recovery checks

All of these checks passed against the disposable PostgreSQL server:

1. Five simultaneous batch-claim transactions returned 80 distinct committed IDs
   with exact stored lease timestamps and no overlapping ownership.
2. Pending approvals, AI drafts and future posts remained unclaimed.
3. A rolled-back claim left its post scheduled.
4. Accepted TikTok operations recovered using their existing ID; stale unaccepted
   operations failed. A run could not reselect its own recovery IDs.
5. Cleanup could not overwrite a newer lease.
6. An oldest row locked by another transaction was skipped without blocking and
   admitted after the lock released.
7. Claim and cleanup lease matching remained correct in a non-UTC session.
8. Two overlapping full scheduler invocations processed 250 fixture posts once,
   using the existing worker-style conditional update and no duplicate starts.
9. Two overlapping accepted TikTok recovery runs processed 50 fixtures without
   repeated fixture publication.
10. Ten continuous-arrival rounds each added five posts per platform. Every platform
    dispatched five in every round; none experienced starvation.

Unit tests also verified rotating first-platform priority, round barriers, commit
failure preventing dispatch, admission deadline enforcement and platform failure
isolation. All 413 repository tests passed, including dedicated-role security
checks; TypeScript and diff checks also pass. The focused tests verify the
diagnostic authenticates before database access, issues only READ ONLY query plans,
and calls only its own dedicated no-op acknowledgement endpoint.

## Credential-free hosted Netlify measurements

A temporary authenticated project in Ohio was actually deployed and then deleted.
It had no production credentials or database access. Transactions were delayed
synthetically by 1.923 s and its first request included a 2.4 s synthetic connection
delay. Netlify execution, module initialization, HTTP routing and optional no-op
background acknowledgements were real.

| Profile | Handler time | Client end-to-end time |
| --- | ---: | ---: |
| First instance invocation, 100 posts | 10.603 s | 12.566 s |
| Warm, 10 posts | 4.352 s | 4.702 s |
| Warm, 25 posts | 4.348 s | 4.742 s |
| Warm, 50 posts | 4.348 s | 4.687 s |
| Warm, 100 posts | 8.197 s | 8.589 s |
| Warm, 250 posts | 13.046 s | 13.413 s |
| 100 five-second failed mock acknowledgements plus cleanup | 14.623 s | 14.972 s |
| 250 posts with actual no-op Netlify acknowledgements | 12.482 s | 12.865 s |

All profiles used a peak of three operations. Successful profiles processed every
synthetic post. Actual no-op acknowledgement latency over 250 calls was 66–644 ms,
median 172 ms and p95 557 ms. No real publishing worker was called. The slowest
hosted synthetic handler left 15.377 s below 30 s. These results do not substitute
for actual hosted database connection/query timings.

A further real-write isolated staging stress case injected a five-second cold
connection delay and 1.923 s transactions for 250 posts. It admitted 230 in 16.311 s,
left 20 scheduled, then picked up those 20 in 4.392 s with no duplicates. Its
estimated last-dispatch delay at minute cadence is about 1m 4.4s from the first tick.

## Runtime and concurrency recommendation

The maximum configured and validated admission concurrency is **three per
invocation**. This is not a global database connection cap: separate invocations
and background workers have their own clients. Five simultaneous local claim
transactions were safe for ownership correctness, but five-way production read
tests previously produced a timeout; a higher operational limit is not certified.

For 100 posts, adding a simulated 2.4 s cold database connection delay produced
an 8.494 s staging run. One hundred simulated five-second ambiguous dispatch
failures, including conditional database cleanup, completed in 11.952 s with
zero cleanup errors. No uncertain sends were automatically republished.

The slowest balanced staging run was 13.225 s, leaving **16.775 s** below the
documented 30 s scheduled-function limit. The skewed first run left 14.948 s.
These are staging margins, not a verified Netlify runtime margin. Application
admission stops at 15 s and transaction/cleanup limits shrink toward the 27 s
finish budget, leaving a target three-second headroom for overhead. Infrastructure
initialization, cancellation and real production write contention still need
hosted measurement before asserting that margin in production.

## Regional placement

Netlify reports Ohio (us-east-2); the production database pooler hostname indicates
Frankfurt (eu-central-1). The owner account is on the Free plan. Netlify documents
regional placement as a Pro/Enterprise feature, so no region override or plan
upgrade was made. A future approved change can target only social-publish-cron,
without moving billing, inbox or other functions. Measurements should guide that
decision rather than making placement a prerequisite for correctness.

## Prepared hosted diagnostic and remaining gate

The diagnostic sources are outside normal function discovery. The new restricted
read-only package will include only publishing-runtime, with authenticated POST,
absolute expiry, dedicated-role/destination checks, verified TLS, fixed SELECT
plans, no production dispatch and no automatic telemetry loader. It cannot use
existing admin usernames or forward DML. The role's allowed columns and safeguards
are documented in publishing-diagnostic-security-review.md. No dedicated-role
credentials are active or configured in Netlify; review and a trusted Supabase CA
certificate are prerequisites before connection. The prior credential-free project
was removed successfully.

Remaining release risks:

- Actual hosted cold-start, database-pool acquisition and cleanup-tail timings
  have not been measured for this implementation.
- The isolated schema omits unrelated production columns/foreign keys and does
  not reproduce all production indexing, transaction contention or pooler behavior.
- Simultaneous invocations can create aggregate connection pressure despite each
  having a three-operation gate.
- Dispatching large bursts can increase real background-worker/provider load;
  tests intentionally do not exercise provider quota or media processing.
- A lost database commit acknowledgement can leave an uncertain claim for the
  existing recovery mechanism, as before. It must never be blindly resubmitted.

**NO-GO for production deployment until hosted cold/warm and cleanup measurements
are completed and judged acceptable.** The code and local validation are ready
for that final measurement step. No production publishing deployment is authorized
or performed by this assessment.

References:

- https://docs.netlify.com/build/functions/scheduled-functions/
- https://docs.netlify.com/build/functions/configuration/

Reproduction:

- Run node scripts/publishing-staging-assessment.cjs with SHOWWORK_POSTGRES_ROOT
  pointing at an isolated PostgreSQL server installation. It creates its own
  fresh localhost cluster and never accepts a production connection URL.
- Run node --test tests/*.test.cjs and npx tsc --noEmit --incremental false.
- Raw staging measurements are saved locally at /tmp/showwork-phase2-staging-results.json.
