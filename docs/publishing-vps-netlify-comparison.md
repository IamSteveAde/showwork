# Showwork: VPS versus Netlify reliability assessment

11 October 2026. This is a conditional architecture assessment, not a migration
approval or a VPS benchmark. User-confirmed provider: **InterServer KVM VPS**.
The VPS has not been configured. Region, vCPU, RAM, storage, Linux distribution,
supervisor and monitoring remain unverified. No VPS access, infrastructure changes or deployment occurred.

## Recommendation

A supervised, adequately sized VPS is a stronger fit for **persistent publishing
admission and background workers** because it can reuse initialized database clients,
control aggregate concurrency and avoid the scheduled-function 30-second boundary.
That is an inference about workload fit, not evidence that the existing VPS will be
more available or have lower database latency. A single poorly monitored VPS can be
less reliable than managed Netlify functions and becomes a shared failure domain
if it hosts the application and publishing workers together.

Prefer evaluating **publishing services on a VPS while retaining the Next.js frontend
on Netlify** as the first migration candidate. Keep Supabase as the managed database.
This separates a publishing-host trial from a simultaneous migration of authentication,
payments, callbacks, emails and all web routes. It still requires explicit approval,
worker transport changes and a staged cutover; nothing has been migrated.

If the VPS region is far from the eu-central-1 database, moving compute there will
not automatically improve the observed 1.3-second warm transactions. Warm processes
remove connection/engine startup costs, but not recurring query, pooler or network
roundtrips. Measure from the actual VPS before deciding.

## Comparison

| Concern | Netlify | Supervised VPS | Current conclusion |
| --- | --- | --- | --- |
| Publishing admission lifetime | Scheduled function limit is 30 seconds; proposed scheduler retains 15-second admission/27-second finish deadlines | No platform-imposed Lambda deadline; service can keep clients initialized | VPS offers more runtime control; retain bounded cycles for fairness and shutdown |
| Cold starts | Instance/runtime/Prisma initialization can consume admission budget | Persistent process remains warm until restart/deploy/crash | VPS can reduce recurring startup cost, not database network cost |
| Connection control | A connection_limit=5 applies to a Prisma client, not automatically to every function instance or worker combined | Central pooler and process budgets can cap aggregate load | VPS is easier to coordinate; multiple processes with five connections each still oversubscribe |
| Platform fairness/idempotency | Must come from claims, round-robin admission and exact worker leases | Same requirements; host choice does not prevent duplicate posts | Preserve current SQL claims, post-commit dispatch and provider reconciliation on either host |
| Background work | Managed asynchronous invocation, maximum 15 minutes; documented error retries | Must supply durable dispatch, acknowledgement, retries and crash recovery | VPS needs deliberate replacement of Netlify transport semantics |
| Availability | Managed compute lifecycle; application still depends on Supabase/providers | One VPS outage can stop scheduler/workers and web app together | Unknown VPS operations prevent an availability ranking |
| Resource isolation | Separate function executions have platform-managed limits | SSR, Sharp/FFmpeg jobs, workers and builds compete unless isolated | Separate services/users, quotas, CPU/RAM limits and build processes required |
| Scheduling | Managed minute cron, UTC | UTC timer/service, clock synchronization, missed-run recovery and singleton leadership required | VPS can be timely if configured and monitored; ordinary setInterval is insufficient |
| Operational burden | Platform handles much runtime infrastructure | Patching, TLS, firewall, supervision, queue storage, backups, disk/log rotation and alerts are yours | VPS advantage depends on verified operations |
| Web scaling | Managed deployment/CDN/function scaling | Finite host capacity; scale-out requires cache/session/deploy consistency work | Retain Netlify web hosting initially unless VPS web load tests justify migration |
| Invocation cost | Publishing cron and worker executions remain metered | Publishing executions do not consume Netlify function allowance when genuinely moved | Reduced invocations do not establish greater reliability |

