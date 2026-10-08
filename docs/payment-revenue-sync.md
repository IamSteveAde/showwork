# Payment revenue synchronization

Successful Paystack charges are verified and saved to `PaymentRevenueReceipt` before product-specific webhook handling. Provider receipts retain exact kobo, payment dates and revenue even if an account is deleted or product attribution needs review. `PaymentRecord` remains the account-level ledger. The revenue query combines both sources and counts each provider reference once.

Checkout callbacks for Delivery, Portfolio, Content Workspace and one-time deliveries use the same sync. Webhooks return a retryable failure if a receipt cannot be persisted. Test payments and synthetic subscription references do not contribute to revenue.

## Production rollout

1. Apply the additive migration `20261008120000_payment_revenue_sync` to the application's database using `npx prisma migrate deploy`.
2. Deploy the code and the `payment-revenue-cron` function with the production live Paystack key and `CRON_SECRET` configured. The cron calls `/api/cron/payment-revenue` every 15 minutes.
3. With the production database and live Paystack settings supplied securely in the environment, run `node scripts/reconcile-payment-revenue.cjs` to produce a read-only report of all historical successful charges and existing payment records.
4. Review the report, then run `node scripts/reconcile-payment-revenue.cjs --apply` to import actual charge references, correct verified amounts/dates/status, reconcile account records and exclude synthetic receipts. The script does not charge cards or change subscription access. Reports are written to ignored `backups/payment-audits/` with restrictive file permissions.
5. Review unresolved references, and compare `providerRevenueNgn` with `ledgerRevenueNgn`. An unresolved account/product still retains its verified provider receipt in revenue. Do not call an audit complete until unresolved references are reviewed.

The live key is required for applying reconciliation. A local test key cannot see production transactions. Never substitute subscription amounts, synthetic references, or inferred payment dates for actual charges.

## Recovery and monitoring

The scheduled worker scans a stable snapshot of the entire successful transaction history. It saves page progress and replays an interrupted page, rather than skipping it. Complete scans repeat so late-settled old transactions are eventually recovered. A lease prevents concurrent workers; unresolved references have a durable retry queue. Admin Analytics shows the last completed scan, attribution issues and a manual sync control. Provider reference upserts make callbacks, webhook retries, scheduled scans and manual audits safe to repeat.

Worker pages contain one transaction so each durable receipt has its own checkpoint. Forward progress takes priority over retries, and a reference is not retried twice within the same batch. The scheduled bridge waits at most 25 seconds, below Netlify's scheduled execution limit. Legacy `spotlite_` one-time delivery payments and `showwork_portfolio_setup_` one-time portfolio payments remain attributable after their project or portfolio is deleted. Verified charges belonging to unavailable historical accounts are retained in the independent ledger rather than assigned to a new account or retried forever.

Migration must precede deployment. No schema migration or production reconciliation is performed merely by building the code.

During rollout, admin reports detect whether the provider receipt table exists and use the existing verified payment records until it is ready. Matched payments can still be recorded before migration. Historical sync remains disabled until all three new tables exist, and the admin displays that setup is pending.

Netlify requires Prisma's `rhel-openssl-3.0.x` engine. The schema generates this target alongside the local native engine, the build command regenerates the client, and Next.js explicitly includes the Linux engine in its function trace. Verify the packaged server function contains that engine before publishing a build made on macOS.

When Netlify masks secret values, use the deployed authenticated `/api/cron/payment-revenue` endpoint rather than exporting the Paystack key. `GET` reports runtime connection and ledger status; `GET?mode=audit&page=1&to=<ISO timestamp>` provides paginated read-only verified-charge audits; `POST` performs a bounded, resumable reconciliation batch. All operations require the configured `CRON_SECRET` bearer token. Audit summaries can be checked without exporting customer payment datasets.

## Verification

- `node scripts/test-payment-sync.cjs`: product attribution, duplicate events, amount correction, paid dates, dry runs, deleted accounts, exact kobo, test exclusion and ownership.
- `node scripts/test-payment-reconciliation.cjs`: pagination, checkpoints, worker leases, unresolved retries, dry runs and live-key enforcement.
- `npx prisma validate`
- `npx tsc --noEmit --incremental false`
