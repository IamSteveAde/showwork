# Fixed-query gateway: offline implementation and staging assessment

11 October 2026. **Offline implementation/staging validation passed. NO-GO for
production activation, publishing deployment or VPS migration.** No production
connection, credential activation, deployment, publishing or live-record modification
occurred in this phase. The existing disabled production diagnostic role was not
used. Publishing code and production configuration were not edited in this phase;
changes from the earlier scheduler phase remain in the workspace, undeployed.

## Implemented boundary

The gateway exposes signed predefined measurement profiles only. Separate ingress,
executor process and client modules are in `scripts/diagnostics/gateway/`, outside
Netlify's production function directory. The executable accepts **only isolated
loopback staging** databases with generated staging database/role names. Production
mode/destinations are rejected. There is no production entry point or activation tool.

- Ed25519 signatures bind run ID, audience, timestamp, nonce, HTTP method/path and
  exact body digest. Thirty-second skew and a maximum two-hour manifest window.
- Exact flat request grammar accepts only one enumerated profile; duplicate keys,
  escaped alternate representations, SQL, platform/row IDs, callback URLs, arbitrary
  destinations, workload overrides and unknown fields are rejected before DB access.
- A private durable ledger atomically persists nonces, per-profile/global budgets,
  minute limits, active lease, failure count and emergency-disable state. fsync/rename
  writes and an exclusive owner file prevent silent counter resets or multiple owners.
  An abandoned active lease disables a restored run; corrupt state fails closed.
- One active operation globally, no queue or retry. Six authenticated calls/minute,
  sixty total, profile quotas 10/10/10/10/20. Ingress attempts are capped at thirty/minute
  per socket source and 120/minute globally. Headers/body/connection sizes are bounded.
- Emergency STOP file or expiry stops the executor; two consecutive failures stop
  the run; a permission mismatch stops it immediately. No HTTP admin/shutdown endpoint.
- Independent parent deadlines terminate a stalled executor process and confirm exit
  before releasing the gate. Unknown termination prevents reuse. Work deadline is
  ten seconds, including executor startup; kill reserve is two seconds. HTTP deadline
  is fifteen seconds and relay outbound timeout eighteen seconds.
- Executor has an immutable, hash-pinned map of ten SELECT-only admission/stale plans
  plus fixed SELECT 1 and fixed security preflight statements. Parameters are executor
  timestamps only. Every transaction declares READ ONLY before any query. No claim
  DML, row-lock clause, provider code or publishing worker is imported/executed.
- CA fingerprint/validity, hostname and chain verification are mandatory. **No plaintext
  executor configuration or accept-invalid-certificates option exists**, even in staging.
  The staging entry point is loopback HTTPS; database and gateway TLS were exercised.
- Both executor/ingress and client filter response fields. Plans, production row values,
  due-post counts, tokens, SQL, URLs and stacks cannot pass the timing response schema.
  Child stderr/query logging are suppressed; caller-visible errors use fixed enums.

The client was further restricted from the approved design: the operator signs
requests locally and the optional Netlify relay holds **only the public verification
key**, not a signing private key. The gateway provides replay/budget enforcement for
forwarded requests. The client dependency graph contains no SQL, Prisma, database
configuration, executor or publishing code. Its first-invocation/module-age/HTTP
metrics distinguish relay overhead from executor database timing; these are not
platform cold-start initialization telemetry.

## Independent executor-role audit

A separate catalog-audit implementation in `audit-role.cjs` does not import the
executor's permission check or column list. This is independent audit code and
negative validation, not an external human security review.

A new, short-lived **local staging** role was created for each assessment, authenticated
using SCRAM over strict TLS, connection limit one. The scheduler had its separate
five-connection staging client. No production executor role was provisioned.

| Effective audit | Actual staging result |
| --- | --- |
| Application read scope | Exactly eleven CalendarPost status/eligibility/lease columns |
| Other application tables/content | No reads; synthetic Creator and SocialConnection reads denied |
| Whole-table/column writes, TRUNCATE, TRIGGER, MAINTAIN | No effective privileges |
| Sequences | None accessible |
| Ownership/membership | No owned relations, routines or schemas; no memberships |
| Privileged roles | No USAGE/SET into data/stats/settings/file/program/signal/replication-related elevated roles |
| Role flags | No superuser, createdb, createrole, inherit, replication or bypassrls |
| Schema access | public plus standard catalogs only; no CREATE |
| Accessible SECURITY DEFINER routines | None |
| Defaults | READ ONLY; statement 2 s; lock 250 ms; idle transaction 5 s; row_security on; trusted search path |
| RLS | Fixture CalendarPost RLS disabled; status columns span fixture tenants |
| PUBLIC/catalog residuals | Present and explicitly disclosed; raw credential is not strictly status-only |

