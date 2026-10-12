# Final effective-permissions audit — 11 October 2026

**Decision: NO-GO for activation or production-connected diagnostics.**
The TLS prerequisite passed. The direct PostgreSQL role does not meet the requested
strict isolation requirement once inherited PUBLIC capabilities are included.
The role remains NOLOGIN, with a NULL password. No credentials were generated or
transferred, no diagnostic login or production-connected workload test ran, and
no deployment was made. This audit changed no production data or global grants.
Production publishing configuration was not changed in this audit phase.

## Method and measured effective permissions

The production PostgreSQL 17.6 catalogs were inspected through the existing local
administrative connection, inside READ ONLY transactions. Checks used effective
`has_schema_privilege`, `has_table_privilege`, `has_column_privilege`,
`has_sequence_privilege`, `has_function_privilege`, `has_database_privilege`,
`pg_has_role`, object ownership and large-object ACLs. Customer records, credential
values, routine bodies and query text were not retrieved. Existing administrative
credentials were never provided to a diagnostic project.

Role: `sw_diag_ro_20261011_0a5570fb`. Final inventory saved at
`/tmp/showwork-final-permissions.json` (metadata only).

| Area | Actual result | Assessment |
| --- | --- | --- |
| Role attributes | NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS; connection limit 3 | Pass |
| Role membership/ownership | Zero memberships; zero owned relations, schemas or routines | Pass |
| Privileged predefined roles | No USAGE or SET rights for read/write-all-data, read-all-stats/settings, server-file read/write, execute-server-program, signal-backend or create-subscription roles | Pass |
| Application reads | Exactly eleven CalendarPost columns; no other application columns accessible through usable schemas | Pass for intended application-data scope |
| Application writes | No effective table or column writes, TRUNCATE or TRIGGER privileges; no accessible sequences | Pass |
| Schema access | USAGE only public, pg_catalog, information_schema; no schema CREATE | Pass for application schema isolation |
| Other schemas | No USAGE on auth, extensions, graphql, graphql_public, pgbouncer, realtime, storage or vault | Pass; does not hide catalog definitions |
| SECURITY DEFINER | No executable definer routines in any usable schema | Pass |
| Existing large objects | Zero readable objects through ownership/PUBLIC/direct ACLs | Pass for existing large-object reads |
| PUBLIC database defaults | CONNECT and TEMPORARY on postgres; CONNECT/TEMPORARY on three migration-shadow databases; CONNECT on template1 | **Blocking extra capabilities** |
| PUBLIC built-in functions | EXECUTE on lo_create, lo_creat, lo_from_bytea, other lo_* routines, pg_notify and advisory-lock routines | **Blocking mutable/side-effect capabilities** |
| System metadata | pg_proc, pg_auth_members, pg_settings, pg_stat_activity and pg_stats are readable | **Broader than publishing-status-only** |
| Sensitive raw catalogs | pg_authid, pg_user_mapping, pg_subscription, pg_largeobject, pg_statistic and pg_statistic_ext_data are not table-readable | Pass |
| RLS | CalendarPost RLS disabled, FORCE disabled, zero policies; role is not owner and has no BYPASSRLS | Column ACLs provide isolation; no tenant/row filtering |

Approved columns: `id`, `platform`, `postDate`, `approvalStatus`, `isAiDraft`,
`instagramPublishStatus`, `tikTokPublishStatus`, `publishStatus`, `tikTokPublishId`,
`publishWorkerStartedAt`, `updatedAt`. These include internal IDs and TikTok's
publishing identifier, in addition to statuses/timestamps. They are readable across
all CalendarPost rows; the due-post predicate is a diagnostic code restriction,
not a database-enforced row restriction. The fixed diagnostic returns none of
these production values to the caller.

### PUBLIC and function implications

NOINHERIT does not exclude PUBLIC privileges. PostgreSQL privileges are additive:
revoking a grant from this role does not negate a PUBLIC grant. Changing PUBLIC
would affect other database users and requires a separate impact assessment;
no such changes were made.

`default_transaction_read_only=on` is a session default, not an immutable role
restriction. A credential holder can request a read-write transaction. The
lo_create/lo_from_bytea capability allows creation of new persistent large objects
without application-table write grants. Existing customer tables remain protected,
but the broader claim that this account cannot modify production data is unsafe.
Advisory locks can contend with application locks; pg_notify can send arbitrary
notifications. Neither is used by the fixed diagnostic.

Some catalog functions are executable but have additional checks inside their
implementation. EXECUTE alone does not confer replication, server-file access,
or permission to terminate another role's sessions. The role has none of the
corresponding privileged attributes or memberships. We did not invoke these
functions to test their side effects on production.

Cross-database CONNECT is an additional exposure: grants, RLS and objects inside
those databases were not audited. The configured URL pins postgres, but a person
holding an unrestricted PostgreSQL credential could choose a different database.

### Statistics and catalog implications

The earlier review listed extensions.pg_stat_statements and
extensions.pg_stat_statements_info as inherited readable views. The final check
corrects that interpretation: their table ACLs grant SELECT, but this role has
**no extensions schema USAGE**, so it cannot resolve/query those views directly
in a fresh session. It cannot SET ROLE into a role with that access.

