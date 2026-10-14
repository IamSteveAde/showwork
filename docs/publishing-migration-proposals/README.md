# Production review inputs — NOT a runnable migration

No SQL here has been applied to production. Source checksums and ordered dependencies are in manifest.json. The first eight files are the accepted synthetic schema proposals; the ninth is a role proposal with its own transaction. They must not be concatenated and blindly run against Showwork.

After separate approval, capture the read-only production-preflight.sql output using a migration-review role. Do not log connection credentials. Compare existing Publishing tables, enums, indexes, triggers, RLS, grants and application schema against these proposals. In particular, PublishingJob may already exist: preserve original rows and publication references; review explicit ALTER/data conversion and quarantine uncertain records. No CREATE IF NOT EXISTS workaround can establish compatibility. The current local PostgreSQL test baseline is not proof of the deployed schema.

Produce one reviewed transaction for schema changes, explicit constraints/backfill and version marker. Keep ownership DRAINING/disabled, integration LEGACY until verified sender-stop evidence, and all new scheduled records ineligible to send until current policy/account/content verification. Deferred audit constraints require a single physical top-level transaction, READ COMMITTED, no savepoints and no statement-pooling split. Role/grant installation is separately reviewed; runtime roles must not own tables/bypass RLS. Worker projection grants now include the exact published references and timestamps it writes.

Rehearse on a sanitized clone before production approval. Roll back an uncommitted transaction as a unit. If COMMIT acknowledgement is lost, inspect the version marker/schema instead of replaying. After any canonical external attempt, never apply destructive down migrations or restore an old snapshot as send authority. Preserve journal/media/attempt history, drain admission and reconcile read-only.

An exact production migration command cannot responsibly be issued until the approved schema baseline and reviewed migration file exist. This is a genuine external-information dependency, not permission to inspect production now.