The independent audit detected all three deliberately introduced staging defects:
direct caption SELECT, inherited PUBLIC SELECT on the synthetic token table and an
accessible SECURITY DEFINER function. Each was removed before measurements. Direct
role reads of caption, customer email and provider tokens failed; a write attempt
failed. The final role and all its grants were removed after tests; its cluster and
private credential files were deleted. Raw credential isolation is deliberately
reported **false**, not misrepresented as a database-level deny of PUBLIC capabilities.

Production permission parity is unverified. Before a later production approval,
provisioning/review of a new inactive production-specific role and its effective
permissions will be required. Staging grants cannot certify Supabase's actual
PUBLIC grants, policies, routines, casts, ownership or other databases. The existing
production diagnostic role remains untouched and inactive.

## Actual local gateway latency

PostgreSQL 17.6, matching production's verified version; Prisma 5.22.0 from the installed
project. TLS verified using a locally generated CA and correctly issued server
certificate; no trusted-system-store changes or verification bypass. fsync enabled.
Synthetic schema includes production-declared CalendarPost indexes and a calendar
foreign key plus inaccessible content/customer/token fixtures. It is not a complete
production schema, dataset, Supavisor pooler or workload replica.

Forty signed HTTPS requests ran against the actual gateway/executor. Sampling clocks
were accelerated in the staging harness to test bounded profiles without sleeping
through a ten-minute sampling window; runtime defaults use wall time, and rate-limit
unit tests exercise both accepted and rejected windows. The fixture-post digest was
identical before and after gateway measurements. No production values were involved.

Nearest-rank p95 is reported; with five samples it equals the observed maximum and
is **not** a robust tail estimate. Values below are the main assessment, in milliseconds.

| Measurement | Samples | Median | p95 / observed max |
| --- | ---: | ---: | ---: |
| DNS resolution, loopback | 5 | 0.024 | 1.392 |
| TCP connect, loopback | 5 | 0.789 | 3.916 |
| Verified TLS handshake | 5 | 7.139 | 18.708 |
| Fresh Prisma connect | 5 | 30.185 | 92.339 |
| Warm SELECT 1 statement roundtrip | 5 | 0.881 | 1.438 |
| Warm transaction wrapper/setup/SELECT/commit | 5 | 3.653 | 6.204 |
| Fixed scheduler-plan transaction | 20 | 3.865 | 8.930 / 8.965 max |
| Fixed plan server planning | 20 | 0.122 | 0.579 / 0.942 max |
| Fixed plan server execution | 20 | 0.079 | 0.172 / 0.182 max |
| Full HTTPS plan request | 20 | 90.962 | 110.104 / 157.945 max |

First executor-creation HTTPS request took 265.424 ms, versus transport-profile
median 98.312 ms. This is a local process-start observation, **not a Netlify cold-start
measurement**. Fresh client construction/connect differs from a fresh operating-system
executor process; label them separately. The first warm-roundtrip sample had to reconnect
following fresh-client cleanup and is visible through connectMs; warm-only samples
remain separately identifiable in raw data.

Prisma acquisition timing includes client wait plus BEGIN; it is not pure pool wait.
Commit timing includes wrapper-return overhead. Fixed permission preflight runs on
new clients and contributes to total duration separately from the reported connect.
TLS transport probes are separate connections; do not subtract them from a different
Prisma connect and call the difference exact authentication latency.

These loopback measurements validate instrumentation and safe execution. They **do
not explain or replace production's 1.30–1.38-second transactions**. HTTP gateway
transit must not be added to the scheduler's direct-DB model as if it were the same path.

## Scheduler throughput: actual writes with injected latency

The proposed scheduler/claim code was loaded unchanged. Real PostgreSQL claims,
leases and fixture-only worker writes ran through one Prisma pool capped at five.
Network-like delay was injected while transactions were open; acknowledgements were
synthetic at 500 ms. No provider calls or Showwork worker endpoints were used.

At injected 1,380 ms per transaction, complete invocation durations were:

| Balanced due posts | Gate 1 | Gate 2 | Gate 3 | Gate 3 at injected 1,923 ms |
| --- | ---: | ---: | ---: | ---: |
| 10 | 7.485 s | 4.664 s | 3.298 s | 4.381 s |
| 25 | 7.474 s | 4.686 s | 3.300 s | 4.382 s |
| 50 | 7.454 s | 4.667 s | 3.306 s | 4.391 s |
| 100 | 14.441 s | 8.874 s | 6.099 s | 8.403 s |
| 250 | 15.398 s for 200, then 7.463 s for 50 | 14.116 s | 9.965 s | 13.345 s |

