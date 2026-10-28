# Marketing Workspace upload audit

Audit date: 28 October 2026. Scope: the current working tree, including the new-post uploader, post-details uploader, cross-platform asset attachment, banners, Business Knowledge documents, shared browser/R2 helpers, storage reservations and both publishing completion paths. This is an audit, not an implementation change.

## Outcome

The basic architecture is good: upload bytes go from the browser directly to R2. The application server authorizes the operation, reserves storage and finalizes the database record. Replacing that with a server-proxied upload would usually add an unnecessary hop.

The biggest improvements are resumable large-file uploads, a shared bounded upload queue, reliable/idempotent completion, and separate preview/knowledge processing. Some security and accounting gaps deserve attention before increasing throughput.

No production R2, database, VPS, customer file, signed URL or paid AI service was accessed. No real upload throughput or latency benchmark was run. Findings distinguish inspected code, a synthetic concurrency reproduction, and configuration-dependent risks. The actual deployed publishing mode, storage bucket policy, CORS/CDN settings, cron execution and regional latency remain unverified.

## Current flow

1. User selects one or more files. New-post previews use stable browser blob URLs.
2. Browser requests an upload URL. The API authenticates, checks upload permission and post editability, verifies the post belongs to the workspace, and reserves the subscription owner's storage.
3. Browser sends the whole file with a single presigned PUT to R2. XHR reports real byte progress and retries transient failures.
4. Browser calls upload-complete. The legacy path verifies the reservation and object size, creates the asset and moves reserved bytes into consumed bytes. The canonical path, when explicitly installed, instead invokes its own locked/versioned media workflow.
5. The UI applies a returned post and/or refreshes server state. Additional platform posts can reference the same physical object without uploading it again.

Useful existing safeguards: authenticated permissions, same-workspace/post key binding, server-side HEAD size verification, owner-billed post uploads, serializable quota admission with conflict retries, sequential completion replay handling, internal-review invalidation on asset changes, and shared-object reuse across platforms. These should be retained.

## Priority findings

### P0 / correctness — legacy completion is not safe against concurrent replay

Evidence: `app/api/calendars/[id]/posts/[postId]/upload-complete/route.ts:409–538`, `prisma/schema.prisma` CalendarPostAsset.

The transaction reads a PENDING reservation without locking it or atomically claiming its PENDING state. A later unconditional status update does not ensure another request has not already consumed it. There is no schema uniqueness constraint on postId + fileKey. If enough other bytes remain reserved for this owner, two overlapping completion requests can both pass the usage guard and create duplicate assets/count the same object twice. Sequential replay handling is present and useful, but is insufficient for concurrent requests.

An offline execution of the actual legacy handler, with mocked dependencies and an interleaving in which both transactions read PENDING before either finalizes, produced:

```json
{"responses":[200,200],"assetsCreated":2,"expectedAssets":1,"usedBytes":"20","expectedUsedBytes":"10","reservedBytes":"10"}
```

The owner started with 30 reserved bytes, with 10 belonging to this file. The mock models a feasible read-committed interleaving; this was not a real PostgreSQL integration test. The asset review trigger locks the parent after insertion, but does not prevent this earlier double-consumption sequence.

Fix direction: lock/conditionally claim the exact reservation inside the transaction; recheck scope, expiry and editability there; return the same receipt on replay; enforce appropriate asset uniqueness after reconciling old duplicates. Serialize asset ordering as well. Do not bypass or replace the canonical publishing boundary to implement this fix.

The document completion path has a similar unlocked reservation reread and should receive equivalent concurrency testing rather than being assumed safe.

### P0 / conditional security — the upload URL remains a reusable write capability

Evidence: `lib/r2.ts:57–65`; post upload key creation/finalization above. R2 documents that a presigned URL may be reused until expiry.

The current URL lasts eight hours. It signs an object path and Content-Type, with no application-level one-use mechanism or enforced byte budget shown in the helper. Application quota validation happens before signing, while actual size is checked only at completion. Therefore an upload can write more bytes than declared before the application rejects finalization; the rejected object is not deleted by the shown path. Completing or approving the post does not itself revoke the still-valid PUT URL. In the legacy flow, another PUT to the same key can change the bytes served from the public URL without passing the database review trigger.

