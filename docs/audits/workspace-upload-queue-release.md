# Workspace upload queue

Implemented locally, not deployed. No schema or environment changes.

## Behavior

- New-post attachments, content editor attachments, business documents and header banners share a browser-session queue. Their original direct-to-R2 endpoints, permission checks, reservations and publishing request wrapper are retained.
- At most three jobs run concurrently, with one video at a time. Knowledge documents are processed sequentially within each workspace, preventing parallel summary rebuilds. Other uploads can use available capacity.
- A workspace-scoped, minimizable upload tray shows filenames, transfer percentages, queued/saving/failed/completed states and individual Retry/Cancel actions. It is rendered above content dialogs and fits mobile screens.
- Failed jobs free their capacity and retain their successful preparation/transfer steps. Retry repeats the failed step, not successful files or a completed transfer. A failed job stays pending until the user retries or cancels it; this keeps the original batch workflow alive.
- Editor attachments update after each successful file. New-post batches wait for retries or cancellation, preserve successful files and continue sharing those files with the selected platform posts.
- Content finalizations for the same post are serialized within this browser queue, preserving response order and avoiding concurrent display-order calculations here. This does not replace server-side concurrency/idempotency protection across browsers or lost acknowledgements.
- Cancel aborts an active transfer or removes a queued job. Once saving/processing begins, cancellation is unavailable because the server may already have committed. Pending-receipt cancellation now releases reserved quota through the completion-reliability update; failed release falls back to expiry cleanup. Physical object deletion remains separate. See `workspace-upload-completion-release.md`.
- Banners are uploaded through the queue, then committed using the existing header Save action.
- Closing/minimizing the tray does not stop uploads. A page-unload warning protects unfinished work. The queue is memory-only: reloads, tab closure and full document navigation discard its retry state. This is not resumable multipart upload; retry of an interrupted transfer restarts that file.

## Validation

Offline behavioral tests exercise concurrency limits, one-video scheduling, queued and active cancellation, save-only retry, successful sibling preservation, document serialization, same-post finalization ordering and workspace-scoped dismissal. Existing storage-reservation and delivery-upload regression tests are also run. TypeScript is checked against application source excluding generated Next build artifacts.

No live storage transfer, production test or speed benchmark has been performed. Verify locally with several images plus a video, simulate transfer failure and completion failure, retry one file, cancel another, and confirm saved assets and multi-platform sharing before deploying. Do not claim measured speed gains from these offline tests.
