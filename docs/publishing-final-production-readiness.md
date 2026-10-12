# Showwork publishing: final production-readiness assessment

11 October 2026. **NO-GO for consolidated-scheduler deployment, production diagnostic
activation or VPS migration.** Offline hardening and isolated staging checks passed;
several requirements depend on infrastructure that does not yet exist or on production
access/security provisioning outside this phase's offline authorization.

No production database connection, credential activation, live publishing, deployment
or infrastructure change occurred in this phase. Existing Netlify handlers, scheduled
configuration, platform workers, payment/billing/email/inbox behavior and the shared
claim/admission core were not edited. Earlier undeployed scheduler changes remain in
the workspace. The old production diagnostic role was not activated or reused.

## Readiness matrix

| Requirement | Evidence/status | Release decision |
| --- | --- | --- |
| Five-platform minute publishing and shared admission | Existing core reused unchanged; round fairness, approval and exact lease guards validated | Passed in staging |
| Hosting-independent service lifecycle | New explicit runtime/transport interfaces; no timer starts on import; overlap guard, shutdown drain and minute scheduling tested | Prepared/tested offline |
| Gateway separates secrets from public ingress | Separate ingress/executor services and review artifacts; actual macOS sandbox denied ingress access to executor config and filesystem writes; HTTPS-to-private-socket measurement passed | Locally verified; target hosting blocked |
| Executor egress restriction | Actual local OS sandbox allowed the approved staging DB query and denied a different TCP destination; its trap received zero connections | Locally verified; Linux/VPS enforcement blocked |
| Independent credential revocation | Separate scoped controller disabled LOGIN, cleared password, terminated the existing diagnostic session and rejected a new login after ingress was SIGKILLed | Passed in staging; production controller pending |
| Effective role permissions | Independent catalog audit of active and inactive staging roles, PUBLIC capabilities, memberships in both directions, functions, schema access and RLS | Passed for staging scope; production audit pending |
| Cold/warm behavior | Ten fresh OS processes/Prisma/TLS connections and ten truly warm samples; no injected latency | Actual local measurements; current hosted build unmeasured |
| Timeouts/expiry | Real ten-second parent timeout/confirmed child exit; prior two-second statement and 250-ms lock tests; monotonic expiry prevents wall-clock rollback extending a run | Passed locally; hosted failure tests pending |
| Concurrency | Single gate three validated; two overlapping runs demanded six operations from a five-connection pool and produced two P2028 errors | Global capacity/leadership remains a release blocker |
| Fairness/continuous arrivals | Hot Instagram plus arrivals during admission; all five platforms progressed; 375 fixtures drained in two cycles | Passed tested injected-latency workload |
| Retry/duplicate/recovery safety | Durable queue fixture restart/redelivery, isolated platform error, rollback/stale/TikTok guards and ambiguous commit tested | Safety passed; conservative/manual recovery remains material |
| Actual production DB latency/queries | No production-connected diagnostics run | Blocked |
| InterServer specifications/operations | VPS has not been configured; region, CPU/RAM, isolation, supervision, monitoring and recovery unknown | Blocked |

## Security hardening implemented

Public ingress now has its own staging entry point and uses only a private Unix socket
to forward signed requests. It imports no Prisma, SQL map, executor configuration,
revoker or application worker. Its dependencies are checked in tests and separately
packaged. Only the private executor owns the diagnostic credential and durable nonce/
budget ledger; caller signatures and the global budget are enforced there too.

Actual split-service tests used strict HTTPS outside, an OS-protected Unix socket
inside, and strict TLS/SCRAM to a disposable PostgreSQL 17.6 instance. Public ingress
ran inside a macOS sandbox with outbound TCP denied, access to the executor/private
cluster denied, application-secret paths excluded, and filesystem writes denied.
It still completed an authenticated timing-only measurement through the private socket.
A separate executor sandbox permitted only the approved local DB TCP port and denied
an alternate TCP trap plus a private file read. The DB query succeeded; the trap saw
zero connections. Application secret path exclusion was configured without attempting
to read actual application secrets. All data/credentials used in these probes were
synthetic/staging-only.