Gate three is the highest allowed/tested per-invocation setting and remains the
recommended **staging** setting; this is not proof of a production-safe global maximum.
At 250 posts, observed invocation-average throughput was approximately 25.1 posts/s
at the 1.38-s profile and 18.7 posts/s at 1.923 s. These include empty follow-up queries
and synthetic acknowledgement overhead, not provider publication.

Measured transaction medians ranged about 1.387–1.395 seconds for the 1.38-s profile;
p95 reached 1.431 seconds in the gate-two/100 test. Tail-profile transaction medians
were about 1.933–1.936 seconds, with observed maximum 1.940 seconds. Small, single-run
samples are insufficient to certify a production tail bound.

Two overlapping gate-three scheduler invocations requested **six** operations through
the five-connection pool. Both completed in 5.875 seconds, with no scheduler errors;
250 distinct fixture worker starts and zero duplicates. This validates the tested
contention case, not arbitrary horizontal scaling. Independent function/client pools
can multiply connections; connection_limit=5 is not automatically a global cap.

Five arrival rounds each added 100 Instagram posts plus five posts per platform.
Every round dispatched Instagram 105 and each other platform five; all 625 fixture
posts processed once, with runtimes 10.399–10.638 seconds. No platform starvation in
this tested arrival rate. Unbounded arrivals above service capacity remain a backlog
risk; those were not simulated as a sustainable workload.

Eligibility/approval/AI/future guards, exact committed lease timestamps, newer-lease
cleanup protection, rollback, accepted TikTok recovery/exclusion and stale unaccepted
recovery passed. A locked oldest row was skipped, then claimed once after release.
Existing unit tests additionally prove no dispatch before commit and platform error
isolation. Existing publishing workers were not modified or called with real content.

## Deferral, timeouts and runtime margin

A separate fault assessment injected a five-second initial connection delay plus
1.923-second transaction delay into a balanced 250-post burst:

- First invocation: 230 admitted, 20 deferred, 16.233 seconds total.
- Following invocation: remaining 20 admitted in 4.365 seconds; zero duplicates.
- Every platform received opportunities in the first invocation; no row was abandoned.
- Admission deadline stops new transactions at 15 seconds; an already-started operation
  can finish after it, within the separate finish budget.

**Estimated delay with actual minute ticks:** final dispatch for that cold burst is
bounded by about 64.4 seconds from the first tick in this tested model. A post becoming
due just after a tick adds up to another minute; provider/media processing is additional.
For balanced warm bursts up to 250, estimated final acknowledgement is within about
13.4 seconds of the first tick in the tested tail model. Gate-one/250 deferral would
reach roughly 67.5 seconds from the first tick. These are estimates, not production SLAs.

One hundred synthetic lost acknowledgements, each delayed five seconds, completed
batched failure cleanup in **14.643 seconds**, with 100 recorded failures and zero
cleanup errors. The 250-ms DB lock timeout was observed at 264–269 ms. The final
security run's three-second staging-only pg_sleep probe was cancelled at about
**2.0 seconds** by the role statement timeout. That fault probe is internal staging
code; pg_sleep is not exposed as a gateway measurement profile.

The parent-termination test uses a scaled 100-ms work deadline and confirms a stalled
child exits before the lease is released; a separate startup-failure test confirms
termination before reuse. Expiry/emergency tests cancel active work. Tests validate
control behavior, not a measured production ten-second cancellation event.

