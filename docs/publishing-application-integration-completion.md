# Showwork application integration verification and completion audit

**Production remains NO-GO. Application integration is incomplete.**

This report records local application integration and its verification, not authorization to deploy, migrate, connect to real services, or activate a worker. It supersedes the earlier final-readiness report for this application's integration coverage. Passing infrastructure tests do not establish application completeness.

## Mandatory coverage audit

Every one of the 149 entries in `docs/publishing-final-integration-coverage.json` has exactly one classification in [the application audit](publishing-application-integration-audit.json), with its original entrypoint ID, exact file, function, reason and test evidence. No fenced-only entry is classified as fully integrated.

| Classification | Entries |
| --- | ---: |
| Fully integrated and tested | 28 |
| Intentionally excluded because no relevant publishing mutation occurs | 16 |
| Blocked by a specific founder decision | 6 |
| Incomplete | 99 |
| Total | 149 |

The 99 incomplete entries are implementation/test gaps, **not external-dependency excuses**. Many are legacy internal functions replaced in the new composition; their original exports remain fenced rather than ported. They are retained as incomplete under the user's strict entrypoint audit. Source-level guard coverage and absence of a bypass are distinct from working integration.

## Implemented application integration

`lib/publishing/showworkApplication.ts` explicitly composes actual authentication, viewer credentials, existing quota/permission rules, account services and the canonical transactional actions. Importing it installs nothing. `publishingEnabled:false` is mandatory, independently of database ownership. NEXT, NETLIFY and VPS hosts have explicit disabled configuration; a configuration object alone cannot activate publishing.

The actual Next exports and browser request helper are tested against **the existing Prisma application schema**, generated offline into a new disposable PostgreSQL schema, followed by the local publishing proposals. Tests exercise actual `NextRequest`/`NextResponse` handlers and existing JWT signing/verification with synthetic credentials. Tests do not emulate application authorization with caller-supplied actor IDs.

Implemented flows include:

- Manual multi-platform post creation, native text/date/custom-field validation, complete existing post relation response shapes, replay and planning statuses.
- Creator editing, viewer approval/revision withdrawal and plan submission/response. Viewer authority never becomes creator publishing authority. Approval does not automatically schedule work.
- Explicit canonical scheduling, cancellation, revision conflicts and trusted-evidence retries through the actual publishing handler. A checkbox cannot supply retry evidence. A retry creates a new revision/execution generation and preserves the rejected predecessor.
- AI generation/regeneration, draft promotion, restoring generation history and bulk draft deletion. Generation uses existing owner quota rules and durable reservation/replay; failed/uncertain generation compensation is a documented blocker below.
- Confirmed imports use the existing pure validation/mapping, duplicate detection and approval semantics. No implicit scheduling occurs.
- Post upload finalization and same-workspace asset attachment verify server storage proof, finalize the native reservation and storage counters atomically, bind immutable object version/hash, and invalidate affected unsent revisions. Deletion preserves publishing evidence; physical cleanup remains separate and incomplete.
- Signed X, Facebook, LinkedIn, Instagram and TikTok account flows bind durable destination versions. Facebook Page and LinkedIn organization choices remain explicit. Reconnect replay cannot exchange the same operation twice. Instagram/TikTok/generic-channel disconnection advances the exact binding version and preserves historical accounts.
- Actual team mutations use existing role/delegation/feature/quota rules. Removal replay survives deletion of the membership row, and activity records commit once. Invitation acceptance revalidates the issuer and never restores removed membership on replay. Direct team-service exports still need their own verification.
- Workspace plan/details/password actions preserve calendar response shapes and use the existing password hashing service. Header uploads/cleanup remain incomplete; the whole PATCH entry is therefore not counted as full.
- Owner reset atomically cancels unsent canonical work, removes safe planning records and returns the original `ok/deletedCount` shape. It rejects any historical external attempt or legacy publication evidence. Original physical objects and charged storage remain retained until reference-aware cleanup exists; reset remains classified incomplete.
- Self-deactivation clears the session and durably invalidates unsent eligibility. Full account erasure is not replaced by deactivation or a tombstone.
- A narrowly registered signed Paystack webhook retains native policy logic, with current schema/fence-trigger checks and permanent eligibility holds. Invalid HMAC is rejected using constant-time comparison. Native renewal and other billing/admin mutations are not thereby integrated.
- Actual Next and Netlify publishing host exports invoke canonical jobs in the isolated mock rehearsal. They execute no worker on the disabled application composition. The synthetic host test publishes once despite repeated cron/background requests and confirms status/reference projection.

### Frontend compatibility

