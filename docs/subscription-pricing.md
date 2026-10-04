# Subscription pricing rollout

All annual amounts retain the existing 5% discount.

| Product | Plan | Monthly NGN | Annual NGN |
| --- | --- | ---: | ---: |
| Delivery | Starter | 5,900 | 67,260 |
| Delivery | Growth | 12,500 | 142,500 |
| Delivery | Unlimited | 22,500 | 256,500 |
| Content Workspace | Creator | 4,900 | 55,860 |
| Content Workspace | Studio | 29,900 | 340,860 |
| Content Workspace | Agency | 59,900 | 682,860 |

New Content Workspace trials last seven days from first workspace creation; existing trial deadlines remain unchanged. Agency (stored as `UNLIMITED` for billing compatibility) includes unlimited workspaces and collaborators, 200 GB storage, 2,000 shared AI generations per month. Delivery quotas count projects created per billing cycle, including deleted projects; Free counts the previous 30 days.

Before enabling checkout:

1. Apply `20261003120000_workspace_unlimited` with the normal database migration workflow. The accidental error log has been removed from `20261001140000_calendar_imports/migration.sql`; its original SQL is restored.
2. Create Paystack monthly and annual plans with the amounts above (Paystack API amounts are in kobo: multiply by 100). Update the corresponding environment plan codes. Existing plan codes may still refer to the previous prices; changing an application price does not change a Paystack plan's amount.
3. Set `PAYSTACK_CONTENT_WORKSPACE_UNLIMITED_MONTHLY_PLAN_CODE` and `PAYSTACK_CONTENT_WORKSPACE_UNLIMITED_ANNUAL_PLAN_CODE` in local and hosting environments. Placeholders have been added locally.
4. Verify checkout and subscription webhooks in Paystack test mode before rollout.

Existing Paystack subscriptions are not repriced by this code change. If keeping existing customers on previous prices, keep their old plan codes in the corresponding `_LEGACY` environment variables before replacing the checkout codes. Existing local codes have been copied into those aliases; configure the same aliases in hosting. Published prices show the new catalogue prices.


Content Workspace limits and features are defined in `lib/contentWorkspaceEntitlements.ts`. Creator includes 5 workspaces, 3 collaborators, 5 GB and 100 AI content generations/month. Studio includes 15 workspaces, 15 collaborators, 50 GB and 500 generations/month. Agency includes unlimited workspaces/collaborators, 200 GB and 2,000 generations/month. Existing annual prices and Paystack plan environment variables remain unchanged.

All plans include planning/calendar, AI content generation, client approvals, social publishing and basic analytics. Studio adds advanced analytics, AI performance recommendations and performance-informed planning, Social Inbox, lead management, AI reply drafting and advanced team permissions. Agency adds opt-in automatic inbox replies and priority support.

The existing account-level 7-day trial grants Agency entitlements while preserving the selected plan. Creating more client workspaces does not restart a used trial. Expired unpaid trials become read-only; paid subscriptions enforce the actual plan. Excess workspaces, documents, messages, leads and saved insights are preserved. Covered workspaces are ordered by creation date and ID; upgrading immediately restores coverage. No automatic reply settings are enabled by trial or upgrade.

AI content generation, regeneration, inbox drafts, automatic replies and performance analysis share the generation allowance. AI allowances reset monthly, including annual subscribers. Conditional quota increments enforce concurrent requests. Storage is never reset with an AI cycle. Plan upgrades retain the existing Paystack checkout, verification, webhook and previous-subscription cancellation flow; checkout alone does not grant paid entitlements.
