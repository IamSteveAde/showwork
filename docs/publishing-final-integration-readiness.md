# Showwork publishing final integration readiness

**Production: NO-GO. The requested complete integration is not achieved.** This cycle adds and verifies the implementations below, but critical application pathways remain unported. A disabled configuration check can be built; a production-equivalent canonical deployment is not ready. No guarded route is counted as integrated merely because it fails closed.

## Exact files

The exhaustive current-cycle manifest is [publishing-final-integration-files.json](publishing-final-integration-files.json): 15 created files and eight modified files. Earlier uncommitted work was retained. Its separate manifest is [publishing-stage-4c6-to-4c13-files.json](publishing-stage-4c6-to-4c13-files.json); those changes were not recreated or counted as new completion here.

Created implementations:

- `lib/publishing/nativeMediaPreparation.ts`: extracted native X chunked upload/finalize/poll and LinkedIn image/video upload/finalize/poll protocols, plus Facebook Reel upload preparation. Injected HTTP, exact credentials, bounded operations, restricted upload hosts and no post-creation endpoints.
- `lib/publishing/providerNormalization.ts`: native TikTok/Meta nested status normalization and exact-reference Instagram, LinkedIn and X lookup verification.
- `lib/publishing/filesystemJournal.ts`: private persistent-volume create-if-absent journal objects; atomic link, file/directory fsync, conflict detection and reopen/list support.
- `lib/publishing/objectStorageAdapters.ts`: injected S3-compatible conditional journal writes/readback/list pagination; source VersionId and independent SHA-256 validation; conditional immutable copies with verified readback.
- `lib/publishing/deploymentReadiness.ts`: strict production-shaped configuration that only accepts publishingEnabled=false; no connections, timers or send authority.
- `lib/publishing/publishingMonitoring.ts`: read-only aggregate owner/epoch/phase/backlog/withheld-capability/hold probe, without credentials, media URLs or principal identifiers.
- `scripts/publishing-reliability/safe-application-build.cjs`: temporary source-only build, no dotenv files/inherited application secrets, denied network access, synthetic read-only database and mocked fonts; removes temporary copy.
- `scripts/publishing-reliability/production-grants.proposal.sql`: review-only restricted runtime grants; no runtime table ownership, DDL, TRUNCATE or evidence deletion.
- Three tests: `tests/publishing-final-adapters.test.cjs`, `tests/publishing-final-refresh.integration.test.cjs`, `tests/publishing-real-schema.integration.test.cjs`.
- Four documentation artifacts: this report, `docs/publishing-cutover-runbook.md`, `docs/publishing-final-integration-coverage.json`, `docs/publishing-final-integration-files.json`.

Modified implementations:

- `providerHttpAdapter.ts`: optional native media preparation composition and normalized read-only responses. Preserves synchronous operation-whitelist rejection.
- `tokenRefreshFence.ts`: refresh-token rotation/expiry persistence and compare-and-swap against the exact original refresh token, within the existing exclusive policy fence and destination lease.
- `authenticatedCallbacks.ts`: signed raw-body Meta ingress before normalization; ambiguous reference matches quarantine rather than selecting the first attempt.
- `applicationComposition.ts`: post/workspace scope validation before canonical post/draft mutations.
- `workers/publishing/main.ts`: inert `--check-config` JSON validation; normal start remains blocked and no runtime/client is loaded.
- `scripts/vps/build-worker.mjs`: narrowly permits the pure deployment-validation module; runtime dependencies remain rejected.
- `tests/worker-build.test.mjs`: updated artifact graph assertions and fixtures.
- `tsconfig.publishing-integration.json`: includes new isolated implementations.

No application route, frontend component, Netlify function or Netlify configuration was edited in this final cycle. Earlier inactive guards remain in the workspace. No Prisma schema or existing proposal schema was changed this cycle.

## Integration coverage and critical blockers

[publishing-final-integration-coverage.json](publishing-final-integration-coverage.json) enumerates all 149 prior enforcement boundaries, including exact file/function IDs. Its conservative classification identifies 20 potentially dispatched partial route families and 129 fenced-only boundaries. Family matching is not proof of complete handler semantics or frontend compatibility; all entries have productionComplete=false. The original detailed inventory and body hashes remain in the Stage 4B reconstructed inventory and Stage 4C.6 enforcement ledger.

