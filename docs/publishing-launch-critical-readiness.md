# Showwork launch-critical publishing readiness

**Production remains NO-GO. Normal five-platform publishing journeys and the new billing/media adapters pass locally; complete application activation is still blocked.**

This report supersedes the previous application-completion report for the launch-critical coverage reviewed in this cycle. It does not claim that all product features are integrated. The disabled VPS artifact is buildable and its offline composition performs no database/provider I/O; deployment, migration, application-profile installation and activation require separate authorization.

## Release-critical coverage

The [coverage matrix](publishing-launch-critical-coverage.json) preserves all 149 original IDs, reviews every one of the 99 previously incomplete entries, and separately records six newly identified entrypoints. Every record includes exact file/function, classification reason and test evidence. Its source caller inventory covers `app`, `lib`, `netlify` and `workers`; import edges are module reachability evidence, not proof that every imported function executes. All 99 source files were available locally.

| The 99 previously incomplete entries | Implemented | Retired in canonical composition | Blocked by retention policy | Incomplete |
| --- | ---: | ---: | ---: | ---: |
| 17 required for normal publishing | 15 | 0 | 2 | 0 |
| 32 important adjacent workflows | 11 | 0 | 0 | 21 |
| 50 obsolete legacy publishing implementations | 0 | 50 | 0 | 0 |
| Total | 26 | 50 | 2 | 21 |

Across the original 149 entries: **54 implemented, 50 retired, 16 excluded, 8 blocked and 21 incomplete**. Previously accepted implemented/excluded entries retain their prior evidence and passed regressions; they are not counted as newly implemented. Additional coverage records three normalized billing-offer handlers and the two Instagram selection handlers as implemented, and the old prepared-media age sweep as retired. Retirement is distinct from working product integration.

### Completed application workflows

- Actual subscribe/cancel, trial upgrade/downgrade, payment retry, account/workspace verification and workspace creation exports reuse native Paystack, plan, metadata, receipt, referral and quota services. Synthetic tests verify original response shapes, current authentication, native database mutations, one external initialization on replay, and no access activation from checkout initialization alone.
- Actual admin creator, both workspace-grant route aliases, complimentary cancellation and partner approval use existing admin authority and existing policy. New unscoped complimentary grants remain rejected by the established native policy. Normalized offers grant/revoke scoped entitlement; email retry preserves its durable notification queue. Post-commit notification tests use the real benefit-delivery service, captured async scope and an injected mock email port with stable provider keys.
- Actual shared-media deletion/replacement/multipart completion, portfolio file/section deletion, delivery section deletion and brief-attachment deletion run in explicit transactions. Native ownership/approval rules remain in use. Tests prove that rows can be removed while objects referenced by scheduled posts remain available, and that unreferenced originals are conditionally deleted. Multipart completion uses server-listed part evidence rather than browser ETags.
- Actual planning-post deletion commits a recoverable original-cleanup plan with the deletion and cleans up after commit; shared/historical references retain their objects and cleanup replay performs no second physical deletion. Actual individual AI draft deletion and revision resubmission now have direct handler tests. Direct team edit/removal/invitation exports have their own tests, in addition to route tests. Operation replay does not recreate revoked membership, approve AI drafts or schedule a post implicitly.
- Instagram's ambiguous connection now presents an explicit account picker. A durable encrypted selection ticket binds the creator, workspace, choices and expected account version; tokens are never returned to the browser. Selection and callback replay cannot repeat the exchange or silently choose another destination.
- LinkedIn organization refresh verifies both the immutable member and current organization administration before applying the existing fenced refresh CAS. The strict-factory synthetic test exercises native token refresh, member lookup and organization ACL/detail lookup, preserves the account version, grants no send authority and rejects a changed member without replacing the stored token. Existing legacy connection IDs are reused for an exact destination tuple; an ID belonging to another destination is rejected.
- The actual Content Workspace billing page renders under the strict disabled composition. Renewal lookup is bounded and read-only at Paystack, matches the stored subscription code, and updates only a still-active matching account. A read-only Prisma facade prevents rendering from becoming an unjournaled mutation boundary. The separate Project Delivery payment-callback branch is incomplete, as recorded below.
- Twelve additional frontend consumers use stable mutation identifiers: billing-offer management, creator actions/deletion, subscription checkout, admin workspace actions, partner approval, file replacement/deletion, portfolio and delivery sections and brief attachments. The shared-media browser-helper test reaches the actual handler and replays a lost HTTP acknowledgement without another mutation. Existing calendar publishing controls retain exact revision/destination metadata and lost-acknowledgement replay. The new Instagram picker has no default account selection. Handler/helper tests are not a browser DOM or visual-accessibility suite.

