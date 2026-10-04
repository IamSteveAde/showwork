# Social integrations rollout

This change targets Facebook, Instagram, TikTok, LinkedIn and X. YouTube remains planning-only.

## Implemented paths

| Channel | Publishing | Reporting | Inbox and leads |
| --- | --- | --- | --- |
| Facebook Page | Text/link, photos, multiple photos, video, Reels | Existing Page adapter | Existing Meta webhook, manual and AI replies |
| Instagram | Existing images, videos and carousels | Existing account/post adapter | Existing Meta webhook, manual and AI replies |
| TikTok | Video or photo collection, explicit account-supported visibility | Existing account/video adapter | Separate Business Messaging OAuth, signed webhooks, DM lead capture, replies and opt-in AI; requires approved Business app configuration |
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

When all-events lookup returns empty despite a recent DM, enter the other person’s @username in the inbox sync field. This resolves the user and requests their one-to-one conversation directly. Targeted recovery never advances the global inbox watermark or enables AI replies. An empty targeted lookup reports the confirmed connected account and target username.

A connected OAuth account does not guarantee DM access. Reading requires `dm.read`, `tweet.read` and `users.read`; replies also require `dm.write`. Sync now surfaces missing scopes, rejected tokens, API access/billing failures and rate limits on the account and in the inbox. Use Channels → Refresh permissions when the error requests reauthorization. X lookup exposes a limited history window; group chats remain excluded.

The importer accepts one-to-one conversation pair IDs when `participant_ids` is absent, empty or partial, while rejecting conflicting participants. Regression coverage includes those payloads, recovery pagination, safe checkpoints and workspace authorization. Live verification still requires reachable database and X credentials.

## Encrypted X Chat

The workspace owner can open **Inbox sidebar → Unlock X messages**, then unlock their existing X Chat identity on-device. Existing OAuth scopes apply. The check verifies token identity and fetches an existing public-key/secure-backup record; it never creates or resets keys. The official `@xdevplatform/chat-xdk` (pinned 0.5.0) and `juicebox-sdk` run in browser WASM. Enter the existing PIN only in that browser flow, never in support chat, environment variables or API requests.

After unlocking, choose a one-to-one conversation or find its sender by username, load/decrypt verified text messages, paginate older events, and send an encrypted text reply. Signature verification is required; unverified messages are not displayed. Only ciphertext and public metadata go through the server. Retry preserves the same encrypted message and SDK-generated ID. Keys and displayed text clear on lock, unmount, hidden tab, page exit, or a 15-minute session timeout. Connection/workspace access is rechecked on each API request and periodically while unlocked.

This initial encrypted-chat path is owner-only and supports existing one-to-one text conversations. It does not register/rotate identities, create group conversations, render media, or copy plaintext into the shared CRM/client portal/AI reply pipeline. Replies require a verified conversation key from history; key resets and new conversation-key provisioning are not attempted automatically. Messages are fetched when opened/refreshed, not by background decryption.

Validation on this account confirmed HTTP 200 for token identity, public keys with an existing backup, and the conversation history endpoint (10 encrypted events and one key-change event). No PIN, private keys or message contents were collected, and no live reply was sent. PIN unlock and a live encrypted reply still require the owner to test in their browser.

