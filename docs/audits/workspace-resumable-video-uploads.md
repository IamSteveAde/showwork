# Workspace resumable videos and background previews

Implemented locally on 28 October 2026. No production migration, deployment, live upload or VPS change performed.

## User experience

- Workspace post videos of **64 MiB or larger**, in supported MP4/MOV/WebM/M4V formats, use **16 MiB chunks**. Maximum session size is **10 GiB**, subject to the owner's actual storage allowance.
- The upload tray offers **Pause / Resume**. Network retry reconciles completed chunks with storage and uploads only missing chunks. An interrupted chunk may restart; previously finished chunks remain.
- After a refresh or browser restart, open the **same existing post** and select the **same local file**. Showwork recovers the session from local browser metadata. The original file is not stored in localStorage, so browser security requires selecting it again. Recovery lasts up to **8 hours**, uses the same browser/site/account, and requires the browser metadata to remain available.
- Clearing browser storage or switching browsers loses automatic session discovery. The abandoned session still expires and is cleaned. If a session expires, cancel that task and select the file again to start fresh.
- Smaller files retain the existing direct upload path and completion retry checkpoints.
- Both the new-post attachment uploader and existing-post editor use the shared pipeline. Successful sibling uploads are not repeated.

## Durable sessions and safety

`WorkspaceVideoUpload` persists session identity, uploader, owner, workspace, post, object key, declared size, storage upload ID, chunk size and expiry. It deliberately has no cascade foreign keys: cleanup must retain enough information to abort partial uploads even after a workspace is deleted.

The client generates a stable request ID before starting. The storage reservation uses this same identity. Duplicate starts reuse one reservation and one storage upload. Permissions, subscription coverage, quota and post state are still enforced. Session IDs cannot be used across accounts/workspaces/posts.

The browser's file identity combines name, size, modification time and SHA-256 of bounded leading/trailing samples. This catches accidental wrong-file selection without hashing gigabytes before transfer. It is a resume identity heuristic, not proof that every byte matches a previously selected file; users must select the same unchanged original. Authorization does not depend on this fingerprint.

Storage is authoritative for uploaded chunk numbers, byte lengths and ETags. Signing is limited to three valid chunk numbers per request. Completion requires every chunk at its expected length and verifies final object size. Unknown completion outcomes recover by inspecting storage. The final attachment continues through the existing upload-complete endpoint and its atomic asset/quota/receipt transaction, including the canonical publishing integration when installed.

Pause retains the receipt. Cancel aborts the storage multipart session and releases its pending reservation. Saved receipts cannot be cancelled as in-progress uploads. Expiry cleanup aborts abandoned multipart sessions, including those whose source workspace was deleted; the existing reservation cleanup releases reserved quota. Assembled-but-unregistered objects use the existing released-upload cleanup path.

## Background thumbnails

After successful video registration, a separate bounded browser queue captures a frame from the local file. It sends a small image to a permission-protected endpoint. The server caps input at 1 MiB, decodes/re-encodes with Sharp, bounds dimensions to 960 pixels and stores a deterministic JPEG preview. No original-video upload or download is repeated to create the frame.

Previews are persisted on `CalendarPostAsset.posterFileKey`, returned with workspace/client post data, and shown by calendar/editor/social preview components. Tiles with a saved poster avoid fetching the video solely for a thumbnail. A client event updates the calendar when its preview is ready. Shared attachment copies retain the preview reference.

The migration excludes **poster-only metadata changes** from the creative-change review trigger. Inserting, deleting or changing creative assets still triggers review. Preview failure does not fail or repeat a registered original. Existing videos without posters retain their fallback display; no historical bulk backfill runs.

Preview work runs while the browser page remains open. Closing it before capture/save finishes may leave that video without a poster. Unsupported local codecs fall back gracefully. This is not a persistent server transcoding service.

Preview deletion is tied to the original's durable cleanup job and last-reference/publishing-retention checks. A referenced original keeps its preview. Failed deletions retry. The poster save endpoint uses parent/file locks compatible with deletion to avoid creating a late preview after the original is removed.

## Release prerequisites

1. Apply the prepared `20261028150000_workspace_video_uploads` migration through the normal migration process. The earlier `20261028120000_workspace_storage_cleanup` migration is also required for durable cleanup. Review all pending migrations before deployment.
2. Generate Prisma Client in the deployment build, and deploy the updated web application and cron handler. No new environment variables or VPS transcoder is required.
3. Ensure `/api/cron/content-workspace-storage` is regularly called with the existing `CRON_SECRET` authorization. The cron now also aborts abandoned workspace multipart sessions.
4. Verify the R2 bucket supports the existing direct-PUT CORS policy. ETags are read server-side, so exposing them to JavaScript is unnecessary.
5. Configure an R2 **abort incomplete multipart uploads** lifecycle rule as a storage-level fallback, with retention longer than the 8-hour resume window. This covers a process crash between storage-session creation and saving its upload ID. This implementation does not change bucket policies automatically.
6. Perform a real storage test after the migration: large video, pause/resume, disconnect during a chunk, refresh and reselect, cancel, preview display, then cleanup. Application tests below do not certify production R2/CORS behavior.

## Validation

Automated coverage exercises duplicate starts, scope/actor isolation, bounded signing, missing/wrong-sized chunks, lost completion acknowledgement, expiry/cancellation, cleanup after workspace deletion, persisted client recovery after a fresh task, pause/resume races, direct-upload registration retry and preview failure isolation.

The actual new SQL migration was executed only in an isolated PGlite database. Its trigger test confirms poster-only updates do not invoke review while creative-file changes do. A real Sharp endpoint test verifies preview normalization and idempotency. Existing upload/accounting/review/deletion regression tests are included.

An isolated Chrome test captured a JPEG from the existing synthetic 8-second test video: **640×360, 14,513 bytes, approximately 943 ms** on this machine. This test used no Showwork session, production API or storage writes.

Final verification: **103 tests passed**, with no failures or skips; TypeScript, Prisma schema validation and whitespace checks passed. No live multipart R2/CORS test was performed.
