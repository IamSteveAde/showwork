# Showwork — coordinated Stage 4C.6–4C.13 local integration

**Production status: NO-GO.** Local development and synthetic rehearsal only. No production database, Netlify, VPS, live social API, credential change, deployment, production migration, worker activation or actual cutover occurred.

## Outcome and completion limits

The coordinated cycle implemented core components in all eight workstreams: default-inactive application bridges, legacy fencing, canonical scheduling and content actions, consent, viewer approval, versioned media, account/eligibility controls, retention guards, legacy classification/adoption and cutover/rollback rehearsal.

**This is not unconditional completion of every production-equivalent application pathway.** Specialized route adapters and operational dependencies remain unimplemented or unverified, as explicitly listed below. In canonical rehearsal those paths fail closed; they never fall back to legacy publishing. Passing synthetic tests does not mark those requirements passed. Deployment/activation is blocked until those gaps and product-policy decisions are resolved.

## 1. Exact created and modified files

The authoritative exhaustive list is `docs/publishing-stage-4c6-to-4c13-files.json`: 29 created deliverable/source files and the deduplicated modified paths. The enforcement ledger lists each generated route/function change individually. Pre-existing changes to environment examples, package files, diagnostics, gitignore and tsbuildinfo were retained and are excluded from this cycle's changes.

New core modules:

- `applicationBoundary.ts`: explicit isolated install proof, no automatic bootstrap; protocol flag can veto but cannot grant authority.
- `applicationComposition.ts`: authenticated route dispatch and explicit unsupported-adapter responses.
- `applicationActions.ts`: joined top-level transactions for publishing, batch/draft creation, planning edits, consent, review, media, account, membership, billing and tombstones.
- `integrationControl.ts`: audited stop-sender protocol, legacy inventory, evidence-required adoption and externally read-only legacy resolution.
- `executionCoordination.ts`: account execution mutex, rate buckets/spacing and refresh reservations.
- `acceleratedComposition.ts`: canonical worker/media/mutex/rate composition.
- `databaseBudget.ts`: shared three-slot heavy-transaction budget using acknowledged reservations and PostgreSQL advisory transaction locks.
- `immutableMedia.ts`: source version/digest binding and job-specific immutable-copy receipts.
- `credentialResolver.ts`, `tokenRefreshFence.ts`: exact account/version credential selection and guarded refresh CAS.
- `providerHttpAdapter.ts`: bounded, injected HTTP endpoint contracts, opaque active-driver/payload binding, durable invocation nonce and response capture.
- `sharedJournal.ts`: injected append-only shared storage contract, acknowledgement and integrity checks.
- `authenticatedCallbacks.ts`: signed normalized callback contract, replay protection and known-reference resolution.
- `statusProjection.ts`: current durable phase to legacy UI projection; no send authority.

Earlier inactive modules modified: ownership/canonical stores for ES2017-compatible BigInt constructor syntax; authorization for active opaque driver contexts; provider composition/journal/content policy for exact payload/media identity and response fallback; validation for tombstone/hold checks; worker for optional coordination/media/projection hooks. `tiktokConsent.ts` includes physical media version/digest only when present, preserving old consent hashes when they are absent. Fault fixtures cover lost action and invocation acknowledgements.

No normal-worker build entrypoint/allowlist, live Netlify configuration, Prisma schema or production migration was changed. Netlify function source and local application files gained inactive conditional bridges; current deployment was untouched.

## 2. Reconstructed Stage 4B inventory

The original Stage 4B report was unavailable locally. Reconstructed artifacts:

- `docs/publishing-stage-4b-reconstructed-inventory.json`: 166 files, 433 function records, baseline hashes, direct writes, relevant fields, lexical authorization/validation checks, authority classification, risk and implementation order; ten current Prisma models and cascade relations.
- `docs/publishing-stage-4b-reconstructed-inventory.md`: human-readable file/function map.
- `docs/publishing-stage-4c6-entrypoint-enforcement.json`: 149 function/route boundaries in 101 files.

