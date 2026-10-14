# Stage 4C.4 — inactive provider integration

Scope: local implementation and synthetic verification only. This composition requires `environment: isolated-mock` and injected `kind: local-mock` IO. It has no default provider export, HTTP client, global fetch, environment-selected database, activation switch or application caller. It does not replace native publishers. This is an executable provider protocol layer with mock ports; production credential/media/HTTP port implementations remain a later integration task.

## Exact files

Created:
- `lib/publishing/capabilityProviders.ts`
- `lib/publishing/providerJournal.ts`
- `lib/publishing/providerSpool.ts`
- `scripts/publishing-reliability/provider-schema.sql`
- `tsconfig.publishing-providers.json`
- `tests/publishing-providers.integration.test.cjs`
- `tests/helpers/provider-mocks.cjs`
- `tests/helpers/provider-process.cjs`
- `docs/publishing-stage-4c4-provider-integration.md`

Modified: `lib/publishing/externalAuthorization.ts`, the inactive Stage 4C.3 service. Its consumed submission includes immutable authorization ID, actor, owner/epoch, root/retry attempt and deadline. An explicit trusted outcome-persistence hook allows journaling before optional work. Its original default transport behavior remains covered by the earlier regression suite. No other earlier-stage file was changed for this stage; existing unrelated workspace changes were retained.

## Architecture and reuse

`createCapabilityProviderIntegration` receives a transaction database, C3 authorization service, C2 validation adapter, durable spool and typed provider IO. `prepare` validates canonical identity/content, refreshes only the exact bound account, revalidates current eligibility, prepares media and appends an immutable artifact. Preparation returns `maySend:false`. It never creates a capability. Refresh, rate reservation, creator metadata, upload/container preparation, lookup and reporting are mandatory injected ports where relevant.

The layer reuses native `state.ts` caption/content validation and `tiktokSettings.ts` parsing, visibility/disclosure/creator rules and post-info construction. It follows the native operation ordering inspected in `lib/publishing/providers.ts`, `lib/instagramPublishing.ts`, `lib/instagram.ts`, `lib/tiktokPublishing.ts` and `lib/tiktok.ts`, including unpublished Facebook photo attachments, Instagram container readiness, Facebook Reel start/upload/finish and platform-specific response IDs. Native defaults also import token/database/storage/execution-context utilities and therefore are not imported into this isolated composition. Actual upload chunking, signed-media URL restrictions, HTTP headers/API versions, provider rate storage and credential rotation must be preserved by later reviewed port implementations. The current mocks exercise port contracts, not real provider compatibility.

| Platform | Capability-protected operation | Earlier preparation | Durable result / read-only reconciliation |
|---|---|---|---|
| Instagram | `IG_MEDIA_PUBLISH` / native `media_publish` | Single/carousel containers; video FINISHED check | Successful publication media ID confirms; permalink optional, after journal. Known media ID can be looked up. |
| TikTok | `TT_VIDEO_INIT`, `TT_PHOTO_INIT` | Current creator settings, consent, media, creator/init rate reservation | `publish_id` means ACCEPTED; only PUBLISH_COMPLETE confirms. Status fetch by operation ID; failure does not prove no-send. |
| Facebook | `FB_FEED`, `FB_VIDEO`, `FB_REEL_FINISH` | Unpublished photo IDs; Reel start/video ID/upload | Feed post ID confirms. Video/Reel acknowledgement means ACCEPTED until ready plus publishing complete. Finish can retain the previously known video ID. |
| LinkedIn | `LI_POST` / native post creation | Prepared media URNs | Creation ID alone means ACCEPTED; explicit PUBLISHED lifecycle or verified read confirms. Missing ID is UNKNOWN. |
| X | `X_TWEET` / native tweet creation | Media preparation | Successful created tweet ID confirms; missing ID is UNKNOWN. Known tweet can be read. |

