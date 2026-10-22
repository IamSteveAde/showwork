# Instagram Insights review audit — 21 October 2026

## Verdict

Code fixes are implemented locally. **Not yet verified end to end and not yet ready to claim a successful App Review demonstration.** The confirmed app-role test account, `@useshowworkofficial`, is disconnected in the inspected database and has no stored access token. A fresh authorization, successful live API reads, and a browser recording are still required. No deployment or database mutation was performed by this audit.

## Evidence and answers

| Question | Finding |
| --- | --- |
| Is `instagram_manage_insights` requested? | Previously conditional on `INSTAGRAM_REQUEST_INSIGHTS_SCOPE=true`. That flag was off in the inspected local environment. Production configuration was not available for verification. The new authenticated-creator allowlist permits app-role testing without enabling the rejected permission for everyone. |
| Did Meta grant it? | The stored grant list for this workspace/account includes `instagram_manage_insights`. The callback obtains this list from Meta `/me/permissions`, filtering for `granted`; it does not simply copy requested scopes. This is historical evidence, not a current token check. |
| Does the current token contain it? | Unverified: connection status is `DISCONNECTED` and `accessToken` is absent. No current token exists to inspect. |
| Does analytics use real API data? | Yes in implementation: Graph API profile, account Insights, media listing and media Insights; persisted snapshots and posts feed reporting. No mock data was introduced. Live execution with the review account remains blocked. |
| Are Meta App Dashboard permissions configured correctly? | Cannot establish from repository configuration or authorization-screen wording. Confirm the configured app has the intended use case/permission and app-role access. User confirms the authorizing Facebook user has an Admin, Developer or Tester role. Advanced Access remains rejected, per the user. |
| Does each account stay scoped to its workspace? | OAuth requires `channels.manage`; reporting reads connections for the calendar and writes snapshots/posts against connection IDs. The new picker also validates creator identity, workspace, authorized Page list and request origin. |
| Must existing accounts reauthorize? | Accounts missing the grant, expired/revoked tokens, and disconnected accounts need reauthorization. A historical grant alone is insufficient proof of current access. |

Local API version defaults to `v26.0`. Authentication is Facebook Login through `graph.facebook.com`, not the separate Instagram Login permission family.

## Code changes

- `lib/instagram.ts`: add server-side reviewer creator allowlist; add `auth_type=rerequest`; retain all existing publishing/messaging scopes; paginate managed Pages and fetch linked Instagram usernames. Global Insights flag remains supported for after approval.
- `app/api/calendars/[id]/instagram/connect/route.ts`: pass the authenticated creator into scope selection and use signed, browser-bound OAuth state.
- `app/api/calendars/instagram/callback/route.ts`: validate state, exchange tokens, read actual grants, then create a short-lived encrypted, HttpOnly selection session. Stop silently choosing the first Page. No token is included in browser JSON or rendered UI.
- `app/api/calendars/[id]/instagram/select-account/route.ts`: enable explicit selection in the active legacy integration. Recheck workspace permission, originating creator, session expiry, origin and authorized Page/account before connecting. Clear the selection cookie after success. Preserve the canonical execution boundary.
- `lib/instagramConnection.ts`: extract the existing connection writes and both Page/Instagram messaging subscriptions for reuse after selection. Keep the MESSAGING-task check and publishing connection behavior when messaging setup fails.
- `app/dashboard/calendars/[id]/instagram/select-account/page.tsx`: show Page/account choices, actual authorization-grant status, loading/errors and a restart link. Distinguish granted permission from successful live API verification.
- `components/calendars/InstagramConnectionCard.tsx`: allow reauthorization without first disconnecting.
- `lib/publishing/showworkOAuth.ts`: pass authenticated creator into the shared scope builder for the canonical path too.
- `lib/reporting/adapters/instagram.ts`: stop swallowing permission, expired-token, rate-limit, network and unexpected API failures; only fall back on explicitly unsupported metric errors. Reject malformed JSON; bound requests to 15 seconds; use Authorization headers instead of token-bearing URLs; redact the token if echoed in a provider error. Respect missing Insights permission for linked-post calls as well as native posts. Unsupported metrics remain unavailable, never fabricated zeros.
- `scripts/audit-instagram-insights.cjs`: credential-safe, read-only token/app validation plus sampled account/post Insights checks. Requires explicit app-role confirmation; stops on a disconnected account. Uses only the relevant connection fields.
- Tests: reviewer gating, preserved scopes, rerequest, account-picker authorization and token secrecy, selected account identity, preserved publishing credentials and dual messaging subscriptions, saves/shares, unsupported metrics, propagated Meta failures and malformed responses.

