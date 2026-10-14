# Migration retention and native execution verification

**Approved local stage implemented and tested; overall migration remains incomplete and production remains NO-GO.** No deployment, migration, production dependency access or worker activation occurred. This report supersedes the pending retention/test-permission sections of `publishing-migration-execution-status.md`.

## Approved retention behavior

Deletion preserves posts/assets whenever canonical publishing records, legacy jobs, provider references or possible external attempts require history. Existing ordinary unattempted draft deletion continues its shared-reference-aware cleanup behavior. Reset soft-retains its affected posts and updates the existing BUILDING plan fields. Workspace and self/admin creator deletion retain owned publishing resources, deactivate deleted creators and hide them from normal application views.

- Unsent canonical work is cancelled through the transactional intent action layer. Cancellation cannot create a revision or retry and rechecks the deletion actor/scope. The existing owner, collaborator calendar-edit and admin deletion authorities remain separate from permission to publish.
- Authorized, accepted, uncertain and confirmed attempts retain their exact identity, phase, evidence and media. A deletion does **not** claim to cancel an already-authorized external request; it may still complete. Read-only reconciliation and durable outcome projection remain possible. No attempted job is reset to READY or automatically resent.
- Retention tombstones block new intents, job admission/preparation, capability creation/consumption and provider invocation. They also block ordinary restoration, retained-record/asset/parent purge and new content under retired parents. Status/reference updates needed for reconciliation remain allowed.
- Legacy work without trustworthy canonical provenance remains quarantined for reconciliation/policy review. Its uncertain historical state is not rewritten to assert verified no-send.
- Normal canonical SQL post reads and the installed application's Prisma read facade exclude deleted posts/parents, nested post collections, counts and memberships. Public portfolio/project reads for a deleted creator are also hidden. Internal reconciliation uses the explicit SQL/evidence adapters. This is not a browser DOM/accessibility test or an installed production profile.
- Deleted workspace slots are excluded from entitlement ordering, matching the effect of the former physical deletion. Changes to that ordering add durable review holds to remaining unsent revisions; freeing a slot cannot silently restore old work.
- Age-only TikTok media cleanup is retired even in standalone Netlify storage functions without an installed Next composition. Shared originals, pinned media and retained assets remain protected. Other storage-cron behavior is preserved.

No storage ledger adjustment, new storage charge, subscription cancellation or billing-policy change is introduced by these retention actions. Existing ordinary cleanup/accounting paths are not repurposed as an archive billing policy.

## Authentication and replay

Self creator deletion reuses the existing signed creator session and bcrypt password check. The transaction compares the server-derived password hash again under a NOWAIT row lock, preventing a changed confirmation from being accepted and avoiding a row/fence lock cycle.

A lost self-deletion response can recover only the exact committed deletion receipt: valid original signed session, correct password, matching creator tombstone/operation ID and matching request hash are all required. This exception returns `{ok:true}` and clears the cookie. It provides no normal account access, restoration, lookup-based publication authority or new mutation. Different operation IDs remain unauthorized after deletion.

Admin deletion reuses `isAdminEmail` and its existing `ADMIN_EMAILS` allowlist, rechecked in the transaction and cancellation scope. It rejects unauthorized callers and admin self-deletion with the established response formats. Workspace deletion checks the current signed-in owner and deactivation state, including receipt replay. It retains the former owner-only deletion behavior without requiring an active publishing entitlement. Existing reset and post-edit authorization rules remain in place.

Actual DELETE handlers preserve `{ok:true}`; reset preserves `{ok:true,deletedCount}`. Internal receipts retain the richer retention result. The frontend does not gain an external-social-post deletion feature: local hiding and provider removal are distinct operations.

## Native worker changes and defects corrected

`nativeWorkerComposition.ts` assembles existing bounded provider HTTP, native media preparation, credential/reconciliation resolution, journal, immutable media, account/rate coordination and status projection ports. It uses exact `(intentId,revision,generation)` and the existing database-backed one-time capability/invocation contract. Constructor/configuration alone performs no I/O. Disabled polling stays inert.

Two further queue defects were discovered and corrected:

