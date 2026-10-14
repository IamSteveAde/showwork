# Stage 4C.3 — external authorization and mandatory capabilities

Completed locally on 2026-10-13. Inactive, synthetic-only composition; stopped for review.
No publishing routes/functions/providers/workers are connected to this service.

## Exact files

Created:

- `lib/publishing/externalAuthorization.ts`
- `scripts/publishing-reliability/authorization-schema.sql`
- `tests/helpers/authorization-fixture.cjs`
- `tests/helpers/authorization-process.cjs`
- `tests/publishing-authorization.integration.test.cjs`
- `tsconfig.publishing-authorization.json`
- `docs/publishing-stage-4c3-external-authorization.md`

No existing files were modified. Earlier-stage modules, proposals and regression
suites, live application routes, Netlify functions/configuration, worker entrypoints,
Prisma schema/migrations and packages are unchanged. Pre-existing workspace changes
were retained.

## Authorization service

`createExternalPublicationAuthorization` receives the explicit transaction database
and Stage 4C.2 validation ports. Factory creation/import makes no connection and
imports no global ORM/session/credentials/provider/runtime. Calls originate from
trusted server worker composition: owner/actor/epoch must not be client-selected
claims. Authentication/role/RLS composition remains later integration work.

Every request explicitly supplies job ID, `(intentId, revision, generation)`, provider,
account binding/version, normalized connection ID, provider account ID, content hash,
ownership epoch and prepared worker token. Inputs are copied/frozen before async
work. The tuple/account/content is read canonically from the database and compared
exactly; a lookup or earlier preflight is not send authority. An obsolete claim token
cannot authorize a replacement worker's prepared job.

One top-level READ COMMITTED transaction:

1. Lock the authorization operation identity and check immutable replay history.
2. Read exact canonical identity; an existing capability/authorization returns a
   no-send pending fact, not another grant.
3. Run Stage 4C.2 immediate-before-external validation. This locks ownership, current
   eligibility/account, intent and job and appends the same-transaction witness.
4. Initial generation: compose Stage 3A ownership.authorize on the supplied tx port,
   retaining the original single initial-attempt uniqueness, job boundary and audit
   constraints. It must produce a fresh initial attempt.
5. Retry generation: lock the existing Stage 4A READY generation and verify exact
   revision/generation/job and immutable evidence/predecessor links, actor stoppage,
   verification and retryability. Update it to AUTHORIZED with ownership epoch and
   authorization ID; append its event and set job EXTERNAL_PENDING atomically.
6. Insert a durable send capability bound to that exact attempt/generation and append
   its authorization operation record. The secret is cryptographically random; only
   its SHA-256 digest is stored. Expiry is at most the current eligibility witness
   and configured TTL (default 15 seconds, maximum 30 seconds).
7. Await successful top-level COMMIT. Only then mint an opaque capability object and
   return the discriminated AUTHORIZED receipt with `maySend:true` and capability.

Initial attempt, retry event, canonical job change, witness, capability and operation
commit or roll back together. SQL checks the current transaction's initial/retry
record and matching audit, identity and witness/expiry. No original constraint is
removed and no externally attempted job is returned to READY. The same predecessor
cannot gain another successor, and confirmed publication still requires a separately
explicitly authorized intent/post.

Replayed authorization returns REPLAY with `maySend:false`, no capability. Recovery
returns durable facts with `maySend:false`, no secret/capability. A different request
reusing the operation ID conflicts. Any unconfirmed COMMIT throws and mints nothing.
Lost acknowledgement is not recovered into send permission. Restarting the process
or creating a second factory cannot restore the discarded opaque capability.

## Mandatory capability transport

`service.transport(driver)` is the proposed transport. Its only publication entry is
`publish({target, capability})`. There is no global-fetch fallback, AsyncLocalStorage
fallback, caller URL or caller provider payload. The injected driver is trusted
synthetic composition; this stage supplies no real API driver.

The opaque object is frozen, branded in its public type and registered privately in
the issuing service's WeakMap. Its secret and handle cannot be obtained through
JSON, admission/preparation receipts, job lookup or authorization recovery. Clones,
forged objects, another factory's objects and missing context fail closed. The
WeakMap is not durable authorization: the durable attempt, operation, nonce digest
and database one-use state are mandatory too.

Consumption uses a separate top-level transaction:

- Check that the live opaque handle is unused and matches the exact expected target.
  Caller target is copied/frozen, so async mutation cannot retarget the request.