The five actual platform journeys cover schedule, cancellation, a new revision, authorization, submission and final status evidence using mocked provider ports. TikTok acceptance remains pending until read-only confirmation. Separate provider regressions exercise native HTTP/media normalization and failure cases. These are two complementary test layers; they are not real-service end-to-end verification.

## Native transaction and safety contract

`showworkLaunchApplication.ts` is the reviewed production-shaped application factory. It requires explicit database/Prisma, billing HTTP, account HTTP, notification and immutable-storage dependencies and **`publishingEnabled:false`**. Construction installs nothing. Existing default routes and Netlify functions continue their existing behavior because no canonical composition is installed by this work.

The strict factory binds the existing signed-session authentication service to the injected Prisma client; its synthetic test forbids the global database fallback. Native policy adapters first authenticate the actual session (or verify the signed billing webhook), reserve a durable request hash/operation ID, and prove that the injected Prisma client sees a random reservation witness committed by the canonical adapter. A client pointing at a different database/schema fails before mutation or external I/O.

Product writes, cleanup plans and the final response receipt commit in one Prisma READ COMMITTED transaction. The eligibility fence comes first, followed by the explicitly ordered policy table locks. Those locks use **NOWAIT**: a writer already holding a table lock and waiting for the eligibility fence cannot form a table/fence deadlock. Contention aborts before native handler execution and provider I/O; tests verify prompt rejection and unchanged state. Heavy contention can require operator reconciliation of the retained operation reservation; this is conservative rather than automatic whole-transaction retry.

Existing native SERIALIZABLE callback scopes join that one explicitly locked transaction. They do not start another transaction or savepoint. A nested failure aborts the outer transaction even when native code catches it. The explicit isolation setting is mandatory; there is no silent downgrade. The outer transaction has a 60-second timeout and five-second acquisition bound; the canonical SQL adapter retains its shorter statement/lock bounds.

External billing invocations have durable request/response hashes and safe references. Unknown outcomes never trigger automatic callback retry. Successful product writes and their response receipt are atomic; a lost commit acknowledgement returns an unconfirmed outcome, and replay returns the committed response without repeating the mutation or billing call. Tests cover rollback before commit, lost acknowledgement after commit and table contention. These are billing journal records, not social publication capabilities.

An external subscription disable can survive a rolled-back application transaction. Before that request, the native adapter commits a sanitized owner hold and old-revision holds, bound to a durable invocation. An unresolved hold prevents new scheduling, preparation and external authorization despite a stale local ACTIVE status. Database triggers enforce the hold at attempt creation, capability issuance/consumption and provider invocation. Worker grants permit reading these sanitized holds but prohibit creating or resolving them.

A committed local revocation resolves its own owner hold. For new paid access, resolution requires the native verified payment record, current ACTIVE policy, a distinct newly bound subscription and payment after the earliest unresolved cancellation for the old subscription. Signed charge/subscription callbacks are tested in reversed order. Old invoice/status evidence alone cannot restore authority; old revision holds remain immutable after owner resolution. Missing identifiers, absent trusted payment evidence or uncertain same-subscription recovery stay blocked for review. This is a conservative inactive-layer safeguard, not an activated billing-policy change.

The canonical adapter now reads Prisma timestamp-without-timezone columns as UTC using **query-local** PostgreSQL type parsers and writes Date parameters as ISO UTC. Tests cover both Prisma-to-canonical and canonical-to-Prisma reads/writes under `America/New_York`, including a daylight-saving transition. Process-global PostgreSQL parsers and legacy database behavior are untouched. `SET LOCAL timezone='UTC'` alone was insufficient to provide this compatibility.

