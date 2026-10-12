# Consolidated publishing scheduler (Phase 2)

`social-publish-cron` remains the sole minute-level publishing schedule. It calls
`runPublishingBatchScheduler` directly; no Next.js publishing API hop is made.
The Instagram and TikTok cron files are removed. The manual/API scheduler and
all background workers retain their existing code.

## Fair, bounded admission

Normal and failure-recovery transactions share a three-operation gate. A run
admits new batches for 15 seconds and reserves a finish budget of 27 seconds.
Each platform receives at most 20 posts per round. All five platforms finish
their round before any receives another batch, and the starting platform rotates
by UTC minute. Each run is capped at 300 claims and 15 rounds. This preserves
opportunities for low-volume platforms during sustained traffic on another.

Each platform uses one atomic PostgreSQL statement for stale cleanup, candidate
selection, and conditional batch claims. `FOR UPDATE SKIP LOCKED` prevents
overlapping schedulers from waiting on or claiming the same locked candidates.
Approval, AI-draft, due-date, status and `updatedAt` conditions remain enforced.
Only database-returned IDs and exact millisecond lease timestamps are dispatched,
after the transaction commits. Leases are strictly newer than prior leases and
normalized to UTC independently of the database session timezone.

TikTok accepted publish IDs retain their reconciliation path and are excluded
from ordinary stale failure. An invocation excludes its own already-claimed IDs
from later rounds, preventing repeated TikTok recovery within the same run.
The existing worker's exact lease and `publishWorkerStartedAt` guard remains
the final authority for starting provider work.

Failed dispatches are cleaned up in a conditional per-platform batch. Cleanup
matches the exact ID, platform and lease, and requires an unstarted worker.
It cannot overwrite a newer claim or a worker that has started. Ordinary
ambiguous dispatches fail for reconciliation; accepted TikTok operations remain
PUBLISHING so their existing provider ID can be checked. No uncertain send is
automatically treated as safe to republish. Existing 16-minute stale recovery
remains the fallback if cleanup itself fails.

The gate checks deadlines after queueing, connection acquisition and timeout
setup. Transactions retain a 1.5-second maximum acquisition wait, a 2.5-second
transaction limit, and a transaction-local two-second statement timeout.
Recovery transaction limits shrink near the finish budget, and no new recovery
transaction is started with less than one second remaining. These are application
budgets, not a blanket guarantee against infrastructure or cancellation stalls.

## Deployment

- Publish a full current-source build only after the Phase 2 assessment permits it.
- Confirm exactly one publishing schedule, `social-publish-cron`, every minute;
  no Instagram/TikTok cron artifacts and no external duplicate cron callers.
- Preserve `publish-post-background` and its media binaries.
- Confirm production Functions-scope database URL, cron secret and Netlify site
  URL. Prisma's Linux query engine is explicitly included in `netlify.toml`.
- Review first-round per-platform counts, errors, failed acknowledgements and
  deferred work. Check cold/warm runtime, locks and backlog age under bursts.
- Verify controlled test-account publishing separately; staging and diagnostic
  tests never publish real content.

Netlify documents a 30-second scheduled-function limit. Frankfurt placement
could reduce database round trips, but the current Free plan does not include
regional configuration. No region override or plan upgrade is made in this change.

The recurring invocation saving remains five executions/minute, estimated
223,200 over a 31-day month. Reliability takes precedence over these savings.
Background work and necessary provider requests remain.

## Validation artifacts

`scripts/publishing-staging-assessment.cjs` creates a disposable localhost-only
PostgreSQL cluster, runs real SQL writes on synthetic fixtures, simulates
production latency, verifies worker leases, and removes its cluster. It never
accepts a production database URL. It requires a PostgreSQL installation via
`SHOWWORK_POSTGRES_ROOT` (defaulting to the assessment's temporary installation).

`scripts/diagnostics/publishing-runtime.ts` is a standalone authenticated, expiring
diagnostic and must never be added to normal function discovery. Production mode
requires the dedicated read-only role, verified TLS and a pinned database host.
It enforces READ ONLY transactions and runs fixed SELECT plans only; dispatch is
synthetic. Existing production/admin credentials are rejected. No-op background
acknowledgements are available only in the separate credential-free mode.
The dedicated role is inactive pending the security review described in
`publishing-diagnostic-security-review.md`. Credentials must be revoked and the
temporary project removed after testing.

See `publishing-phase2-assessment.md` for measurements and release recommendation.