Standard pg_catalog statistics functions/views remain accessible. PostgreSQL
restricts other users' query text and sensitive activity fields without
pg_read_all_stats; pg_stats applies source-column access checks. Aggregate
statistics, object names, role memberships and some backend metadata remain
visible. These are outside a literal publishing-status-only scope.

pg_proc is readable even for routines in inaccessible schemas. The audit found
46 SQL/PLpgSQL routine definitions in auth (4), extensions (6), graphql_public (1),
pgbouncer (1), realtime (15), storage (17) and vault (2). Bodies were not retrieved
or claimed to be secret-free. Schema USAGE denial protects invocation, not catalog
source visibility. This prevents an absolute certification that arbitrary database
credentials can reveal no sensitive information through routine definitions.

## Official Supabase CA and strict TLS verification

Supabase's official documentation directs clients to the Database Settings SSL
certificate download and recommends full CA/hostname verification:
https://supabase.com/docs/guides/platform/ssl-enforcement

The official dashboard source resolves its production certificate from:
https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Settings/Database/SSLConfiguration.tsx
https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json

The exact HTTPS URL used by that official source was downloaded, with normal
HTTPS verification enabled:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Local public certificate: `scripts/diagnostics/prod-ca-2021.crt`.

- Subject/issuer: Supabase Root 2021 CA, Supabase Inc.
- Validity: 28 April 2021 10:56:53 UTC to 26 April 2031 10:56:53 UTC.
- SHA-256: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.
- The packager pins that identity and rejects certificates outside their validity.

A PostgreSQL SSLRequest followed by Node TLS negotiation against
`aws-0-eu-central-1.pooler.supabase.com:6543` succeeded with TLS 1.3,
`rejectUnauthorized: true`, this explicit CA, and hostname verification/SNI set to
the original host. Peer subject: `*.pooler.supabase.com`; issuer: Supabase
Intermediate 2021 CA. No PostgreSQL startup/authentication payload or SQL was sent.
Evidence: `/tmp/showwork-ca-verification.json`.

This validates CA/host negotiation. It does not claim that a Prisma production
connection was tested; that remains behind the approval gate. No TLS bypass was used.

## Prepared connection configuration — inactive template

```text
DIAGNOSTIC_ROLE_NAME=sw_diag_ro_20261011_0a5570fb
DIAGNOSTIC_DB_HOST=aws-0-eu-central-1.pooler.supabase.com
# DIAGNOSTIC_DATABASE_URL is supplied through the protected runtime secret store.
# Never paste a connection string into this document or repository.
DIAGNOSTIC_TOKEN=<fresh-256-bit-bearer-token>
DIAGNOSTIC_EXPIRES_AT=<approved-start-plus-at-most-two-hours>
```

No secret-bearing connection URL exists. The project reference and absolute CA
runtime path must be resolved and checked during an approved provisioning step.
Prisma's strict certificate settings must remain enabled. Expiry would be refreshed
only for an approved window; the existing NOLOGIN role currently expires on
12 October 2026 at 09:56:05.635 UTC.

The fixed authenticated diagnostic still permits only SELECT/EXPLAIN ANALYZE SELECT,
rejects unknown inputs, uses READ ONLY transactions and synthetic dispatch, and
includes no publishing worker. Those code safeguards do not remove capabilities
of a leaked raw database credential. The bundle was packaged locally only.

## Safe next step and review gate

Do not activate this direct production role under the current strict requirement.
Prefer a database-side SQL allowlisting gateway that exposes only the fixed timing
queries, enforces read-only sessions, blocks all other databases/catalogs/functions,
and keeps the raw credential out of the diagnostic project. Its added latency must
be measured/reported because it changes the measurement path. An isolated read-only
replica is another option, but it cannot establish production-primary write latency.

Removing PUBLIC capabilities in production would require explicit, broader approval
and a compatibility audit of Supabase and existing application/service roles. It is
not authorized by this diagnostic task, and no production-wide revoke is proposed
as an immediate action.

The final configuration needs further isolation design before activation approval
can safely be requested. Following any later approved tests, disable LOGIN/clear
the password, terminate only diagnostic sessions, revoke/drop the role, delete the
temporary Netlify project, and verify both removals. No project currently holds
production diagnostic credentials.

## Validation and files changed in this audit phase

- Eleven diagnostic/scheduler unit tests passed; no production database used by tests.
- Public CA identity/validity check and credential-free strict TLS handshake passed.
- Dedicated package built locally with the verified CA; archive inventory reviewed
  for schedules, workers, instrumentation and secrets.
- Files: this report, `docs/publishing-diagnostic-security-review.md`,
  `scripts/diagnostics/prod-ca-2021.crt`,
  `scripts/diagnostics/package-readonly-diagnostic.mjs`.
- No publishing scheduler or production deployment configuration changed this phase.

PostgreSQL references:
https://www.postgresql.org/docs/17/ddl-priv.html
https://www.postgresql.org/docs/17/runtime-config-client.html
https://www.postgresql.org/docs/17/lo-interfaces.html
https://www.postgresql.org/docs/17/monitoring-stats.html