The initial publishing inventory was captured before entrypoint edits. Indirect project/media cascade paths were subsequently added before their guards were installed. Inventory is conservative static source analysis: a dependency on a publisher is distinguished from a confirmed direct API request. It does not establish production traffic, credentials, deployment versions or third-party caller behavior.

Confirmed publishing paths include all three legacy cron API routes; Netlify social-publish cron/background; simple, batch and dormant reliable admission/workers/runtime; direct Instagram/TikTok default and injected publishers; Facebook/LinkedIn/X provider exports; Instagram media_publish and TikTok initialization helpers; reporting adapter publication references; legacy recovery/retry; app publishing/approval/content/media/AI/account/entitlement/deletion routes and server actions.

The map records existing checks such as creator authentication, calendar permissions, workspace access, approval/draft state, token scopes, consent and cron secrets. These are source observations, not assertions that every legacy path already enforced the canonical boundary.

## 3. Canonical enforcement and Stage 4C.6

Default behavior is preserved when `SHOWWORK_PUBLISHING_PROTOCOL` is unset/legacy and no composition is installed. Generated bodies are unchanged apart from an installed-only prefix/import; static hash tests restore the original source and verify parity. Pure reads were excluded from mutation guards so readers do not become unintended publishing entrypoints.

A `canonical` flag **without** explicit bootstrap throws; it does not enable publishing or fall back. Invalid protocol values fail closed. The only supplied installer accepts an opaque proof from a private Unix-socket `postgres` database owned by `synthetic_owner` in an `accelerated_N` schema. No route/function/normal worker installs it. A production installer is intentionally absent and requires separate deployment authorization and review.

Installed canonical routes dispatch to trusted server adapters. Unported routes return errors. Legacy function, provider and writer entrypoints call the DB-backed legacy veto. `executionContext` gates even its no-context global-fetch fallback before egress. Existing optional `beforePublication` callbacks cannot bypass that gate.

Legacy permission requires enabled NETLIFY ownership, LEGACY protocol and absence of canonical intents. DRAINING/VPS/CANONICAL veto legacy publication. Canonical authorization is independently vetoed at SQL level when protocol is LEGACY. Activation is an audited DRAINING transaction with current-epoch ALL_SENDERS stop evidence from a trusted verifier. The mode record is a veto/compatibility control, not an independent send grant.

Canonical sending still requires exact C1 identity, C2 current eligibility witness, fresh C3 authorization and consumed capability, C4 protected operation, and the additional HTTP invocation reservation when that adapter is used. Ordinary job lookup/admission/preparation/recovery cannot create an opaque active-driver context. That context binds the exact operation and payload hash and is removed when the driver settles. The invocation row is unique per authorization and checked against EXTERNAL_PENDING/current ownership/account/fence/expiry. Only acknowledged fresh INSERT COMMIT may precede HTTP; lost acknowledgement never resends.

Account mutexes block other intents while an existing attempt is pending/unknown, even after its lease expires. Terminal evidence/reconciliation releases the matching lease. Rate buckets serialize through PostgreSQL; TikTok composition also preserves native spacing (creator 3100ms, init 10100ms, status 2100ms), waiting outside transactions. Shared DB budget protects three heavy callbacks; it is not publishing authority. Production quotas/capacity remain unverified.

## 4. Stage 4C.7 — scheduling, editing, cancellation and retry

Canonical application actions reuse Stage 4A inside the existing READ COMMITTED top-level transaction. Scheduling/cancellation/rescheduling/retry preserve immutable revision/generation/job history; current permissions and owner entitlement are checked again inside mutations. UI projection derives from the current durable job, so an old replay cannot revert a confirmed post to SCHEDULED.

Draft and bounded multi-platform creation are atomic and replay-safe; approved status is not client-assigned. Planning edits cover caption, date/platform/type, hook/script/category/content idea, CTA, hashtags, tags, links and TikTok visibility with a fixed SQL field allowlist. Approved content remains locked; affected unsent work is cancelled/invalidated first. Externally attempted or legacy-evidenced work cannot be silently edited. User body actor IDs do not override authenticated creator identity.