The preparation ports are trusted server dependencies. In particular Facebook photo preparation must remain unpublished, Instagram containers must never call media_publish, and Reel start/upload must never finish publication. No caller-provided endpoint or executable publication callback is accepted by the public `publish` operation. The trusted composition itself is not a sandbox for malicious dependencies.

## External boundary and transactions

1. Canonical job admission/preparation remains C1. Long provider preparation precedes minting the short-lived capability.
2. C3 authorization atomically commits exact `(intentId, revision, generation)`, job, account/version, content hash, owner epoch, eligibility witness, external attempt and capability. Only fresh COMMIT acknowledgement returns a send capability. Replay/recovery never returns one.
3. C3 transport rechecks policy/ownership/identity and durably consumes that capability before the provider driver. Invalid/wrong publication/expired/revoked/missing capabilities cannot reach submission. Concurrent contenders spend once.
4. The provider driver journals a conservative SUBMISSION marker, revalidates content/current eligibility and checks its deadline before invoking the one typed post-creation operation. Once C3 authorizes, ordinary cancellation is already blocked; once capability consumption commits, no replay may submit, even if the process crashes before network activity.
5. The actual irreversible external-publication boundary is entry into the IO post-creation request. The preceding database authorization and SUBMISSION marker are permission and risk evidence, not proof a request reached the provider. There is deliberately no database transaction held across provider calls.
6. Response capture writes and fsyncs an append-only synthetic host WAL, then inserts immutable DB journal evidence, then projects through C3 `recordOutcome`. Optional permalink/reporting follows capture. A database failure retains known IDs in the spool and returns UNKNOWN until projection succeeds. The spool must also be available before submission; failure spends the capability without calling a provider.

All transactions use the existing READ COMMITTED adapter, C2 policy fence and post/account locks, C3 ownership/intent/job/capability ordering. No nested transaction, savepoint, transaction-ID sharing or implicit retry is introduced. Journal transactions do not hold provider locks across IO. Immutable evidence and fixed event-hash operation IDs make projection/repeated callbacks idempotent. Spool fsync and DB COMMIT cannot make the provider call atomic; process death between provider acceptance and response capture remains UNKNOWN.

## Additive local schema proposal

`provider-schema.sql` is manually loaded only into synthetic schemas after the six earlier local proposals. It is not a production migration or installer.

- `PublishingProviderPreparation`: canonical-execution foreign key, immutable artifact, SHA-256 target/content hashes, trigger checking canonical content binding.
- `PublishingProviderJournal`: capability foreign key, exact consumed job/platform guard, immutable evidence, SUBMISSION/RESPONSE/STATUS kinds, ACCEPTED/CONFIRMED/REJECTED/UNKNOWN classification, bounded provider reference and response hash. ACCEPTED/CONFIRMED require a reference.
- Existing post statuses, ownership, revision, generation and attempt tables are preserved; no attempted job is reset to READY.

Stored responses are normalized outcomes, known IDs and response digests, not access tokens or full provider payloads. Raw error strings are not persisted. Host WAL durability is synthetic only; durable deployment storage, backup/recovery and disk-full monitoring are unresolved requirements before activation.

## Uncertainty, retry and reconciliation

Missing response/ID, timeout, interruption, lost acknowledgement or ambiguous HTTP error is UNKNOWN. Explicit trusted definitive-no-send evidence may classify a provider rejection; an HTTP 4xx alone does not. Rejected work still requires the existing evidence verifier and explicitly approved new retry generation. Unknown work has no automatic resend path. Confirmed work requires a new explicitly authorized intent.

Reconciliation reconstructs immutable identity from a CONSUMED capability, imports spool evidence and invokes only typed lookup endpoints using an existing reference. It never mints a capability or invokes submission. Exact account identity and CONNECTED status are checked before lookup; disconnection cannot retarget a request. Authoritative terminal evidence survives disconnect and can be projected without contacting a provider. Pending/failure responses retain IDs and do not become trusted no-send evidence.