Social publication authority remains the exact `(intentId, revision, generation)`, ownership epoch, immutable account/version and content hash. Current eligibility is revalidated at the authorization/consumption boundaries. Only newly committed authorization can grant a send; preparation, lookup, replay, media processing and account refresh cannot. A protected, durably consumed capability plus unique provider-invocation commit precedes external submission. Neither an authorization receipt nor acceptance proves publication. Uncertain attempts remain uncertain and require read-only reconciliation; retry requires trusted durable predecessor evidence and a new generation.

## Legacy retirement and host reachability

Retirement applies to the **local canonical profile**, not the still-unchanged deployed production system.

1. The three Next publishing cron exports and the Netlify cron/background exports dispatch before their legacy bodies. Actual exported-host tests run a canonical job once despite repeated host requests. `netlify.toml` and all local host roots were inspected; neither configuration nor Netlify source was changed this cycle.
2. Retired reliable-store/worker/portable/runtime constructors reject before database or provider calls when the canonical profile is installed. The source inventory finds no production-source direct construction of those factories and no `.publishPost()` callers.
3. Reporting adapters omit publication functions in the canonical profile. This removes those obsolete exports from that active composition rather than merely surrounding a callable export with a fence.
4. The compiled disabled VPS dependency graph contains canonical execution and no obsolete publishing implementation. Direct native publishing leaves remain guarded as defense in depth; guarded leaves alone are not the retirement evidence.
5. A canonical flag without an explicit trusted bootstrap fails closed. Configuration does not activate a worker. Normal worker startup remains blocked.
6. The storage cron still reaches `cleanupTikTokPreparedFiles`; that helper explicitly returns retired in the canonical profile without listing/deleting recovery media. A mock-SDK test proves no storage operation occurs. Its old age-based behavior remains available only outside that profile.

The `lib/tiktok.ts#apiPost` retirement classification concerns post-creation behavior. Endpoint-restricted account reads still use that primitive; those reads cannot call initialization/post-creation endpoints or obtain capabilities.

Static local caller/configuration evidence cannot establish which binaries or external schedulers are running on Netlify or a VPS. Verified sender-stop evidence, deployment bootstrap configuration and the ownership transfer remain mandatory cutover gates. Nothing here retires a live sender remotely.

## Remaining blockers and implementation gaps

These are explicit gaps, not external-dependency explanations for code that has not been completed:

### Founder/product decisions affecting destructive or uncertain workflows

- Full creator/admin/workspace erasure: what evidence must survive unresolved attempts, and what may be anonymized or removed? Existing tombstones are not full erasure.
- Reset/header replacement/shared storage accounting: when originals remain for recovery or another product, what retention and charging rule applies? Safe reset/cancellation works; physical cleanup and charged-storage reclamation are not complete for the entire reset/header workflow.
- Failed or uncertain AI generation/regeneration: how should reserved quota be refunded or reconciled when external generation may have succeeded? Normal generation and replay work; uncertainty is retained without automatic regeneration/refund.
- Blanket storage purge: original per-operation cleanup is implemented, but arbitrary destruction of historical immutable media/journals still requires approved purge authority and retention policy.

These account for eight blocked original entries, including the two previously incomplete reset/PATCH entries. They must be reviewed before enabling those behaviors; they do not authorize an automatic restoration or destructive workaround.

### The 21 incomplete adjacent entries

The exact entries are in the matrix below and in JSON. They are **not retired** and **not counted as working integration**:

- Business-document upload/removal, website ingestion and scheduled AI business research: actual ingestion/storage/AI accounting adapters and handler tests remain missing. This affects knowledge onboarding/research, not the tested manual publication path.
- Messaging connection/callback, inbox synchronization and replies: LinkedIn/TikTok auxiliary messaging, WhatsApp, and X inbox paths still need exact account/version-aware adapters. Publishing OAuth and provider confirmation do not complete these products. Partner/app approval may later require real-service verification, but the missing local adapter is an implementation gap.
- Legacy reporting/token-refresh helpers: analytics refresh and old auxiliary token lookups are not adapted/tested entrypoint by entrypoint. Canonical publishing refresh/reconciliation and saved-report reads do not make those exports integrated.
- Calendar trial-email background work remains unadapted.
- Project Delivery payment callback on the billing page remains unported to a transactional native mutation handler. Its mutation and POST billing operations are denied by the read-only composition. Content Workspace rendering/renewal passing is not whole-page completion.

