# Subscription pricing rollout

All annual amounts retain the existing 5% discount.

| Product | Plan | Monthly NGN | Annual NGN |
| --- | --- | ---: | ---: |
| Delivery | Starter | 5,900 | 67,260 |
| Delivery | Growth | 12,500 | 142,500 |
| Delivery | Unlimited | 22,500 | 256,500 |
| Content Workspace | Creator | 4,900 | 55,860 |
| Content Workspace | Studio | 29,900 | 340,860 |
| Content Workspace | Unlimited | 59,900 | 682,860 |

New Content Workspace trials last seven days from first workspace creation; existing trial deadlines remain unchanged. Unlimited includes unlimited workspaces and collaborators, 200 GB storage, 2,000 AI generations and 600 regenerations per billing cycle. Delivery quotas count projects created per billing cycle, including deleted projects; Free counts the previous 30 days.

Before enabling checkout:

1. Apply `20261003120000_workspace_unlimited` with the normal database migration workflow. The accidental error log has been removed from `20261001140000_calendar_imports/migration.sql`; its original SQL is restored.
2. Create Paystack monthly and annual plans with the amounts above (Paystack API amounts are in kobo: multiply by 100). Update the corresponding environment plan codes. Existing plan codes may still refer to the previous prices; changing an application price does not change a Paystack plan's amount.
3. Set `PAYSTACK_CONTENT_WORKSPACE_UNLIMITED_MONTHLY_PLAN_CODE` and `PAYSTACK_CONTENT_WORKSPACE_UNLIMITED_ANNUAL_PLAN_CODE` in local and hosting environments. Placeholders have been added locally.
4. Verify checkout and subscription webhooks in Paystack test mode before rollout.

Existing Paystack subscriptions are not repriced by this code change. If keeping existing customers on previous prices, keep their old plan codes in the corresponding `_LEGACY` environment variables before replacing the checkout codes. Existing local codes have been copied into those aliases; configure the same aliases in hosting. Published prices show the new catalogue prices.
