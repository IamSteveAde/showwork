# Calendar internal review

Posts now have separate Content, Internal review, Client review and Publishing views.
Owners and team members with `internal_review.manage` may internally approve, request changes
(with a required private note), or return an unapproved-by-client post to internal review.
Internal approval does not grant client approval, enable auto-publishing, or bypass platform consent.

## Visibility and edits

The client portal only loads confirmed posts with internal approval. Direct client review
and video-comment routes enforce the same rule; client reporting excludes unapproved
calendar-linked posts. Internal notes and reviewer identity are stripped from client review responses.

Post text, platform, schedule, draft state, assets and custom-field changes invalidate internal
approval in database triggers, including writes from legacy and canonical workers. Fresh
client review is required after content changes. Review versions prevent stale internal
decisions; the canonical action also journals idempotent requests. Client-approved content
remains locked. Imported source statuses remain available as source metadata but do not
count as internal or client approval.

This release adds the approval gate and private review note, not general comment threads,
assignments, due dates or a new notification delivery system. Existing client resubmission
notifications require internal approval.

## Deployment — required before using the new application

Migration: `prisma/migrations/20261024090000_calendar_internal_review/migration.sql`.
The migration was tested in an isolated PostgreSQL engine; it has NOT been applied to the
workspace database, production, or VPS.

Coordinate the rollout across web and worker deployments. Back up the database and inspect
pending migrations, then apply reviewed migrations using the normal `prisma migrate deploy`
process. Do not use `db push`: the SQL triggers are part of the approval boundary. Regenerate
the Prisma client and rebuild/restart every process using this schema before enabling the
new UI. Apply and test in staging first, including the canonical publishing configuration.

Existing client-approved, scheduled, publishing and published non-AI-draft posts retain
eligibility. Existing unapproved posts become internal-only. Previously shared asset URLs
cannot be revoked by hiding posts; this gate stops future portal/API discovery, not access
to public URLs already received by a client.

After rollout, verify a new post is absent in a separately authenticated client session,
approve it internally, then confirm it appears. Edit it before client approval and confirm
it disappears again. Test client approval with auto-publish both on and off and retain all
platform-specific consent requirements. Never use a real publish to validate UI alone.

## Validation

`node --test tests/calendar-internal-review.test.cjs tests/publishing-canonical-worker.test.cjs`

The database test runs when `SHOWWORK_REVIEW_PGLITE_PATH` points to a locally installed
`@electric-sql/pglite` package. It uses a fresh in-memory database, not application credentials.
It covers migration backfill, hidden new posts, approval and scheduling rejection, edits and
media invalidation, locked approved content, canonical internal decisions, idempotent replay,
stale decisions, cross-workspace access and permission rejection. UI checks use temporary
sample posts and mocked requests at 320, 390 and 1440 pixels.

### Internal review access

Feedback, approval, requesting changes, and reopening all require `internal_review.manage`. Owners always retain it. Managers receive it by default; custom manager permissions can remove it. Other non-viewer roles must receive it explicitly through invitation or Edit access. Viewer roles cannot receive it. Calendar viewing is required and selected automatically. Existing custom permission lists remain unchanged; grant the new permission explicitly where needed. No database migration is required.
