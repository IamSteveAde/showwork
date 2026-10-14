# Publishing deployment, cutover and rollback proposal

Production remains NO-GO. These are review instructions, not executed operations.

## Release gates

Require complete route/server-action/frontend adapters, authenticated native callback contracts, actual OAuth/billing/usage ports, immutable storage/version proofs, shared journal IAM and recovery rehearsal, reviewed tenant grants, and a production composition on **every** sender host. A guarded-but-unported path fails this gate. Validate the same application schema used by Prisma, READ COMMITTED, direct transaction connections without statement-pool transaction splitting, top-level transactions without savepoints, and transaction-ID audit triggers. Host clocks must be synchronized; short witnesses still expire conservatively. Prepare an application backup and encrypted evidence archive; test restoration with synthetic data first.

## Proposed database installation

Use a separate migration-owner role. Snapshot existing schemas, indexes, grants, enum definitions and legacy job constraints before preparing a migration. Proposed order is schema.sql → ownership-schema.sql → intent-actions-schema.sql → canonical-schema.sql → eligibility-schema.sql → authorization-schema.sql → provider-schema.sql → integration-schema.sql. These files are local proposals, not idempotent migrations. Check existing Publishing tables first; do not blindly replay CREATE TABLE or IF NOT EXISTS past an incompatible existing table. The initial ownership row is DRAINING/epoch 0/disabled. Migration installation must never enable it. Review production-grants.proposal.sql separately; runtime role must not own tables or bypass RLS, and browser roles must not access credentials or publishing evidence. Application mutation grants and tenant policy remain explicit release gates.

Install all proposals in one migration transaction only after measuring lock/DDL duration on a sanitized database copy. Deferred constraints and xmin checks require the same physical top-level transaction. A failed pre-commit migration rolls back as a unit. A lost migration acknowledgement requires schema/version inspection, not automatic replay. Do not execute down migrations after any canonical attempt; preserve all evidence.

## Storage and deployment preparation

Provision a private journal prefix shared by Next/Netlify/VPS with conditional create support, strong read-after-write, encryption, restricted list/read, no normal overwrite/delete, and backups. Verify storage service semantics using disposable objects under separate approval. Filesystem journaling requires durable mounted storage and filesystem fsync semantics; it is not shared Netlify storage. Media sources require real version IDs plus independently computed SHA-256. Unversioned R2 objects currently fail closed; immutable-key/ETag alternatives need a verified adapter before release. Pinned copies must deny overwrite and deletion while attempts remain unresolved. Presigned URLs must last through provider pull/processing without exposing credentials in audit logs.

Deploy binaries/configuration with publishingEnabled=false. Validate configuration offline before loading credentials, constructing pools or starting timers. Readiness is not authority. Require Node 22, platform-compatible media binaries, bounded pools, account mutexes, durable rate reservations and private credentials. Monitor pending/unknown age, journal write failures, acknowledgement loss, stale epochs, reconciliation lag, provider rate responses, holds, account invalidation and pool pressure. Logs must omit access/refresh tokens, raw callback bodies and signed media URLs.

## Cutover sequence

1. Obtain separate production deployment/migration/cutover approval after release gates pass. Deploy compatible inactive adapters to every Next route, server-action, Netlify cron/background and native sender. Do not assume deploying the VPS fences an older host.
2. With legacy execution still owning NETLIFY, inventory scheduled, prepared, accepted, uncertain and confirmed records. Preserve current references, original scheduler and destination. Do not use CalendarPost timestamps or status as send authority.
3. Transition NETLIFY → DRAINING with expected epoch, audited operation ID. Stop admission/wake delivery on all old senders and allow or reconcile already-authorized work. Verify real process/function quiescence and outstanding requests; elapsed time alone is not trusted no-send evidence.
4. Record trusted ALL_SENDERS stop evidence for that exact epoch. Classify legacy posts. Confirmed stay historical; ambiguous records stay quarantined. Adopt only evidence-proven never-authorized candidates with unchanged snapshot and current eligibility. No blanket conversion of SCHEDULED, FAILED or PUBLISHING to READY.
5. Keep CANONICAL protocol after activation. Only after unresolved attempts are resolved and sender evidence is current may an audited DRAINING → VPS epoch transition occur. Initial execution must use fresh admission/preparation/current eligibility/capability/invocation; never recover a send grant from receipts.
6. Under a separate activation decision, enable the approved runtime and start with low concurrency. Reconcile first, then explicitly authorized new work. Compare durable state with UI projections and known provider references. Abort admission on journal/ownership/eligibility failures.

## Rollback and recovery

Stop new admission and transition VPS → DRAINING using expected epoch. Stop and verify all VPS senders; reconcile accepted/unknown/consumed attempts read-only. Do not reset attempted jobs, clear external references or regenerate capabilities. Missing acknowledgements remain spent/uncertain. Reimport shared journal events idempotently and repair status projections only after durable evidence. If there is no reference, hold for operator/provider evidence; lookup absence is not no-send proof.

Rollback to NETLIFY requires renewed exact-epoch stop evidence and no unresolved ownership blockers. Netlify must run the canonical composition; **keep CANONICAL protocol** and never restore an old unfenced release. Rollback is ownership/application compatibility, not evidence deletion or SQL reversal. If Netlify canonical composition is unavailable, remain DRAINING/disabled. Restore application backups only with reconciliation of any attempts committed after the backup; restoring an old snapshot cannot authorize their resend.

## Retention recovery

Retain unresolved attempts, lineage, account destination/version and provider references. Policy-authorized terminal evidence purge requires a separate audited role and privacy review; no runtime DELETE grant is proposed. Before removing media, prove no unresolved provider pull/reconciliation depends on it, validate retention dates and archive evidence. Restore journal/media backups into quarantine and verify hashes before replay. No automatic restoration of held revisions or revoked consent.