## Environment configuration

Keep this off for ordinary users until Advanced Access is approved:

```dotenv
INSTAGRAM_REQUEST_INSIGHTS_SCOPE=false
INSTAGRAM_INSIGHTS_REVIEW_CREATOR_IDS=<Showwork creator ID for the confirmed app-role test login>
```

The allowlist accepts comma-separated **Showwork creator IDs**, not Instagram handles or Facebook IDs. Only add test logins whose authorizing Facebook user has the appropriate role on this configured Meta app. This allowlist does not grant a Meta role or bypass Meta approval. The login email is needed to identify the correct local creator record; no password/token is needed.

Existing `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `JWT_SECRET` and callback URL configuration are still required. Do not replace publishing/messaging app credentials. No new database migration is introduced. No environment values were changed during this audit. Restart the local app or redeploy the intended environment after configuring the reviewer ID.

## Live verification

After connecting the confirmed account, from the repository root:

```sh
node scripts/audit-instagram-insights.cjs \
  d13b4f2b-ae03-4652-b585-b9883942e97b \
  useshowworkofficial --app-role-confirmed
```

The diagnostic checks token validity, configured app match and current Insights scope with Meta's token debugger, then makes real account reach and sampled media reach/saves/shares requests. It prints safe status/metric values, not tokens, raw provider errors, captions or credentials. Empty/unsupported results do not count as verified metrics. It does not publish, subscribe webhooks, or change stored data. API success establishes access to the requested asset; a granted scope alone does not.

## Recording checklist

1. Use the configured review environment and confirmed app-role Facebook login.
2. Start signed out of Showwork; demonstrate platform login without recording credentials.
3. Open the review workspace's Channels, then Connect Instagram (or Reauthorize Instagram).
4. Complete Meta login/consent and authorize the appropriate Facebook Page and linked professional account. Do not infer missing permission from summary wording.
5. Return to the Showwork account picker. Show Page/account identity and the grant status. Choose `@useshowworkofficial` and connect.
6. Open Analytics & Reporting, filter Instagram and choose the date range. Run Sync data and wait for completion. Show the connected account and successful last-sync status.
7. Show actual account metrics and individual post metrics, including saves/shares where Meta supports them. Explain unavailable metrics rather than describing them as zero. Existing Instagram rolling totals and post lifetime counters must be described according to their UI labels.
8. Capture the resulting analytics in the same recording as authorization. Match the written permission use case to these exact screens. Hide passwords, tokens, developer-console requests and unrelated inbox/customer data.

## Validation and limitations

- TypeScript check passes (`npx tsc --noEmit --incremental false`).
- Combined Instagram, Meta messaging, social integration, reporting comparison and channel status suite: 134 passing tests; the additional extracted connection-preservation test also passes.
- Existing publishing and messaging scopes are retained; regression tests pass. This is not a claim of a live publishing/messaging smoke test.
- Full browser OAuth round trip, current token verification, account/post Insights responses and production configuration remain unverified until reconnection.
- No public production Insights access is assumed before approval.
- Meta's developer Insights documentation was inaccessible to the browsing tool during this audit. The official Meta [Instagram Facebook Login collection](https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login) identifies the professional-account API; no third-party documentation was used to assert current metric availability. Live supported metrics must be established with the authorized account.
