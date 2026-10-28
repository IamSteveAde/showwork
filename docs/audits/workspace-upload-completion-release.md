# Workspace upload completion reliability

Implemented locally. No production migration, deployment, VPS action or paid AI test was performed. No new schema fields or environment variables are required.

## Confirmed cause

The legacy post and document completion handlers reread a pending reservation inside a transaction without locking it. Concurrent requests could both observe PENDING and consume the same receipt, provided the owner had enough other reserved storage. A transaction alone did not prevent this Read Committed race. Reservation release and expiry cleanup had the equivalent race.

## Changes

- `lib/workspaceUploadLocks.ts`: parameterized PostgreSQL row locks for a receipt and usage counters; evaluates database clock after lock acquisition to include lock-wait time in expiry checks.
- Post completion locks its parent post and receipt, rechecks expiry, byte binding and current content-edit eligibility, and commits receipt status, asset and counters together. Concurrent/replayed calls return the existing asset without another charge. Completed receipt replay is read-only even if the post has since been approved. Asset order uses max existing order plus one under the post lock.
- Document completion locks the workspace and receipt; the losing request returns the saved document without a second insert, charge or knowledge rebuild. Replayed responses serialize BigInt correctly and identify `alreadyCompleted`, so the UI does not mislabel a replay as a failed summary update.
- Banner completion locks the workspace and each receipt, uses guarded atomic usage updates, and accepts replays only while the completed banner remains current. It reads previous banner references under the lock. Title-only changes no longer delete unchanged banner files; replayed variants skip old-banner cleanup. New banner references require a correctly bound receipt. Authorized collaborators reserve the workspace owner's storage rather than their own.
- Presign routes generate UUID object keys, preventing same-millisecond/same-name collisions. Existing keys remain supported.
- Reservation release and expiry cleanup lock the same receipt before usage. Usage readers lock counters before computing decrements. This prevents concurrent release/cleanup from decrementing the same reserved bytes twice or creating negative counters from stale reads.
- `POST /api/calendars/[id]/uploads/cancel` checks authentication, workspace/feature permission and owner/calendar/key binding, and releases only pending receipts. Completed files are never deleted or uncharged by cancellation.
- The shared queue registers cancellation release after preparation. If cancellation happens while preparation is in flight, it releases the receipt as soon as the response arrives. Failed release is shown in the tray; existing automatic expiry cleanup remains the fallback. Saving is still non-cancellable because its commit may already have happened.
- The canonical publishing integration boundary is preserved. Its existing locked media/receipt implementation remains authoritative when explicitly installed; this change does not switch publishing modes or bypass hash/version verification, review or publishing locks.

## Validation and limits

The focused suite covers concurrent completion with spare reserved bytes, replay after approval, expiry/approval changes during verification, transactional rollback/retry, concurrent document saves, exactly-once reservation release, cancellation/completion races, overlapping cleanup jobs, authorization, banner replay/title-only edits and canonical dispatch. Queue, delivery and team/storage regressions are included.

73 focused tests passed; the source-only TypeScript check passed. Lock SQL was also executed against an isolated in-memory PostgreSQL implementation (PGlite), with no production connection. Concurrency tests use a transaction/row-lock fixture; they are not multi-session production PostgreSQL or live R2 tests.

An additional historical publishing-boundary snapshot test fails on `app/[slug]/page.tsx`. That file is unchanged from Git HEAD; its mismatch with the older inventory predates this upload change. The other five boundary tests pass. The inventory was not rewritten to hide this failure.

This change does not reconcile historical duplicates, add resumable/multipart upload, or delete abandoned R2 objects. Pending reservations can be released safely, but physical orphan cleanup needs a separate retention-aware process: signed PUT URLs remain reusable until expiry, and shared/publishing-pinned objects must not be deleted blindly. Existing scheduled expiry cleanup must actually be running in the hosting environment; that live schedule was not inspected here.