This is an architectural write/validation gap, not evidence that anyone has exploited it. Canonical publishing separately verifies hashes/versions and can pin immutable provider media; do not claim its publishing protections are absent. Mutable original preview URLs and raw upload admission still need assessment in the active deployment.

Fix direction: explicit upload sessions with byte/type budgets; enforce supported size constraints on upload tickets/parts using verified R2/browser-compatible signing or a bounded upload gateway where necessary; use immutable finalized objects or write-once keys; verify exact bytes before promoting staged files; reject/delete invalid staged objects safely. Shorter, renewable URLs reduce exposure but do not make a PUT URL single-use. Coordinate cleanup with ticket expiry and all shared/publishing references.

### P1 / speed — large workspace videos have no chunked resume

Evidence: both CalendarGrid upload functions call `putFileWithProgress` with the complete File. There are no calendar-specific multipart endpoints in these paths, although R2 multipart helpers and other product upload-session implementations exist.

Every failed PUT retry restarts the entire file. Closing/reloading does not restore a workspace upload session. There is no early single-PUT ceiling check in the workspace presign route beyond quota admission. Files beyond the storage service's single-request ceiling can fail after unnecessary preparation.

Fix direction: calendar-scoped multipart sessions above an initial configurable threshold around 64–100 MiB, with part-level retries, server-verified completed parts, size/type validation and abort/expiry handling. Start with 8–16 MiB chunks and 2–3 concurrent parts, then tune with measurements. Full reload resume needs persisted session metadata and reselecting/verifying the local file (unless a supported persisted file handle exists). Do not promise arbitrary browser file access after reload. Do not call project-delivery endpoints from the workspace: their authorization and storage scopes differ.

Multipart reduces wasted retransmission and can improve utilization; it cannot exceed the user's uplink bandwidth.

### P1 / speed and reliability — inconsistent, unbounded vs sequential batching

Evidence: `components/calendars/CalendarGrid.tsx:830` starts all new-post files through Promise.all; the post-details path at ~3079 awaits each file in a loop. BusinessKnowledgeCard also processes files sequentially.

Unlimited parallel files compete for bandwidth and browser connections and burst the same owner quota counters. The opposite path pays the complete prepare/upload/finalize latency before starting the next file. A bulk failure rejects Promise.all while sibling operations can continue; there is no per-file durable retry receipt in this UI. In the modal, earlier successful uploads may not be reflected until the entire loop succeeds. Retrying the whole batch can re-upload already completed files.

Fix direction: one shared queue with bounded concurrency and per-file states. Initial policy: roughly 3 small images, 1–2 large videos, and a global cap on total in-flight parts. Measure on mobile networks before fixing defaults. Preserve completed receipts, retry only failed transfers/finalizations, reconcile partial successes, and do not let repeated clicks create a new upload for a file already saved.

### P1 / lifecycle — orphan objects, stuck reservations and incomplete deletion

Evidence: `lib/contentWorkspaceUsage.ts:969` releases expired counters but does not delete the associated R2 objects. `app/api/calendars/[id]/posts/[postId]/assets/[assetId]/route.ts` on the legacy path deletes a database row only. No calendar upload-cancel endpoint is present in the audited routes; CalendarGrid does not pass AbortSignal to its shared uploader. The storage cleanup route processes up to 100 expired reservations per invocation. Its live schedule/execution was not verified.

Cancelled, rejected, or abandoned uploads can occupy actual object storage independently of what the UI counters show. Pending reservations can reduce the user's available app storage until expiry/cleanup. Removing a file is not visibly tied to releasing quota or safely deleting its original object in this legacy route.

Fix direction: explicit cancel plus reservation release; durable cleanup jobs with retries and reference checks; reconciliation of usage counters vs referenced objects; observable cleanup backlog. Delete a physical object only after the last workspace reference and any publishing/retention pin is gone. Naively deleting a file when one post removes it would break the existing cross-platform reuse feature. Canonical retention/deletion logic must remain authoritative when enabled.

### P1 / validation — MIME labels are not proof of file contents or browser compatibility

