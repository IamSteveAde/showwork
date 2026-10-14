# Stage 4C.2 — transaction-aware validation adapters

Completed locally on 2026-10-13, inactive and stopped for review. Existing application
permission/entitlement routes and publishers are unchanged. No deployment readiness
or activation is implied.

## Exact files

Created:

- `lib/publishing/eligibilityPolicy.ts` — pure bridge to existing entitlement,
  account-grant and approved-content rules.
- `lib/publishing/validationAdapters.ts` — transaction-aware policy adapters and
  validated Stage 4A/canonical factories.
- `scripts/publishing-reliability/eligibility-schema.sql` — uninstalled local fence,
  authority/witness and invalidation proposal.
- `tests/publishing-eligibility-policy.test.cjs` — parity and hash tests.
- `tests/publishing-validation.integration.test.cjs` — disposable PostgreSQL tests.
- `tsconfig.publishing-validation.json` — isolated no-emit typecheck.
- `docs/publishing-stage-4c2-validation-adapters.md` — this report.

No existing files were modified. No routes, Netlify functions/configuration, worker
entrypoints, Prisma schema/migrations, packages, earlier-stage modules/schemas or
production policy helpers changed. Pre-existing workspace modifications remain.

## Implemented adapters

`createPublishingValidationAdapters` receives a transaction database, trusted local
viewer-token verifier and trusted retry-evidence verifier. No global database client,
session/credential loader or social provider is imported. Creator IDs supplied to
these ports MUST originate from trusted authentication, never an arbitrary request
actor field. The ports validate authority; they do not authenticate creator cookies.

- `validateWorkspacePermission`: current owner/collaborator authority using the actual
  `effectiveTeamPermissions` helper, including legacy role aliases, allowed feature
  subsets and view/action dependencies. Preserves the existing billing exceptions
  for view permissions and people management.
- `validateAction`: permission and owner entitlement for schedule/reschedule/retry/
  cancel/edit, current post/calendar/platform identity, non-draft approval, explicit
  destination/version, connected account/scopes and content checks as applicable.
  Cancellation does not require a still-connected destination; it still requires
  the existing publishing-management/entitlement policy and Stage 4A safety checks.
  Approved content remains locked for normal editing.
- `captureRevision`: exact account/version plus approved payload hash and immutable
  scheduling principal, workspace and owner provenance, appended in Stage 4A's
  transaction through the existing Stage 4C.1 hook.
- `validateExecution`: derives the immutable job tuple/account identity from the DB;
  rejects a forged supplied snapshot; rechecks the recorded scheduling principal,
  current workspace owner/entitlement, approval/draft/content and bound connection.
- `validateBeforeExternal`: requires a valid ownership epoch and live PREPARED job,
  reruns execution validation, locks current intent/job, and appends a bounded
  current-transaction eligibility witness. The existing initial/retry authorization
  must occur in that SAME transaction. Validation itself returns `maySend:false`.
- `validateViewerApproval`: independently verifies a server-derived calendar-scoped
  viewer credential and expiry, active owner entitlement, non-draft/reviewable content
  and absence of external uncertainty/confirmation. It returns VIEWER_APPROVAL, never
  publishing-management authority or permission to send.
- `intentActions` and `canonicalStore`: inactive compositions supplying these adapters
  to the existing factories. No application handler imports them.
- `lockForPolicyChange`: acquires the exclusive policy fence before a cooperating
  policy mutation obtains any application/canonical row locks.

Creator/owner checks fail closed on a missing/deactivated identity. Collaborator
subscription fields are not used: entitlement belongs to the workspace owner.

The pure entitlement bridge uses the existing `workspaceComplimentaryPlan` helper
and `CONTENT_WORKSPACE_PLANS`. Its paid/trial/effective-plan evaluation matches the
existing pure `canAccessContentWorkspace`/`getContentWorkspacePlan` behavior, verified
with a mocked DB import (no global ORM connection). It preserves ACTIVE/trial plan
selection, active-trial UNLIMITED access, projected/cached/legacy complimentary grants
and covered-workspace ordering. The rank is computed entirely in SQL using the
stored `(createdAt,id)` tuple, avoiding JavaScript timestamp precision loss.

There is deliberately no new subscription-renewal-date expiry rule: the existing
policy accepts ACTIVE billing state and uses current trial/complimentary dates;
subscription failures/disables must update the billing state. Whether overdue ACTIVE
accounts should lose access independently of billing events remains a product question.

## Exact destination and content

Validation resolves the bound account version, not a findFirst connected account.
It requires calendar/platform/provider-account/normalized-connection identity,
CONNECTED status, token presence/current expiry, exact normalized grant-context hash
and required scopes. Token bytes are not selected or returned; only token presence,
expiry and scope/account metadata are read.

