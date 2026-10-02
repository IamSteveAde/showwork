# Customer-care messaging

Inbox → Customer-care playbook sets the default tone for automatic replies and staff drafts. The playbook can be edited while automatic replies are switched off. Existing workspaces default to Professional and retain their old reply guidance.

## Setup

Choose Professional, Warm & friendly, Direct & concise, Premium & polished, Patient & empathetic, or Upbeat & engaging. Add:

- Industry and confirmed business/service details, support contacts and hours.
- Prices with currencies, inclusions, booking/delivery requirements and published policies.
- Relevant qualification questions, ordered by usefulness.
- Handoff rules: decisions requiring private records, approval or a staff member.
- Additional voice guidance such as spelling preference or emoji policy.

Save the settings. The workspace Knowledge summary is also supplied, with confirmed pricing and policies in the playbook taking priority. Customer claims and an existing draft are not treated as verified business facts. Conflicts should go to the team.

Example qualification guidance for a photography business: “For a booking enquiry, ask the event date, location and coverage required, only when the customer has not already supplied them. Do not confirm availability without staff checking the diary.” Add actual confirmed pricing separately; never fill a price field with an illustrative amount.

## Staff drafts

In a supported conversation, select a Reply tone, optionally add facts or direction under Add context for this reply, and click Draft reply. If the composer already contains text, Improve draft uses it as wording to improve rather than proof of business facts.

The preview does not send or replace typed text. Use draft copies the suggestion into the editable composer. Reply remains the explicit send action. Team review reasons appear separately from the customer-facing text. Switching conversations or receiving a newer customer message cancels or clears the suggestion. Encrypted X Chat content is excluded from AI drafting.

## Reply behavior

The prompt directs replies to answer the actual question, use the recent conversation, match language and mood, avoid repeated qualification questions, ask at most one or two useful questions, and use short, natural paragraphs. Complaints should receive specific, calm care regardless of brand tone. Replies must not invent prices, availability, compensation, completed actions or policy exceptions, claim to be human, or request credentials and payment-card details.

Automatic replies requiring a person return no customer-facing text. Staff drafts can offer a safe acknowledgement while flagging the issue for review. Invalid, empty or oversized model results are rejected rather than truncated and sent. Older queued messages are skipped if their fetched history already contains a newer customer message or a reply. Existing WhatsApp window and pre-send checks remain in place.

Output uses the existing Responses API strict JSON schema, following [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs). Schema validation ensures shape; it does not establish that facts or wording are correct.

## Deployment and verification

Apply `20261002160000_customer_care_reply_profile` with the normal Prisma migration deployment and regenerate Prisma Client. The additive migration adds one nullable JSONB column to SocialInboxSettings and needs no data backfill. No database migration is applied by the code change itself.

Run:

```sh
node --test tests/customer-care-replies.test.cjs tests/whatsapp-messaging.test.cjs tests/social-integrations.test.cjs
npx tsc --noEmit --incremental false
```

Tests mock the model and providers; they verify configuration, permissions, generation inputs, validation and handoff handling. Before enabling automatic replies, evaluate the configured model on representative business enquiries, complaints, unknown prices, conflicting policies, returning customers, and requests for a person. No prompt guarantees perfect factual accuracy. Live model evaluation needs authorization and is separate from the local test suite.