Evidence: `lib/mediaFileTypes.ts`, `lib/r2.ts:isAllowedContentType`, legacy upload-complete mediaType handling.

The file type can come from a browser MIME label or extension, the allowlist accepts broad image/video subtypes, and legacy completion accepts a browser-selected MediaType enum while checking size only. There is no file-signature/decoder validation in this completion path. A file accepted as an image/video may not preview in a browser or publish on the intended platform. SVG is included; unsanitized active documents need a deliberate serving policy. Actual script execution risk depends on asset origin, response headers and embedding and was not tested.

Fix direction: bind expected type to the upload session; verify signatures and safe decoding; separate “accepted original” from “previewable” and “publishable”; isolate untrusted originals, enforce safe headers and reject/sanitize active content as appropriate. Preserve source quality and generate appropriate derivatives rather than silently degrading originals. Canonical verification inspects stored Content-Type plus hashes/versions but should not be mistaken for complete image/video format validation.

### P1 / privacy — public URL design is separate from workspace access control

Evidence: `lib/r2.ts:199`, returned asset URLs, and document extraction through publicUrlFor(fileKey).

The code constructs public object URLs and does not put the viewer's workspace/password authorization into those URLs. If R2_PUBLIC_URL is publicly readable, as these flows assume, someone possessing a URL can read it without going through the workspace login. A private page is not equivalent to private object storage. Live bucket access was not tested.

Fix direction: classify public marketing assets vs confidential knowledge documents; private storage plus short-lived authorized read URLs for private originals; narrowly scoped provider fetch URLs for publishing; cacheable public preview derivatives only where intended. Audit CDN origin, CORS, response headers and URL lifetime before claiming private media access.

### P1 / apparent speed — calendar videos fetch originals to create thumbnails

Evidence: CalendarGrid VideoThumbnail uses `<video preload="metadata">` and seeks to 0.1s; CalendarPostAsset has no poster field in the main Prisma model.

A transferred video may appear slow or blank because the browser still needs metadata/range requests to display a frame. Many visible video cards can fetch from original files at once. This is preview latency, separate from upload throughput.

Fix direction: display a local image/poster immediately; persist a server-generated poster and optional small playback derivative; lazy-load previews near the viewport and avoid opening original videos solely for thumbnails. Portfolio poster work is reusable conceptually, but is not wired into calendar assets automatically.

### P1 / mode-dependent speed — canonical verification rereads the complete original

Evidence: `lib/publishing/showworkUploads.ts`, `lib/publishing/objectStorageAdapters.ts:9–23,43`.

When canonical application routing is explicitly installed, completion verifies source content by downloading it into memory, hashing it, and returning version evidence. The adapter imposes a configurable limit no larger than 512 MiB and uses a 30-second request timeout. Buffering/concatenation adds memory pressure, and an upload can finish transferring before verification rejects a larger file. This is stronger integrity checking than legacy HEAD-only completion, but has a different cost profile.

Fix direction: confirm the deployed mode first. Enforce the relevant limit before transfer; use streaming hash validation/background verification or trusted immutable object receipts where appropriate; preserve version/hash guarantees and fail-closed publishing. Never remove integrity verification just to make the success indicator appear sooner. Route readiness and publishing readiness should be distinct states when work is asynchronous.

### P2 / apparent speed — Business Knowledge waits for processing and AI

Evidence: business document upload-complete extracts text around line 356 and calls rebuildBusinessKnowledge around line 600 before returning; the browser waits for each document before starting the next.

A document may have reached R2 while the UI still waits for text extraction and an AI overview rebuilt from the accumulated knowledge. Uploading five documents can repeat summary rebuilding five times. The current path correctly preserves a successfully saved document if summary rebuilding fails.

Fix direction: separate Uploaded / Extracting / Ready / Needs attention. Persist upload receipts promptly, process extraction/indexing through durable jobs, debounce/batch the overview rebuild and make processing retryable without retransferring the file. Preserve source-completeness and error reporting; do not pretend extraction succeeded when it did not.

### P2 / smaller defects

