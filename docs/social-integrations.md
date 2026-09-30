# Social integrations rollout

This change targets Facebook, Instagram, TikTok, LinkedIn and X. YouTube remains planning-only.

## Implemented paths

| Channel | Publishing | Reporting | Inbox and leads |
| --- | --- | --- | --- |
| Facebook Page | Text/link, photos, multiple photos, video, Reels | Existing Page adapter | Existing Meta webhook, manual and AI replies |
| Instagram | Existing images, videos and carousels | Existing account/post adapter | Existing Meta webhook, manual and AI replies |
| TikTok | Video or photo collection, explicit account-supported visibility | Existing account/video adapter | **Not enabled: separate Business Messaging access and adapter required** |
| LinkedIn member | Text, images/multiple images, video | Member analytics after approval and reauthorization | **Not enabled: Page Messaging approval, Page OAuth and adapter required** |
| X | Text, up to four photos, or one video | Followers, native timeline and published-post counters | One-to-one DMs polled every five minutes, replies, CRM leads and opt-in AI replies |

These are implemented code paths, not a claim of live provider validation. Stories and documents are rejected explicitly rather than silently posted as another format. LinkedIn currently connects a member, not an organization Page. X accepts/rejects caption length using the account's current posting entitlement; it is not silently truncated.

## Before deployment

1. Apply `prisma/migrations/20260930120000_shared_social_publishing/migration.sql` using the normal migration deployment process (`npx prisma migrate deploy`). The migration is additive; it does not enable old approvals or publish old posts. Generate Prisma Client during installation as usual. **Do not deploy code before the migration.**
2. Deploy the Next.js application and Netlify functions together. Existing Instagram/TikTok cron entry points now use the shared dispatcher. `social-publish-cron` schedules Facebook, LinkedIn and X. `social-inbox-sync-cron` queues X polling in a background function.
3. Configure `CRON_SECRET` and the normal Netlify `URL`/`DEPLOY_URL`. API cron routes reject unauthenticated requests. `NEXT_PUBLIC_APP_URL` is only a publishing dispatcher fallback.
4. Reauthorize X with `tweet.read tweet.write users.read offline.access media.write dm.read dm.write`. Confirm the developer account has access/credits for these endpoints. Existing tokens do not gain scopes automatically. The Channels card has a Refresh permissions link.
5. Facebook needs a Page connection granting `pages_manage_posts` and `pages_read_engagement`, with the user permitted to publish to the Page. Reporting/messaging still require their existing scopes and subscriptions.
6. LinkedIn publishing uses `w_member_social`. Set `LINKEDIN_ANALYTICS_ENABLED=true` **only after** the app has `r_member_postAnalytics` access, then reauthorize the member. `LINKEDIN_API_VERSION` defaults to `202609`; update it before that version sunsets. Do not enable unapproved scopes or the entire OAuth flow can fail.
7. TikTok requires Direct Post (`video.publish`), approved reporting scopes, and a verified R2 media domain for `PULL_FROM_URL`. Public visibility requires TikTok's app audit. Privacy is an explicit user choice fetched from creator information; there is no default selection. Existing AI drafts without privacy must be configured before approval.

## Publishing lifecycle

Client approval schedules supported posts only when the channel is connected. Otherwise the manager can schedule the approved post after connecting. Past dates publish on the next cron run. Schedule/retry/cancel controls require EDIT_CALENDAR permission and an active workspace. Provider calls recheck workspace access.

Requesting revision cancels a pending schedule. A post already publishing/published cannot be reviewed again. Approved assets are locked from the normal upload, attach and delete routes. Workers claim an immutable dispatch timestamp and a single lease; duplicate background deliveries cannot republish. Ambiguous dispatch/network outcomes fail for manual reconciliation rather than automatically retrying.

