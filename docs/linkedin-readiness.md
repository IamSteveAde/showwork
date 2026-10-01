# LinkedIn integration readiness

Approval is pending. App credentials alone do not grant analytics or Page Messaging access.

## Publishing and analytics

Personal publishing uses `w_member_social`. Company Page publishing uses `w_organization_social`; Page selection and reporting use `rw_organization_admin`. Authorize company Pages from Channels after Community Management approval.

Personal analytics uses `r_member_postAnalytics`. After approval, use **Authorize analytics after LinkedIn approval** in Channels. Alternatively set `LINKEDIN_ANALYTICS_ENABLED=true` to request it on every LinkedIn authorization. Existing accounts must reconnect to grant new permissions. Reconnecting preserves an already granted analytics scope.

Keep `LINKEDIN_API_VERSION` on a supported version. The current default is `202609`.

## Page Messaging adapter handoff

The production binding in `lib/linkedin/messagingProvider.ts` intentionally remains null until the approved specification is available. Do not infer private endpoints or use personal inbox APIs as a substitute.

The surrounding application is implemented: subscription setup, webhook challenge/signature checks, notification ingestion, deduplication, conversation ownership, inbound lead capture, and confirmed replies. The provider must implement these four boundaries:

| Boundary | Required behavior |
| --- | --- |
| `requiredScopes` | Exact permission names granted by the approved product. |
| `decodeNotification` | Translate approved webhook payloads into Page URNs and `IncomingMessage` values; fetch message details if the notification only supplies references. Preserve provider IDs, timestamps, participant identity, and outbound direction. |
| `subscribe` | Register the HTTPS callback for the selected Page and resolve only after the API confirms registration. Throw on denied or ambiguous responses. |
| `send` | Use the approved conversation reply endpoint and return its confirmed message ID. Throw if the API does not confirm acceptance. |

Implement and export a non-null provider only after obtaining the endpoint definitions, authentication requirements, subscription lifecycle, webhook signature specification, and sanitized real response fixtures. Compare the approved signature scheme with `lib/linkedin/webhook.ts` before activation. Add fixture-based adapter tests for successful requests, permission errors, duplicate notifications, outbound notifications, malformed payloads, and unconfirmed sends.

Then set `LINKEDIN_MESSAGING_ENABLED=true`, reconnect the company Page for the approved scopes, and use the Page messaging setup button in Channels. The flag alone cannot enable messaging.

## Verification after approval

Run `node --test tests/social-integrations.test.cjs` and `npx tsc --noEmit`. With the database reachable, reconnect an account and verify granted scopes and expiry. Confirm analytics responses against LinkedIn's native reporting dates. Use an agreed test post for text, image, and video publishing, then confirm the returned post URL. Send a test inbound Page message twice to verify one inbox entry and lead; reply once and confirm it in LinkedIn. Live posting and messaging require test content and a recipient.

Official specifications: [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), [Member Post Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics), and [Pages messaging setup](https://www.linkedin.com/help/learning/answer/a6246714).