Verified canonical core coverage: transactional draft creation, selected planning edits, explicit intent schedule/cancel/reschedule/evidence-backed retry, current creator/collaborator entitlement checks, separate viewer approval, explicit TikTok consent, exact account versions, media pin contracts, canonical admission/preparation, capability consumption, one invocation nonce, durable outcomes and current UI projection. Earlier regression scenarios still pass. This core is inactive and injected; it does not establish complete host integration.

**Critical unported paths:**

| Area | Confirmed remaining gap | Consequence |
| --- | --- | --- |
| Next routes/server actions | Specialized import/custom-field/bulk payloads, AI generation, calendar-plan approval/respond flows, nested admin/billing/deletion actions and indirect media/project cascades lack complete canonical adapters | Canonical composition rejects them or legacy veto fences them; existing UX is not fully usable under activation |
| Bootstrap/Netlify/native hosts | Installer remains synthetic-only; no production application composition or usable canonical Netlify runtime is supplied; normal worker remains mock-only | Disabling configuration is safe, but a production-capable worker artifact cannot be claimed |
| OAuth/accounts | Real state/PKCE exchange, Facebook Page selection, LinkedIn organization preservation, five-platform connection proof ports and legacy shadow-account projection are not fully wired | Existing callbacks cannot be represented as integrated merely by dispatching to account actions |
| Billing/usage | Actual authenticated billing callback/cycle/reservation/quota ports remain missing; advanced team/workspace policies are incomplete | Injected mocks prove contracts, not established production billing/accounting behavior |
| Media | New upload protocols are implemented, but full TikTok conversion/verified URL preparation, multipart completion/reservations, historical physical-version backfill and credential/media IO composition remain incomplete | Five-platform production media compatibility is not complete |
| Callback ingress | Meta raw authentication is implemented; event normalization remains a trusted port. Native TikTok, LinkedIn and X ingress protocols are not implemented/verified | Use read-only reconciliation where possible; do not accept unauthenticated callback claims |
| Shared storage | Concrete storage adapters exist, but IAM, durability/conditional-write/version semantics and real R2 compatibility are not verified | Storage remains a deployment blocker; mocks cannot certify a service |
| Frontend | No complete revision/destination/idempotency metadata or old response-shape integration exists across existing scheduling/edit/retry/approval/status flows | User-facing compatibility under canonical activation is incomplete |
| Privacy/recovery | Full non-publishing deletion/cascade cleanup, approved purge/archive policies and deployed recovery scheduling are incomplete | Keep unresolved evidence and media; do not claim account deletion or retention enforcement |

The missing ports above are implementation gaps, not merely live verification tasks. No claim is made that all remaining integration work was completed. They must be addressed in a coordinated continuation before deployment approval; this report does not introduce another numbered stage plan.

## Provider compatibility

| Platform | Local implementation and mock verification | Remaining release limits |
| --- | --- | --- |
| Instagram | Protected media_publish; unpublished container/carousel preparation; exact media-reference/permalink lookup; response journal before optional follow-up | Actual media URL/storage composition, bounded processing/backoff integration and native event normalization |
| TikTok | Protected video/photo init; explicit settings/consent; native nested status mapped to pending/confirmed; uncertain init never repeats | Native conversion/verified-domain URLs, callback ingress and durable secondary publication-reference normalization |
| Facebook | Protected feed/video/Reel finish; unpublished photo/Reel start; new Reel upload preparation; nested video/publishing status normalization | Real upload-session compatibility, feed-specific reconciliation and native event normalization |
| LinkedIn | Protected post creation/header-ID capture; new image/video preparation; exact-reference PUBLISHED lookup | Upload response/API-version compatibility and full organization/account flow composition |
| X | Protected tweet creation; new initialize/append/finalize/processing media preparation; exact tweet-ID lookup | Real grant/plan/rate compatibility and complete account flow composition |

