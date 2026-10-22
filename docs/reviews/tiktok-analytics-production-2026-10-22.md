# TikTok production analytics repair — 2026-10-22

## Findings

The OAuth request still intentionally contained only user.info.basic and video.publish, from the period when analytics permissions were awaiting approval. New connections therefore still lacked analytics even after app-level approval. Actual grants are stored from the token response by both the regular and canonical OAuth callbacks and by token refresh; they are not inferred from the requested scopes.

The existing reporting adapter already uses real TikTok v2 user/info, video/list and video/query APIs. It checks each granted analytics scope independently, pages public videos, batches video queries in groups of 20, and keeps unavailable counters null. No mock provider values were introduced. Reporting synchronization stores snapshots and videos under socialConnectionId, and the report loads connections by workspace and selected platform. The dashboard correctly falls back to lifetime counters of videos published in the selected period rather than inventing daily account views.

## Changes

- lib/tiktok.ts: request user.info.basic,user.info.stats,video.list,video.publish. Preserve Direct Post, PKCE and the exact production callback https://useshowwork.com/api/calendars/tiktok/callback.
- lib/reporting/adapters/tiktok.ts: bound requests to 20 seconds; actionable missing-permission, expired-token and rate-limit failures; reject incomplete response envelopes; explain reconnecting and the 200-video/366-day discovery limit when reached.
- components/calendars/TikTokConnectionCard.tsx: reconnect without disconnecting first, with actual analytics grant status and sync instructions.
- app/api/calendars/[id]/tiktok/analytics-access/route.ts: authenticated, channels.manage-protected workspace-scoped grant status. Does not expose credentials.
- scripts/audit-tiktok-analytics.cjs: read-only diagnostic using the real reporting adapter, with sanitized counters and permission output.
- tests/tiktok-production-oauth.test.cjs: updated OAuth expectation; account/video mapping, cursor pagination, errors, safe permission status, and dashboard comparison coverage.

Publishing callbacks, token exchange, token refresh, post consent and scheduled publishing were preserved. Partial analytics consent does not disconnect a publishing-capable account. Other integrations were not changed.

## Validation and live result

TypeScript passed. 44 selected OAuth, analytics, dashboard-comparison and TikTok compliance tests passed with synthetic provider responses. These tests do not prove live publishing or analytics success.

The user reconnected Stephen Adediran in the Showwork workspace on useshowwork.com. A subsequent credential-safe database check showed an unexpired connected token with only user.info.basic and video.publish. user.info.stats and video.list were absent. Consequently a successful live analytics fetch and browser end-to-end test could not be completed; the test stopped before making unauthorized analytics requests.

## Deployment and completion

No environment-variable or database migration is needed. Deploy this code to the website using the intended development/vps-publishing branch workflow, then reconnect the same TikTok account and grant profile statistics plus public-video access. Do not disconnect first. Select TikTok in Analytics & Reporting and Sync data; inspect followers and video views/likes/comments/shares. TikTok's public-video API does not provide saves or historical daily account activity; those must remain unavailable.

Run `node scripts/audit-tiktok-analytics.cjs WORKSPACE_ID` after reconnecting to verify real account statistics and up to three video-query results without publishing anything. No deployment or live publication was performed during this task.

Official references:
- https://developers.tiktok.com/docs/en/tiktok-api-scopes
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-query
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object