These are **local OS enforcement proofs**, not verification of Linux containers,
separate Linux users, mount namespaces, read-only roots, capability dropping or the
future InterServer host. Docker/Podman and an approved Linux staging host are not
available in this environment. Do not treat a declared policy as enforced hosting.
`scripts/diagnostics/gateway/hosting-policy.json` lists concrete identities, secret
mount exclusions, egress channels, singletons and target-host release probes; it is
not a deployed firewall/service configuration.

Expiry now combines absolute UTC expiration with a monotonic ceiling. A backward
wall-clock adjustment cannot extend an already-running diagnostic window. Supervisor
work deadlines also use a monotonic clock. Existing signature/replay/rate/quota/error
controls remain; no plaintext or invalid-certificate executor mode is accepted.

### Scoped independent revoker

The revoker runs separately, with no dependency on the gateway PID, heartbeat or IPC.
Its staging credential has no application-column grants or elevated role attributes.
It can execute only three authorized SECURITY DEFINER control functions in public;
the gateway cannot execute any of them. Ordinary inherited PUBLIC capabilities remain
and are not represented as removed.

Function bodies bind one generated diagnostic role literally and accept no arguments:

1. Disable that role's LOGIN and clear its password.
2. Terminate only sessions with that exact role, waiting for termination.
3. Verify LOGIN is disabled, the password is absent and no such sessions remain.

Creation and PUBLIC revocation are in one transaction; function search_path is fixed
to pg_catalog. Disable/password clearing commits **before** session enumeration so
new sessions cannot slip into the termination sweep. The controller records success
only after verification; a false verification produces no successful receipt.

In the final staging run, ingress was forcibly killed while the private executor
remained alive with one DB session. The independent controller still revoked the
credential and terminated that session. Total controller elapsed time includes an
800-ms configured wait; it was about one second overall. A subsequent new login was
rejected. Roles, functions, credentials, sockets and clusters were removed afterward.

Production installation must separately verify the function owner's actual ALTER ROLE,
catalog and signalling permissions. The staging owner is a local administrator;
Supabase privileges are not assumed equivalent. No production control functions or
credentials were created. Trusted hosting must also supervise/alert the revoker and
prove restart behavior, DB-outage handling and operator emergency stop before activation.
A revoker that cannot reach the DB cannot certify session revocation; expiry alone
only prevents fresh password authentication, not existing-session use.

### Production-specific audit: prepared, not performed

The audit implementation now checks active and inactive credentials, incoming SET ROLE
rights as well as outgoing memberships, effective PUBLIC/table/column privileges,
sequence/write/ownership rights, privileged roles, accessible SECURITY DEFINER routines,
schema CREATE/USAGE, catalog exposure, defaults/timeouts and RLS policy changes.
A deliberately introduced inbound SET ROLE grant failed the staging audit and was
removed. Unreviewed RLS policies fail closed.

`auditInactiveProductionRole` is a read-only catalog helper for an already-authorized
local audit client and a separately provisioned `sw_gateway_ro_*` NOLOGIN role. It does
not obtain credentials, create a role, activate LOGIN or connect any gateway. Its
staging-equivalent inactive-role path was exercised after revocation. It checks only
whether a password is absent, never retrieves password/hash values.

There is no new production gateway role to audit yet, and this phase authorizes only
offline/staging work. **No production-specific pass is claimed.** A later approved
security-provisioning step must create an inactive role without a password, audit its
actual Supabase grants/policies/types/functions/role dependencies and the scoped
revocation functions, and present the report/configuration before diagnostic connection.
Do not reuse the original disabled role or copy existing production credentials.

## Measured and simulated evidence

**Actual local cold/warm measurements:** ten fresh executor processes, each initializing
Prisma and strictly verified TLS against the synthetic local DB. Fresh profiles close
the client, so reconnecting the first subsequent request is recorded separately from
true warm requests. Every true-warm sample had connectMs=0. These measurements have
no injected network delay and no production/Netlify hosting component. They validate
instrumentation and initialization paths, not production 1.3-second transaction timing.
Final local measurements (milliseconds):