Retry takes durable evidence ID and Stage 4A generation lineage. The old confirmedNotPublished checkbox does not become evidence. Unknown/accepted/authorized work remains pending reconciliation; confirmed work requires new explicit intent/post policy. All original constraints remain.

Canonical HTTP requests require stable operation IDs and explicit revision/destination contracts. Frontend metadata/idempotency upgrades and exact old response-shape coverage are not complete. Unsupported custom fields/import payloads are explicitly rejected, not silently dropped. Default-inactive existing request behavior is unchanged.

## 5. Stage 4C.8 — TikTok

TikTok configuration parses the existing settings, validates visibility/disclosure/creator constraints, exact account/version and explicit authenticated creator consent. Generic client approval cannot infer consent. Video/photo differences remain in C4. Consent hashes now include verified physical media identity when available, and content/media changes/cancellation clear consent.

Atomic rescheduling/retry can append a new revision/generation through the existing protocol with explicit consent. Replayed action returns the original result and no send grant. TikTok initialization acceptance remains PROVIDER_PENDING; confirmation requires verified status. Unknown outcomes never repeat init.

Creator lookup, token handling, conversion/media and rates are injected. Real TikTok photo/video conversion, URL verification, grant behavior and native webhook normalization remain deployment blockers; mocks prove contracts only.

## 6. Stage 4C.9 — client approval

Viewer credentials are verified through the C2 transactional viewer port. Approval/revision changes alter eligibility and preserve evidence. Viewer identity never substitutes for creator publishing-management identity. Original scheduler authority, owner entitlement, connected destination and approval are revalidated before sending.

No implicit owner delegation or automatic viewer scheduling is invented. That differs from legacy auto-scheduling only inside the inactive canonical composition and requires founder review before activation. Calendar-plan approval/server-action and all real viewer credential/password-rotation adapters are not fully ported; their mutation paths are fenced.

## 7. Stage 4C.10 — AI and media

AI drafts are excluded, promotion returns to PENDING review, and edits invalidate unsent work. AI draft creation, membership changes and upload completion require an injected transaction-aware usage validator; missing/denied allowance fails closed. The actual AI-generation route remains unavailable pending verified generation/quota integration; it is not represented as implemented just because a draft can be created.

Uploads require a trusted verifier bound to calendar/post, immutable object version, SHA-256 and byte length. Client-provided hashes or source keys are not accepted as verification. Replacement updates media type/size and clears consent. Physical identity enters canonical content/consent hashes.

Before authorization the worker requires job-specific immutable-copy receipts with exact source version/digest and a publishing/job prefix. Provider media uses pinned blob keys. SQL rejects authorization without matching pins and prevents destructive asset changes for unresolved work. Legacy project/media/folder cascade paths are included in inventory and fenced.

Real storage-version semantics, immutable copy/access policies, presigned/multipart ticket and reservation accounting, old in-flight uploads and garbage collection are unverified/unported. A checksum returned by a mock is not proof of real R2 bytes. No real storage operation occurred.

## 8. Stage 4C.11 — accounts and entitlements

Connection/reconnection/disconnection uses trusted verified account evidence and C1 append-only account versions. Exact normalized destination is checked; replacement cannot retarget an old intent. Credential resolver selects by canonical job/binding/version/connection/provider identity, not findFirst. HTTP credentials require a matching structured binding.

Refresh reserves a bounded DB lease, performs injected refresh outside transactions, then under exclusive policy fence checks lease token, binding/version and normalized account before updating credentials. Scope changes invalidate old work rather than silently adopting new permissions. Full OAuth exchange/CSRF/refresh-token rotation and legacy shadow-calendar token projection are not wired; those routes require additional verified adapters.

Subscription/trial/complimentary changes and principal revocation are current transactional policy, not permanent scheduling grants. New immutable holds prevent restoration from silently resuming an old revision; explicit rescheduling/revision is required. Already-authorized work is not erased or promised atomically revoked. Old accepted/unknown work reconciles only.