Installing the canonical application profile today would reject those workflows. **Do not activate it or describe the full Showwork application as launch-ready.** No incomplete adjacent feature was silently removed from the product. The separately reviewed disabled VPS artifact can be assessed without installing the incomplete application profile into live hosts.

## Provider, database and storage readiness

| Platform | Locally verified | Real-service/release verification still required |
| --- | --- | --- |
| Instagram | Explicit destination selection; protected publication; media preparation; durable IDs; permalink failure preserves evidence | App permissions, provider media constraints and callback configuration |
| TikTok | Exact open_id/version; consent/settings; protected initialization; accepted versus confirmed; read-only polling and final references | Creator/app approval, upload modes, production limits and messaging auxiliary integration |
| Facebook | Page selection/version; feed/video/Reel protected boundaries and intermediate states | Page tasks, upload/status response variants and real callback delivery |
| LinkedIn | Member/organization selection; protected creation and reconciliation; organization-refresh checks implemented | App/organization permissions and version compatibility |
| X | Signed connection; bound account refresh; protected tweet creation and missing-ID uncertainty | App tier/media/rate-limit behavior and inbox auxiliary integration |

All social, billing, storage and notification requests in verification use local mocks. Missing response IDs, submission timeouts and lost persistence acknowledgements remain uncertain. Read-only reconciliation never enters a creation endpoint; no uncertain social attempt is reset to READY or automatically resent.

Only local proposal SQL changed: `integration-schema.sql` adds immutable billing revocation hold/resolution tables, durable invocation references, transaction-ID resolution audits and database publication guards, as well as reference guards for retired original keys, including live upload reservations and banner references. Reference writers serialize through the eligibility fence before checking tombstones, preventing attachment after a cleanup decision. Immutable historical evidence remains protected. `production-grants.proposal.sql` withholds private `PublishingApplicationOperation` receipts from the worker role; a restricted-role database test confirms denial. The application role, trigger/RLS/pooler behavior and actual deployed schema still require DBA review. No production migration was run.

R2 adapters perform bounded HEAD/conditional DELETE and server-evidenced multipart completion. Original cleanup first checks post assets, publishing snapshots, shared media/attachments/documents/reservations and workspace/portfolio banners, then commits a tombstone before conditional deletion. Failed cleanup stays recoverable; it cannot roll back the already committed user mutation. It never purges publishing snapshots or journals. Actual R2 conditional requests, version/ETag behavior, signed URL lifetime and shared-journal durability remain real-service checks. General retention/charge policy is not inferred from passing storage mocks.

## Files and validation

The [exact cycle file manifest](publishing-launch-critical-files.json) records **12 created and 62 modified files**, plus two generated disabled artifacts. Earlier accepted dirty-workspace changes are retained and distinguished from this cycle. Key application additions are `nativeApplicationContext.ts`, `nativePolicyAdapters.ts`, `originalMediaCleanup.ts`, `showworkLaunchApplication.ts` and the Instagram picker route/page. The manifest includes every changed route, frontend consumer, adapter, SQL proposal and test harness.

Final check results are recorded in [the machine-readable test report](publishing-launch-critical-test-results.json). 
| Check | Result |
| --- | --- |
| 13 PostgreSQL integration suites, previous stages and actual application schema | 302 passed; 0 failed/skipped |
| Final actual-handler rerun, including scoped authentication, legacy account identity and native organization refresh | 34 passed; included in the integration total |
| Final application-action regression rerun | 30 passed; included in the integration total |
| All unit/application suites, external network denied, local gateway mock allowed | 431 passed; 0 failed/skipped |
| Full repository and isolated integration TypeScript | Passed |
| Worker TypeScript/artifact build and offline composition | Passed; disabled, databaseConnected:false, maySend:false |
| Safe Next application build | Passed; no dotenv/inherited app secrets, network denied, synthetic read-only data; copy removed |

**733 unique tests passed.** Targeted reruns are not added again. The safe build uses `--no-lint` and is not live-service validation. Early runs exposed test-only loopback guard normalization, a timezone fixture mismatch, and a shared trigger referencing fields absent from another table's record shape; these were corrected and the final suites pass without skips.