33 calendar components and the profile deactivation component use the shared mutation request helper. GET requests remain ordinary reads. JSON mutations carry a stable operation ID; a lost HTTP/database acknowledgement retains the original operation, exact revision and destination payload for replay rather than fetching a newer authority snapshot. The bounded request cache is browser-memory only; reloads do not persist it. Server revision/generation constraints remain the safety authority.

Social publishing and TikTok components load server-derived revisions and destinations. Social controls remain disabled until that snapshot loads, expose metadata errors, and disable canonical retries lacking trusted evidence. TikTok checks the creator-info account against the exact canonical destination and retains explicit privacy/consent validation. Acceptance remains pending confirmation. Existing API response shapes are retained for the implemented paths; new publishing metadata is additive.

Handler and browser-helper tests are not a browser DOM/end-to-end suite. Visual interaction and accessibility, notification follow-ups and every specialized frontend mutation remain verification gaps.

## Transactions and durable authority

Canonical transactions require READ COMMITTED, UTC and an explicit injected database. Nested action calls join the same physical transaction rather than committing independently or introducing savepoints. Operation replay is serialized with transaction-scoped advisory locks. Eligibility-changing operations acquire the shared global eligibility fence exclusively before policy rows, account versions, intents/jobs and evidence; external authorization uses current witnesses and ownership epochs.

A policy check made while scheduling is not permanent authorization. Preparation, capability authorization/consumption and provider invocation recheck exact identity/account/version/content and current eligibility. Cancellation and edits cannot override a committed external attempt. The irreversible application boundary is the protected external HTTP submission after durable capability consumption and a unique provider-invocation commit. The authorization receipt does not prove submission; provider acceptance does not prove publication.

Canonical job identity remains `(intentId, revision, generation)`, never a mutable CalendarPost timestamp. CalendarPost statuses are UI projections. Initial attempts, retries and historical references remain immutable and auditable. Replayed/lost-ack operations never obtain another send capability. Uncertain publication is reconciled read-only or retained; it is never silently resent.

Native policy execution is restricted to the reviewed signed webhook and renewal service IDs. Ordinary admission, account I/O, media preparation, metadata lookup and native helpers cannot obtain a publication capability. The disabled VPS composition has a bounded, separately checked module graph and performs no database/provider I/O in its offline readiness check.

## Provider and account compatibility

| Platform | Implemented inactive/mocked composition | Remaining verification or gap |
| --- | --- | --- |
| Instagram | Signed connection, Page-token/account binding; immutable media preparation; capability-protected media publication; durable media ID; optional permalink lookup failure preserves publication evidence | Ambiguous first-account selection fails closed pending an explicit picker; original native publishing exports remain unported; real app permissions, media/provider behavior unverified |
| TikTok | Signed PKCE callback, exact open_id/account version, creator-info/settings/explicit consent; protected photo/video initialization; acceptance pending; read-only confirmation; immutable operation ID plus final public references | Messaging connection/refresh hosts and original publisher exports remain unported; real creator/API/media limits unverified |
| Facebook | Signed callback/Page choice; Page-token binding; protected feed/video/Reel boundaries; intermediate states; trusted bounded returned upload URL | Original native exports and messaging subscription follow-ups remain incomplete; real Page tasks/video/Reel responses unverified |
| LinkedIn | Member and explicit organization selection/replay; immutable member/destination binding; protected creation and read-only lookup | Organization-token refresh conservatively requires reconnect; older publishing/messaging exports remain incomplete; real organization permissions/media upload unverified |
| X | Signed OAuth/PKCE, exact account reconnect/disconnect; protected tweet creation; member-verified refresh and read-only lookup | Older freshConnection/native publisher/inbox paths remain incomplete; real media tier/rate limits/response contracts unverified |

Provider HTTP defaults do not reach real services in tests. Account HTTP uses explicitly injected ports, bounded requests and an endpoint/method whitelist; account preparation cannot call creation endpoints. Default/native publisher exports remain fenced within the new composition, **not counted as integrated**.

Provider responses and known references are journaled before optional permalink/reporting work. Unversioned R2 sources require strong ETag plus server-verified SHA-256 rather than fabricated version IDs. Lost persistence acknowledgements preserve durable/spooled evidence and never justify resend. Read-only credentials are bound to the historical destination; replacement accounts cannot supply reconciliation identity for a different publication.

## Database/storage readiness

The only schema proposal changed during this application cycle is `scripts/publishing-reliability/provider-schema.sql`: additive nullable `publicationReferences text[]` and `permalink text`. These preserve TikTok final publication IDs and optional links without overwriting the immutable provider operation reference. No migration was run outside disposable synthetic databases.

The actual Prisma schema is exercised locally with all eight publishing proposals. This verifies more than reduced synthetic model fixtures, but does not prove a real installation's migration history, grants or backfill compatibility. The production grant proposal and [cutover runbook](publishing-cutover-runbook.md) remain proposals requiring review.