| Local operation | Samples | Median | Observed maximum |
| --- | ---: | ---: | ---: |
| Fresh process, Prisma/TLS connection and first measurement | 10 | 172.615 | 180.610 |
| Truly warm transaction including parent/child IPC | 10 | 1.967 | 3.360 |
| Hung-worker termination at the ten-second deadline | 1 | 10,010.375 | 10,010.375 |
| Independent revocation after ingress crash, including an 800-ms configured wait | 1 | 1,029.583 | 1,029.583 |

The ten-sample p95 equals the observed maximum and is not a robust tail guarantee.
The roughly 2-ms warm loopback result must not replace production's measured
1.30–1.38-second warm transaction latency in a deployment decision.

**Actual local timeout enforcement:** a deliberately hung, no-DB worker was killed by
the unscaled ten-second supervisor deadline, with confirmed process exit before gate
reuse. The hang is a simulated fault; termination timing is an actual local measurement.
Previous staging measurements recorded approximately 2.0 seconds for statement timeout
and 0.264–0.269 seconds for lock timeout. No production fault was induced.

**Actual PostgreSQL writes with injected latency:** the scheduler core and real claims/
leases ran in PostgreSQL 17.6 with fsync enabled and a five-connection client. Network-
like sleeps were deliberately added while transactions were open; provider work was
fixture-only. These are measured staging runtimes of a model, not actual production
write latency or provider publication speed.

| Balanced due posts | Gate 3 at injected 1.380 s/transaction | Gate 3 at injected 1.923 s/transaction |
| --- | ---: | ---: |
| 10 | 3.298 s | 4.381 s |
| 25 | 3.300 s | 4.382 s |
| 50 | 3.306 s | 4.391 s |
| 100 | 6.099 s | 8.403 s |
| 250 | 9.965 s | 13.345 s |

These five workload sizes were measured in the previous staging assessment; the
current phase adds the stronger overlap/arrival/queue/crash tests below rather than
presenting those older figures as a fresh production measurement.

- At 1.923-second injected latency, two gate-three invocations requested six operations,
  while a maximum of five transaction callbacks actually executed. Two P2028 transaction
  errors occurred. The runs took 10.079 s and 7.911 s and together drained 250 distinct posts without
  duplicate fixture workers or an additional recovery tick. The error code covers transaction failures;
  raw error text was not retained. This demonstrates pool pressure and safe job ownership,
  not an acceptable production error rate or a safe global concurrency of six.
- A 250-post hot Instagram backlog plus 25 initial mixed posts and 100 additional posts
  arriving every 750 ms completed over two accelerated admission cycles. Latencies varied
  deterministically between 1.300/1.380/1.600/1.923 seconds. Instagram and all four other
  platforms progressed in the first cycle; every platform's remaining jobs completed in
  the second. Cycle runtimes were 15.395 s and 11.656 s. Zero duplicate workers; 375 total jobs.
  Cycles were not real minute ticks.
- One platform's forced DB failure left its ten jobs scheduled while forty healthy-
  platform jobs ran. A subsequent healthy cycle completed those ten; zero duplicates.
- A real synthetic SQL queue persisted fifty exact committed lease envelopes. Recreating
  the transport and delivering the jobs twice produced fifty worker starts, not one hundred.
  This is a durability/redelivery fixture, not a production queue choice or migration.
- Five committed claims with a deliberately lost commit acknowledgement were **not
  dispatched**. After an accelerated stale-age update in staging, they became five
  failures requiring manual reconciliation. No blind provider retry occurred. The
  conservative fallback preserves duplicate prevention but does not prove timely
  automatic recovery from every uncertain outcome.

Previous cold/failure models admitted 230 of a balanced 250-post burst with an injected
five-second connection delay and 1.923-second transactions: 16.233 seconds first cycle,
20 deferred posts completed in 4.365 seconds next cycle. One hundred simulated lost
worker acknowledgements plus cleanup took 14.643 seconds. These measured local models
leave at least 13.767 seconds of arithmetic margin against a 30-second scheduled limit;
actual hosted initialization/cleanup/production pressure are still missing.