Defects corrected: incompatible native SERIALIZABLE scopes versus eligibility triggers; wrong policy-table name; unbound native database/HTTP dependencies; cross-database receipt risk; nested transaction failures being swallowed; lost-ack replay; unsafe original/shared-object deletion; trusting browser multipart ETags; missing explicit Instagram destination selection; LinkedIn organization refresh checks and existing-account connection-ID collisions; worker access to private application receipts; provider-accepted subscription cancellation surviving database rollback; billing callback ordering and stale-invoice reconciliation; policy table/fence lock-cycle risk; and Prisma/PostgreSQL UTC interpretation. The last two fixes were necessary compatibility/safety corrections, not a new infrastructure stage.

## Separately authorized disabled deployment and eventual cutover

For the next separately approved **disabled VPS deployment**:

1. Review the artifact/configuration, Node 22/toolchain, bounded graph and dependency manifests. Keep publishing disabled, normal startup blocked and application profile installation off. Offline checks must report `databaseConnected:false` and `maySend:false`.
2. Review database/grants proposals against an approved schema snapshot, application/worker role separation, pooler/trigger requirements and the UTC date contract. Agree on storage/journal durability and recovery. This report is not migration approval.
3. Prepare secrets and provider/storage ports through explicit dependency injection; confirm no credential loading or configuration object can activate publication. Real-service verification must be separately authorized and must not publish implicitly.
4. Keep existing production hosts and ownership unchanged during that disabled deployment. Resolve the eight policy-blocked and 21 adjacent incomplete entries before any application-profile activation that would affect those features.

For a later separately authorized live cutover, follow [the cutover runbook](publishing-cutover-runbook.md): enumerate/drain all senders, authenticate and persist complete sender-stop evidence, quarantine legacy uncertainty, adopt only trusted eligible work, install canonical hosts deliberately, transfer ownership through DRAINING with a new audited epoch, and authorize activation separately. No timestamp/status alone establishes legacy adoption authority.

Rollback must stop/drain canonical senders, preserve journals/attempts/media and quarantine unresolved outcomes before any audited ownership transition. It must not restore invalidated work, reset attempted jobs to READY or re-enable old senders simply because the legacy code remains in the repository.

## Infrastructure cleanup and production safety

PostgreSQL 17.6 was downloaded/build-tested only under `/private/tmp`, after verification against its official SHA-256 before extraction:

`e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`

All test clusters used synthetic data, private Unix sockets and TCP disabled. Cluster helpers stopped and removed their clusters/sockets. No task PostgreSQL server remained before cleanup. The temporary archive, checksum, source/build/install tree, task test logs/runner, generated test-media binaries and safe-build copies have been removed; filesystem absence and no remaining owned temporary paths were verified. The machine-readable test report records the removed paths. Pre-existing unrelated temporary files were preserved. The two disabled worker deliverables remain in the project's ignored artifact directory for review. No system PostgreSQL installation or persistent service was created or modified.


**No production Supabase/database access, VPS connection, live social/billing/storage API call, Netlify service/configuration change, deployment, production migration or publishing activation occurred. No production credentials were used. Production behavior remains unchanged and NO-GO.**

## Exact review of the 99 previously incomplete entries

Legend: normal = required for normal publishing; adjacent = important adjacent workflow; obsolete = obsolete legacy publishing implementation. Implemented means the scoped mutation tested above; retired means local canonical-composition retirement only. Full evidence, original line-based IDs and import callers are in the JSON matrix.