Storage ports implement source proof, immutable pinning and shared append-only journals; local mocks verify their contract. Real R2/drive shared durability, ETag/checksum behavior, signed-media lifetime, storage lifecycle/retention and the database/storage recovery pairing need deployment-specific verification. Physical deletion and charged-storage reclamation are not complete across all application workflows.

## Critical remaining blockers and gaps

These are blockers to readiness, not claims that the requested application work is complete:

1. **Billing/admin/workspace mutations:** actual subscribe, cancel, upgrade/downgrade, verification, payment retry, workspace creation, complimentary grants, partner/admin changes and billing-page renewal paths need canonical policy adapters and real exported-handler synthetic tests. Passing the signed webhook scenario does not complete these paths.
2. **Media and destructive operations:** shared media replacement/multipart completion, media/section/project/attachment deletion, header replacement and cleanup need exact reference-aware transactions, immutable-snapshot protection and correct storage reclamation. Account/workspace erasure additionally needs the retention decisions below. Tombstones and fences alone are not full deletion integration.
3. **Old publishing/runtime exports:** the reliableStore/reliableWorker/portableRuntime/batch/scheduler/provider entrypoints in the audit are not themselves canonical adapters. The new composition uses the canonical worker, but this does not satisfy the strict original-entrypoint porting requirement. Do not activate while any host can enter an unreviewed old graph.
4. **Shared account auxiliary hosts:** messaging callbacks, inbox/reporting sync and old token-refresh lookup exports require exact account/version integration and host tests. OAuth messaging-subscription follow-ups remain incomplete.
5. **Product/follow-up compatibility:** AI uncertain-generation compensation, viewer notifications, complete team-service activity/replay, knowledge ingestion, reset cleanup, specialized uploads and all frontend branches need completion/verification.
6. **Deployment-specific dependencies:** real provider permissions/callback configurations, token encryption/secrets delivery, approved production database/grants/backfill, immutable/shared storage durability and operational sender-stop evidence are unverified. No live validation was authorized or performed.

### Founder decisions that cannot safely be inferred

- What retention/erasure policy governs account/workspace/admin deletion while publication outcomes, provider callbacks, journals or references remain unresolved? Which evidence may be anonymized, and by whose authority?
- What is the shared original/immutable-media retention period and who may purge it? How should storage charges change when user-visible rows disappear but recovery evidence remains retained?
- What quota/refund and recovery policy applies when AI generation fails after its durable reservation, returns after a timeout, or succeeds externally but its application acknowledgement is lost? The inactive layer retains the reservation and refuses automatic repeated generation.
- Which Instagram business account should be selected when a first connection discovers multiple eligible accounts? The inactive layer requires explicit resolution rather than selecting arbitrarily.

Conservative behavior in the inactive layer: no implicit scheduling, no retry of uncertainty, no restoration of invalidated work, and no destruction of unresolved evidence. These defaults are not activated production policy changes.

## Files and verification

The [cycle-specific exact file manifest](publishing-application-integration-files.json) lists 13 created files, 95 modified files and two generated disabled-worker artifacts. Earlier stage changes already present in the dirty workspace are distinguished from this cycle; no unrelated changes were reverted. The 16 removed guards were reviewed lexical false positives and their original source bodies are checked against the reconstructed inventory.

Verification and cleanup results are recorded below after the final run. The entrypoint audit records scenario names rather than unsupported blanket test claims.

## Defects discovered and corrected

- Native post relations/date/custom-field response compatibility was missing from generic actions; implemented full native shapes and validators.
- Caption clearing incorrectly depended on COALESCE; nullable/trimmed edits now preserve native clearing behavior.
- Content invalidation originally required publishing-management authority; narrow transactional edit/upload/delivery adapters now preserve existing creator permissions without granting scheduling authority.
- Team delegation/quota differed from the application rules; reused the existing role, feature and owner-quota policy. Removal replay previously looked up an already-deleted membership before consulting its receipt; a stable collaborator-ID action now commits the receipt and original activity together.
- Page/member account token and identity projection mismatches were corrected, including Instagram Page tokens and LinkedIn member identity with organization selection.
- LinkedIn selection replay depended on changing server credential/version fields; its stable request identity is now explicit, with version checks on a fresh mutation.
- Strong unversioned R2 source proof used an incorrect physical pin key/version representation; corrected ETag/hash proof, conditional reads and physical keys.
- Account auxiliary HTTP could accept method override or creation-like payloads; endpoint/method and preparation-payload validation now reject them.
- Final TikTok publication IDs must not replace the initialization operation ID; durable secondary references and status projections now preserve both.
- Publishing controls could authorize before loading the displayed destination; controls now wait for a snapshot and expose failures.
- Broader application regressions exposed test loaders that did not resolve relocated pure policy/request modules or inactive guards, and a TikTok hook fixture with stale state positions. Updated the loaders to use the real modules and retain all original behavior assertions. Network-restricted regression execution separately permits only the existing local HTTP gateway mock.