Native protocol logic is based on existing local source, without contacting provider documentation or APIs. Configured version strings are validated syntactically, not certified as supported. All requests in tests use local mocks. Missing IDs, HTTP failures, submission timeouts and lost acknowledgements remain uncertain. Provider acceptance is distinct from confirmed publication. Preparation, upload, credential refresh, lookup, callbacks and monitoring cannot mint send capabilities.

## Authorization, transactions and evidence

The irreversible request boundary remains after freshly acknowledged durable C3 authorization, freshly acknowledged capability consumption, exact registered target/payload binding and freshly acknowledged unique provider invocation insertion. Provider egress is outside database transactions. Durable authorization is not proof of transmission; acceptance is not proof of publication. Recovery/replay never returns a fresh send grant.

The adapters preserve exact intent/revision/generation, account/version, content hash, owner epoch and attempt identity. Stage 3A–4C.2 eligibility/ownership fences, immutable history, trusted retry predecessor evidence and current-policy checks remain. No attempted job is reset to READY. Permission restoration does not restore an invalidated revision. Uncertain work is reconciled read-only or held.

READ COMMITTED, UTC, one physical top-level transaction and existing statement/lock bounds remain. No savepoints or nested physical transactions were introduced. Deferred audit checks still use the current transaction ID. Refresh reserves a lease before external token IO, then checks the current policy fence, account/version and original token before atomically persisting rotation. Concurrent disconnection or another token rotation rejects the write. Meta callback authentication occurs before parsing; ambiguous reference matches are quarantined.

Journal objects are create-if-absent, checked on readback and never silently overwritten. Persistent filesystem journaling assumes a trusted private mounted volume with real fsync semantics and is not cross-host Netlify storage. Object storage journaling requires conditional PUT and strong read-after-write semantics. Neither adapter proves WORM retention without service IAM and storage policy. Media materialization reads the exact source VersionId and verifies SHA-256 before and after copying. Unversioned sources fail closed; current unversioned R2 use needs an explicit immutable-key/version adapter rather than fabricated version IDs.

## Database/storage and deployment proposals

The actual Prisma datamodel was converted to SQL offline and installed in a disposable schema. All eight ordered publishing proposal schemas installed successfully alongside it. A synthetic creator/calendar/post/account passed approval → explicit schedule → admission/preparation → capability-protected mock publication → durable confirmation → UI projection → replay, with exactly one external-attempt record. This is stronger than synthetic reduced table fixtures, but does not verify historical production data or privileges.

The production grant proposal was also applied in that disposable schema. Restricted role reads succeeded; evidence DELETE and trigger disabling were denied. It remains a proposal requiring DBA review. Application mutation grants, tenant RLS, deployed Supabase roles, pooler behavior, security-definer boundaries and authority to insert trusted evidence are **not complete**. Migration order, data compatibility, lock/backup requirements, non-destructive rollback and storage recovery are documented in [publishing-cutover-runbook.md](publishing-cutover-runbook.md). None of those production procedures were executed.

The compiled disabled configuration check accepts only an exact validated configuration with publishingEnabled=false. It rejects true, malformed versions, unknown fields and unsafe concurrency/pool limits. The graph contains only main, status and pure validation; no credentials, database clients, provider clients, timers or native media packages are loaded. Normal start exits blocked. Readiness/configuration checks are not authorization and do not install the canonical composition.

Monitoring is read-only and aggregate. Deployed alert delivery, health probes, reconciliation backoff and operator dashboards remain uninstalled. Require monitoring of unknown/pending age, withheld acknowledgements, journal failure, owner fencing, revoked eligibility and pool/rate pressure before any activation.

## Verification and corrected defects

