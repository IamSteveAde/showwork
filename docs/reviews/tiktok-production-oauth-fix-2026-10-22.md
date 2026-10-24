# TikTok production OAuth scope fix — 22 October 2026

Implemented locally; not deployed. No end-to-end production connection or publishing test has succeeded during this task.

## Cause and correction

`lib/tiktok.ts` constructed every authorization request with `user.info.basic,user.info.stats,video.list,video.publish`. The owner confirms that the Live app has not yet received approval for the two analytics scopes. The request now contains exactly:

```text
user.info.basic,video.publish
```

`video.upload` is intentionally not requested: the requested Showwork flow uses Direct Post (`video.publish`), not draft upload. The pending analytics permissions are not requested in any environment by this scope constant. Reintroduce them only after the relevant TikTok app version is approved and the OAuth change is reviewed.

Production authorization and both token-exchange callback paths now use exactly:

```text
https://useshowwork.com/api/calendars/tiktok/callback
```

This no longer changes when `NEXT_PUBLIC_APP_URL` uses the www hostname. Development keeps the existing configured development origin. Production OAuth testing must start on the hosted application; a preview/local login cannot transfer browser state cookies to the production host. Any hosting-level redirects must preserve the callback query and allow browser state/session cookies to reach the callback handler.

## Files changed for this task

| File | Change |
| --- | --- |
| `lib/tiktok.ts` | Restrict requested scopes to basic profile and Direct Post. |
| `lib/tiktokOAuthConfig.ts` | New shared exact production callback resolver. |
| `app/api/calendars/[id]/tiktok/connect/route.ts` | Use shared redirect URI while retaining signed state and PKCE. |
| `app/api/calendars/tiktok/callback/route.ts` | Use the same URI for code exchange; retain permission validation, account storage and schedule/consent safeguards. |
| `lib/publishing/showworkOAuth.ts` | Use the same URI for the canonical TikTok token exchange. Existing Instagram edits in this file predate this task. |
| `lib/reporting/adapters/tiktok.ts` | Check each analytics grant independently; skip unavailable API calls and return an analytics notice plus unavailable values. Keep existing supported analytics and video metrics. |
| `tests/tiktok-production-oauth.test.cjs` | Verify exact scopes/callback, server credential usage, PKCE exchange, callback persistence, schedule safeguards, missing-scope behavior and retained analytics. |

Earlier Instagram changes were already present in the working tree and were not altered as part of this TikTok fix. No TikTok messaging or other social integration changes were made.

## Credentials and deployment

- The code reads `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` on the server. The secret is sent only to TikTok's token endpoint, not in the browser authorization URL. There is no automatic Sandbox credential fallback in this flow.
- Both variables are populated locally; no public TikTok credential variable was detected. This does not prove those credentials are the Live app's credentials or establish Vercel's current values.
- Before deploying, confirm the **Production** environment in Vercel supplies the Live TikTok app's client key and matching client secret under those existing names. Do not send credentials in chat or put them in `NEXT_PUBLIC_*` variables.
- No new environment variables or database migration are required. Do not change the global application URL solely for TikTok.
- Deploy/redeploy the intended production build. An environment update alone does not remove the old hardcoded analytics scopes from an already-deployed build.
- Restart authorization from Showwork after deployment; an old TikTok authorization URL retains the old scopes.

## Validation

134 tests passed across the new production OAuth tests, TikTok compliance suite and social integration suite. These cover callback/token exchange with mocked provider responses, state/PKCE, connection storage, token rotation, publishing consent, scheduled publishing and status reconciliation. TypeScript checking also passed.

Publishing code still requires `video.publish`; analytics permissions are not a scheduled-publishing prerequisite. Missing analytics grants return notices instead of an exception, so a publishing-only grant is not treated as a connection failure by analytics.

These tests are not live TikTok verification. Remaining production acceptance test:

1. Sign into hosted Showwork as a regular user and start Connect TikTok.
2. Confirm the outgoing request has only the two approved scopes and the exact approved callback.
3. Complete authorization; verify return to the correct workspace and successful connection.
4. Verify analytics reports unavailable permissions gracefully rather than asking the user to repeatedly disconnect/reconnect.
5. With the account owner's explicit publishing consent, authorize a test post's content/privacy/settings, schedule it, and verify provider completion plus appearance on TikTok.

Do not claim production publishing works until step 5 succeeds. This task did not publish any content.

## Official references

- TikTok scopes and user authorization: https://developers.tiktok.com/docs/en/scopes-overview
- Scope definitions (`video.publish` versus `video.upload`, analytics scopes): https://developers.tiktok.com/docs/en/tiktok-api-scopes
- Token exchange and redirect matching: https://developers.tiktok.com/docs/en/oauth-user-access-token-management
