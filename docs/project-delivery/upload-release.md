# Delivery upload and viewing release

## Implemented application changes

- Gate-first server rendering: locked requests fetch only project branding and gate data, never media/reviews/briefs. Unlock refreshes the server payload. Protected originals are no longer used for public social-card images. Unpublished managed-project assets are omitted even for unlocked clients.
- Feedback/comment endpoints verify a project-specific signed viewer session or authorized creator and match its email to the requested reviewer; knowing a media ID/email no longer grants feedback rights. Deleted projects are rejected by access checks. Managed publication still requires internal approval.
- Durable `DeliveryUploadSession` binds creator, project/task/replacement target, generated object key, upload ID, expected byte size and MIME, expiry and state. Signing, completion and cancellation verify that binding. Namespaces and multipart manifests are validated. Portfolio upload/signing/deletion namespace checks also prevent that entry point being used to register or delete a project original. Expected byte size is verified against R2 before registration.
- NEW and TASK registration use unique nullable upload-session references and transactions. Multipart finalization first checks whether R2 already has the finished object, allowing DB-failure recovery without repeating the original transfer. Replacements preserve shared managed-task originals/posters, use compare-and-set and atomic allowance increments; same-object completion is repeat-safe. Additional-upload counters use conditional updates to avoid the former concurrent check/increment race.
- Small-file retries retain transferred object identity and retry registration alone. Small PUT URLs can be renewed for the same valid session. Core multipart resumes reconcile with authoritative storage parts. Existing client part sizes are retained in local progress; new uploads use 16 MiB parts/two workers. Core signing batches three part URLs per authorization round trip.
- One global budget of three active storage PUTs across delivery clients, at most two queued files across initial/create/add-files/subsection/task flows, and no deliberate per-file/batch sleeps there. Replacement entry points share the storage-request budget. Stalled transfers time out; explicit pause aborts active transfers and leaves completed parts available for retry.
- Initial builder retries within the same mounted page reuse the project, sections, folders and completed media. Add-section/subsection retries retain destination IDs. This does not promise the initial form or local File objects survive a full browser reload; the already-created project remains in the dashboard. No passwords are persisted to browser storage.
- Gallery rows render immediately with stored dimensions or safe placeholders and learn missing dimensions from displayed items. No detached loader waits for all originals. Gallery photos use responsive image derivatives. Document iframes load lazily. New delivery and managed-task uploads save video posters and dimensions separately; versioned poster URLs and compare-and-set prevent old frames overwriting replacements. Task previews remain internal until approval and publication; promotion is atomic and copies the latest preview metadata. Late preview updates propagate only while the delivery still references that same original. Legacy managed-source backfill needs its own scoped extension rather than assuming a normal delivery prefix.
- Authorized, paid single downloads use short-lived R2 attachment URLs and the browser download manager. Archives stream through a Node route with authorization/payment checks, count and actual-byte caps (100 files / 1 GiB), lazy sequential source reads and abort propagation. Large selections are rejected clearly for individual native downloads. Browser ZIP accumulation was removed.

## Required release steps — developer-owned

No production migration, deployment, backfill, storage configuration or VPS changes were performed.

1. Review pending migrations and back up the target DB. This release requires `20261027150000_delivery_upload_reliability`; the prior portfolio-poster feature separately requires `20261027120000_portfolio_video_posters`. Do not blindly apply unrelated pending migrations without reviewing them.
2. Apply approved additive migrations before serving the new code, regenerate Prisma, and rebuild/deploy the website. Source-generated clients were regenerated locally only. API and client changes should be released together.
3. Confirm R2 credentials permit HEAD/list-parts/GET in addition to upload/sign/delete. These use existing R2 variables; there are no new required environment names. GET URLs use the S3 API endpoint and include attachment disposition.
4. Verify native/canonical adapter routing in the actual deployment. Replacement handlers retain the existing integration boundary; if a deployed external adapter owns them, its corresponding handler must implement the same session binding/CAS behaviour. Source tests exercise the native handlers, not an unknown remote worker version.
5. In-flight uploads from before this release have no server session and cannot safely be assumed to belong to a new session. They receive `UPLOAD_SESSION_EXPIRED`; core clients clear stale resume state so a subsequent retry starts a fresh upload. Do not silently trust an arbitrary old client-supplied key or upload ID. Existing completed records remain intact; legacy rows may have null uploadSessionId/dimensions/poster fields.
6. Test uploads, retries, pauses and native downloads on a scoped staging account, including mobile Safari and a throttled connection. Measure timing before claiming a speed improvement. Archive duration remains constrained by hosting invocation limits; use background archive jobs for selections too large/slow for those limits.

## Original-file privacy remains an infrastructure requirement

Application-level gates are strengthened, but pre-existing files still live on the configured public R2 media domain. Anyone who already possesses a public original URL can still request it, and authorized viewers receiving an original preview can save that preview. A download-button/payment check cannot revoke public object access or provide DRM.

For strict original-file/payment protection, the developer must provision a separate private delivery bucket (or equivalent authenticated delivery edge), keep original downloads private, generate separate review-quality/watermarked media, and serve authorized temporary preview/download URLs. Inventory all references before copying/remapping existing keys. Preserve portfolio and social-publishing public assets; do not disable the shared public bucket/domain globally. This implementation does not switch bucket policy or claim that public originals have become private.

## Existing videos

Prepared, not run:

```sh
node scripts/backfill-delivery-video-posters.cjs --project-id PROJECT_ID --limit 20
```

Dry run does not download videos or write objects. After reviewing scope and approving writes, the developer can add `--apply`. It serially processes missing normal-delivery video posters, caps downloads at 100 MB and extraction time, saves JPEGs/dimensions and leaves originals intact. Larger originals, managed-source keys and unsupported codecs are left for a controlled processing job. New normal delivery uploads do not require a VPS thumbnail service.

## Remaining operational follow-up

- Durable email outbox/worker dispatch: existing notification delivery is preserved, but email provider latency can still affect task/replacement responses. Finalization is now repeat-safe, so a registration retry does not duplicate task alerts or replacement allowance increments. Guaranteed delivery/reconciliation needs a durable outbox and deployed dispatcher, not an unawaited promise.
- Account-wide storage reservations, content-signature/virus scanning and orphan reconciliation are not replaced by byte-size verification. The product's existing billing rules remain; the batch-counter concurrency race is fixed, but these broader policy controls need explicit resource limits and a processing/quarantine workflow.
- Incomplete-upload lifecycle settings must be verified in the real bucket. Pause intentionally retains resumable parts; it is not destructive cancellation. Completed-but-unregistered objects need reconciliation beyond incomplete-multipart lifecycle cleanup.
- End-to-end resume of a newly created builder after a full browser reload still requires form/destination recovery UI and file reselection. Server transfer sessions provide a recovery foundation; they do not preserve local File objects after tab close.

## Validation

Regression tests cover locked payloads and metadata, viewer/payment checks, cross-project/session/target rejection, actual byte verification, repeat-safe NEW/TASK/replacement registration, storage-before-DB recovery, pending internal review, unique-session migration against disposable PostgreSQL-compatible PGlite, real ZIP bytes, global concurrency, pause/drain, registration-only retry, multipart windows/manifests, real JPEG posters and stale-preview protection. Portfolio and delivery payment-notice checks run alongside them. No paid AI or customer-file tests were used.

Browser timing, real R2 CORS/permissions, Vercel duration behaviour, external adapter parity and private-bucket migration are not validated by these local tests.