- `Date.now() + sanitized filename` keys can collide for the same post/name/millisecond. Reservations have no unique fileKey constraint. Prefer random UUID upload IDs with immutable resource binding.
- Concurrent displayOrder = count calculations can produce tied ordering. Lock/allocate positions or preserve explicit batch order.
- Banner presign reserves against the acting creator.id, unlike post uploads which use managerId. A non-owner with delivery.manage can be permission-authorized yet fail the reserve helper's owner check. Banner-save reservation checks also use the acting creator. Align both sides with subscription ownership while keeping role checks.
- The uploader has transient retries and a two-minute stall timer, but the workspace provides no AbortSignal or explicit per-file cancellation. The stall error says “resume” although a single PUT restarts from zero.
- Progress reaches 100% when bytes finish, before finalization/processing. Display Transfer complete / Verifying / Saved instead of suggesting the whole workflow is complete.
- Presign and finalization repeat multiple database lookups. Multiple uploads also serialize through the same owner usage row. These are candidates for consolidation/batch admission after timing them, not justification for removing authorization or quota checks.

## Proposed delivery order

1. **Correctness and observability:** confirm active runtime, reproduce completion races in disposable PostgreSQL, atomically finalize receipts, safe unique keys, pre-transfer size/type constraints, per-stage timings, and per-file partial-success UI.
2. **Shared upload engine:** one bounded queue across both calendar paths; cancellation; retry only unfinished stages. Preserve direct-to-R2 transfer and cross-platform physical reuse.
3. **Large-file multipart/resume:** calendar-scoped sessions, bounded parts, recovery/reselect, cleanup and expiry. Keep integrity and publishing gates intact.
4. **Fast display and processing:** posters/preview derivatives, lazy loading, optional image optimization that preserves originals, asynchronous/debounced document processing.
5. **Lifecycle/privacy hardening:** safe reference-aware garbage collection, quota reconciliation and private-object delivery policies. Coordinate with existing publishing retention rules and deployment owners.

Steps 1–2 should precede simply increasing concurrency. They can make small batches feel faster while preventing retries from introducing duplicate assets.

## Benchmark plan (not yet executed)

Use synthetic, non-sensitive files and an authorized test workspace. Record separate timings for prepare, first byte, transfer, verification, database finalization, first usable preview and document processing. Record file size/type, effective Mbps, retry bytes, active concurrency and error class. Never log signed URLs, secrets, raw documents or personal filenames.

Test a 5 MB image, 10 small images, 100 MB/500 MB videos and a five-document batch on desktop and mobile. Include throttled network conditions, a dropped connection near completion, finalization-only failure, a reload/reselect, overlapping completion requests, cancellation, exhausted quota, unauthorized users and cross-workspace key substitution. Compare both calendar entry points and the actual enabled backend mode. Report p50/p95 and total successful bytes/time across repeated runs.

A 500 MB decimal file on a 10 Mbps uplink takes at least 400 seconds (6m40s) to transfer before protocol overhead, verification or processing. Faster code cannot beat that physical limit. Local Next.js compilation may add API-startup delay; it does not prove local upload bandwidth is the cause.

Do not set numerical improvement promises before these measurements. Confirm production CORS, region, CDN delivery and worker/cron configuration with the developer separately; this audit did not inspect or change them.

## Validation performed

- Read the source paths above and their shared helpers/model/trigger definitions.
- Ran the actual legacy completion handler with synthetic mocked dependencies and a forced concurrent interleaving; duplicate asset/double-accounting result recorded above. No live database, R2, customer data or network request was used.
- Ran existing `storage-reservation-retry.test.cjs` and `delivery-upload-reliability.test.cjs`: **25 tests passed**. These cover existing generic/reservation/delivery safeguards, not a successful live calendar benchmark and not proof that the identified race is fixed.
- No application implementation changed for this audit. No database migration, production deployment, paid AI call or VPS operation.

## Primary references

- Cloudflare R2 upload methods: https://developers.cloudflare.com/r2/objects/upload-objects/ — multipart retries parts instead of restarting the entire object; small single PUT vs large/resumable uploads.
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/ — reusable bearer capabilities until expiry, not one-time upload tickets.
- Cloudflare R2 limits: https://developers.cloudflare.com/r2/platform/limits/ — consult the current limits/footnotes when defining exact single-request and multipart ceilings. Application/platform publishing limits can be smaller.