Required scopes: Instagram content publishing; TikTok video.publish; Facebook Page
manage-posts/read-engagement; X tweet.write plus media.write for attachments; LinkedIn
member or organization write scope according to the bound account. Existing content
validation is reused. TikTok additionally requires stored settings, current consent
version/account/hash and a currently authorized consenting creator. No creator-info,
OAuth refresh or other provider request is performed in a database transaction.

Content hashes cover publishable caption, platform/type, TikTok settings and ordered
asset IDs/keys/types/order. Mutable CP timestamps and UI statuses do not grant execution
identity. Physical R2 object bytes/version retention are not established by this hash;
immutable media and cleanup integration remain later work.

## Policy decisions and unresolved questions

| Change | Inactive layer behavior |
| --- | --- |
| Scheduling actor loses publishing permission/membership | Deny fresh admission/preparation/authorization. Retain unsent job and history. Earlier permission checks are not permanent grants. |
| Owner loses subscription/trial/complimentary access or workspace coverage | Deny fresh execution, preserving job/evidence. Collaborator billing cannot substitute for owner access. |
| Actor or owner deactivated | Conservatively deny publishing; existing live helpers do not consistently enforce this flag. No live behavior was changed. |
| Ownership transfers | Recorded owner must still match current owner; no automatic adoption of an old principal's intent. |
| Approval withdrawn, post becomes draft or post identity changes | Append immutable revision-policy invalidation. Restoring APPROVED cannot revive that revision; a new explicitly authorized revision is required. |
| Connection disconnect/replacement/grants change | Append immutable account-version invalidation. Reconnection cannot revive an old bound version; synchronize a new explicit account version and authorize a new revision. |
| Token rotation with same account/grants | Does not invalidate account identity; current token presence/expiry is still rechecked. Scope order/duplicates/whitespace alone do not change the grant hash or trigger invalidation. |
| Already-authorized external attempt | Policy change does not erase/cancel its authorization/evidence. It can still complete externally; reconciliation/ownership barriers remain required. |
| Replay | Scheduling rechecks current policy before its historical result. Canonical receipt replay remains a historical `maySend:false` fact. An old witness cannot authorize a new transaction. |

Ambiguities are resolved conservatively ONLY in the inactive layer. Open product
questions: whether revoking the original scheduler should revoke owner-authorized
queued work; whether renewed subscription/restored permission should automatically
resume held work or require explicit rescheduling; how deactivation differs from
logout; cancellation after entitlement expiry; whether a different permitted creator
can adopt/re-authorize held work; and precise same-account reconnect/grant-change UX.
No hold is converted into a provider rejection, retry proof or automatic generation.

Viewer approval remains distinct from creator publishing management. Existing live
viewer approval can implicitly schedule connected non-TikTok posts. This layer does
not reproduce that automatic scheduling using a viewer as a creator, nor manufacture
owner consent. The eventual approval-to-schedule principal/delegation needs product
review; current routes retain their behavior. Viewer credential verification is an
injected trusted adapter; tests use a synthetic verifier. Real cookie/JWT/password
rotation handling has not been wired.

## Transaction, fence and lock guarantees

The additive proposal introduces PublishingEligibilityFence, PublishingRevisionPolicy,
PublishingEligibilityWitness, PublishingAccountInvalidation and
PublishingPostEligibilityInvalidation. Provenance, witnesses and invalidations are
immutable/deletion-protected; foreign keys preserve canonical history. No production
DDL or migration was created/applied.

One coarse shared policy fence protects all transaction-local policy reads. BEFORE
INSERT/UPDATE/DELETE triggers on Creator, SocialCalendar, CalendarCollaborator,
CalendarPost, CalendarPostAsset and SocialConnection take the exclusive fence and
advance its version. This covers direct policy writes, absent-member deletion/insertion,
workspace rank changes, approval and media mutations in the disposable model.
Readers use fresh READ COMMITTED statements under the shared fence. They deliberately
avoid locks on application rows: a raw UPDATE may have acquired its application row
before its BEFORE trigger waits on the fence; MVCC reads avoid a reader/writer cycle.
The post's advisory identity lock serializes the new action/execution compositions.

Canonical admission/preparation: operation lock → ownership SHARE → eligibility SHARE
→ post advisory lock/policy reads → account SHARE → intent/job locks. New intent
scheduling: operation lock → eligibility fence → post advisory lock → account SHARE
→ Stage 4A intent/job locks. Edits and viewer review take eligibility UPDATE initially,
avoiding later shared-to-exclusive upgrades. External boundary: ownership SHARE →
eligibility SHARE → post advisory/policy/account locks → intent UPDATE → job UPDATE →
witness and existing audited authorization. Account version rows remain immutable;
the bound account head SHARE prevents standalone version replacement through commit.