- Lock/check current ownership and epoch; rerun current Stage 4C.2 execution policy.
- Lock active/current intent, EXTERNAL_PENDING job and issued capability; compare
  prepared worker identity, nonce digest and database expiry/state.
- Capture the actual post/media metadata from the protected DB snapshot and verify
  its content hash. Caller payloads cannot substitute different content.
- Change ISSUED → CONSUMED once, storing policy fence/version and bounded validity;
  append the consume event in the same transaction. SQL rejects expired state,
  identity changes, spending twice, invalid job/owner/fence and missing audit.
- Await acknowledged COMMIT, check the local deadline again, then invoke the driver
  once with the deeply frozen canonical snapshot.

The in-memory handle is marked used before awaiting consumption; SQL also permits
only one transition from ISSUED. A failed/ambiguous consumption burns the local
handle and never invokes/retries the driver. In particular, if the database committed
CONSUMED but its reply was lost, there is no synthetic call and no resend grant.
This can strand an unsent operation; trusted no-send reconciliation/actor fencing is
required to propose a later generation rather than reclaiming the old capability.

`revoke` changes an ISSUED capability to REVOKED with immutable audit, scoped to its
recorded trusted worker actor. Replays are idempotent. A consumed reservation cannot
be cancelled as if no external effect were possible: revocation returns pending
reconciliation. Policy withdrawal/account change/draining before consumption blocks
its invocation without erasing the already-authorized attempt.

## Submission and outcome meanings

| Durable fact/state | What it establishes |
| --- | --- |
| Attempt AUTHORIZED / capability ISSUED | An authorization committed; no proof of HTTP submission |
| Capability CONSUMED | One invocation reservation committed; still no proof a request was sent |
| Driver invocation | Proposed external submission begins; may have an irreversible effect |
| ACCEPTED / job PROVIDER_PENDING | Provider operation accepted with reference; not publication confirmation |
| CONFIRMED / job CONFIRMED | Trusted provider result verification reported confirmation |
| REJECTED / job REJECTED | Trusted definitive rejection reported; retry still requires separate evidence |
| UNKNOWN / job OUTCOME_UNKNOWN | External effect unresolved; never an automatic resend |

`recordOutcome` records initial or retry event, canonical job phase/reference and an
immutable outcome operation in one transaction. It does not revalidate permission to
write historical evidence, mint a capability or grant a send. Exact operation replay
is safe; reference conflicts and terminal-state reopening fail. Accepted/confirmed
require a reference and keep the existing event/phase/reference constraints.

The synthetic transport records observations through this service. Exceptions become
UNKNOWN, not rejection. If observation persistence fails, it returns UNKNOWN (with a
known returned reference where available); the consumed reservation remains spent.
A later reconciliation must persist/verify the result without another create/init.
The driver must return known references rather than discard them in an exception.
Actual provider-specific result validation and durable crash-safe response journaling
remain Stage 4C.4 work. This stage does not interpret HTTP status codes as independent
proof of no-send or publication.

## Boundary and concurrency guarantees

There are two conservative local boundaries and one physical external boundary:

1. **Authorization COMMIT:** crosses the durable external-attempt boundary. Cancellation
   can no longer claim the operation is ordinary unsent work; the original Stage 3A/
   3B/4A safeguards apply even if the capability is later unused or lost.
2. **Consumption COMMIT:** spends the single invocation budget. A crash or lost reply
   afterward cannot restore it. CONSUMED does not mean SENT.
3. **Actual provider request initiation:** the physical effect may now be irreversible.
   PostgreSQL cannot atomically couple this to either local COMMIT.

Ownership transitions/policy changes before the locked consumption transaction are
observed and fail closed. Changes after the committed reservation cannot retroactively
prove that no send started. Original unresolved-attempt ownership barriers remain;
no generation or capability is regenerated on timeout/restart. Exactly-once external
publication is not claimed. The guarantee is one durable authorization and at most
one proposed driver invocation for its successfully acknowledged capability use.

Ordering: authorization operation advisory lock → ownership SHARE → eligibility SHARE
→ policy-post advisory lock/account SHARE → intent UPDATE → job UPDATE → retry/attempt
→ capability/audit. Consume follows the same owner/policy/intent/job order before
capability UPDATE. Outcome writes lock intent/job before attempt/generation. Revocation
locks capability only, so it cannot silently undo a winning consume transaction.

All phases use the previous top-level adapter's READ COMMITTED/UTC contract; no nested
BEGIN, savepoints or automatic transaction retry. Composed ownership helpers receive
a scoped transaction port, not another physical transaction. xmin/current transaction
checks and deferred commit constraints remain active. Raw writers can still invert
lock ordering and deadlock; an abort produces no grant. Runtime DB roles must prevent
untrusted evidence/capability writes, trigger disabling and TRUNCATE. SQL audit attests
to trusted code, not independent proof of a provider effect.