Netlify documents the 30-second scheduled-function boundary and the background
15-minute limit/retry behavior. These are different limits; moving the admission
loop does not eliminate the need for worker timeouts/recovery.
[Scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/),
[background functions](https://docs.netlify.com/build/functions/background-functions/).

## Suitability by service

**Next.js application:** Node-hosted Next.js supports dynamic rendering, middleware,
route handlers, authentication and server actions; a full application migration is
technically feasible. Use a production build and supervised `next start`, an HTTPS
reverse proxy, correct forwarded headers, secure cookie/base URLs and compatible
native Prisma/media binaries. Netlify's `.netlify/functions/*` paths and scheduled
functions are not automatically hosted by `next start`. Preserve OAuth/payment
callback URLs and webhook behavior, streaming/proxy timeouts, writable cache/media
temporary directories, Sharp/FFmpeg resource controls and clean deploy rollback.
Build in CI or a separate process/host rather than competing with publishing for RAM.
Do not store durable jobs or customer uploads solely in ephemeral app temp directories.
For multiple web instances, review cache invalidation and deployment consistency.
[Next.js 15 self-hosting guidance](https://nextjs.org/docs/15/app/guides/self-hosting).

**Publishing scheduler:** Use one supervised leader that wakes on UTC minute
boundaries, invokes the existing shared batch scheduler directly and keeps a warm
client. Prevent overlap locally and across leaders; retain row claims as the final
correctness guard. Account for missed ticks on restart by selecting already-due
jobs, rather than replaying old claims. Do not remove approval checks, TikTok accepted-ID
reconciliation, exact leases, first-platform rotation or error isolation. Keep cycles
bounded even though the VPS allows more time; longer cycles change delay and fairness
semantics and need tests. A systemd timer must explicitly configure timing accuracy:
default timer coalescing is not a promise of exact minute execution. Persistent timers
can catch a missed trigger but do not replay every missed minute or replace due-job
selection. [systemd timer reference](https://github.com/systemd/systemd/blob/main/man/systemd.timer.xml).

**Background publishing workers:** Run isolated supervised worker processes with
bounded provider/media concurrency. The proposed scheduler's default dispatch still
calls `/.netlify/functions/publish-post-background`; VPS execution is not a drop-in
change. Inject a durable transport through the scheduler's dispatch interface. An
in-memory array or fire-and-forget process spawn is insufficient. Persist a job
containing the committed post ID/platform/exact lease, acknowledge only durable enqueue,
and execute the existing `runPublishJob` lease guard. If enqueue is uncertain, preserve
existing recovery/lease behavior instead of claiming/publishing again blindly. Queue
visibility/retry delays, worker crashes after provider acceptance, dead-letter alerts,
shutdown and TikTok reconciliation require staging fault tests before replacement.
Queue/DB changes, if needed, require a separate review; none were made here.

**Other scheduled jobs:** Billing, payments, lifecycle/trial emails, AI research,
reporting and social inbox timers are currently Netlify-specific wrappers. Migrating
the web app alone does not migrate these jobs. Keep them on Netlify during a publishing
pilot. A later complete migration must inventory all eleven currently present cron
wrappers and four background wrappers, port their schedules/transport and ensure old
schedules stop at cutover. No billing/payment/email/inbox job is changed in this phase.

**Database connections:** Keep production PostgreSQL managed in Supabase; moving the
DB onto the application VPS adds durability/backup/failure-domain risks and is outside
this assessment. Prefer existing verified pooler/TLS configuration initially. A
persistent VPS may suit session/direct connections, but changing pooler mode can
change backend connection consumption, prepared statements and timing; test separately.
Use the official CA and hostname verification. Do not treat a five-connection client
setting as a global server limit. Budget web, scheduler, worker, gateway and other job
connections together through a central pooler or explicit shared limits. The local
assessment deliberately used one five-connection scheduler client; independent
Netlify clients/VPS processes would have separate pools unless coordinated.
[Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres),
[pooling limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).

## Conditional capacity scenarios — planning estimates only

These are initial load-test candidates, not measured minimums or InterServer plan facts.
Actual media size/transcoding, concurrent SSR load, RAM use and database latency can
change requirements substantially.

| Verified VPS scenario | Suitability to evaluate |
| --- | --- |
| 1 vCPU / 1–2 GiB RAM, shared with Next.js builds/media tasks | Poor candidate for hosting all services; evaluate only a lightweight isolated scheduler after measuring headroom |
| 2 vCPU / 4 GiB RAM, builds elsewhere, bounded workers | Reasonable staging pilot for scheduler and light publishing workers; media/SSR contention remains an important limit |
| 4+ vCPU / 8+ GiB RAM, isolated services, healthy storage/network | Stronger candidate for combined web and workers, subject to peak and fault testing; still a single-host failure domain |
| Any size without supervisor, backups, alerts and verified DB reachability | NO-GO for reliability-driven migration |

Before a final decision, verify region, CPU allocation/steal, RAM/swap/OOM behavior,
free disk/inodes and I/O latency, firewall/TLS, clock synchronization, Node/OpenSSL
compatibility, process restarts, deployment rollback and access controls. Measure
warm/fresh DB connections and actual staging scheduler throughput from that VPS;
load-test web traffic alongside media work; reboot/kill workers and confirm durable
jobs resume exactly once through the existing lease guard. Monitor due-job age,
per-platform backlog/errors, missed minute heartbeats, queue depth, provider reconciliation,
DB pool wait, CPU/RAM/disk and process restarts with external alerts.

**Decision:** VPS is a promising publishing-runtime candidate, particularly with a
hybrid frontend arrangement. **NO-GO for migration or a categorical claim that the
existing InterServer VPS is more reliable until its specifications and operational
controls are verified.** No production infrastructure or publishing change is authorized.