**Historical actual Netlify execution, synthetic DB latency only:** an earlier credential-
free temporary project measured first-invocation 100-post handler duration 10.603 s
(client 12.566 s), warm 250-post handler 13.046 s, and failure/cleanup handler 14.623 s.
The temporary project was deleted, never had production DB access, and used synthetic
1.923-second transaction timing. It predates the current split gateway. These are real
hosted runtime observations of that fixture, not a hosted production-connected test
or certification of the current build. No hosted measurements or deployments occurred
in this phase. [Netlify scheduled limit](https://docs.netlify.com/build/functions/scheduled-functions/).

## Architecture prepared for a persistent VPS worker

The existing publishing core remains hosting independent and dependency injected.
New optional modules add a service lifecycle and transport contract without changing
its SQL or current Netlify entry point:

```text
Minute trigger / persistent supervised loop
  -> leadership + no-overlap lifecycle
  -> unchanged shared admission core (five platforms, gate 3, round-robin)
  -> committed exact ID/platform/lease
  -> Netlify dispatch OR durable queue transport
  -> existing runPublishJob via validated envelope
  -> unchanged provider/consent/approval/recovery behavior
```

`runtime.ts` owns minute-boundary wake-up, duplicate-minute/backward-clock suppression,
leadership acquisition/release, catch-up through already-due selection and graceful
shutdown. It never starts a daemon on import. Shutdown waits for active admission,
committed dispatch and failure cleanup before closing transport. A supervisor must
provide cancellation, restart policy and bounded termination; no global singleton
implementation or service is silently assumed.

`transports.ts` supports the existing Netlify worker message shape and a durable queue
interface with an idempotency key derived from the exact versioned lease envelope.
A queue must acknowledge only durable persistence; no in-memory fire-and-forget adapter
is provided. Redelivery passes the exact lease to the existing worker guard. The
selected queue owns visibility/ack/retry/dead-letter behavior. Queue/leader selection,
atomicity at the claim-to-enqueue boundary, provider acceptance recovery and real
worker packaging still need review/test before a VPS cutover.

This isolates future hosting changes to trigger/leadership/transport/packaging rather
than rewriting platform claim or publishing logic. The current handlers do not import
these adapters. No worker queue table or migration was added to production; the SQL
queue exists only inside a disposed staging cluster.

The InterServer KVM VPS is **not configured**. It cannot yet be recommended as more
reliable than Netlify. A persistent publishing service can avoid repeated engine/client
startup and give better aggregate connection control; a single unmonitored host can
be a worse failure domain. Confirm region/CPU/RAM/storage, Linux/OpenSSL compatibility,
supervision, NTP, egress, secret isolation, alerting, backups and crash/deploy recovery.
Prefer evaluating publishing separately while retaining the Next.js frontend and
other jobs on Netlify. See [the conditional VPS comparison](publishing-vps-netlify-comparison.md).

## Invocation reduction — estimate, not measured savings

Assuming three old minute cron invocations plus three billed self-API invocations
become one direct scheduler invocation, the reduction is **five invocations/minute**:
approximately **216,000/month for a 30-day month**. That is 86,400 fewer scheduled
executions and 129,600 fewer self-API executions; per-post background workers and
unrelated web/cron traffic remain. Deployment/billing/account behavior must confirm
this assumption. No savings have occurred from these undeployed changes. Publishing
reliability takes priority over this estimate.

## Final blockers and next-stage sequence

1. **Target hosting unavailable:** provision an explicitly approved staging Linux
   environment first. Verify distinct identities, secret mount denial, root/capability/
   filesystem controls, the Unix socket boundary, actual egress/DNS rules, singleton
   ledger persistence and restart behavior. A policy JSON or macOS result is insufficient.
2. **Production security audit missing:** provision a new NOLOGIN/password-free target
   role only in a later authorized security step. Audit actual Supabase PUBLIC, schema,
   column, RLS, inbound/outbound memberships, functions/types and revoker-owner permissions.
   Present the production-specific report before any connection/activation request.
3. **Production revocation infrastructure missing:** install and verify an independent
   scoped controller, emergency control, restart/DB-outage handling and external alerting
   on approved hosting; test gateway/ingress death and credential/session teardown there.
4. **Current hosted timing absent:** run no-publish diagnostics on approved staging
   hosting and eventually the approved restricted production read-only path. Measure
   real cold/warm initialization, DB/pooler phases, cleanup, cancellation and safety margin.
   Do not combine synthetic sleeps/local loopback numbers into a claimed production result.
5. **Aggregate concurrency unresolved:** keep three per admitted scheduler run in staging;
   require one active leader and a defined aggregate budget for web, scheduler, workers
   and diagnostics. Five connections per Prisma client is not a global server limit.
   The observed overlap errors must be addressed/accepted with measured recovery bounds.
6. **VPS delivery/recovery choice pending:** select and validate a durable queue/leadership
   implementation, uncertain enqueue/commit handling, provider reconciliation and worker
   restart semantics. Manual stale reconciliation is safe but may delay customer publishing.
   No region/specification assumption can replace testing the configured VPS.
7. **Cutover/rollback unapproved:** ensure old schedules stop, only one publisher leader
   admits, existing in-flight workers finish under exact leases, and rollback cannot run
   two schedulers unintentionally. Billing/email/inbox jobs remain outside this phase.

Do not request production activation until these are concrete and verified. No next-stage
approval is requested or inferred by this report. **GO for continued offline/staging
work; NO-GO for production release.**

## Files and reproducibility

New publishing modules: `lib/publishing/runtime.ts`, `lib/publishing/transports.ts`.
New security/service modules: `revoker.cjs`, `expiry.cjs`, `unix-relay.cjs`,
`serve-ingress-staging.cjs`, `serve-executor-staging.cjs`, `hosting-policy.json` in
`scripts/diagnostics/gateway/`. New assessment/probe modules in that directory:
`readiness-assessment.cjs`, `publishing-resilience-assessment.cjs`,
`isolation-probe.cjs`, `secret-denial-probe.cjs`.
Updated offline modules: `audit-role.cjs`, `executor.cjs`, `ingress.cjs`, `ledger.cjs`,
`supervisor.cjs`, `package-offline.cjs`; `staging-assessment.cjs` can now export fixtures
without running on import. New tests: `publishing-runtime.test.cjs`,
`publishing-hardening.test.cjs`, `helpers/gateway-role-fixture.cjs`.
This report records the final stage; earlier reports retain their historical evidence.

Final repository suite: **444 tests passed**. TypeScript no-emit and whitespace checks
passed. Independent scope/SET ROLE audit, split OS probes, ten-second timeout, crash/
revocation and publishing resilience assessments passed against disposable staging.
Artifacts are separate client (3 files), ingress (8), executor (10) and revoker (2),
with hashes, no credentials, no publishing worker, no schedule and production mode
still disabled. Actual Linux hosting verification is explicitly false in inventory.

```sh
node --test tests/*.test.cjs
npx tsc --noEmit --incremental false
SHOWWORK_POSTGRES17_ROOT=/path/to/isolated/postgres17 node scripts/diagnostics/gateway/readiness-assessment.cjs
SHOWWORK_POSTGRES17_ROOT=/path/to/isolated/postgres17 node scripts/diagnostics/gateway/publishing-resilience-assessment.cjs
node scripts/diagnostics/gateway/package-offline.cjs /tmp/new-reviewed-artifacts
```

Current raw evidence: `/tmp/showwork-readiness-security-results.json`,
`/tmp/showwork-publishing-resilience-results.json`,
`/tmp/showwork-final-readiness-tests.log`. Historical evidence remains in the prior
staging/credential-free hosted JSON files. Records contain no raw passwords, connection
strings or customer content. All synthetic role/function/cluster/socket cleanup passed.