1. Credential expiry could block admission before token refresh ran. Native execution now checks the exact enabled ownership epoch before a read/rotation-only refresh, then performs ordinary admission/preparation and fresh policy validation before authorization. A stale owner performs no refresh or provider request. Refresh does not mint a capability or silently retarget the account.
2. Held or invalidated jobs could fill the bounded poll limit repeatedly. Discovery excludes durable holds, post invalidations and retired resources. Pre-authorization failures park only exact, unattempted jobs: permanent eligibility denial adds an immutable review hold; transient preparation failure defers availability. Any send capability or terminal/attempted phase prevents this mutation. Natural trial expiry cannot silently restore old work after eligibility returns.

The native five-platform test uses real bounded HTTP adapter methods with injected mock responses and synthetic SQL. Instagram/Facebook/LinkedIn/X confirm according to their mocked evidence; TikTok remains accepted pending a read-only status confirmation, including after soft deletion. Concurrent execution and replay create one provider invocation. Native X credential expiry and stale-ownership refresh rejection are covered.

These are implemented library composition and contracts. **The packaged worker CLI still has no runnable active production bootstrap, and the application composition is not installed in any live host.** Media/refresh/storage driver callbacks still require the reviewed executable assembly and real-service verification. No final active Git release or activation command is claimed.

## Database and transaction changes

Only additive/local proposal changes were made. `integration-schema.sql` adds retention reason, dependency, review flag and retention timestamp, permits NULL expiry, and adds admission/consumption/invocation, purge/restoration and retired-parent guards. Retention insertion advances the eligibility fence; workspace retirement also records entitlement-order holds. Existing immutable evidence, retry predecessor references, transaction-ID audits and unique invocation constraints remain intact.

Deletion/cancellation/retention records and application response receipts commit in one physical READ COMMITTED transaction. The eligibility fence precedes ordered intent locks and protected mutation. Nested intent actions join that transaction without savepoints. Password-confirmation row locking uses NOWAIT. Rollback removes all effects; a lost commit acknowledgement never triggers an external resend. Existing lock/statement bounds remain. This does not claim that every unported legacy writer is deadlock-free; production composition/cutover review must cover those writers.

Worker projection grants include the exact publication IDs, timestamps and permalink columns that the projector writes, without granting post content/approval mutation. The production proposal bundle remains review-only: existing deployed table definitions and grants must be inspected under separate approval before an actual ALTER/backfill migration can be finalized.

## Verification

- Full final PostgreSQL selection: **321 tests, 312 passed, 9 failed, zero skipped**, across 15 suites. Failures were fixture/statement/checkpoint timeouts, not waived assertions.
- Isolated rerun of the three affected suites: **54 passed, zero failed/skipped**. Every one of the 321 unique database scenarios has passing evidence across the runs. **There was not a single green full final database invocation.** Do not add 54 to 321 or claim deployment performance is proven.
- Publishing/worker unit selection: **137 passed, zero failed/skipped**. Total unique scenarios with passing evidence across runs: **458**.
- Whole-repository, publishing-integration and worker TypeScript checks passed; the safe application build passed with network denied, no inherited credentials, synthetic read-only database and mocked fonts. Its temporary copy was removed.
- A prior concurrent database/build attempt also had nine timeout failures. It and the final full-run limitation are preserved in `publishing-migration-current-stage-test-results.json`; timeouts and checkpoint limits were not increased to force a pass.

The new scenarios cover unsent cancellation, preparation/deletion concurrency, rollback, lost deletion acknowledgement, immutable history, hidden views, forbidden restoration/purge, confirmed history, accepted TikTok reconciliation, admin/self/workspace handlers, current permissions and existing regressions. Provider execution uses local mocks only. Tests exercise database triggers/constraints and physical transactions, not just application predicates.

Initial failures were corrected rather than omitted: a fixture attempted a second X binding for a unique destination; old deletion/cron assertions described superseded behavior; a read-only page facade initially denied the fixed retention metadata SELECT; a shared deletion fixture invalidated later tests. The read-only facade now permits only that exact SELECT, not general raw SQL or transactions. Synthetic cluster initdb required the approved sandbox escalation; an out-of-tree build command was corrected. The isolated corrective reruns have zero failures/skips; the non-green full-run totals above remain explicitly reported.

## Deferred decisions and remaining risks

