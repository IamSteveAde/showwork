/** Legacy entry point. Actual provider charges now drive revenue; synthetic receipts are prohibited. */
import { reconcileAllPaymentHistory } from "../lib/paymentReconciliation";
import { db } from "../lib/db";

reconcileAllPaymentHistory({ apply: process.argv.includes("--apply") })
  .then((summary) => {
    console.log(JSON.stringify(summary));
    if (!summary.complete) process.exitCode = 2;
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
