# Production-latency diagnostic: security configuration for review

**Status: superseded by the final effective-permissions audit; NO-GO for activation.**

See [the final permissions report](publishing-diagnostic-final-permissions.md).
The role remains NOLOGIN with a NULL password. The final audit identified PUBLIC
built-in function, catalog and cross-database capabilities that prevent certification
of strict read-only/status-only access. TLS verification passed. No production-connected
diagnostic test or deployment is authorized or has occurred.

The details below describe the original prepared configuration; the final report
corrects the statistics-view interpretation and takes precedence over preliminary
permission conclusions.

## Created PostgreSQL role

Role: `sw_diag_ro_20261011_0a5570fb`

| Setting | Actual configuration |
| --- | --- |
| LOGIN | Disabled (`NOLOGIN`) |
| Password | NULL; no diagnostic password has been generated |
| SUPERUSER / CREATEDB / CREATEROLE | All disabled |
| INHERIT / REPLICATION / BYPASSRLS | All disabled |
| Membership in other roles | None |
| Connection limit | 3 |
| Role validity | Until 12 October 2026, 09:56:05 UTC; login remains disabled regardless |
| Default transaction mode | Read-only |
| Statement timeout | 2 seconds |
| Lock timeout | 250 milliseconds |
| Idle transaction timeout | 5 seconds |
| Row security | Enabled; no bypass |
| Search path | pg_catalog, public |

Only CONNECT to the application database and USAGE of public are explicitly
granted. There is no schema CREATE privilege and no grant option. The only
application-data grants are column-level SELECT on public.CalendarPost:

`id`, `platform`, `postDate`, `approvalStatus`, `isAiDraft`,
`instagramPublishStatus`, `tikTokPublishStatus`, `publishStatus`,
`tikTokPublishId`, `publishWorkerStartedAt`, `updatedAt`.

These columns support the due-post predicate and timing plan. There is no table-wide
SELECT grant. Caption/content, customer/account/payment tables, media, credentials,
and other application tables are not readable. INSERT, UPDATE, DELETE and TRUNCATE
on CalendarPost are denied, independently of the default read-only setting.

The permission audit checked effective privileges, including inherited PUBLIC
permissions. No PUBLIC application-table write grants, PUBLIC schema CREATE grants,
or accessible PUBLIC SECURITY DEFINER functions were found. The role has no
pg_read_all_data, pg_write_all_data or pg_read_all_stats privileges.

### PostgreSQL defaults disclosed

PUBLIC grants CONNECT/TEMPORARY at database level and exposes two standard statistics
views: extensions.pg_stat_statements and extensions.pg_stat_statements_info.
The role inherits these existing defaults; it has no other readable application
tables. PostgreSQL conceals other users' query text/query IDs from roles without
pg_read_all_stats. The diagnostic does not query these statistics views or create
temporary tables. No global PUBLIC permissions were revoked, which would affect
other database users. Backend column grants and the endpoint query allowlist are
separate safeguards.

Role creation and grants changed only explicitly authorized security metadata.
No production customer/publishing records were changed. Effective privileges were
audited using the existing local administrative connection; those administrative
credentials are never supplied to the diagnostic project.

## Diagnostic execution restrictions

Source: scripts/diagnostics/publishing-runtime.ts, outside normal production
function discovery. It will be deployed alone to a separate temporary project.
The read-only deployment will not include Showwork API routes, cron schedules,
real publishing workers, or the optional no-op acknowledgement function.

- POST only; missing/incorrect authentication is rejected before database access.
- A newly generated 256-bit bearer token is required. It is not returned to clients
  or placed in static assets, source control, command arguments, or logs.
- An absolute DIAGNOSTIC_EXPIRES_AT value is mandatory. Missing/expired values
  disable execution. The testing window will be at most two hours.
- The database username must match the dedicated DIAGNOSTIC_ROLE_NAME. Existing
  production/admin usernames are rejected before connection.