- Retention duration, irreversible purge, privacy requests, identity/email/slug reuse, token/PII minimization, resolved-media cleanup and retained-storage billing remain separate policy reviews. `retentionUntil=NULL` is **not** permanent-retention approval or a permission to purge. `retainedAt`, reason/dependency and `policyReviewRequired` provide the review queue. There is no automated destructive expiry policy.
- Retained public media URLs may remain usable while provider pulls/reconciliation require them; URL revocation and privacy handling require the approved storage/provider policy. No compliance claim is made.
- The Prisma visibility facade reads retirement metadata on canonical application reads; deployment performance and role access should be measured. Direct reconciliation access must remain internal. Normal views must not receive raw retained records.
- Complete executable VPS/application bootstrap wiring and important adjacent application integrations remain local code gaps. These must not be disguised as external-only blockers or counted as finished merely because a route is fenced.
- Actual schema compatibility, tenant/RLS/runtime grants, shared storage conditional/durability semantics, provider app permissions/callbacks/API versions, secret delivery, legacy sender quiescence and Netlify account restoration/telemetry require separate production approvals and verification.

## Exact files and safety

Current-cycle source files and SHA-256 values are recorded in `publishing-migration-current-cycle-files.json`. The combined local cycle changed/created these 34 source/test/configuration files:

- `.gitignore`
- `app/api/cron/instagram-publish/route.ts`
- `app/api/cron/social-publish/route.ts`
- `app/api/cron/tiktok-publish/route.ts`
- `lib/auth.ts`
- `lib/publishing/applicationActions.ts`
- `lib/publishing/applicationComposition.ts`
- `lib/publishing/canonicalWorker.ts`
- `lib/publishing/canonicalWorkerStore.ts`
- `lib/publishing/capabilityProviders.ts`
- `lib/publishing/executionContext.ts`
- `lib/publishing/nativeApplicationContext.ts`
- `lib/publishing/nativeWorkerComposition.ts`
- `lib/publishing/retainedVisibility.ts`
- `lib/publishing/showworkApplication.ts`
- `lib/publishing/validationAdapters.ts`
- `lib/r2.ts`
- `netlify.toml`
- `package.json`
- `scripts/publishing-migration/dependencies.env.example`
- `scripts/publishing-migration/prepare-proposals.mjs`
- `scripts/publishing-migration/production-preflight.sql`
- `scripts/publishing-reliability/integration-schema.sql`
- `scripts/publishing-reliability/production-grants.proposal.sql`
- `scripts/vps/prepare-netlify-handoff.mjs`
- `tests/publishing-application-handlers.integration.test.cjs`
- `tests/publishing-application-integration.test.cjs`
- `tests/publishing-canonical-worker.test.cjs`
- `tests/publishing-entrypoint-boundaries.test.cjs`
- `tests/publishing-launch-retirement.test.cjs`
- `tests/publishing-native-composition.integration.test.cjs`
- `tests/publishing-netlify-handoff.test.mjs`
- `tests/publishing-retained-visibility.test.cjs`
- `tests/publishing-retention.integration.test.cjs`

Documentation created/updated: this report, `publishing-migration-execution-status.md`, the current-cycle file manifest, final test-results JSON, and the review-only proposal README/manifests.

Generated proposal copies/checksums are listed in `publishing-migration-proposals/manifest.json`; generated retained Netlify functions are listed in `netlify/publishing-handoff-manifest.json`. The previous disabled archive was not rebuilt. No final Git commit/tag or push was made.

PostgreSQL 17.6 was verified before extraction against the official SHA-256 checksum `e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`. It was built only under `/private/tmp`, used with synthetic data/private Unix sockets and TCP disabled, and never installed system-wide or registered as a service. All task-owned PostgreSQL source, archive/checksum, build/install files and test infrastructure were removed. Server-process and filesystem absence checks passed. Removed paths are recorded in the test-results JSON; unrelated pre-existing temporary files were preserved.

No VPS/Netlify/production database/live provider, billing or storage access, DNS change, production migration, sender stop, ownership transition or deployment occurred. All ownership mutations were against newly created synthetic databases. **Stopped at the current approved local stage boundary for review; production remains NO-GO.**