## Final verification results

| Check | Result |
| --- | --- |
| 13 PostgreSQL integration suites, including actual application-schema handlers and Stage 3A–4C regressions | 295 passed, 0 failed/skipped |
| Actual application handler suite after strengthening Facebook callback verification | 27 passed, 0 failed/skipped; included in the integration total, not added again |
| All non-integration application/unit suites with external networking denied and no inherited app credentials | 423 unique tests verified: 422 passed in the broad run; one gateway loopback bind was denied by the sandbox |
| Gateway suite rerun with loopback socket permission and external network still denied | All 19 passed, including the sandbox-blocked test; duplicates are not added to the unique total |
| Focused legacy harness/policy/frontend regression rerun | 115 passed, 0 failed/skipped; included in the non-integration total |
| Full repository TypeScript (`tsc --noEmit --incremental false`) | Passed |
| Isolated publishing integration TypeScript | Passed |
| Worker TypeScript and disabled artifact build | Passed |
| Offline disabled VPS composition check | `state:disabled`, `publishingEnabled:false`, `databaseConnected:false`, `maySend:false` |
| Safe Next application build | Passed; network denied, synthetic read-only database, no dotenv/inherited app secrets; temporary copy removed |
| Source parity, boundary exclusions, default-disabled/bootstrap enforcement | Passed in regression tests |
| Relevant `git diff --check` | Passed |
| Coverage reconciliation | Exactly 149 original IDs, no missing/duplicate IDs; every manifest file exists |

**718 unique tests were verified across integration and non-integration suites.** Counts do not add repeated targeted runs. The safe build uses `--no-lint`; it is not a lint pass or a real-service build. Actual-handler tests use injected mock provider/storage/billing/notification ports and local synthetic SQL fixtures, not real services.

Early broader runs exposed stale loaders/state fixtures, an incorrect retry test assumption that an ordinary HTTP 400 proved rejection, and sandbox socket restrictions. The retry fixture now supplies explicit trusted no-send evidence; production classification remains uncertain for an ordinary HTTP error. No failing test was skipped or changed to accept unsafe publication behavior.

## Deployment and review requirements

- Do not install the disabled application composition into deployed hosts while the audit contains critical incomplete entries. Current installed-composition fencing would otherwise turn those user workflows into failures; it is not a compatibility strategy.
- Finish the actual billing/media/admin/runtime/account auxiliary adapters and their exported-handler tests. Review the retention/AI decisions before integrating destructive or compensation workflows.
- Review the additive migration/grants proposals against an approved production schema snapshot, backfill/disposition plan and immutable/shared storage recovery setup. No production migration or real-service verification has been performed.
- Account for every Netlify cron/background invocation, Next cron, direct native publisher and legacy process in the sender-stop inventory. Scheduled Netlify caller authentication must be verified in its real deployment; a synthetic bearer event is not that evidence.
- Follow the existing cutover runbook only after separate deployment/cutover authorization: disabled deployment, reviewed schema/grants/storage, sender drain and verified stop, legacy quarantine/adoption, fenced ownership transfer, and separately authorized activation. Configuration alone grants no activation authority.
- Rollback must preserve all attempted/uncertain work and journals, drain and stop every sender, resolve/quarantine uncertainty and transfer ownership through an audited epoch. Never reset attempted jobs to READY or re-enable legacy senders based only on CalendarPost timestamps/statuses.

This cycle does **not** establish deployment or application completion. The exact incomplete paths are in the mandatory audit, including gaps that can still be implemented locally without real-service access.

## Infrastructure cleanup and production safety

The approved PostgreSQL 17.6 archive was verified against the official SHA-256 checksum before extraction:

`e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`

Testing used new disposable clusters with synthetic data, owner-private Unix sockets and TCP disabled. No system PostgreSQL installation or system service was modified. All PostgreSQL source/archive/checksum/build files/binaries under `/private/tmp/showwork-postgres17-build`, clusters, sockets, mock journals/gateway fixtures, safe-build copies and task test logs were removed. Filesystem absence was verified, and no test PostgreSQL process remained. The disabled worker artifacts remain in the ignored project build directory for review.

**No production database or credentials were used. No production Supabase, VPS, Netlify service or live social API was contacted. No Netlify configuration was changed. Nothing was deployed; no production migration, publishing activation or live cutover occurred. Production remains untouched and NO-GO.**
