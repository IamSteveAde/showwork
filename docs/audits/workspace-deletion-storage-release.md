# Workspace deletion and storage cleanup

Implemented locally for Marketing Workspace file/document removal, post deletion, calendar reset, workspace deletion and replaced banners. No production migration, deployment, paid AI test or VPS change was performed.

## Behavior

- Logical removal, pending-reservation release, consumed-quota release and durable cleanup records commit together. Database failure rolls everything back before any storage object is touched.
- A physical object is counted once across shared post references. Removing one reference preserves the remaining references and storage charge. Removing the last reference releases the known charge once, recorded permanently against the unique object key.
- Reset removes posts/drafts and import history across all dates. Business knowledge, banners, people, connections and the subscription remain.
- Workspace deletion includes posts, business-document files, banners and pending upload tickets. Cleanup jobs survive the workspace/receipt cascades. It does not cancel account-level billing.
- Document removal also invalidates its derived business summary. Website/text-only knowledge without a file has no physical storage charge.
- Publishing media-snapshot pins preserve both source objects and snapshot blobs, even if the app is currently in legacy mode.
- Scheduled or active/unresolved publishing blocks the destructive operation. Existing approved-content restrictions remain. Installed canonical publishing paths still delegate to their existing retention/tombstone implementation, rather than bypassing provider history or policy locks.
- File reference creation and cleanup serialize on the object key; an object whose quota was already released cannot be reattached via an old reference. New upload keys remain unique.
- Physical deletion happens asynchronously after all known signed upload URLs expire, plus a one-minute safety margin. Existing links can last eight hours. This avoids deleting a file only for an in-flight/reusable PUT to recreate it. Logical deletion is immediate; this is not immediate revocation of previously shared public URLs.
- The cleanup worker rechecks global post/document/banner references, claims a five-minute lease, and retries failed storage deletes. Duplicate workers and lost acknowledgements cannot release quota twice. Crashed leases are recoverable.
- Expired RELEASED upload receipts are discovered for orphan-object cleanup. Active uploads are not swept.

The batch planner uses set-based receipt/job queries and one aggregate usage decrement, avoiding a database round trip for every file in large resets.

## Required migration and hosting steps

Prepared migration: `20261028120000_workspace_storage_cleanup`.

It adds a durable `WorkspaceStorageCleanup` table (intentionally no workspace FK) and file-key lookup indexes. The table contains metadata only, not copied file bodies or credentials.

Before using the updated deletion/attachment flows against a database:

```sh
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` applies every outstanding migration in the configured database; review status first. No live migration was run by this implementation. Restart the local app after applying migrations, or deploy the matching server code and generated client for hosting.

The existing `/api/cron/content-workspace-storage` endpoint now processes cleanup jobs and discovers released-ticket orphans. GET and POST both require `Authorization: Bearer <CRON_SECRET>`. Ensure the existing scheduler calls this endpoint regularly. No new secret is required, and no scheduler/VPS setting was changed automatically. Physical deletion/retry requires that schedule to be running; returning `cleanupQueued` is not proof the remote object has already been purged.

No production data is deleted by the migration. Existing active files are not swept merely because this table was added.

## Validation

Tests use isolated PGlite databases with the actual cleanup migration and SQL. They cover shared-reference preservation, last-reference accounting, failed-delete retry, duplicate workers, signed-URL waiting, reset vs whole-workspace scope, documents/summary invalidation, pending-reservation release, rollback on inconsistent counters, workspace isolation, publishing/retention protection and denial of retired-key reattachment. Upload completion, queue, team and delivery regressions are included.

Validation result: 87 focused checks passed, Prisma schema validation passed, and the source-only TypeScript check passed.

Production deletion/cron execution has not been tested with this new migration: applying it requires user approval. This is separate from the earlier live upload verification, which predates this implementation.

## Limits and preserved retention

The canonical publishing integration may deliberately retain hidden records and their files until its evidence/retention policy authorizes purge. This cleanup worker conservatively defers while that policy is installed. It does not erase publishing history to free storage.

The implementation does not guess corrections for historical counter corruption, missing legacy receipts, or nonstandard/public-URL banner references. If known recorded bytes cannot be released safely, the transaction fails with a reconciliation message rather than producing negative counters or deleting unrelated files. A separate read-only reconciliation audit is needed for historical inflation.