- Comprehensive PostgreSQL regression set: **268 passed, zero failed/skipped**, including previous ownership/process/intent/canonical/validation/authorization/provider/worker/application/operational suites, three new refresh race scenarios plus their parent, and one actual-Prisma-schema scenario.
- Unit/policy/team/artifact/lifecycle/boundary/new-adapter set: **74 passed, zero failed/skipped**. Seven new tests cover normalization, concurrent durable journal append/reopen/conflict, disabled config, X/LinkedIn preparation and host restriction, immutable object storage and raw Meta authentication.
- Combined unique final suite count: **342 passing tests**. Independent reruns are not added to this count. The broadened actual-schema scenario was rerun successfully after adding publication/replay, grants and monitoring assertions.
- Isolated integration TypeScript and repository `tsc --noEmit --incremental false`: final results recorded below.
- Safe Next build: passed in an isolated temporary source copy with no dotenv files/inherited application credentials; network denied, read-only synthetic DB results and mocked fonts. It compiled, checked types and generated routes. This does not validate real prerender data, real font fetching, deploy packaging or live route behavior. Lint was disabled for this build.
- Relevant `git diff --check`: passed. Pre-existing unrelated workspace edits were preserved.

The initial regression attempt found a synchronous-versus-Promise rejection incompatibility in the newly normalized lookup method; fixed without weakening the operation whitelist, and the comprehensive set subsequently passed. The isolated TypeScript check found Node-only BodyInit/unknown JSON typing mismatches; fixed with the existing RequestInit body contract and validated object responses. The first safe build correctly denied external font fetching; explicit font fixtures and read-only prerender data then allowed a network-free build. Refresh CAS/rotation, ambiguous callback selection and cross-workspace route scope were also corrected and covered by local checks.

Reproduction commands:

```sh
SHOWWORK_TEST_CANONICAL_SCHEMA=1 node --test --test-concurrency=1 \
 tests/publishing-ownership.integration.test.cjs tests/publishing-ownership-process.integration.test.cjs \
 tests/publishing-intent-actions.integration.test.cjs tests/publishing-canonical.integration.test.cjs \
 tests/publishing-validation.integration.test.cjs tests/publishing-authorization.integration.test.cjs \
 tests/publishing-providers.integration.test.cjs tests/publishing-canonical-worker.integration.test.cjs \
 tests/publishing-application-integration.test.cjs tests/publishing-provider-operations.integration.test.cjs \
 tests/publishing-final-refresh.integration.test.cjs tests/publishing-real-schema.integration.test.cjs
node --test tests/publishing-entrypoint-boundaries.test.cjs tests/publishing-canonical-worker.test.cjs \
 tests/publishing-ownership.test.cjs tests/publishing-retry-policy.test.cjs \
 tests/publishing-eligibility-policy.test.cjs tests/calendar-team.test.cjs \
 tests/worker-build.test.mjs tests/worker-lifecycle.test.mjs tests/publishing-final-adapters.test.cjs
npx tsc -p tsconfig.publishing-integration.json --noEmit
npx tsc --noEmit --incremental false
node scripts/publishing-reliability/safe-application-build.cjs
```

## Production safety and final cleanup

All PostgreSQL tests used synthetic data, private Unix sockets and TCP disabled. PostgreSQL 17.6 was downloaded only after fresh approval and verified against its official SHA-256 **before extraction**: `e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`. No system-wide installation, existing PostgreSQL modification or persistent service occurred.

No production database, VPS, Netlify service, real social API or real storage service was contacted. No production secrets were used for the safe build. No deployment, production migration, Netlify configuration change, worker activation or live publishing behavior change occurred. Database grants were tested only in disposable clusters. The production migration/grant/runbook artifacts are inactive proposals.

Final verification: isolated integration TypeScript, full repository TypeScript and worker TypeScript all passed. The safe application build passed after the final adapter changes. `npm run worker:build` generated the inactive `dist-worker/main.cjs` and `dist-worker/metafile.json`; `--check` and `--check-config` both succeeded with publishingEnabled=false, databaseConnected=false and runtimeImplemented=false. These gitignored generated artifacts are retained as reviewable disabled build outputs and listed separately in the file manifest. They do not contain an operational publishing runtime.

Cleanup verified: no disposable PostgreSQL or synthetic provider/worker/sender processes remained; no disposable clusters, sockets, safe-build copies or journal fixtures remained. Temporary PostgreSQL archive/checksum/source/build/install directory and all temporary schema/TAP/build-log artifacts from this cycle were removed, and absence was checked. No existing PostgreSQL installation or system service changed.

Production remains **NO-GO** because the critical unported paths above remain. This is a partial integration readiness result, not completion or authorization to deploy.