Existing entitlement computation and team permission helpers are reused. Billing proof and usage validators are trusted server ports, not client booleans. Actual billing-provider signature/cycle/accounting adapters and advanced team feature limits are unimplemented; founder policy questions remain below. Owner-only canonical membership/deletion restrictions are conservative temporary behavior, not approved production policy changes.

## 9. Stage 4C.12 — deletion and retention

Post deletion requires current authority, an approved retention policy, no unresolved canonical/legacy outcome, cancellation of unsent work and a same-transaction tombstone. Historical jobs, revisions, attempts, references and journals remain. Legacy confirmed references are archived before content erasure. SQL blocks unrecorded post/parent deletion, destructive unresolved-media changes and retired post-ID reuse. Retired workspace/creator tombstones veto new eligibility.

Workspace/user retirement deliberately does not run broad legacy project/media/account cascades. It returns requiresNonPublishingCleanup; full erasure is **incomplete** and must not be reported as completed account deletion. Uncertain credentials/reference context cannot be destroyed before reconciliation.

Privacy implications: pseudonymous actor/post/account IDs and provider references may still be personal data. Media keys, preparation URLs and creator metadata need a reviewed private-cache purge/archive procedure. Retention dates are policy proposals, not automatic TTL enforcement. No new production retention was introduced. Current immutable triggers prohibit ordinary evidence deletion; deployment-grade privacy erasure/grants and policy-authorized cache purge remain unimplemented. No indefinite retention approval is inferred.

## 10. Stage 4C.13 — compatibility, cutover and rollback

Legacy discovery distinguishes confirmed, ambiguous/quarantined and scheduled candidates using status, worker/init markers, references and durable jobs. **SCHEDULED is only a candidate, never trusted no-send evidence.** Adoption requires a separate trusted VERIFIED_NEVER_AUTHORIZED proof bound to snapshot/post, current stopped-sender evidence and DRAINING epoch. Existing legacy jobs needing conversion are refused, not rewritten. Quarantined/confirmed work cannot become a sendable canonical job via generic scheduling bypass.

New canonical-born posts carry immutable origin records. Legacy adoption proof is appended in the same transaction as the new canonical action. Ambiguous records block ownership transfer. Externally read-only reference reconciliation can append verified terminal legacy resolution, never new sendable work. Missing references/absence from a lookup do not resolve uncertainty.

Synthetic rehearsal: NETLIFY → DRAINING; current-epoch sender-stop verification; candidate inventory/proof/adoption; VPS takeover; stale Netlify fencing; one protected publication; VPS → DRAINING → NETLIFY rollback with renewed stop verification. CANONICAL mode remains after rollback; legacy publishers stay fenced and history is retained.

Independent synthetic cron/background actors were killed and their before-submission checkpoints/exit receipts verified before adoption. These receipts prove the controlled mock actors stopped; they do not establish production quiescence or provider no-send. Generic sender exit alone is never no-send evidence for real attempts. Actual production legacy adoption requires provenance that current historical systems may not possess; such posts stay quarantined.

## 11. Provider, journal, callback and role status

The HTTP adapter implements protected creation URL/body/header contracts for five platforms, plus selected unpublished preparation and read-only lookup operations. It has no global fetch/default credential source. Operation whitelists prevent prepare/lookup from calling create endpoints; published Facebook photos/Reel finish cannot masquerade as preparation. Actor context expires, payload/target binding is immutable, and SQL nonce commit is one-way. Credentials/body/network waits are bounded; late mock responses are journaled without resending. LinkedIn header IDs are captured before optional body reading. Ordinary HTTP failures/timeouts are uncertain, not definitive no-send.

**Incomplete real integration:** LinkedIn/X native media upload ports, Facebook Reel upload sessions, full TikTok media processing, provider-specific response/reference normalization and native callbacks/permalinks/reporting still need reviewed adapters. Existing native API-version defaults were inspected; this cycle does not verify live API support or terms/permissions/rate limits.

