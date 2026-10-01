# Social integration audit — 2026-10-01

This is a source review and isolated automated test result, not live certification. No posts or messages were sent to real accounts during the audit. Connected tokens, provider approvals, webhook delivery and deployed jobs could not be verified because the database was unreachable in this environment.

| Platform | Messaging and DM lead capture | AI replies | Analytics | Publishing |
| --- | --- | --- | --- | --- |
| Instagram | Implemented for the connected professional account; requires messaging permission and Meta webhook delivery | Implemented, opt-in, for new text messages | Adapter implemented | Image, video and carousel flows implemented |
| Facebook | Implemented for connected Pages; requires pages_messaging and webhook subscription | Implemented, opt-in, for new text messages | Adapter implemented; some Page Insights require platform eligibility | Text, link, photos, video and Reel flows implemented |
| X | REST DM sync plus browser encrypted-chat transport; direct conversations only, history limited to connection date | Implemented for eligible new REST DMs; encrypted browser chats excluded | Adapter implemented; counters depend on granted access | Text and media flows implemented |
| LinkedIn | Partner approval pending; production messaging adapter remains null | Inbound ingestion currently disables automatic replies | Member and Page adapters implemented; requires approved scopes | Member and Page text/image/video flows implemented |
| TikTok | Native Business Messaging OAuth, signed webhook ingestion, historical import and manual replies implemented; separate approved Business app configuration required | Opt-in for fresh inbound text; live activation still unverified | Follower and video metrics implemented | Photo/video Direct Post implemented; public visibility requires audit and media URLs require verified ownership |

## Fixes verified in this audit

- Meta ingestion now uses the shared transaction: message deduplication, unread counts and CRM lead writes commit together; old deliveries do not overwrite newer previews.
- Orphan outbound Meta echoes do not create conversations or leads. Media-only notifications are excluded from AI eligibility.
- Meta sends require a confirmed message ID; subscriptions require explicit success. Expired/disconnected accounts cannot send, and sends have a timeout.
- AI sends include provider conversation identity. A send attempt with uncertain delivery or failed persistence is handed to a human instead of automatically resent.
- Instagram's connection and publishing helpers use the configured Meta API version.
- LinkedIn analytics authorization and missing-statistic fixes are recorded in linkedin-readiness.md.

## Validation and remaining live checks

93 isolated integration tests passed, including publishing validation, lease protection, error handling, lead deduplication, X history and encryption behavior, LinkedIn permissions and adapters, TikTok metric semantics, and the newly added Meta and AI regressions. These mocks validate application behavior; they cannot prove provider acceptance or production job execution.

Local provider app credential variables, the OpenAI key variable, Meta verification token and cron secret are present. This does not establish validity. Local URL and DEPLOY_URL variables are absent, so Netlify background dispatch cannot run locally; verify these injected variables and scheduled functions on the deployed site.

Restore database access, then verify token identity/expiry/scopes and per-workspace AI settings. Test inbound webhook delivery, one lead for duplicate events, one confirmed AI response, native analytics agreement, and publishing with agreed test content on every supported platform. LinkedIn messaging needs its approved specification and implementation; TikTok Business Messaging now has a native adapter and requires the migration, separate approved app credentials and business authorization described in [tiktok-messaging.md](./tiktok-messaging.md).