## Additive local schema

`authorization-schema.sql` adds PublishingSendCapability, PublishingAuthorizationOperation,
PublishingCapabilityEvent and PublishingAuthorizationOutcome. It references immutable
canonical execution and original initial/retry rows. One capability per job/attempt/
retry generation; XOR initial versus retry linkage; immutable target/worker/owner/epoch/
secret digest/expiry; irreversible CONSUMED/REVOKED states; same-transaction issuance
and state-transition audits; bounded expiry at COMMIT; deletion-protected history.
It changes no earlier table definition or existing uniqueness constraint.

Apply only to a NEW disposable DB after all five earlier proposal scripts. No Prisma
or production migration was created or executed. Earlier APIs can still create their
historical records, but cannot produce this transport's sealed capability; do not
activate any alternative send path beside it.

## Tests and corrections

User-approved PostgreSQL 17.6 source was downloaded from the official source archive
and verified against its official SHA-256 file:
`e0630a3600aea27511715563259ec2111cd5f4353a4b040e0be827f94cd7a8b0`.
Build/source/prefix were exclusively /private/tmp/showwork-postgres17-build. Clusters
were disposable, synthetic, private owner-only Unix sockets, TCP disabled. No system
installation/service or existing PostgreSQL installation changed.

Final results:

- Stage 4C.3: **34/34 PostgreSQL scenarios**, Node counts parent: 35/35, approximately
  12.7 seconds; zero final failures/skips.
- Stage 4C.2: 32/32 regressions; Stage 4C.1: 22/22; Stage 4A: 26/26 with canonical
  proposal; Stage 3A: 7/7; Stage 3B: 17/17. Combined regression runner: 104 scenarios,
  109 including five parents; zero failures/skips.
- Policy/team/ownership/retry unit suites: 34/34.
- `tsc --project tsconfig.publishing-authorization.json`: passed.

Scenarios include initial/approved retry and unauthorized retry; simultaneous grant
contenders; operation replay/recovery; rollback; real socket-read suppression before
COMMIT for authorization and consumption; stale owner/revision/claim/account/content;
approval/entitlement withdrawal; opaque/no-context/wrong-provider/job/account/hash;
expiry/revocation; concurrent consumption; policy changes between authorization/use;
provider rejection/acceptance/confirmation/uncertainty; immutable history; raw missing
issuance/consume audits; frozen caller input/snapshot; and real SIGKILL child processes
before COMMIT and after authorization. Child environments contain no app credentials;
only private synthetic socket/schema/request configuration is supplied. No driver in
these tests sends a network request.

Review corrections: explicit prepared-worker token binding prevents a retired claim
from authorizing another worker's job; request/target snapshots prevent async retargeting;
consumption validity is bounded by fresh policy expiry as well as original capability
TTL; opaque capabilities are minted strictly after acknowledged commit. The raw audit
omission test was corrected to inspect the synthetic PostgreSQL constraint error while
honoring the existing adapter's sanitized COMMIT_UNCONFIRMED result. First smaller
suite passed 26 scenarios; expansion reached 34; all final results passed.

## Remaining risks and cleanup

Existing live native publishers and executionContext/global fetch paths are unchanged
and can still publish without this capability. They must be integrated/fenced in later
stages; this module protects only its proposed transport today. No real provider driver,
worker composition, route bridge, ownership cutover or deployment is implemented.
Provider drivers must not retry a create/init or issue multiple publication requests
inside the one trusted invocation. Media preparation versus publication boundaries,
provider-supported idempotency, remote reconciliation, response crash journaling,
permissions revoked remotely, role/RLS privileges, pooler behavior, clock alignment and
policy-fence contention remain unverified. Capability objects are process/service-local
and intentionally cannot be restored/transferred through JSON; any future cross-process
capability protocol needs separate design. Worker actor/owner authentication is trusted
composition, not a public request authorization endpoint.

Every cluster was stopped and its database/socket/config files removed. Temporary
archive/checksum/source/build/binaries and TAP files were removed; absence of temporary
processes, directories and artifacts was verified. Database tests require another
explicitly approved temporary build to run again.

Production remains untouched: no Supabase, Netlify or VPS connection, no live API,
no route/function/configuration modifications, no production migrations, deployment
or publishing-worker activation. Existing production behavior is unchanged. Stop after
Stage 4C.3 and await review.