Cooperating policy mutations must take eligibility UPDATE BEFORE application/account/
intent/job locks. Do not call the adapters after taking those locks or upgrade a shared
validation transaction into a policy mutation. Arbitrary raw multi-row transactions or
legacy code that mixes row orders can still deadlock; PostgreSQL aborts one transaction
and the adapter never automatically retries or returns an uncommitted send grant.
Two ordering races are tested by observing actual PostgreSQL lock waits: policy change
commits first and authorization sees the new denial; authorization commits first and
policy mutation waits, then applies without rewriting the authorized attempt.

Initial/retry authorization for policy-bound revisions requires a witness with the
current fence version, recorded principal, same top-level transaction ID (xmin) and
unexpired validity. Checks run at the INSERT/authorization UPDATE and at COMMIT. A
prior transaction's witness or preparation receipt is insufficient. Time cannot be
locked: validity is bounded to 30 seconds and the earliest upcoming trial/grant/token
boundary; expiry before COMMIT rolls authorization back. This is conservative even
when another grant might remain sufficient. All earlier ownership/generation/job/
audit constraints remain intact.

Use the existing top-level READ COMMITTED adapter, UTC and commit-confirmed result
contract. Savepoints, nested BEGIN and automatic retries remain unsupported. The
trusted verifier/callback must await database work and perform no network/provider
side effects. A provider send belongs outside the successful COMMIT. These guards
cannot make COMMIT and a remote API call atomic or revoke a capability after commit.

The singleton fence intentionally favors proof of serialization over throughput.
It serializes policy writes across workspaces and may make a future deployment more
contentious. Sharding it would require a separately reviewed lock protocol and tests.
Existing routes do NOT share these locks today: the proposal is uninstalled.

## Verification and corrections

PostgreSQL 17.6 archive verified against the official SHA-256 file:
`e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`.
The user-approved build/source/prefix were under /private/tmp. All database fixtures
used synthetic data and private owner-only Unix sockets with TCP disabled. No system
installation/service or existing PostgreSQL installation changed.

Final results:

- Stage 4C.2: 32/32 database scenarios passed (Node includes suite parent: 33/33),
  approximately 11.7 seconds; zero failures/skips.
- Stage 4C.1: 22/22 PostgreSQL regression scenarios passed.
- Stage 4A with canonical proposal: 26/26 passed.
- Stage 3A: 7/7 passed; Stage 3B: 17/17 passed.
- Combined policy/team/ownership/retry unit suites: 34/34 passed.
- `tsc --project tsconfig.publishing-validation.json`: passed.

Coverage includes creator/collaborator/custom/legacy roles; revocation; owner billing,
ownership, workspace rank, trial and projected/legacy complimentary changes; viewer
scope/expiry versus publishing authority; approval/draft exclusion and irreversible
revision invalidation; connection/account version replacement/disconnect/reconnect;
required scopes for all five providers including LinkedIn organization/member; exact
content/canonical identity; fresh witness for initial and retry authorization; token
expiry before COMMIT; both concurrency orderings; mutation/witness rollback; immutable
history; and real lost authorization acknowledgement. The lost-ack fixture pauses
socket reads BEFORE the authorization COMMIT, observes that attempt from another
connection and destroys the unread socket. Recovery never grants another send.

Corrected during testing: SQL-only workspace rank avoids microsecond precision loss;
expected validation errors retain their explicit action error codes; the lost-ack
harness targets the authorization transaction rather than a preceding read-only
transaction; the synthetic retry verifier uses its correct `(tx,input)` signature.
Added irreversible approval/account invalidation and COMMIT-time expiry coverage.
One test invocation hit an automatic approval-review timeout; the permitted single
retry succeeded. No unresolved approval block remains.

## Remaining integration risks and cleanup

Trusted authentication/viewer/retry-evidence adapters still need production composition.
Normal workers/providers/routes remain unconnected. Witness inserts must be restricted
to the trusted validation role: these records attest to trusted application validation,
not independent authentication of arbitrary SQL writers. Table owners can disable
triggers/TRUNCATE; runtime role/RLS grants require review. Real database field types,
pooler behavior, fence contention, legacy multi-row lock ordering, provider-side token/
scope revocation, media object immutability and route/account synchronization remain
unverified. No social API or token refresh ran. Physical provider grants cannot be
verified solely from persisted tokenScopes; later provider preflight remains necessary.

All test clusters were stopped and database/socket directories removed. Temporary
PostgreSQL archive/checksum/source/build/binaries and TAP/debug outputs were deleted;
process/directory/artifact absence was verified. Re-running PostgreSQL tests requires
another explicitly approved temporary build.

Production remains untouched: no Supabase, Netlify or VPS connection, no production
migration, no route/function/configuration changes, no deployment, no live social API
and no publishing-worker activation. Stop after Stage 4C.2 for review.
