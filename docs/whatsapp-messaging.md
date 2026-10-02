# WhatsApp messaging, leads and AI replies

WhatsApp is a messaging-only channel in a client workspace. It uses Meta's
WhatsApp Cloud API and the existing Inbox, Leads, business knowledge and AI
reply settings. It is excluded from calendar posts, content generation,
publishing and social reporting.

## Server setup

1. Create a Meta app with the WhatsApp product and configure a WhatsApp Business
   Account (WABA) with a registered Cloud API business phone number. Complete
   the required Meta business setup and permissions for the intended accounts.
2. Set these environment variables on the deployed app:
   - `WHATSAPP_APP_ID`: the Meta app that issued the channel's access token.
   - `WHATSAPP_APP_SECRET`: that app's secret; used to verify notification signatures.
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: a random secret chosen for webhook verification.
   - `META_GRAPH_API_VERSION`: the supported Graph version (default `v26.0`).
3. In the app's WhatsApp webhook configuration, register
   `https://<your-app-domain>/api/webhooks/whatsapp/messaging`, enter the same
   verification token, and subscribe to the `messages` field. The endpoint
   responds to Meta's verification challenge and validates `X-Hub-Signature-256`
   on subsequent requests. The verification secret is never returned to clients.
4. Run `npx prisma migrate deploy` against the intended database, then deploy the
   application with its regenerated Prisma client. The enum changes and
   connection indexes are separate migrations so enum values commit before use.
5. Keep the existing AI infrastructure configured: OpenAI credentials,
   `CRON_SECRET`, and the Netlify background and scheduled auto-reply functions.
   Live notifications dispatch the existing background worker; its scheduled
   worker recovers queued work. In a local environment without background
   functions, use the authenticated `/api/cron/social-inbox-auto-replies` route
   to process eligible messages.

## Connect a workspace

The workspace owner opens **Channels → WhatsApp Business → Connect WhatsApp**
and enters:

- WhatsApp Business Account ID (WABA ID).
- Phone Number ID, which is the API identifier rather than the phone number.
- A system-user access token issued by the configured app with
  `whatsapp_business_management` and `whatsapp_business_messaging` permissions
  and access to the selected WABA and phone number.

The server inspects the token, checks its app and scopes, confirms phone
membership in the WABA, checks registration status, and subscribes the app to
the WABA before saving the connection. Tokens are kept in the server-only
connection record, consistent with the existing channel storage. The browser
does not persist the token, retrieve it, or receive it in API responses.

One WhatsApp number can be connected to one workspace at a time. Each workspace
supports one connected WhatsApp number. Database indexes enforce both rules,
including concurrent connection requests. Updating a connection can replace a
token or number. Existing conversations remain attached to their original
connection; changing the number disconnects the old one.

This connection flow uses credentials for an already registered Cloud API
number. It does not implement Meta Embedded Signup, phone registration, QR-code
pairing, or migration/coexistence with the consumer or Business mobile app.

## Inbox, leads and AI

- Incoming messages are routed using both WABA ID and Phone Number ID.
- Message, unread count, conversation and lead writes commit together. Provider
  retries do not create duplicate messages or leads. WhatsApp profile names and
  international phone numbers are saved on leads.
- New messages appear in **Inbox**, including the WhatsApp platform filter.
  Collaborators use existing workspace permissions; the client portal stays
  read-only and obeys the existing client inbox access setting.
- Text and button/list selections are readable in the inbox. Other message
  types appear as placeholders and must be viewed in WhatsApp. Reactions and
  system notifications are ignored. Media downloads and outgoing attachments
  are outside this implementation.
- Replies require an existing inbound conversation and a customer message
  within the last 24 hours. The server enforces this for both manual and AI
  replies; the UI shows when the window has closed. Templates, campaigns and
  proactive outreach are outside this implementation.
- Outgoing messages show accepted, delivered, read or failed status as provider
  notifications arrive. Delivery updates are scoped to the connection and
  recipient and cannot regress a read receipt.
- AI replies are **off by default**. Add business knowledge and configure AI
  reply guidance, then enable automatic replies in Inbox. Only fresh supported
  inbound messages received while AI is enabled enter the AI queue. Older
  notifications and media cannot trigger AI replies. Both before generation
  and before sending, WhatsApp AI checks for newer messages, existing replies
  and expired windows and hands off when appropriate.
- Disabling AI, disconnecting, inactive workspace access or expired credentials
  prevents sending. Tokens are re-read before every send. Ambiguous sends are
  handed off for human inspection, without automatic resending.
- Disconnect clears local credentials and stops routing new messages, while
  retaining conversations and leads. It leaves the WABA subscription intact
  because other numbers can share it; manage that subscription in Meta if needed.

## Validate before going live

Run `node --test tests/whatsapp-messaging.test.cjs tests/social-integrations.test.cjs`
and `npx tsc --noEmit --incremental false`.

Then, using a Meta test number or your registered business number:

1. Verify the webhook in Meta and connect the number in Channels.
2. Send a customer text message and confirm one conversation and one lead with
   the correct phone number. Send another message and confirm the lead is reused.
3. Reply from Inbox and confirm receipt in WhatsApp and delivery/read updates.
4. Add business knowledge, enable AI, send a question, and confirm an AI reply
   appears in both WhatsApp and Inbox. Disable AI and confirm another question
   receives no automatic reply.
5. Disconnect and confirm new messages and replies stop while saved leads remain.

Automated tests use provider and database doubles; they do not validate live Meta
credentials, app-level webhook configuration or production message delivery.

References: [Meta's Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api),
[Meta's status and reply-window reference](https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object).
