# Discounts and complimentary access

The admin manager is `/admin/billing-offers`, linked from the admin overview and every creator's account controls. New grants use explicit, auditable offer records instead of the old `isComped`/percentage toggles.

## Admin controls

An offer has a customer-visible name, product (Delivery, Content Workspace, or both), eligible plans, percentage, duration in billing months, billing cycle, and audience. Discounts support everyone—including future accounts—or up to 500 selected, active accounts. Search by name/email and retain selections while searching. An optional activation deadline closes new checkouts at 23:59 Lagos time on the selected date.

Percentages are whole numbers from 1 to 99. A 100% benefit is complimentary access: select recipients and an exact plan for each included product. It grants access immediately without a zero-value Paystack transaction. Complimentary access begins when granted and ends after the specified calendar months. Grants do not cancel or refund paid subscriptions; the admin must acknowledge this, and users with an active paid subscription see a renewal warning.

Durations are 1–36 whole months. Monthly discounts cover that many discounted subscription payments. Annual discounts require 12, 24 or 36 months and cover 1, 2 or 3 annual payments. Selecting both cycles with a non-year duration makes the offer eligible for monthly billing only. Annual discounts apply to the annual catalogue price, which already includes the existing 5% annual saving.

Examples:

| Offer | Eligible charge | Discounted price | Discounted payments | Afterwards |
| --- | ---: | ---: | ---: | ---: |
| 20% off Delivery Starter for 3 monthly billing months | ₦5,900/month | ₦4,720/month | 3 | ₦5,900/month |
| 20% off Workspace Creator for 12 months, annual | ₦55,860/year | ₦44,688/year | 1 | ₦55,860/year |
| Complimentary Workspace Studio for 2 months | No payment | Free Studio access | No invoices | Existing paid access or unpaid/read-only limits |

A product-specific percentage discount does not grant access before payment. Complimentary plans enforce the selected product's real quotas and features. Workspace Creator grants do not unlock Studio's inbox features; a Delivery grant does not grant Workspace access. Overlapping complimentary grants use the highest eligible tier and fall back immediately as grants expire. A higher existing paid tier remains available. The projection stores all overlapping grants so expiry does not depend on the scheduler running at the exact boundary.

## Selection and activation

Offers never stack. Among eligible offers, precedence is selected recipients, specific plan, specific billing cycle, then specific product. Within identical specificity, the higher percentage wins, then the newer offer. Expired, revoked, wrong-plan and wrong-cycle rules never qualify.

The first verified successful payment activates a percentage discount. A redemption is shared by that user, offer and product: changing plans does not restart the expiry or discounted-payment allowance. Each discounted checkout or renewal consumes one payment from that allowance. An activated redemption stays on its original billing cycle. Delivery and Workspace have separate redemptions for an offer that covers both.

New checkout and plan switches use the same server-side quote and eligibility resolver. Users review the amount, discount, remaining payments and eventual standard renewal price before proceeding. An accepted quote that has changed fails with 409 instead of silently charging a higher price. Current-plan discounts can be activated through the benefit cards or the Delivery current-plan card; other Workspace plans use the existing upgrade/downgrade flow.

Activation is a new checkout and starts a new billing period immediately. This implementation does not automatically prorate unused prepaid time. The confirmation explains this and the existing switch flow cancels the previous renewal after successful payment. Admin publishing alone does not reprice existing provider subscriptions.

Stopping a percentage offer prevents new checkout activation; already-issued checkout URLs and paid subscriptions retain their snapshotted terms. Stopping a complimentary offer immediately recomputes each recipient's remaining grants. Revocation retains the offer, recipients, invoices and financial snapshots for history. Creation records the admin email; revocation records who stopped it. Submission IDs plus a hash prevent duplicate creation on retries or reuse of an ID for different terms.

## Provider and ledger

Every discounted checkout has its own private Paystack plan. The plan code, customer, product, tier, cycle, original price, discounted price, percentage and duration are stored before checkout starts. Private plans are recognized by callbacks and all relevant webhook plan-mapping paths. Shared catalogue plans are never edited to apply or expire individual discounts.

Verified NGN payments are bound to the snapshot owner's email and allowed price. Each provider reference counts once. Transactions use serializable isolation and retry conflicts. Both test and live provider payments can exercise discount lifecycle behavior; partner commissions continue to require verified LIVE revenue and use the actual amount paid.

Immediately after the final discounted payment, the private plan price is restored for its next renewal. Standard renewal uses the catalogue price snapshotted at checkout, rather than an unrelated future catalogue increase. Failed restoration is persisted as `RESTORE_PENDING`, surfaced in the admin manager, and retried by subsequent webhook delivery and the billing scheduler. A 15-minute scheduler also restores expired activated discounts and refreshes complimentary projections. Failures return 503 and are logged rather than reported as success. Provider outages can delay price restoration; monitor the attention queue.

