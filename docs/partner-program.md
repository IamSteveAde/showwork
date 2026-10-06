# Partner Program behavior

Creators apply from `/dashboard/partners`. Admin approval activates a unique referral link and grants one month of complimentary access. Rejected creators may reapply; suspended creators cannot. New customers must use the referral link during signup and verify their email for attribution to be saved.

Partners earn 10% of actual verified LIVE payment revenue for Delivery and Content Workspace initial subscriptions and renewals. Catalogue prices are not read by the commission calculation: discounted annual charges and legacy subscription charges use the amount actually recorded as paid. Test payments, unverified payments, portfolio payments and one-time project payments do not qualify. Commission amounts round down to whole naira.

Examples: ₦4,900 paid earns ₦490; ₦55,860 paid annually earns ₦5,586. Annual commission is recorded when the payment occurs, rather than spread across months.

The first qualifying payment starts a 12-month eligibility window. Payments at or after its anniversary do not qualify. Leap-day anniversaries clamp to February 28. Stopping new partner referrals does not cancel existing referred customers' eligibility.

Commissions begin pending and require admin approval. Partners need a saved bank account and at least ₦5,000 of approved, unallocated commissions to request a payout. Allocations prevent the same earnings from being withdrawn twice; admin settlement records payment rather than initiating an automatic bank transfer. Voided records are excluded from total earnings.

Duplicate webhook delivery retries missing commission processing. Serializable transactions protect the initial eligibility window against concurrent payments. Payments marked UNVERIFIED after provider outages still require revenue reconciliation before earning commissions; replaying a webhook alone does not reclassify revenue.

Validation: `node --test tests/partner-commissions.test.cjs tests/payment-revenue.test.cjs tests/workspace-pricing.test.cjs tests/calendar-payment-return.test.cjs` and `npx tsc --noEmit --incremental false`. Production checkout, webhook delivery and actual payout settlement require an end-to-end environment check. These local checks do not certify deployment configuration or existing financial records.