Without an operation/publication ID, Instagram, LinkedIn and X cannot safely search by caption/time and infer which request succeeded. TikTok cannot poll without publish_id. Facebook may retain a Reel video ID from preparation, but it cannot infer publication from that ID alone. These cases need trusted callbacks or manual reconciliation. Callback import is an injected trusted server observer; signature verification, tenant routing and provider-specific callback parsing remain unimplemented and cannot be exposed directly as a route.

Policy mutations after the last transactional check and before provider request entry cannot be made atomic with the external system. C3's committed authorization is the serialization boundary; changes already committed before consumption are denied, and cancellation after authorization remains pending/conflict. Later ownership cutover must drain authorized attempts and reconcile rather than promise network-level revocation.

## Existing live entrypoints requiring later enforcement

Native provider default exports in `lib/publishing/providers.ts`, `publishFacebook`, `publishLinkedIn` and `publishX`, `lib/instagramPublishing.ts:publishPostToInstagram`, `lib/instagram.ts:publishContainer`, `lib/tiktokPublishing.ts:publishPostToTikTok` and TikTok video/photo initialization in `lib/tiktok.ts`, and `lib/publishing/executionContext.ts`'s optional authorization hook/global-fetch fallback remain unchanged. Live callers catalogued by Stage 4B must later enter the canonical composition; this stage cannot enforce capabilities on existing routes/functions. Reliable admission/store/worker/portableRuntime integration is also still inactive. No safety claim is made about bypass prevention in those live paths today.

## Verification results

See final verification record below. Tests use private disposable PostgreSQL Unix sockets with TCP disabled, synthetic owners/accounts/posts and in-process provider mocks only. Crash tests kill a child at pre-submission, after synthetic external effect but before response, and after journal capture. Recovery never invokes post creation. Tests also exercise approved generation 2, untrusted retries, rollback, real lost COMMIT acknowledgement, concurrency, invalid/missing/wrong/consumed capabilities, response/DB failures, TikTok and Facebook intermediate states, Instagram permalink failure, missing identifiers, duplicate evidence, disconnection and scope revocation.

Defects corrected during this stage: missing awaited asynchronous spool construction in test fixtures; incorrect synthetic IMAGE enum (native uses PHOTO); stripped child TMPDIR causing private-spool validation failure; refresh sequencing blocked expired credentials before refresh; LinkedIn creation receipt initially classified too strongly and now remains ACCEPTED absent explicit publication evidence. Uncertain retry tests now assert the existing pending-reconciliation result rather than expecting an exception.

## Safety and remaining review

Production was not accessed or changed. No live route, Netlify function/configuration, production migration or worker activation was performed. All provider calls were mocks. Temporary PostgreSQL and test artifacts are removed after verification. Remaining activation work includes real reviewed IO adapters, stable shared WAL storage, signed callback ingress, account/token-refresh fencing, provider-specific processing/timeouts and API-version compatibility, and the Stage 4B cutover plan. Stop at Stage 4C.4 for review.

### Final local verification record

- PostgreSQL 17.6 official SHA-256: `e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`; downloaded archive matched. Temporary prefix only; no services/system installation.
- Provider integration: **30 scenarios plus parent = 31 tests passed**, zero failures/skips.
- Stage 3A/3B/4A/4C.1/4C.2/4C.3 PostgreSQL regressions: **138 scenarios plus six parents = 144 tests passed**, zero failures/skips. Stage 4A also loaded the canonical compatibility proposal (`SHOWWORK_TEST_CANONICAL_SCHEMA=1`).
- Ownership/retry/eligibility/calendar-team unit suites: **34 tests passed**, zero failures/skips.
- `npx tsc -p tsconfig.publishing-providers.json --noEmit`: passed.
- Total Node test count: **209 passed** (includes seven parent tests). All external APIs mocked.
- Cleanup verified: no disposable clusters or PostgreSQL/provider child processes remained; temporary source, binaries, sockets, database files, build logs, crash fixtures/spools and TAP outputs removed. No system service was created.