Provider references: [Paystack subscriptions](https://paystack.com/docs/payments/subscriptions/), [plan updates](https://paystack.com/docs/api/plan/). Paystack checkout charges the plan's amount, and plan updates affect existing subscriptions when `update_existing_subscriptions` is true. Creating separate plans prevents another customer's subscription from being repriced.

## Legacy compatibility

`isComped` continues to represent legacy complimentary Workspace Studio access, including partner welcome grants. `compedUntil` is enforced; an expired flag cannot block checkout or keep Delivery access paid. Existing indefinite legacy grants remain indefinite until explicitly ended. New grants cannot be created through the legacy boolean API. The account control can end legacy Workspace access without changing paid subscriptions or newer grants.

The migration imports valid existing 1–99% account and platform discounts as explicit Delivery-only offers with a displayed 12-month duration for new activations. It does not edit existing Paystack subscriptions. Old 100% percentage values did not create valid nonzero recurring plans; review those accounts and grant scoped complimentary access if intended. Legacy percentages remain available for auditing but are no longer used directly in checkout. End imported offers from the manager before replacing their terms if their specificity would override a new offer.

Historical private Paystack discount plans created before this ledger are not automatically mapped or repriced: their subscription terms and original plan identity cannot be reconstructed reliably from the old percentage fields. Audit any such subscriptions in Paystack before rollout; confirm their tier/cycle and agree a new checkout where needed. Do not infer that the new ledger has repaired existing external billing records.

## Rollout and validation

1. Apply `prisma/migrations/20261006160000_billing_offers/migration.sql` through the normal deployment workflow (`prisma migrate deploy`) and generate the Prisma client. Deploy the schema before traffic uses the new offer queries.
2. Preserve existing Paystack plan codes and LIVE/test separation. The checkout key must be able to create plans and update private plan prices.
3. Keep `CRON_SECRET` configured on the application and scheduler. Deploy `netlify/functions/billing-offers-cron.ts`; other hosting must schedule POST `/api/cron/billing-offers` every 15 minutes with the bearer secret.
4. Exercise monthly and annual offers in Paystack test mode, including callback/webhook ordering, current-plan activation, plan switching, cancellation, final discounted payment, restoration failure/retry, revocation and overlapping complimentary expiry. Verify the provider's next charge amount and dates, not only the UI.
5. Confirm user dashboard and billing show available vs. activated benefits, exact prices, duration/end dates, and warnings about any remaining paid renewals. Review imported offers and historical provider subscriptions before enabling the feature.

Automated tests cover rule precedence, audience validation, prices and annual cycles, private-plan identity, quote changes, owner/amount verification, duplicates, shared redemptions, expiry, restoration retry, authorization, atomic complimentary grants, product feature enforcement and benefit rendering. Run `node --test tests/*.test.cjs`, `npx tsc --noEmit --incremental false`, and `npx prisma validate`.

Local tests use provider/database fixtures. No production migration, deployment, provider plan change, bank payment, or email send is performed by these tests.

## Benefit emails and accepted-partner controls

The manager has an **Accepted partners only** account filter and a partner-benefit preset. Acceptance is `PartnerProfile.status = ACTIVE`; pausing new referrals (`isActive = false`) does not remove this tag or exclude an accepted partner. Pending, suspended and rejected applications have distinct tags and do not match the accepted-partner filter. Tags also appear in the main admin user directory and account details. The partner administration page links directly to the filtered benefit manager.

Admins can search, select the matching partners shown, grant an exact complimentary product/plan and duration, or stop one user's complimentary access. Stopping a user's access revokes their structured complimentary grants and any legacy partner welcome comp, then recomputes that user's access. Other users' grants and that user's paid subscriptions are preserved. Individual selected-offer recipients can also be revoked through the PATCH API without stopping the whole offer. Personal revocation prevents new discount activation; already-paid discount terms remain intact.

Every new discount/complimentary assignment saves an email notification in the same database transaction as the grant. Selected offers notify the selected active users; global offers notify currently active users, and future users receive active global offers when signup is verified. Partner approval also queues a detailed notification for the welcome Workspace Studio benefit alongside the existing partnership welcome message. Previously existing offers are not broadcast retroactively by the migration.

Messages name the product, plan, percentage, duration and activation deadline or complimentary end date, link to billing, and distinguish an available percentage offer from active free access. They explain that free access does not cancel paid renewals. Stop actions also queue notices. Obsolete pending grant announcements are cancelled when the grant/recipient is revoked or the grant has expired.

Delivery begins after the HTTP response using Next's `after` hook. An outbox worker claims each record with a lease, records successful sends, and retries provider failures with backoff. Stable Resend idempotency keys protect acknowledgement-loss retries; Resend retains these keys for 24 hours, so this is not an unconditional exactly-once guarantee across prolonged outages. After eight failed attempts, the manager shows failed delivery and offers an admin retry control. The persistent queue prevents normal request retries from creating duplicate announcements.

Apply `20261006190000_benefit_notifications` with `npx prisma migrate deploy`, then restart with `npm run dev` before using these controls. The migration adds the email outbox and per-recipient revocation fields; it does not send emails itself. It also permits the audited `REVOKED` complimentary state. Configure the existing Resend key/from address and deploy `netlify/functions/billing-benefit-emails-cron.ts`, which runs every minute. Other hosting must schedule POST `/api/cron/billing-benefit-emails` with `Authorization: Bearer CRON_SECRET`. Local development sends immediate grant messages through `after`; queued failures need the scheduled endpoint or a configured local scheduler.

References: [Resend idempotency keys](https://resend.com/changelog/idempotency-keys). Automated notification tests use a fake sender; they do not send live messages.