Retry requires the manager to confirm the post is not already on the platform. TikTok publish IDs and Facebook video IDs are saved before polling; a retry checks the existing operation. Reporting linkage failure never changes successful publication into a retry. There is no universal exactly-once guarantee if a provider accepts a request but the response is lost; the UI requires a platform check for that reason.

## Reporting/inbox limits

- TikTok video discovery currently covers at most 200 videos within 366 days. Lifetime video totals are not daily account analytics.
- X timeline discovery covers up to 1,000 recent posts, subject to endpoint availability. Missing metrics stay unavailable. DM lookup is limited by X's retention; this importer processes up to 1,000 events per sync and surfaces a truncation notice. Group chats are excluded from person-based CRM leads.
- Historical X DM imports do not trigger AI replies. Only new text after an established successful sync, less than ten minutes old, is eligible. Existing workspace AI opt-in and instructions apply. Duplicate events do not increment unread counts or create duplicate leads.
- LinkedIn account analytics cover the last 30 days. Post-level analytics cover up to 100 Showwork-linked posts; native post discovery, organization analytics and follower counts are not implemented.
- TikTok and LinkedIn DMs cannot be enabled with the existing standard tokens. Obtain Business Messaging / Page Messaging access and the approved API contract before implementing their OAuth, webhook verification, receipt and send adapters. Their connection cards/inbox explicitly disclose the requirement. Lead-form/advertising lead imports are separate integrations and are not part of DM-to-CRM ingestion.

## X connected but inbox empty

Use **Inbox → Sync X messages** to fetch up to 50 recent events immediately, including when running locally without Netlify cron. **Refresh inbox** only reloads saved conversations. Manual recovery ignores the previous sync watermark, deduplicates stored messages and never enables AI replies. The scheduled importer checks up to 1,000 events; truncated or partial responses preserve the previous watermark and display a warning.

A connected OAuth account does not guarantee DM access. Reading requires `dm.read`, `tweet.read` and `users.read`; replies also require `dm.write`. Sync now surfaces missing scopes, rejected tokens, API access/billing failures and rate limits on the account and in the inbox. Use Channels → Refresh permissions when the error requests reauthorization. X lookup exposes a limited history window; group chats remain excluded.

The importer accepts one-to-one conversation pair IDs when `participant_ids` is absent, empty or partial, while rejecting conflicting participants. Regression coverage includes those payloads, recovery pagination, safe checkpoints and workspace authorization. Live verification still requires reachable database and X credentials.

## Verification

Run `node --test tests/social-integrations.test.cjs`, `npx tsc --noEmit --incremental false`, `npx prisma validate` and `npm run build`. Tests isolate all network and persistence access; they do not load `.env` or publish/send messages.

After migration and deployment, use dedicated connected test accounts: approve a post on each channel, check the live result and stored platform ID, verify reporting sync, then test cancellation, expired permissions and duplicate delivery. For X, send an inbound DM from a second test account, verify one conversation/lead, reply manually, and separately test opt-in AI replies. Live publishing and messaging have not been performed by this change.

## Official references

- [Meta publishing collection](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api)
- [TikTok photo Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post)
- [TikTok Business API access](https://business-api.tiktok.com/portal?id=1771100799076354)
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- [LinkedIn member analytics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics)
- [LinkedIn Page Messaging access](https://www.linkedin.com/help/learning/answer/a6246714)
- [X media upload](https://docs.x.com/x-api/media/quickstart/media-upload-chunked)
- [X DM lookup](https://docs.x.com/x-api/direct-messages/lookup/introduction)
- [X DM sending](https://docs.x.com/x-api/direct-messages/manage/introduction)

## Local verification results (2026-09-30)

- Provider/worker/inbox/approval tests pass with mocked network and database access.
- Prisma schema validation and TypeScript checking pass.
- The isolated production build compiles and passes type checking. It then fails during `/sitemap.xml` prerendering because the configured Supabase database is unreachable. Full production build completion remains unverified.
- No migration was applied and no live posts or DMs were sent.
