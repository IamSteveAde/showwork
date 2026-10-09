# Workspace team access

Ownership is the existing `SocialCalendar.managerId` relationship. Owner is not an assignable teammate role. Only an owner can appoint, change, or remove a Manager. Managers can manage other teammate roles when they have the People permission.

## Roles

- **Owner**: all workspace features, billing, ownership, destructive reset/delete, and encrypted X key access.
- **Manager**: workspace operations, people, channel connections, and business knowledge. Billing, deletion/reset, ownership, and encrypted X keys remain owner-only.
- **Social Media Manager**: calendar planning, creative assets, client content delivery, publishing, analytics, and AI content generation. Inbox and Leads can be enabled explicitly. Cannot upload business documents or administer teammates.
- **Creative Contributor**: view planned content and upload creative assets. Cannot change planned posts, delete attached assets, publish, read messages, or manage teammates.
- **Inbox Agent**: read and reply to supported message conversations, including AI reply drafting. No calendar, analytics, leads, documents, or team administration. Encrypted X chats remain owner-only.
- **Viewer**: read-only access to selected areas.

Feature selections can restrict a role, never extend its permission ceiling. Managers cannot grant a feature they do not hold; broader grants and changes to other Managers require the owner. Granting an action also requires the related view access. Role defaults are inherited unless custom access is enabled. All write routes recheck server-side permissions; hidden navigation is not the authorization boundary.

## Existing memberships

Existing `VIEW_ONLY`, `ADD_CONTENT`, and `EDIT_CALENDAR` rows remain valid and map to Viewer, Creative Contributor, and Social Media Manager respectively. Existing editors are not silently promoted to Manager. Only an explicitly assigned Manager or the owner can add, delete, or replace business knowledge documents and websites.

Creator includes Creative Contributor and Viewer invitations. Manager, Social Media Manager, Inbox Agent, and custom feature assignments require the existing advanced-team-permissions entitlement (Studio/Agency or eligible trial/grant). Membership slots continue to be account-wide and count each workspace membership separately. Active pending invitations reserve one slot; expired/cancelled invitations do not. Accepting an invitation consumes its reserved slot rather than reserving a second one.

## Invitation lifecycle

- Email and role/permission inputs are validated; owners, self invitations, and existing teammates are rejected.
- Resending replaces a pending invitation's hashed token and renews its seven-day expiry; old email links stop working.
- Delivery is tracked as queued/sent/failed. Provider acceptance is described as “email sent,” not guaranteed delivery.
- Team changes serialize on the workspace owner's database row. Membership authorization, quotas, invite state, and delegated manager authority are rechecked inside the transaction.
- Acceptance is bound to the invited email and is idempotent for an already accepted member.
- Cancelling an accepted invitation returns a conflict; actual member removal is required to revoke accepted access.
- Owners and authorized managers can remove members and cancel invitations after billing expiry.
- Invitations, acceptance, role/feature changes, cancellations, and removals produce durable team activity records, with paginated history.

The schema migration is `20261009100000_workspace_team_permissions`. Client-invitation pages display actual roles and feature access before acceptance. Wrong-account users can switch accounts without losing their invitation link.