| File and function | Class | Disposition |
| --- | --- | --- |
| `app/admin/social-calendars/[id]/route.ts#PATCH` | normal | implemented |
| `app/api/admin/creators/[id]/complimentary/route.ts#POST` | normal | implemented |
| `app/api/admin/creators/[id]/route.ts#PATCH` | normal | implemented |
| `app/api/admin/partners/[id]/route.ts#PATCH` | normal | implemented |
| `app/api/admin/social-calendars/[id]/route.ts#PATCH` | normal | implemented |
| `app/api/calendars/[id]/ai-drafts/[postId]/route.ts#DELETE` | normal | implemented |
| `app/api/calendars/[id]/business-documents/[documentId]/route.ts#DELETE` | adjacent | incomplete |
| `app/api/calendars/[id]/business-documents/upload-complete/route.ts#POST` | adjacent | incomplete |
| `app/api/calendars/[id]/business-documents/website/route.ts#POST` | adjacent | incomplete |
| `app/api/calendars/[id]/channels/linkedin/messaging/route.ts#POST` | adjacent | incomplete |
| `app/api/calendars/[id]/channels/whatsapp/route.ts#POST` | adjacent | incomplete |
| `app/api/calendars/[id]/channels/whatsapp/route.ts#DELETE` | adjacent | incomplete |
| `app/api/calendars/[id]/posts/[postId]/resubmit/route.ts#POST` | normal | implemented |
| `app/api/calendars/[id]/reset/route.ts#POST` | normal | blocked |
| `app/api/calendars/[id]/retry-payment/route.ts#POST` | normal | implemented |
| `app/api/calendars/[id]/route.ts#PATCH` | normal | blocked |
| `app/api/calendars/[id]/tiktok/messaging/route.ts#POST` | adjacent | incomplete |
| `app/api/calendars/[id]/verify-subscription/route.ts#POST` | normal | implemented |
| `app/api/calendars/cancel-subscription/route.ts#POST` | normal | implemented |
| `app/api/calendars/channels/tiktok-messaging/callback/route.ts#GET` | adjacent | incomplete |
| `app/api/calendars/downgrade-to-individual/route.ts#POST` | normal | implemented |
| `app/api/calendars/route.ts#POST` | normal | implemented |
| `app/api/calendars/subscribe/route.ts#POST` | normal | implemented |
| `app/api/calendars/upgrade-to-company/route.ts#POST` | normal | implemented |
| `app/api/calendars/verify-subscription/route.ts#POST` | normal | implemented |
| `app/api/managed-projects/[id]/brief-attachments/[attachmentId]/route.ts#DELETE` | adjacent | implemented |
| `app/api/media/[mediaId]/replace/complete/route.ts#POST` | adjacent | implemented |
| `app/api/media/[mediaId]/replace/multipart-complete/route.ts#POST` | adjacent | implemented |
| `app/api/media/[mediaId]/route.ts#DELETE` | adjacent | implemented |
| `app/api/portfolio/media/[mediaId]/route.ts#DELETE` | adjacent | implemented |
| `app/api/portfolio/sections/[sectionId]/route.ts#DELETE` | adjacent | implemented |
| `app/api/sections/[sectionId]/route.ts#DELETE` | adjacent | implemented |
| `app/dashboard/billing/page.tsx#BillingPage` | adjacent | incomplete |
| `lib/aiResearchScheduler.ts#runScheduledAiBusinessResearch` | adjacent | incomplete |
| `lib/calendarTeamService.ts#editTeammate` | adjacent | implemented |
| `lib/calendarTeamService.ts#removeTeammate` | adjacent | implemented |
| `lib/calendarTeamService.ts#acceptTeamInvite` | adjacent | implemented |
| `lib/calendarTrialEmails.ts#runCalendarTrialEmailCheck` | adjacent | incomplete |
| `lib/instagram.ts#publishContainer` | obsolete | retired |
| `lib/instagramPublishing.ts#publishPostToInstagram` | obsolete | retired |
| `lib/publishing/batchClaims.ts#claimPublishingBatch` | obsolete | retired |
| `lib/publishing/batchClaims.ts#failPublishingDispatchBatch` | obsolete | retired |
| `lib/publishing/budgetedDatabase.ts#transaction:callback` | obsolete | retired |
| `lib/publishing/legacyRecoveryBridge.ts#importLegacyPublishingRecovery` | obsolete | retired |
| `lib/publishing/platformIntegration.ts#publish` | obsolete | retired |
| `lib/publishing/platformIntegration.ts#reconcile` | obsolete | retired |
| `lib/publishing/portableRuntime.ts#tick` | obsolete | retired |
| `lib/publishing/portableRuntime.ts#consume` | obsolete | retired |
| `lib/publishing/providers.ts#publishFacebook` | obsolete | retired |
| `lib/publishing/providers.ts#publishX` | obsolete | retired |
| `lib/publishing/providers.ts#publishLinkedIn` | obsolete | retired |
| `lib/publishing/reliableConsumer.ts#drainReliablePublishing` | obsolete | retired |
| `lib/publishing/reliableStore.ts#leader` | obsolete | retired |
| `lib/publishing/reliableStore.ts#releaseLeader` | obsolete | retired |
| `lib/publishing/reliableStore.ts#prepareMany` | obsolete | retired |
| `lib/publishing/reliableStore.ts#releasePrepared` | obsolete | retired |
| `lib/publishing/reliableStore.ts#budget` | obsolete | retired |
| `lib/publishing/reliableStore.ts#admit` | obsolete | retired |
| `lib/publishing/reliableStore.ts#acquireAccount` | obsolete | retired |
| `lib/publishing/reliableStore.ts#releaseAccount` | obsolete | retired |
| `lib/publishing/reliableStore.ts#recoverAccountLeases` | obsolete | retired |
| `lib/publishing/reliableStore.ts#beginExternal` | obsolete | retired |
| `lib/publishing/reliableStore.ts#finish` | obsolete | retired |
| `lib/publishing/reliableStore.ts#failProvider` | obsolete | retired |
| `lib/publishing/reliableStore.ts#accept` | obsolete | retired |
| `lib/publishing/reliableStore.ts#unknown` | obsolete | retired |
| `lib/publishing/reliableStore.ts#reject` | obsolete | retired |
| `lib/publishing/reliableStore.ts#claimReconciliation` | obsolete | retired |
| `lib/publishing/reliableStore.ts#releaseReconciliation` | obsolete | retired |
| `lib/publishing/reliableStore.ts#markReported` | obsolete | retired |
| `lib/publishing/reliableStore.ts#deferReporting` | obsolete | retired |
| `lib/publishing/reliableStore.ts#acquireConsumer` | obsolete | retired |
| `lib/publishing/reliableStore.ts#renewConsumer` | obsolete | retired |
| `lib/publishing/reliableStore.ts#releaseConsumer` | obsolete | retired |
| `lib/publishing/reliableStore.ts#requestWake` | obsolete | retired |
| `lib/publishing/reliableStore.ts#takeWake` | obsolete | retired |
| `lib/publishing/reliableStore.ts#dispatchedWake` | obsolete | retired |
| `lib/publishing/reliableStore.ts#acknowledgeWake` | obsolete | retired |
| `lib/publishing/reliableStore.ts#cancelBeforeExternal` | obsolete | retired |
| `lib/publishing/reliableStore.ts#recoverExpired` | obsolete | retired |
| `lib/publishing/reliableStore.ts#authorizeKnownRejectedRetry` | obsolete | retired |
| `lib/publishing/reliableWorker.ts#execute` | obsolete | retired |
| `lib/publishing/runtime.ts#tick` | obsolete | retired |
| `lib/publishing/scheduler.ts#runScheduledPublishing` | obsolete | retired |
| `lib/publishing/worker.ts#runPublishJob` | obsolete | retired |
| `lib/reporting/adapters/tiktok.ts#apiPost` | adjacent | incomplete |
| `lib/reporting/sync.ts#syncConnection` | adjacent | incomplete |
| `lib/socialMessaging/tiktok.ts#freshTikTokMessagingConnection` | adjacent | incomplete |
| `lib/socialMessaging/tiktok.ts#syncTikTokInbox` | adjacent | incomplete |
| `lib/socialMessaging/whatsapp.ts#sendWhatsAppMessage` | adjacent | incomplete |
| `lib/socialMessaging/x.ts#syncXInbox` | adjacent | incomplete |
| `lib/socialMessaging/x.ts#syncSocialInboxes` | adjacent | incomplete |
| `lib/socialReporting.ts#database.$transaction:callback` | adjacent | incomplete |
| `lib/socialTokens.ts#freshConnection` | adjacent | incomplete |
| `lib/syncContentWorkspaceRenewal.ts#syncContentWorkspaceRenewal` | adjacent | implemented |
| `lib/tiktok.ts#apiPost` | obsolete | retired |
| `lib/tiktokAuthorization.ts#authorizeTikTokPost` | obsolete | retired |
| `lib/tiktokConnection.ts#freshTikTokConnection` | adjacent | incomplete |
| `lib/tiktokPublishing.ts#publishPostToTikTok` | obsolete | retired |