Against Netlify's documented 30-second scheduled limit, the slowest modeled scheduler
fault invocation (16.233 seconds) leaves **13.767 seconds** of arithmetic margin.
That figure includes the injected five-second connection delay but does not certify
real Netlify initialization, production pooler contention or provider throughput.
Actual hosted cold/warm gateway and scheduler behavior remains unmeasured this phase.
[Netlify scheduled-function limit](https://docs.netlify.com/build/functions/scheduled-functions/).

## Verification and artifacts

- Full repository suite: **432 tests passed**. Final TLS-only focused gateway suite:
  **19 tests passed**. TypeScript no-emit and whitespace checks passed.
- Security tests cover signatures/tampering/audience/path, replay across restart,
  expiry/skew, authenticated/profile/global/edge rate limits, simultaneous callers,
  malformed/duplicate/extra input, destination/TLS rejection, output filtering,
  emergency stop, timeout/failure shutdown, crash/corrupt ledger and child termination.
- Independent audit detects deliberately bad direct/PUBLIC/definer privileges.
- Main and final security staging assessments passed and removed their roles/clusters.
  Fault assessment passed and removed its own synthetic cluster.
- Offline package inventory includes three client files and nine gateway files, no
  secrets, schedules, staging provisioning code or publishing worker. Dependencies
  are external rather than silently bundling the app. No new npm dependencies were added.

Raw local evidence (no passwords, connection strings or customer records):
`/tmp/showwork-gateway-staging-results.json`,
`/tmp/showwork-gateway-security-staging-results.json`,
`/tmp/showwork-gateway-staging-fault-results.json`,
`/tmp/showwork-gateway-staging-summary.json`,
`/tmp/showwork-gateway-full-tests.log`,
`/tmp/showwork-gateway-final-unit-results.log`,
`/tmp/showwork-gateway-tls-only-final-artifacts/inventory.json`.

Files added in this phase:

| Files | Purpose |
| --- | --- |
| scripts/diagnostics/gateway/contract.cjs, protocol.cjs, profiles.cjs | Client-safe contract, authentication/output schema and fixed SQL map |
| scripts/diagnostics/gateway/ledger.cjs, ingress.cjs | Durable replay/budgets, shutdown and bounded HTTP(S) handling |
| scripts/diagnostics/gateway/executor.cjs, executor-worker.cjs, supervisor.cjs | Staging-only TLS executor, process isolation and hard cancellation |
| scripts/diagnostics/gateway/client.cjs, serve-staging.cjs | Signed-request relay and loopback HTTPS staging entry point |
| scripts/diagnostics/gateway/audit-role.cjs, staging-assessment.cjs, package-offline.cjs | Independent permissions audit, synthetic measurements and artifact inventory |
| tests/helpers/isolated-postgres.cjs, tests/publishing-gateway.test.cjs | Disposable PostgreSQL/TLS fixtures and security regressions |
| docs/publishing-gateway-implementation-assessment.md, docs/publishing-vps-netlify-comparison.md | Results, risks and conditional hosting assessment |

Reproduce with an isolated PostgreSQL 17.6 installation:

```sh
SHOWWORK_POSTGRES17_ROOT=/path/to/isolated/postgres17 node scripts/diagnostics/gateway/staging-assessment.cjs
SHOWWORK_POSTGRES17_ROOT=/path/to/isolated/postgres17 node scripts/diagnostics/gateway/staging-assessment.cjs --gateway-only
SHOWWORK_POSTGRES17_ROOT=/path/to/isolated/postgres17 node scripts/diagnostics/gateway/staging-assessment.cjs --faults-only
node --test tests/*.test.cjs
npx tsc --noEmit --incremental false
node scripts/diagnostics/gateway/package-offline.cjs /tmp/new-reviewed-artifact-directory
```

The staging runner creates its own localhost cluster and never accepts a production
URL. The local PostgreSQL binary was compiled from the checksum-verified official
17.6 archive into /tmp, with TLS support; no global installation or system trust
change occurred. Hosting deployment, provider calls and production tests are absent.

## Remaining risks and next-stage decision

1. Production role audit and actual production timing are not completed. No new
   production credential was created or activated. Keep the existing role inactive.
2. Process separation in local tests is not OS-user/container isolation. Trusted
   hosting must supply separate identities/secret-mount permissions, egress controls,
   durable storage and singleton enforcement before a production connection review.
   A compromised executor/raw credential still inherits PUBLIC capabilities.
3. A trusted independent revocation timer/secret deletion controller has not been
   deployed. Runtime expiry/process termination is implemented; production credential
   revocation/role/session teardown infrastructure still needs review and fault tests.
4. External TLS termination, firewall/DNS egress, distributed deployment controls,
   actual Netlify relay initialization and verified VPS operations remain untested.
   Staging clock acceleration/loopback results cannot substitute for hosted testing.
5. Real Supabase dataset/pooler activity, application load, independent client pools,
   provider quotas, media processing and ambiguous provider outcomes remain outside
   these no-publish measurements. SELECT plans cannot establish real write throughput.
6. The manifest is trusted local configuration, not an operator-signature-verified
   deployment artifact. Hosting access/ownership must protect it and pin package hashes.
   Unclean ledger lock removal requires operator review; it does not auto-reset a run.

**GO for completed offline/staging validation. NO-GO for production activation or
publishing deployment.** Do not request activation until the hosting isolation,
cleanup controller and production-specific permissions/configuration review are
concrete and reviewable. No next-stage approval is inferred from this report.

See [the VPS comparison](publishing-vps-netlify-comparison.md): a warm supervised
publishing service is a promising fit, but InterServer capacity/region/operations
remain unknown. A hybrid publishing pilot is a safer evaluation sequence than
migrating all web/payment/auth/email workflows at once. No migration is authorized.
