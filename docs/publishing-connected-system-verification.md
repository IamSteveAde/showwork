# Connected application and VPS publishing verification

Local code and synthetic verification only. **Migration incomplete; production remains NO-GO.** This report replaces the earlier statement that the canonical worker/application bootstrap did not exist. It does not certify a complete production release or close the entire historical application coverage inventory.

The application now has a default-off Next `instrumentation.ts` bootstrap installing the actual Showwork handler composition. It reuses signed authentication, client approvals, workspace permissions, owner subscription/complimentary/trial validation, quotas, native billing handlers, OAuth/account versioning and existing frontend request contracts. Its worker port is always disabled. Native Prisma and canonical SQL use the same explicitly configured database/schema; this prevents split-database policy writes.

The executable worker command now assembles the PostgreSQL adapter, immutable object storage, shared response journal, exact-account refresh, provider preparation, canonical authorization, status projection and reporting. `npm run worker:native:build` builds `dist-worker-native/run.cjs`. `node dist-worker-native/run.cjs --check` is offline. `npm run worker:run` returns disabled with default configuration. Running publication requires the explicit command, enable flag, canonical protocol and matching enabled VPS ownership/epoch; configuration alone cannot grant a send. No production service, persistent timer or live sender was installed or started.

`--reconcile` additionally requires `PUBLISHING_RECONCILIATION_ENABLED=true` and matching DRAINING ownership. It permits provider status lookups and exact-account refresh, denies post-creation operations, and cannot admit fresh publication work. Confirmed status/reporting repairs run from durable evidence without invoking providers.

Provider preparation now preserves known media/container references in conditional, private object-storage records before polling or subsequent steps. Instagram video preparation resumes after genuine database lease/backoff expiry using the original container. TikTok photos reuse the existing decoder/orientation/resize/JPEG policy; compatible videos are probed locally and incompatible videos use the existing conversion rules. Prepared derivatives remain under protected publishing storage. Neither preparation records nor media references confer publication authority.

Provider responses still pass through the exact committed capability and one-time durable invocation boundary. TikTok initialization remains accepted/pending until verified status confirmation. Timeouts, absent identifiers, lost acknowledgements and uncertain outcomes never trigger another automatic publication. Already-approved retry generations retain their predecessor/evidence checks. The bootstrap deliberately refuses to manufacture new no-send/rejection approvals: a trusted reconciliation/evidence approval process is still required.

The existing `PublishedSocialPost` record is projected only from confirmed canonical evidence, using the exact historical connection. It never creates/reconnects an account, converts acceptance into confirmation or overwrites a different historical provider reference. Reporting failures cannot roll back calendar status; bounded repairs do not resend publications. Retired content is excluded from new reporting projections.

## Verification

Final results, exact source hashes, suite selection, artifact checksum and cleanup evidence are in `publishing-connected-system-verification.json`. Final result: **331/331 database tests, 52/52 publishing/media tests and 36/36 packaging/lifecycle checks passed** (419 unique counted tests, including parent tests; isolated reruns are not added). All three TypeScript checks and the safe application build passed. Current-cycle whitespace checks passed; a repository-wide check also reports a trailing blank line in an unrelated diagnostic script, left untouched.

- Actual signed-in application bootstrap: create → signed client approval → schedule/cancel; a further authenticated schedule continues through a mock worker to confirmed status and one legacy reporting record, with replay producing no duplicate.
- Actual exported publishing handlers through native host assembly: Instagram photo/video, Facebook feed, LinkedIn, TikTok photo/MP4/converted WebM, and X. Provider/storage APIs are mocked. X also executes through the built child-process CLI with TCP denied, then exits cleanly on SIGTERM.
- Instagram readiness holds send authorization until processing finishes, preserves the container across real lease expiry, and obeys the durable retry delay. TikTok reconciles retained/deleted content in DRAINING without another invocation.
- Earlier database suites cover cancellation, edits, approval/permission/account/entitlement revocation, uncertain outcomes, retry generations, concurrency, replay, rollback and historical evidence. The safe Next build uses a source-only temporary copy, synthetic read-only database, no dotenv files/inherited application credentials, denied network and mocked fonts.

Corrected integration defects: separately compiled bundles did not share the application/policy scope; SQL-restored journal field ordering falsely conflicted with identical evidence; application clients could otherwise write to different databases; native media conversion/readiness were missing from executable assembly; confirmed status/reporting lacked repair wiring. The R2 client preserves the existing required-only request-checksum policy. Database fencing rejected a test's attempted live lease rewrite; the test now waits for actual lease/backoff expiry. No constraints were weakened.

## Remaining blockers and limits

