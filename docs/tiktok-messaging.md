# TikTok Business Messaging

The native integration supports signed inbound DMs, deduplicated CRM lead
capture, manual replies, recent-history import and opt-in AI replies. Business
Messaging credentials are separate from the existing Content Posting tokens.

## Activate

1. Apply the additive migration with `npx prisma migrate deploy`, then generate
   Prisma Client and deploy the application and Netlify functions together.
   The new migration is `20261001120000_tiktok_business_messaging`. Deploying the
   code without this migration will break inbox queries.
2. Obtain Business Messaging approval for the TikTok for Business developer app.
   Configure `TIKTOK_BUSINESS_CLIENT_ID`, `TIKTOK_BUSINESS_CLIENT_SECRET` and
   `TIKTOK_BUSINESS_AUTH_URL`. The last value is the **TikTok account holder
   authorization URL** issued by the Business app, not the publishing app.
3. Register `https://<app-host>/api/calendars/channels/tiktok-messaging/callback`
   as the account-holder redirect URL. Configure the application's public URL
   so the callback and webhook use HTTPS.
4. In Channels, connect TikTok publishing, then select **Connect Business
   Messaging**. Authorize the Business Account whose DMs should be managed.
   The account ID is displayed separately in Channels and Inbox; Business and
   publishing app IDs need not match. All four permissions must be granted:
   `message.list.read`, `message.list.send`, `message.list.manage`,
   `user.account.type`.
5. The callback subscribes the Business app to `DIRECT_MESSAGE` events at
   `/api/webhooks/tiktok/messaging`. Set the Business Account to accept DMs from
   everyone in TikTok. TikTok's subscription is app-wide, so this callback must
   be the same production host for every connected workspace.
6. Enable AI replies and add business instructions in Inbox settings.
   Configure `CRON_SECRET` and Netlify `URL`/`DEPLOY_URL`. Fresh inbound text
   dispatches the existing background AI worker; the minute cron recovers
   pending eligible messages. Media messages are shown as text placeholders
   and never trigger AI replies.

## Behavior and limits

- A webhook retry cannot create another stored message, unread increment or
  CRM lead. Outbound echoes update existing conversations only.
- Historical recovery imports the ten most recent conversations of each type
  (`STRANGER` and `SINGLE`), with up to twenty messages per conversation. It is
  time-bounded and reports partial results. History never enables AI replies.
- Replies require a matching stored conversation and participant, an active
  workspace and an authorized Business connection. The app restricts replies
  to the 48-hour inbound window; TikTok enforces the ten-message quota.
- Refreshes preserve rotated Business credentials and leave publishing tokens
  untouched. Disconnecting TikTok clears Business credentials and subscriptions
  locally without deleting stored conversations or the app-wide subscription.
- TikTok's `im_receive_msg_eu` notification omits the sender, conversation ID and
  message content. The integration cannot create a lead or AI response from
  that notification; it acknowledges it without inventing message data.
- Unconfirmed delivery is surfaced as an error. AI does not automatically resend
  a reply after an uncertain send attempt.

## Verification

`node --test tests/social-integrations.test.cjs` passes 93 isolated integration
tests. TikTok tests cover business-token separation, rotated token refresh,
conversation ownership, reply windows, normalization, signed webhook replay
protection, duplicate delivery, outbound echoes, history encoding and AI
eligibility. Run `npx tsc --noEmit --incremental false` for type checking.

Live activation is not verified. The local environment lacks all three Business
app settings. A read-only remote database check confirmed that the new migration
is pending; it has not been applied. The production build and type check pass.
After deployment, use two dedicated test accounts to confirm inbound delivery,
one CRM lead on repeated delivery, a manual reply and a separately enabled AI
reply. No live DMs were sent during development.

## Official specifications

- [Business authorization](https://business-api.tiktok.com/portal/docs?id=1832184159540418)
- [Business tokens and refresh](https://business-api.tiktok.com/portal/docs?id=1832184175482945)
- [Send messages](https://business-api.tiktok.com/portal/docs?id=1832184403754242)
- [List conversations](https://business-api.tiktok.com/portal/docs?id=1832184415059970)
- [List messages](https://business-api.tiktok.com/portal/docs?id=1832184425841170)
- [Webhook events](https://business-api.tiktok.com/portal/docs?id=1832190670631937)
- [Webhook subscription](https://business-api.tiktok.com/portal/docs?id=1832184470423554)
- [Webhook signature verification](https://business-api.tiktok.com/portal/docs?id=1759978341579777)
