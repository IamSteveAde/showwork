# Project delivery upload and media audit

Date: 27 October 2026. Scope: checked-in delivery creation, adding files/sections/subsections, replacement, managed-task uploads, client galleries and downloads. This is a code audit with synthetic offline reproductions, not a production penetration test or a network-speed benchmark. No customer files were accessed, no upload/storage writes were made, and no production configuration was changed.

## Assessment

Keep direct browser-to-R2 uploads and multipart support. The architectural foundation is appropriate; routing original uploads through Next or moving the website to a VPS would add a bottleneck. Current problems are primarily gallery rendering dependencies, upload scheduling/chunk policy, missing durable upload state, original-only previews, and incomplete authorization/verification around storage keys.

The new portfolio poster feature does not automatically apply to delivery: delivery uses the separate `Media` model, not `PortfolioMedia`. Delivery Media currently has neither persisted aspect ratios nor poster keys.

## Priority findings and proposed fixes

### P0 — Locked deliveries disclose files and reviewer data in client props

Evidence: `app/[slug]/page.tsx:153` maps every original to a public R2 URL; viewer verification happens at line 219; media/sections/reviews are passed into the client at line 229 regardless of unlock status. `DeliveryPage.tsx` hides them visually using client state. Metadata also selects a random original photo before authorization at page.tsx:50. This exposes more than a screenshot of a legitimate preview: the original URL and reviewer email/note are provided to a locked browser.

Confirmed with a mocked locked request: `initiallyUnlocked=false` alongside an original media URL and reviewer email. Production reachability and deployed revision were not tested.

Fix: return only gate-safe project identity/branding while locked. Retrieve authorized media server-side after verifying the viewer session. Refresh the server payload after password unlock. Do not embed original assets in social metadata for protected deliveries; use an explicitly public share image. Apply the same checks to section/folder/preview endpoints. Minimize reviewer personal data sent to clients.

### P0 — Storage keys and multipart sessions are not bound to the authorized project

Evidence: `app/api/upload/complete/route.ts:65` creates a media record from arbitrary `fileKey` after checking access to the submitted project. `app/api/upload/multipart/sign-part/route.ts:43` signs arbitrary fileKey/uploadId after checking only the supplied project ID; abort and completion follow the same pattern. Replacement and managed-task completion paths also need the corresponding binding.

Synthetic reproductions confirmed completion accepted `projects/another-project/...`, and signing accepted a foreign key/session while authenticated only for `allowed-project`. This demonstrates a missing application boundary, not a claim that the tester accessed a real foreign object.

Fix immediately: enforce exact allowed key namespace and safe types before signing/completing/aborting/replacing. Then introduce a server-owned UploadSession linking user, project/task/media, storage key, upload ID, expected size/type, destination, expiry and status. Accept a session ID from the browser and derive keys server-side. Require fresh authorization on every operation. A namespace check alone cannot bind two sessions inside the same project.

### P0 — Payment and viewer protection do not protect the public original URL

Evidence: original preview URLs come from `publicUrlFor()`. The download proxy checks payment but cannot control access to the same publicly served original. `app/api/download/route.ts:39` checks `PAID` without checking the viewer cookie, owner/collaborator access, deleted project or publication state.

Confirmed synthetically: a paid mediaId is enough for the route to return bytes without a viewer session. Media IDs are UUIDs, but knowing a UUID should not replace authorization.

Fix: separate private originals from previews. Only serve original downloads after viewer/owner authorization and payment/publication checks. For protected media, serve authorized lower-resolution/watermarked previews via signed URLs or an authenticated delivery edge. Do not make originals public or embed permanent original URLs. Short-lived signed links remain bearer credentials while valid; they are not DRM. Remove public access only after existing portfolio/public asset dependencies have been mapped, to avoid breaking them.

### P1 — Entire gallery waits for the slowest file

Evidence: `components/ProjectContent.tsx:261` creates detached video/image loaders with no timeout. `:377–385` requires `allKnown` before rendering any rows. One unsupported or stalled media item can keep a section blank indefinitely. Every item starts discovery together, including files not yet visible.

Fix: render immediately using persisted dimensions or safe placeholders; update individual tiles as metadata arrives. Store aspect ratio once on upload. Reuse displayed media load events rather than detached requests. Add bounded fallback timeouts. Virtualize/paginate large galleries. This is the first visible-speed fix to ship.

### P1 — Chunk size is too costly for unstable connections

Evidence: `app/dashboard/new/page.tsx:128`, `components/AddMoreFilesButton.tsx:172`, `SectionHeader.tsx:125`, `ReplaceFileButton.tsx:73` and `AddTaskSubSection.tsx:102` use 200 MiB chunks with three part workers; multipart begins at 100 MiB. A 100–200 MiB file consequently has just one part and gains little resumability. Retrying a failed large part retransmits that part's data. Sliced Blobs do not prove 600 MiB of JS memory usage, but three large in-flight requests can still pressure devices/network buffers.

