# Workspace upload preparation and save optimization

Implemented locally, 28 October 2026. No deployment, migration, paid AI request, or live storage write performed for this change.

## Evidence and changes

The earlier live verification measured preparation at approximately 18–22 seconds, saving at 12–15 seconds, and direct storage transfer at 0.6–3.3 seconds for the small synthetic test files. Those are local-development observations, not a production benchmark or a measurement of this optimization.

Code inspection found avoidable sequential reads:

- Post presign fetched the post for the edit guard and again for its workspace owner. It now fetches both together and applies the same guard to that fresh row.
- Storage reservation fetched the owner entitlement and calendar ownership sequentially. These independent reads now run together. The owner/workspace binding check remains mandatory.
- Reservation initialized usage outside its transaction, then fetched usage again inside it. The retryable serializable transaction now initializes/reads storage together. Uploads no longer reset unrelated monthly AI counters; the existing AI accounting paths still handle their own cycle reset.
- Document presign repeated a subscription lookup after `knowledge.manage` had already validated owner billing and workspace coverage. Removed that extra lookup. Reservation still independently validates current owner entitlement and available storage.
- Legacy post completion locked the post, then separately fetched it for approval/publishing checks. It now checks the row returned by the lock. These checks still run after storage verification and under the lock.
- Completion separately looked for duplicate attachment and highest display order. A single scoped metadata query now supplies both while the parent post is locked.

This reduces application database operations and serial waiting. The exact number of underlying SQL statements depends on Prisma's query plan. No cross-request authorization cache or client-supplied entitlement is introduced.

## Timing diagnostics

Post and business-document presign/completion, and banner presign return `Server-Timing`. In browser DevTools, select the upload request and inspect its response headers. Depending on the endpoint, stages include:

- `auth`: current session/creator resolution
- `permission`: role, billing and workspace coverage
- `lookup` / `receipt`: scoped database lookup
- `reservation`: quota reservation, including transaction and conflict retry
- `signing`: signed URL creation
- `storage_verify`: storage HEAD verification
- `save`: database completion transaction, including lock wait and response data
- `extraction` / `knowledge`: document text extraction and knowledge rebuild
- `total`: handler time (excludes dev compilation and time before the handler starts)

Optional `WORKSPACE_UPLOAD_TIMING_LOGS=1` enables server logs containing only numeric stage durations and HTTP status. It is off by default. Measurements are isolated per request and do not log file names, signed URLs, tokens, content or customer IDs. Existing canonical publishing dispatch remains first and authoritative; it bypasses these legacy completion changes and instrumentation.

## Preserved behavior

Permission checks, workspace isolation, plan coverage, quota limits, server-reported object size, receipt identity/expiry, locked review state, atomic asset/receipt/accounting writes, retry idempotency and cancellation are retained. The existing receipt-clock query remains separate so expiry is evaluated after acquiring the lock. No schema, response-body or browser upload protocol change is required.

Document extraction and knowledge rebuild are still synchronous; this change does not promise instant document processing. Large videos still use the existing whole-file transfer protocol.

## Validation and release

Regression checks cover concurrent completion, duplicate retries, cancellation versus completion, quota conflict retry, transaction rollback, review changes during storage verification, deletion accounting and canonical dispatch. New checks cover the single-read presign path, denied/foreign/approved/publishing posts, and concurrent timing isolation.

No migration or environment change is required for this optimization. Deploy the updated application through the usual workflow when ready. The separately prepared storage-deletion migration and cleanup schedule remain separate release prerequisites for that feature.

A fresh live upload benchmark is still needed to quantify the speed improvement. Compare warm requests on the same environment and similarly sized files, with the new stage timings; do not compare a cold development compilation against a warm production request.

Validation results: 90 focused tests passed across upload performance, completion, queue, reservation retry, storage cleanup, team permissions and delivery upload reliability. TypeScript and whitespace checks passed. The broader existing content-workspace-entitlements suite is blocked by its custom loader failing to resolve `@/lib/workspaceUploadLocks`; temporarily supplying that dependency also exposed existing missing knowledge-context/brand-personality loader mappings in unrelated AI tests. Those unrelated tests and application code were not changed.