Shared journal implements an injected append-only storage interface with durable-ack and integrity checks. Actual shared/WORM storage is not installed or verified. Response/status capture can fall back to DB when spool fails; pre-submission spool failure still stops sending. If all persistence fails, UNKNOWN and any known returned reference are retained conservatively; no resend.

Normalized callbacks use timestamp/HMAC authentication, payload-hash replay checks and exact known account/reference matching. Unknown signed references quarantine. This is a locally tested ingress contract, **not verified implementation of each provider's native webhook signature/normalization protocol**.

The local grant proposal is restricted to synthetic Unix-socket accelerated schemas. Tests deny DDL, trigger disabling, TRUNCATE and evidence deletion. It is not production RLS or tenant authorization; trusted backend evidence writes remain a privileged boundary. Production roles, tenant grants, pooler/isolation, shared capacity and observability are not verified.

## 12. Potential duplicate-publishing paths and controls

All confirmed legacy sources in the inventory can duplicate if mixed with canonical execution: cron API routes, Netlify cron/background, simple/batch schedulers, direct default and injected native publishers, reporting publication adapters, dormant reliable worker/store begin/recovery/retry, legacy recovery import, immediate TikTok authorization and manual failed-post checkbox retry. Mutable CP PUBLISHING/updatedAt claims and job resets cannot be accepted as canonical authority.

Controls: mode/epoch fencing, mandatory installed bootstrap, exact immutable tuple/current eligibility, original initial-attempt uniqueness, predecessor/evidence retry generations, one consumed capability, one registered payload/context and one fresh invocation nonce. Old envelopes are hints only. Ambiguous legacy work is quarantined. These controls require every host to deploy a reviewed bootstrap; protecting one new worker alone protects no unmodified/unconfigured production sender.

No exactly-once remote guarantee is claimed. Database commit, process stopping and remote provider request cannot be one atomic event.

## 13. Defects discovered and corrected

- Reserved SQL window identifier changed to bucketWindow.
- BigInt syntax adjusted to constructors for the existing repository target without changing epoch semantics.
- Adoption stripped transport epoch from Stage 4A request hashing and gained explicit never-authorized proof/replay handling.
- Initial provider adapter permitted repeated use of consumed metadata; fixed by active opaque context, exact request hash, lifetime teardown, durable invocation uniqueness and state/fence checks.
- Preparation/lookup runtime operation lists now reject create/finish bypasses, independent of TypeScript casts.
- Credential binding/deadline covers credential waits and exact destination metadata.
- Late response capture, early LinkedIn ID capture and spool/DB response fallback preserve evidence without resend.
- UI replay derives current durable phase instead of overwriting confirmed state with an old schedule result.
- Actual Prisma required timestamps are explicitly populated by raw INSERTs; synthetic constraints test this.
- Media byte/type updates and physical-version consent binding prevent old consent from silently covering replaced bytes.
- Read-only page/helper false positives removed from generated guards; nested server-action and indirect cascade mutation paths retained.
- Restoration holds and existing-mode adoption bypass protection added.
- Unsupported fields/routes explicitly error rather than silently dropping changes/falling back.

## 14. Remaining blockers and founder decisions

Unimplemented deployment/integration blockers (not passed):

1. Production bootstrap for every Next/Netlify/native/legacy host, reviewed entrypoint coverage and signed activation/stop procedures. Current installer is synthetic-only.
2. Full OAuth state/exchange, real authentication/viewer credentials, billing webhook/cycle handling, quotas/reservations, import/custom-field/bulk-specialized payloads and server-action adapters.
3. Complete five-platform native media/processing/response/callback/reference adapters, immutable deployed storage and credential rotation.
4. Durable shared journal deployment, reconciliation scheduling/backoff/observability and real stop-old-sender/legacy provenance evidence.
5. Production schema/data import, role/RLS/grants, pooler behavior and backend capacity verification.
6. Full privacy erasure, retention/purge/archive procedures and non-publishing cascade cleanup.
7. Frontend canonical revision/destination/idempotency contracts and full existing response/UI compatibility under activation.