Fix: benchmark a starting policy of 16 MiB parts, two concurrent parts on mobile/slow networks and up to three on healthy desktop connections. Use a stable per-session chunk size; never change it halfway through an existing multipart session. For much larger allowed files, compute a compliant size that stays within the provider's part-count limit. Tune the multipart threshold from measurements rather than increasing concurrency without bounds. Smaller parts trade less retry waste for more signing calls; batch-sign a small window of session-bound parts to avoid a new auth/DB round trip per part.

Cloudflare documents a 5 MiB minimum for non-final parts and up to 10,000 parts: [R2 upload documentation](https://developers.cloudflare.com/r2/objects/upload-objects/). The 16 MiB recommendation is a proposed starting point, not a measured optimum for Showwork users.

### P1 — Small-file batches are unnecessarily serial and paused

Evidence: `AddMoreFilesButton.tsx:197–201` adds 150 ms after every file and 3 seconds after each third file; the loop awaits each file. `SectionHeader.tsx` repeats this. Initial delivery creation also awaits files one at a time. Thirty files add approximately 31.5 seconds of deliberate pauses in AddMoreFilesButton, before actual transfers/API overhead.

Fix: one bounded queue shared across upload entry points, with two small files concurrently as a starting point and a global request budget shared with multipart work. Remove unconditional pauses; back off on transient errors/rate limits. Preserve deterministic ordering and never start every video at once. A network bottleneck will still limit aggregate throughput.

### P1 — Completion is not idempotent or recoverable across storage/DB failure

Evidence: single-part completion always calls `db.media.create`; no unique session or fileKey constraint prevents duplicate creates. Small-file retry wraps presign, PUT and completion together, generating a fresh key and retransmitting when only saving failed. Multipart completion first finalizes R2 and then creates the DB record, with no durable recovery step.

Synthetic reproductions confirmed repeated single-part completion creates two rows. Simulating storage success followed by DB failure makes a second multipart-finalization attempt fail because the storage upload session has already completed. Real R2 was not contacted.

Fix: durable upload sessions with idempotent finalization and a uniqueness constraint on the upload-session reference. Separate transfer retry from registration retry. On repeated completion, return the existing record. If storage completed but DB registration failed, verify the already-created object and finish registration without uploading again or calling complete on an exhausted session. Use DB transactions for destination validation/session transition/record insertion; use recovery or outbox logic for storage operations, which cannot join a Postgres transaction.

### P1 — Server does not verify uploaded bytes and quotas at completion

Evidence: presign/start trust an optional browser-reported fileSizeMb. Completion does not verify existence, actual size, MIME/signature, checksum or expected upload key. The current allowed-type check is based on supplied MIME/extension, not inspection of original bytes. Application-level project batch allowances are incremented in a separate preflight route; storage endpoints do not derive their authorization from a reserved batch/session.

Fix: require an expected byte size, validate finite positive input, reserve quota atomically, and verify object metadata from storage before making it available. Match type expectations and use a quarantine/scanning process where required for shared documents; do not label extension matching as content scanning. Keep originals unmodified. Store byte size/checksum and content type. Account for completed objects once and release reservations on cancellation/expiry. Enforce allowances in the server-owned upload session, not only in the UI.

### P1 — Resume is local-only and can lose its destination

Evidence: initial delivery multipart progress is keyed by random `localId`, regenerated on reselect, so it is not a reliable reload recovery identity. AddMoreFilesButton progress uses project + section name + name/size/lastModified, while retry creates a new section before filtering completed files. This can split a resumed batch across duplicate sections. There is no server-side reconciliation of local completed-part state before uploads resume. Existing storage helper does correctly list authoritative ETags during finalization.

Fix: persist a stable upload batch ID, section/folder IDs and server session ID. Reuse those destinations on retry. Reconcile completed parts with storage. Expire abandoned sessions, clear stale browser records, and ask for file reselection only when necessary; do not promise uploads can continue after the browser closes. File metadata fingerprints alone do not prove identical content.

### P1 — Downloads buffer entire originals and ZIP sets in the browser

Evidence: `lib/download.ts:23` calls response.blob() before triggering save, so a large file can appear to do nothing until the full transfer finishes. The proxy streams from R2 through Next, adding another delivery hop. `downloadAllAsZip()` holds each original in JSZip and then creates the final archive blob. The proxy does not forward Range/If-Range or handle partial-content responses.

Fix: after authorization, navigate to a short-lived signed attachment URL so the browser's native download manager handles progress/resume. R2 presigned URLs use the S3 API hostname, not a custom public media hostname: [R2 presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/). If a proxy is retained, implement correct range/abort/timeout handling. Generate large ZIPs as streamed or asynchronous storage artifacts with bounded resources and expiry, rather than storing all originals in the viewer's browser memory. Retain a small-batch path only under explicit byte/count caps.

### P2 — Previews, upload UX and lifecycle cleanup are inconsistent

- Delivery galleries still use original photos in public WallTile and have no saved video poster/dimensions in Media. Reuse the portfolio approach at the delivery model boundary; do not point delivery at PortfolioMedia records. Add small posters and responsive image derivatives while leaving downloads original quality. Consider fast-start MP4 or adaptive playback for large videos.
- Multiple upload implementations duplicate retry/queue/resume logic. Some use the shared helper, others raw XHR. Raw helpers have no explicit transfer timeout, stall detection or upload cancellation; many retry every error including permanent 4xx responses. Add inactivity timeouts (not a short fixed timeout for multi-GB uploads), cancellation via AbortSignal, transient-only retries with backoff/jitter, URL renewal and user-visible retry state.
- Initial large upload progress ignores live per-part byte progress and advances mainly after parts complete. Other flows can account for a last resumed part as a full chunk. Display real bytes, upload/save/preview stages, queued files and retry state. Avoid showing 100% as completed before metadata registration succeeds.
- No upload UI references the generic multipart abort endpoint. Wire deliberate cancel to abort and expire upload sessions. Verify actual bucket lifecycle configuration; Cloudflare defaults incomplete multipart cleanup to seven days, so old code comments claiming indefinite retention are not proof of current bucket behaviour. Completed-but-unregistered objects need separate reconciliation; incomplete-upload cleanup does not cover them. [Cloudflare multipart lifecycle behaviour](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).
- Replacements reset review state and delete the old object, while media update and replacement counters are separate DB operations and notification email is awaited. Use a transaction/CAS to prevent concurrent replacements/quota races, retain recoverable prior versions as appropriate, and send email through an outbox after commit. Do not let mail latency hold upload completion open.
- Read-heavy delivery requests load media/reviews in both top-level media and section/folder trees, fetch metadata separately and synchronously update viewCount before responding. Profile DB latency and payload sizes, avoid duplicated client data, paginate histories, memoize shared reads, and move analytics writes off the critical response path with a supported durable mechanism.

## What is already sound

- Large bytes upload directly to R2 via signed PUTs, rather than through Next.
- Multipart retries and per-part local progress exist; worker pools bound concurrent requests.
- Main upload routes check owner/collaborator access, and section/folder relationships are checked.
- The non-delegated R2 finalizer validates contiguous unique part numbers and obtains authoritative ETags from R2, addressing missing browser ETag access. Some paths use integration adapters; verify the deployed adapter when releasing changes.
- Managed-task uploads restrict owner/assignee and managed publication selects internally approved task assets. Preserve those gates.

## Recommended implementation order

1. Close pre-unlock data exposure, validate storage-key scope and require proper download authorization. Design private-original separation before changing existing public bucket access.
2. Remove the gallery allKnown dependency; add delivery dimensions, video posters and responsive previews. Measure first-preview time.
3. Introduce UploadSession and idempotent finalize/recovery, then unify uploads behind one client queue. New policy should not invalidate in-flight old sessions.
4. Tune chunk sizes/concurrency, batch-signing, cancellation and progress; remove deliberate pauses. Measure mobile and desktop separately.
5. Move large downloads/ZIP creation out of browser-memory/Next bottlenecks; add reconciliation and observability.

These changes can be staged without rebuilding reviews, approvals, payment state or the rest of project delivery. Private media and large ZIP/transcoding work need storage/edge/worker deployment decisions; a VPS is not required merely to improve new browser uploads.

## Validation performed and remaining

Executed five offline synthetic reproductions in `scripts/audits/delivery-upload-reproductions.cjs`; all five reproduced current gaps. They document current defective behaviour, not successful fixes or a normal regression acceptance suite. Update/remove their assertions when fixing each finding.

No production files, credentials, paid AI calls, database migrations, deployments, storage backfills or VPS changes were used. No application runtime code was changed for this audit.

Before claiming faster/reliable production uploads, measure: presign/auth latency, storage PUT duration, retry bytes, finalize latency, queue time, time to first preview, decode failures, download-start latency and peak memory. Record only opaque IDs, byte counts/statuses/durations; never signed URLs, access tokens or file content. Verify R2 CORS, cache headers, range support, custom-domain setup, lifecycle settings and Vercel/DB region placement in the real environment.

Release tests should cover mobile throttling, 30+ small images, short/large/unsupported-codec videos, offline/reconnect, abort, expired signatures, browser reload + reselection, DB failure after storage completion, repeated completion, concurrent replacements, unauthorized/cross-project keys, locked-page responses and unpaid/private downloads. Do not run those against real customer objects without an agreed test scope.
