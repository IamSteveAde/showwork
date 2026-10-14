# Netlify-to-VPS migration execution status

**Migration incomplete; production remains NO-GO.** This cycle modifies the intended local release only. There has been no VPS/Netlify/database/provider access, migration, transfer, commit/push, deployment, sender stop, epoch change or activation.

**Current connected-system update:** see [publishing-connected-system-verification.md](publishing-connected-system-verification.md). The actual default-off application bootstrap and executable native worker now exist and are tested. Older factory-only/runtime-unimplemented statements below describe the earlier snapshot and are superseded. The wider application compatibility backlog and production gates remain open.

## Changes completed locally

- `netlify.toml` selects generated `netlify/functions-vps`. The normal build runs `scripts/vps/prepare-netlify-handoff.mjs`. This preserves all 13 unrelated functions byte-for-byte and excludes social-publish-cron and publish-post-background. Those old source files remain outside the intended configured host tree for historical review; they are not shipping sender hosts in that tree.
- The three Next social/Instagram/TikTok publishing cron POST routes return 410 without importing a scheduler/database/provider. Any external caller must also be removed after approval; otherwise it still consumes an HTTP invocation. This is explicit endpoint retirement, not canonical product integration.
- `executionContext.ts` permanently rejects the legacy native post-creation transport for all five platforms, including Facebook published-photo/video/Reel endpoints. Preparation is restricted to explicit unpublished photo/start payloads; redirects cannot bypass the initial endpoint inspection. Account lookup/OAuth and safe preparation remain available. Canonical providerHttpAdapter uses its separate durable capability/invocation gate and explicit injected HTTP.
- `nativeWorkerComposition.ts` connects the existing bounded HTTP, native upload, credential/reconciliation resolution, journal, immutable media, rate/account coordination and UI projection adapters. A production-canonical worker environment now supports those native ports. It requires explicit enablement and mandatory coordination/media/projection; disabled construction/polling performs no I/O. This is a **factory**, not an installed production bootstrap or runnable active VPS release. Do not equate its existence with a completed worker.
- The worker grant proposal now permits the published reference, timestamp and permalink fields its status projector writes. Before this correction, a restricted production worker could silently fail those follow-up projections despite provider confirmation. Content/approval/schedule writes were not granted.
- `scripts/publishing-migration/prepare-proposals.mjs` packages the accepted schema/grant proposals with checksums. Read-only production-preflight SQL and a secret-free configuration template are provided. They are deliberately not a blindly executable production migration; deployed schema compatibility is unknown.

Exact current-cycle source files and hashes: `publishing-migration-current-cycle-files.json`. Generated Netlify host inventory: `netlify/publishing-handoff-manifest.json`. Proposal inventory: `publishing-migration-proposals/manifest.json`.

## Verification (superseded by final current-stage report)

26 targeted worker/adapter/account-I/O/retirement/handoff tests passed. Whole-repository and publishing-integration TypeScript checks passed. Safe application build passed from a temporary copy with synthetic read-only database, no inherited credentials, denied external network and mocked fonts; the copy was removed. A further handoff/account test run validates the redirect/payload hardening. No normal application build or Netlify CLI was run.

An initial test selection included a database-dependent integration test: it failed with DISPOSABLE_POSTGRES_UNAVAILABLE. This is reported, not counted as a pass. The new native composition tests subsequently ran successfully. Fresh temporary PostgreSQL testing was subsequently approved and completed; see the current-stage report below. Earlier 733-test results remain historical and do not verify the new production-canonical branch.

## Remaining work and actual blockers

1. **Local code, not a founder decision:** finish executable production worker dependency/bootstrap wiring (SQL pool, secure credentials, media conversion/URL delivery and lifecycle), install the canonical application bootstrap, and resolve important adjacent application paths without breaking existing workflows. The disabled `main.cjs` still blocks normal startup; no active release can be tagged honestly yet. The newly assembled factory is not a substitute for this work.
2. **Verification:** temporary PostgreSQL was approved. Native composition, retention and earlier database regressions are recorded in `publishing-migration-retention-and-native-verification.md`. Real-service and complete executable deployment verification remain separate gates.
3. **Retention policy:** soft deletion/evidence retention was approved and implemented for this local stage. Irreversible purge, duration, privacy requests, identity reuse and retained-storage billing remain deferred. No automatic restoration or uncertain retry is permitted.
4. **Approved external information/actions:** inspect the production schema read-only, create/rehearse the actual ALTER/backfill migration, verify role/RLS/pooler compatibility, shared storage conditional/version/durability guarantees, existing provider app permissions/callbacks/versions and secure credential delivery. These cannot be certified from mocks or inferred from the expected VPS description.
5. **Production cutover evidence:** paused websites/Functions allowance exhaustion are not trusted proof that every sender/request has stopped. Separately approve listing actual Netlify functions, external schedulers and old deploy endpoints, removing them, resolving pending/unknown publications and recording exact-epoch ALL_SENDERS stop evidence before ownership changes.

## Invocation reduction

Code-level: the intended function directory removes the one-minute publishing scheduler: **1,440 scheduled invocations/day, 43,200 per 30 days**, plus one background invocation per legacy dispatch (and its retries). The intended worker polls SQL on VPS without Netlify publishing wake-ups. The three HTTP cron tombstones do not eliminate traffic from unremoved external schedules. Billing, inbox, reporting and other unrelated functions remain on Netlify and still consume allowance. Actual savings and website restoration require Netlify account/usage telemetry; no measurement or assertion about the paused site's real usage has been made.

## Production sequence and commands

First production step after separate approval: install the already-reviewed disabled package using the pinned transfer/install commands in `publishing-vps-disabled-deployment-readiness.md`. Its archive is `dist-vps-disabled/sw-disabled-78484da7afe5-3498b2e0f20d78e5.tar.gz`, SHA-256 `0f5ba2e8a48019f5daef2f23863b9ef8143fc17047010d16a80abb9d08067e2a`. It connects to nothing and starts no service. It remains the old disabled package; this cycle did not rebuild it or replace its provenance.

Subsequently, under separate approval: validate secrets/dependencies; capture schema baseline and apply the reviewed migration; inventory/verify stopped legacy senders; deploy completed canonical application and the host-removal release; drain and record trusted stop evidence; classify/adopt only proven never-authorized existing posts; transfer ownership using expected epoch; explicitly activate the completed VPS runtime; verify controlled real publications/status and Netlify telemetry. Do not deploy the intended Netlify release before the canonical bootstrap and migration dependencies pass: old scheduling would otherwise have no working consumer.

Rollback preserves CANONICAL protocol/evidence: stop admission, drain/reconcile, and choose a compatible reviewed owner/runtime. Do not restore unfenced Netlify senders or reset attempted jobs. The dedicated disabled-artifact symlink rollback is separate and touches no live application/database state.

A final Git commit/tag and active deployment command are not yet prepared because unfinished runtime/application code cannot truthfully be called the final migration release. The temporary-infrastructure and soft-retention approvals were received; their implementation/test/cleanup results are in the current-stage report.

## Current-stage update

See [retention and native verification](publishing-migration-retention-and-native-verification.md) for the approved policy implementation, final test results, exact files and cleanup confirmation. This update closes the temporary-test permission and soft-retention design gates; it does not close the active bootstrap/application-composition gaps or authorize production.