1. **Whole application compatibility remains a local gap.** The historical launch coverage inventory still lists adjacent knowledge, inbox/messaging, reporting refresh and delivery-billing paths with fail-closed guards or missing adapters. Those are not completed merely by this publishing bootstrap. Do not deploy canonical mode for the entire website until each reachable required path is integrated/tested or explicitly reviewed as excluded/retired. See `publishing-launch-critical-coverage.json`; no blanket coverage-completion claim is made here.
2. Review the actual production schema/roles/RLS/pooler and rehearse the compatible ALTER/backfill/adoption migration. These sources are proposals, not executable production migrations. The existing reporting table needs worker SELECT/INSERT/UPDATE grants; the local grant proposal and its generated copy include that addition. No application schema was changed in this cycle.
3. Verify real storage conditional writes/version identity/durability/public origin, provider app permissions/scopes/consent/API contracts and secrets. Mock success cannot establish real-service compatibility. Linux Node 22 dependencies and FFmpeg/ffprobe/Sharp must be packaged/verified for the VPS architecture; do not copy macOS native dependencies.
4. Preserve the reviewed conservative retry policy. New production retry-evidence approvals require trusted evidence and actor stoppage; HTTP errors/timeouts alone are insufficient. Native jobs retain the 60-second bounded worker budget and conversion has a 45-second subprocess limit; longer legacy conversions (formerly up to eight minutes) need explicit compatibility work/review rather than a claim of full parity. Irreversible purge/privacy duration/identity reuse/retained-storage billing remain deferred.
5. Build/review a release containing the new command before installation. The previous nine-file preparation archive is unchanged and **does not contain this runnable worker**. The new bundle is a local build artifact, not a deployed or complete VPS package. No Git commit/tag/push was made.
6. Separately approve production actions. Prove old deploys, background requests and external schedules are stopped; resolve/adopt legacy scheduled records using trusted evidence; transfer ownership; activate only afterward. Paused websites do not prove sender quiescence. Netlify allowance/site restoration and actual invocation savings require account telemetry; the code-level publisher removal remains 1,440 cron invocations/day plus legacy background dispatches, not an actual measurement.

The first production execution step remains installation/verification of the **reviewed updated worker switched off**, after separate approval. There has been no VPS, Netlify, production database, live provider/billing/storage access, deployment, migration, sender stop, ownership transfer or production worker activation. Synthetic worker execution was exclusively against disposable local data and mocks.

## Exact files in this cycle

Created:
- `instrumentation.ts`
- `lib/publishing/hostConfiguration.ts`
- `lib/publishing/applicationHost.ts`
- `lib/publishing/showworkPublishingAccounts.ts`
- `lib/publishing/nativeTokenServices.ts`
- `lib/publishing/nativeTikTokMedia.ts`
- `lib/tiktokMediaPolicy.ts`
- `workers/publishing/nativeHost.ts`
- `workers/publishing/run.ts`
- `scripts/vps/build-native-worker.mjs`
- `tests/publishing-host-bootstrap.test.cjs`
- `tests/publishing-native-host.integration.test.cjs`
- `tests/helpers/native-cli-fixture.cjs`

Modified:
- `.gitignore`
- `package.json`
- `lib/db.ts`
- `lib/linkedin/pages.ts`
- `lib/publishing/showworkApplication.ts`
- `lib/publishing/objectStorageAdapters.ts`
- `lib/publishing/sharedJournal.ts`
- `lib/publishing/applicationBoundary.ts`
- `lib/publishing/nativeApplicationContext.ts`
- `lib/publishing/nativeWorkerComposition.ts`
- `lib/publishing/statusProjection.ts`
- `lib/socialTokens.ts`
- `lib/tiktokMedia.ts`
- `scripts/publishing-reliability/safe-application-build.cjs`
- `scripts/publishing-migration/dependencies.env.example`
- `scripts/publishing-reliability/production-grants.proposal.sql`
- `tests/publishing-application-handlers.integration.test.cjs`
- `tests/tiktok-media-conversion.test.cjs`
- `tsconfig.worker.json`

Generated: `dist-worker-native/run.cjs`, its metafile, and updated review-only grant copy/manifest under `docs/publishing-migration-proposals/`. Documentation: this report, its verification JSON, and the execution-status update. Temporary testing infrastructure and logs are removed after verification; repository test sources and deliverable artifacts remain.

Cleanup verified: official-checksum-verified PostgreSQL 17.6 source/archive/binaries/install tree and all task-owned temporary clusters, sockets, media-processing files and logs were removed. No task-owned PostgreSQL process remained. No system installation/service was created. Exact removed paths and log hashes are recorded in the verification JSON.