Official contracts: [browser architecture](https://docs.x.com/xchat/building-ui-apps-with-wasm), [Chat XDK](https://github.com/xdevplatform/chat-xdk), [public keys](https://docs.x.com/x-api/chat/get-user-public-keys), [conversation events](https://docs.x.com/x-api/chat/get-chat-conversation-events), [encrypted send](https://docs.x.com/x-api/chat/send-chat-message).

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

### Encrypted Chat follow-up verification

47 mocked integration tests pass, including owner/workspace isolation, encrypted payload validation, signature-filtered rendering, key-backup callback mapping and concurrent-unlock exclusion. An isolated production build and type checking pass. A headless Chrome smoke test loaded both WASM libraries, generated temporary test keys, matched the identity, and verified lock/release without live credentials. The read-only live probe confirmed Chat API access and encrypted events; actual PIN unlock and live sending remain user validation steps.

### Unified inbox presentation

Encrypted X conversations now join the same sorted conversation list, platform/search filters, message pane, message bubbles and Reply composer as Facebook and Instagram. The sidebar contains only X unlock/find/pagination controls; there is no separate encrypted-chat panel. Decrypted histories remain session-only and clear from the shared view on lock. CRM lead-status and unread filters do not invent server-side state for encrypted sessions. Shared CRM/client visibility and AI reply limitations remain unchanged.

50 integration tests and TypeScript checks pass. An isolated browser test with fake accounts and a mocked crypto SDK verified the combined Meta/X list, X selection, shared-pane rendering, ciphertext-only reply routing and lock cleanup without touching live credentials or sending messages.

### SDK message discriminator fix (2026-10-01)

The installed Chat XDK 0.5.0 WASM serializes decrypted text with `content.content_type`, despite its TypeScript interface describing `content.contentType`. The inbox now accepts both documented and runtime forms while continuing to require verified signatures and matching conversation participants. A regression test decrypts X's public synthetic fixture using the real installed WASM and passes the result through the inbox filter. The fixture is attributed under `tests/fixtures/`; it contains no user credentials or real messages.

### Encrypted X contacts in CRM

Loading an X conversation page now performs an authorized metadata-only lead sync. Each contact gets a persistent social conversation and linked SOCIAL-source CRM lead with name and @username. Canonical conversation IDs deduplicate repeated pages and reversed pair IDs; existing qualification status is preserved. Stored rows and browser-decrypted rows merge into one inbox entry, and the existing lead-status control updates the linked CRM record. Unlock X again and load additional pages to import existing contacts. No decrypted text, PIN, private keys, or artificial message records are stored by lead sync.

### LinkedIn readiness and app approvals

Personal publishing uses Sign In with LinkedIn and Share on LinkedIn. Text,
images, multi-image posts and one video are supported by the publishing worker.
The integration does not publish documents or polls.

Keep `LINKEDIN_ANALYTICS_ENABLED` off until the developer application has
`r_member_postAnalytics`. After approval, set it to `true` and reconnect.
Member account analytics use the latest returned day's actual date, rather than
writing yesterday's counters into today's snapshot.

Channels now offers **Authorize company Pages**, **Choose company Page**, and
**Use personal profile**. Page authorization requests `rw_organization_admin`,
`w_organization_social`, and `r_organization_social`; these require LinkedIn
Community Management access. Do not use Page authorization on an app approved
only for Sign In and Share. The owner must select a Page, and Showwork checks
current administrator access again when saving that choice. One LinkedIn
publishing identity is active per workspace. Refreshing permissions preserves
an existing Page only when it is still authorized.

Page reporting uses organization share statistics for the last 30 completed
days, organization post statistics for up to 100 Showwork posts, and network
size for followers. It does not discover posts made outside Showwork.

LinkedIn messaging is still unavailable: Page connection does not grant Page
Messaging partner access. Do not enable inbox reply controls or claim message
lead capture until approved messaging documentation/credentials are available
and the partner transport has been implemented and verified.

Live acceptance checks after approval: reconnect, select a Page, publish a
consented test post for each supported media format, schedule a post, sync
analytics, and confirm expired/revoked permissions produce a reconnect error.
Automated tests mock LinkedIn and do not publish to real accounts.


### LinkedIn messaging and message-derived leads: prepared integration

The Showwork-side integration now exists, but it is deliberately inactive. This
is not the LinkedIn Lead Gen Forms API and does not import advertising leads.

- Webhook: `/api/webhooks/linkedin/messaging`. GET implements the documented
  UUID challenge/HMAC response. POST checks `X-LI-Signature` against the exact
  raw JSON body with LinkedIn's documented `hmacsha256=` signing prefix.
  It limits bodies to 1 MB, validates normalized events before writes, and
  returns an error for failed processing so delivery can be retried.
- Incoming Page messages enter the existing transactional inbox/CRM ingestion.
  Stable provider message IDs deduplicate retries. New inbound conversations
  create named leads; later messages preserve qualification status. Events
  before the connection date, inactive workspaces and unsubscribed Pages are
  excluded. Outbound echoes cannot create new lead conversations. AI replies
  remain disabled for imported LinkedIn messages.
- Replies use the shared inbox composer and validate the exact connection,
  conversation and participant before calling the provider. A reply is only
  marked sent after a provider message ID is returned.
- Owner-only subscription setup is at
  `/api/calendars/[id]/channels/linkedin/messaging` (POST) and is exposed in
  Channels. Neither an environment flag nor a personal-profile connection
  can enable messaging alone.

**Remaining partner work:** `lib/linkedin/messagingProvider.ts` contains an
explicitly unbound interface. Its field names are Showwork's internal model,
not a guessed LinkedIn webhook schema. After approval, implement notification
normalization, subscription registration and sending against the supplied
partner API specification. If notifications only contain references, resolve
those with the approved API before producing normalized messages. Ignore
non-message events explicitly. Supply the approved OAuth scopes in
`requiredScopes`. Ensure provider errors never contain credentials or bodies.

Then set `LINKEDIN_MESSAGING_ENABLED=true`, reconnect the company Page to grant
the new scopes, register/validate the HTTPS callback, and use **Set up Page
messaging after approval**. Confirm an inbound message creates one inbox thread
and CRM lead, replay it to verify deduplication, and send an authorized test
reply. Also test echo handling, revoked subscriptions, expired tokens and
cross-workspace isolation. Do not enable the production flag before the partner
adapter and these live checks are complete.

Public verification reference:
https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation
The public specification does not establish the private Page Messaging wire
format. Update verification if the approved product specifies a different scheme.

## Instagram: “URL Blocked” during connection

Instagram currently uses Facebook Login. Both the authorization request and code exchange use `${NEXT_PUBLIC_APP_URL}/api/calendars/instagram/callback`, with trailing slashes removed from the app URL. The callback has no workspace ID; the workspace travels in OAuth state.

In the Meta developer dashboard, select the app matching `INSTAGRAM_APP_ID`. Open Facebook Login (or Facebook Login for Business) → Settings → Client OAuth Settings. Enable Client OAuth Login and Web OAuth Login, then add the **full callback URL** to Valid OAuth Redirect URIs and save. Adding an app domain alone does not register the callback.

For `NEXT_PUBLIC_APP_URL=http://localhost:3000`, the exact callback is:

```text
http://localhost:3000/api/calendars/instagram/callback
```

For deployment, add `https://YOUR_APP_DOMAIN/api/calendars/instagram/callback` as a separate entry. Scheme, hostname, port and path must match the actual `redirect_uri`; do not append a slash or workspace ID. If Meta requires HTTPS for the development app, use an HTTPS development URL and set `NEXT_PUBLIC_APP_URL` to that same URL, register its callback, restart the development server and open Showwork through that URL before connecting. Opening Showwork through another hostname can prevent its session cookie from reaching the callback.

The connect route's HTTP 307 is the expected redirect to Facebook. An inbox HTTP 200 is unrelated to OAuth completion. A successful connection requires Meta to redirect back to the callback and Showwork to store the connected account.
