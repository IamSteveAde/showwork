# Facebook / Instagram account discovery repair

## Finding and limits

The supplied production response establishes that `/me/accounts` returned no Pages,
although `/me/permissions` reported discovery scopes granted. It does not establish
why Meta omitted the selected Page. A scope grant is not evidence of Page-specific
access. No live User token or fresh production OAuth session was available in this
workspace; the exact external cause and the supplied Page's direct API response
remain unverified. Do not describe this as a verified production fix yet.

Confirmed implementation gaps were: no token debugging/identity validation before
Page discovery; exclusive dependence on `/me/accounts`; Facebook discovery ignoring
pagination; and Instagram relationship lookup errors being swallowed as absent
relationships. The application uses the newly exchanged long-lived User token for
Page discovery in both paths; no evidence was found of a Page-token substitution at
that step. Stored publishing credentials remain Page tokens.

## Implemented behavior

- Validate `/debug_token` using the corresponding app credentials. Require valid
  USER type, matching app ID, user identity, non-expired token/data access, and
  required discovery scopes. Instagram Insights is deliberately not required.
- Enumerate all `/me/accounts` pages using cursors without following arbitrary URLs.
- Supplement the list using Page IDs returned in Meta's granted Page-scoped
  `granular_scopes.target_ids`. Respect explicit `pages_show_list` exclusions;
  never interpret Instagram grant IDs as Page IDs. No known test IDs are hardcoded.
- For missing candidates, request `/{page-id}?fields=id,name,access_token` with the
  current User token. Require matching ID and a returned Page token. Public Page
  metadata or a target ID alone does not authorize connection.
- Read `instagram_business_account{id,username}` using the Page token. API errors
  remain errors; a successful response with no relationship is a distinct result.
- Preserve workspace permissions, signed state, origin checks, encrypted selection
  sessions, canonical operation/version handling, and existing publishing flows.
- Attempt existing messaging subscriptions when direct Page lookup omits task data;
  Meta enforces access. An explicit task list missing MESSAGING still produces the
  existing messaging warning. Connection remains possible if messaging is denied.

Both Instagram list callers (legacy picker and canonical callback) use the shared
helper. Facebook's existing list service uses it too, with Facebook credentials
and without requesting Instagram fields. No separate OAuth implementation or
business-management scope has been added. Listing every business-owned/client Page
would require a separate permission model and is not a justified automatic fallback.

Meta documents the primary and direct Page-token requests here:
https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
Token debug reference:
https://developers.facebook.com/docs/graph-api/reference/debug_token/

## Files

- `lib/metaPageDiscovery.ts`: shared validated, paginated discovery and authorized fallback.
- `lib/instagram.ts`: use shared discovery; stop swallowing account lookup failures.
- `lib/channelOAuth.ts`: use shared Facebook discovery with its own app credentials.
- `lib/instagramConnection.ts`: distinguish unknown tasks from explicit messaging denial.
- `lib/publishing/showworkOAuth.ts`: canonical picker grant indicator, meaningful account
  names and distinct no-Page/no-relationship errors; default services use shared discovery.
- `app/api/calendars/[id]/instagram/select-account/route.ts`: safe actionable errors,
  remove raw provider-error logging.
- `app/api/calendars/instagram/callback/route.ts`: safe canonical discovery errors.
- `app/dashboard/calendars/[id]/instagram/select-account/page.tsx`: explain empty Page
  list separately from missing Instagram relationship.
- `tests/meta-page-discovery.test.cjs`: token validation, paging, direct fallback,
  exclusions, no Pages, no relationship, provider failures, and Facebook behavior.
- `tests/meta-canonical-oauth.test.cjs`: real discovery helper inside canonical callback,
  mocked Meta HTTP, fresh connection and reconnect using Page tokens without Insights.
- `tests/instagram-review-oauth.test.cjs`: repair stale permissions mock; verify known,
  unknown and explicitly denied messaging tasks alongside existing picker safeguards.

## Deployment and live acceptance

No new environment variables or database migrations are required by this change.
Keep `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` for Instagram's Facebook Login app,
and `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` for the Facebook flow. Each token must
belong to its corresponding configured app. Keep the existing approved callback URI
and `META_GRAPH_API_VERSION` (default v26.0). Do not enable Insights globally until
its required access has actually been approved.

Deploy the web application to the production Vercel environment serving
useshowwork.com, then start a fresh Connect Instagram authorization. Existing
connections are not deleted or migrated. No VPS action was performed for this task.

For controlled verification of Thestephenadediran (Page 108238759045067):
1. Sign into the correct Showwork workspace and restart Connect Instagram.
2. Use the Facebook profile with assigned access to that Page. Select the Page and
   linked professional Instagram account in Meta's permission/asset dialog.
3. Verify the account appears and can be selected/connected; reconnect again and
   confirm it updates the same destination. Do not publish merely to test discovery.
4. If Meta still returns zero Pages and no corresponding Page-scoped grants, inspect
   the profile's Page access and its People/asset assignments in the owning Business
   Portfolio. Portfolio membership alone is not proof of an effective API Page grant.
   Have the asset administrator verify the assignment, then reauthorize both assets.
5. If direct lookup is refused or returns no Page token, verify the app's access level
   and the profile's assigned Page tasks. If lookup succeeds but the relationship is
   absent, inspect that specific Facebook Page's linked Instagram professional account.
6. An operator may inspect `/debug_token`, `/me/accounts` and the known Page directly
   using the *fresh session User token* server-side. Report only token type/app match,
   validity, expiry, scope/granular grant IDs and Page/relationship IDs. Never copy a
   token, app secret, full request URL, or raw provider error into logs or messages.

A successful test must cover actual Meta authorization, discovery, selection and
saved connection. Mocked tests cannot verify production assignments or app approval.

## Verification results

- 36 tests passed, zero failed/skipped: Meta Page discovery, canonical OAuth,
  Instagram picker/security/subscriptions, Facebook reporting permissions and
  native Instagram post insights.
- Final TypeScript check (`npx tsc --noEmit --incremental false`) passed.
- `git diff --check` passed.
- Initial production build compiled and passed type validation, then failed on
  existing sitemap generation because the configured database was unreachable in
  the sandbox. A second build with network access also compiled and passed type
  validation, then failed on the same unreachable database in `/sitemap.xml`.
  The full production build therefore did NOT pass; no sitemap/schema workaround
  was introduced as part of this OAuth change.
- No live Meta authorization, direct test-Page read, account save, or publish was
  performed. No production migrations, deployment or VPS changes were performed.