- The PostgreSQL destination must match DIAGNOSTIC_DB_HOST, and the URL must
  limit its connection pool to three. Caller input cannot change the destination.
- After connection, the session must report that exact role, default read-only
  mode, no privileged flags, no CalendarPost write access, and no caption access.
  A mismatch fails closed.
- Every database transaction additionally executes SET TRANSACTION READ ONLY.
- Actual database statements are fixed SELECT queries and EXPLAIN ANALYZE SELECT
  plans over the eleven granted columns. No claim/cleanup UPDATE, INSERT, DELETE,
  row-locking query, or user-supplied SQL is executed.
- Query results are discarded. Responses contain timings, counts from synthetic
  in-memory fixtures, region and instance metadata; no production row IDs, content,
  query text/parameters, connection strings, passwords or tokens are returned.
- Automatic telemetry loaders are excluded from the diagnostic package; Prisma
  query/error logging is disabled. Errors return only a short error code.
- Caller-supplied SQL, URLs and unknown body fields are rejected. Profile sizes and
  timing parameters are bounded; at most three database operations are concurrent.
- Production read-only mode rejects actualAcknowledgement. Dispatch is synthetic
  bookkeeping only; no publishing or background-worker HTTP endpoint is called.

## TLS and credential handling

The client requires sslmode=require, sslaccept=strict and an explicit sslcert CA
file. It will not downgrade to unverified or plaintext connections. The Supabase
server CA must be obtained from the trusted Database Settings dashboard and
certificate/hostname verification validated before credentials are activated.
The official certificate has now been downloaded and verified by a credential-free
TLS handshake. Activation remains blocked by the final effective-permissions findings.

After review, generate a fresh random diagnostic password, store only a SCRAM-SHA-256
verifier in PostgreSQL, and enable LOGIN for a maximum two-hour password-validity
window. The password stays in memory during provisioning and is stored only in
the temporary project's server-side environment. The original production URL is
not copied: construct a new URL using the dedicated role and its new password.
No existing application secret or publishing token is provisioned.

The dedicated package command is scripts/diagnostics/package-readonly-diagnostic.mjs.
It requires the trusted CA file before bundling, excludes automatic instrumentation,
and produces only the restricted diagnostic function, with no schedule or credentials.

Only the prebuilt authenticated diagnostic bundle and a static placeholder are
deployed; no source build, repository connection or client-side environment
substitution is used. Netlify's Free plan does not support Functions-only variable
scopes, so the temporary project must have no build command or repository and
no untrusted collaborators. Credentials must remain server-side and excluded
from responses, error details, telemetry and static assets.

## Revocation and project removal

After tests, or immediately on a failure:

1. Disable LOGIN and clear the password first, stopping new connections.
2. Terminate sessions belonging only to this temporary role; do not touch other users.
3. Revoke its column SELECT, schema USAGE and explicit database CONNECT grants.
4. Drop the temporary role after its sessions/privilege dependencies are removed.
5. Delete the temporary Netlify project and its environment variables, then verify
   project deletion and role removal.

Existing credentials, existing roles, global PUBLIC permissions and Showwork's
deployment are unaffected by the teardown. A normal expiry alone is insufficient
to revoke existing sessions; explicit termination and removal are required.

## Review gate

The role is deliberately inactive while this configuration is reviewed. No password
has been generated, no dedicated-role login attempted, and no diagnostic project
has received a database URL. The earlier credential-free timing project was
removed and never had production database access.

Please review the column scope, disclosed PostgreSQL defaults, endpoint restrictions,
TLS prerequisite, short activation window and cleanup sequence before authorizing
activation and the diagnostic-project connection.

Primary references:

- https://www.postgresql.org/docs/current/sql-createrole.html
- https://www.postgresql.org/docs/current/sql-grant.html
- https://www.postgresql.org/docs/current/pgstatstatements.html
- https://supabase.com/docs/guides/database/psql
