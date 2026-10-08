// Historical audits now use actual provider transactions and refuse live changes through a test key.
// Run without --apply for a read-only report; --apply reconciles the verified ledger.
require("./reconcile-payment-revenue.cjs");
