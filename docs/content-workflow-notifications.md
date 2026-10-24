# Content workflow and internal review notifications

The content modal now includes a navigable Create → Internal review → Client
review → Publishing → Live tracker. The current stage is derived from saved
internal/client approvals and real publishing state, not from the selected tab.
Calendar tiles and social feed previews use the same labels. Internal approval
must happen before “Awaiting client review”; client approval alone does not mean
that a post is scheduled. Publishing errors remain actionable.

Creative contributors (including the legacy Add Content role) can share private
internal feedback without approving a post. Approval, request changes and reopen
still require delivery management permission. Feedback keeps the current approval
state and increments the optimistic review version. Existing client visibility
and publishing gates remain intact. This is the latest internal note, not a new
threaded discussion or review-history feature.

After the review transaction commits, email is sent separately to the active owner
and active workspace members whose effective permissions include content editing,
creative upload, internal delivery, publishing or workspace management. This covers
managers, social media managers and designers using Creative Contributor, including
legacy role mappings. Custom restrictions are respected. Clients, pending invites,
inbox-only agents and read-only viewers are not recipients. Email addresses are
deduplicated; recipients do not see each other's addresses.

Feedback is HTML-escaped. Each email links to the exact post in the authenticated
content view. Existing Resend configuration is reused; the canonical host passes
its existing explicit notification transport. No new environment variables or
migration are introduced by this update. The earlier internal-review migration
must already be installed.

Delivery attempts happen after commit, with up to three attempts per recipient and
a stable provider idempotency key for each post/version/recipient. The API and UI
report partial failures without rolling back a saved review. These are bounded
request-time retries, not a durable email outbox: process termination or a prolonged
mail outage can still prevent delivery. Provider acceptance is not proof of inbox
delivery. No live emails were sent during automated verification.

Tests cover stage mapping, recipient permissions/deduplication, private-note escaping,
stable email keys, transient retries, failure reporting, designer feedback versus
reviewer approval, notification-after-commit and the existing PostgreSQL review gates.
Browser checks use sample data and mocked review/email responses only.

Verification: 18 targeted tests passed, including isolated PostgreSQL migration/gate
checks. Browser tests passed at 1440px, 390px and 320px, covering horizontal overflow,
reachable feedback actions, preserving the pending stage on feedback, advancing to
client review on approval, and displaying notification results. Temporary preview
files were removed and the isolated preview server was stopped.