Manual product decisions requiring founder review: client approval auto-scheduling/delegation; adoption after original scheduler revocation; restoration/hold behavior; manager versus owner membership powers; creative contribution invalidation powers; cancellation after entitlement expiry; same-post repost identity; account reconnect/grant-change consent UX; approved-content privacy erasure and retention periods. Conservative inactive behavior must not silently become production policy.

## 15. Verification and production confirmation

All database tests use fresh synthetic PostgreSQL clusters, private Unix sockets, TCP disabled and mocked external APIs. PostgreSQL 17.6 official SHA-256 was verified before extraction/build:

`e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`

No system installation/service or existing PostgreSQL installation changed. Final exact results and cleanup are recorded below. Full Next production build was not run because prerendering/imports may access configured external data; repository and isolated TypeScript checks plus synthetic tests are the claimed verification.

Production remained untouched throughout. No real cutover or activation occurred. Review the explicit incomplete-path/blocker list before approving any next work.

### Final verification record

- Comprehensive PostgreSQL: **263/263 passed**, zero failures/skips, ten suite parents included. Earlier stages: **209 scenarios + eight parents = 217**. New application/operational workstreams: **44 scenarios + two parents = 46**.
- Unit/policy/team/worker-isolation/entrypoint suites: **67/67 passed**, zero failures/skips; includes six source/fence boundary checks.
- Combined final Node count: **330 passed**.
- Independent final new-workstream run: **46/46 passed** (not added again to the combined count).
- Isolated integration TypeScript: **passed**. Full repository `tsc --noEmit --incremental false`: **passed**.
- `git diff --check -- app lib netlify`: **passed**. Pre-existing unrelated diagnostic whitespace was not changed.
- Source parity checks restore all generated guards/imports and match original hashes. They verify default-inactive bodies, not a full browser/production deployment rehearsal.
- All five platforms exercised through mocked provider operations. Actual native provider compatibility, native callbacks, real storage, production RLS/capacity and unported route adapters remain **not verified / not implemented**, as listed above.

Commands used for final checks:

```sh
SHOWWORK_TEST_CANONICAL_SCHEMA=1 node --test --test-concurrency=1 \
 tests/publishing-ownership.integration.test.cjs \
 tests/publishing-ownership-process.integration.test.cjs \
 tests/publishing-intent-actions.integration.test.cjs \
 tests/publishing-canonical.integration.test.cjs \
 tests/publishing-validation.integration.test.cjs \
 tests/publishing-authorization.integration.test.cjs \
 tests/publishing-providers.integration.test.cjs \
 tests/publishing-canonical-worker.integration.test.cjs \
 tests/publishing-application-integration.test.cjs \
 tests/publishing-provider-operations.integration.test.cjs
node --test tests/publishing-entrypoint-boundaries.test.cjs \
 tests/publishing-canonical-worker.test.cjs tests/publishing-ownership.test.cjs \
 tests/publishing-retry-policy.test.cjs tests/publishing-eligibility-policy.test.cjs \
 tests/calendar-team.test.cjs tests/worker-build.test.mjs tests/worker-lifecycle.test.mjs
npx tsc -p tsconfig.publishing-integration.json --noEmit
npx tsc --noEmit --incremental false
```

### Cleanup and stopping record

Cleanup verified: no disposable PostgreSQL or synthetic actor processes remained; no `sw-owner-*` cluster directories remained. Temporary PostgreSQL source/archive/checksum/build/binaries/logs, clusters/sockets, mock fixtures/spools/traces and TAP/typecheck outputs were removed. No system service or existing PostgreSQL installation was changed.

The coordinated local cycle stops here for review. Core safety components and synthetic rehearsals are implemented; the explicitly listed unported paths and operational/product dependencies prevent claiming complete production-equivalent integration. Production remains **NO-GO and untouched**.
