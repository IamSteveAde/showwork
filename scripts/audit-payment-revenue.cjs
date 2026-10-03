// Run without --apply for a read-only audit. No payments are deleted.
require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client");
const ts = require("typescript");
const fs = require("node:fs");
const mod = { exports: {} };
new Function(
  "module",
  "exports",
  ts.transpileModule(fs.readFileSync("lib/paymentRevenue.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(mod, mod.exports);
const db = new PrismaClient();
async function main() {
  const payments = await db.paymentRecord.findMany({
    orderBy: { createdAt: "asc" },
  });
  const summary = { LIVE: 0, EXCLUDED: 0, UNVERIFIED: 0, liveRevenueNgn: 0 };
  const report = [];
  for (const payment of payments) {
    let verification = null;
    if (payment.paystackReference) {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.paystackReference)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY?.trim()}`,
          },
          signal: AbortSignal.timeout(15000),
        },
      ).catch(() => null);
      if (response) {
        const result = await response.json().catch(() => null);
        if (response.ok || result?.code === "transaction_not_found")
          verification = result;
      }
    }
    const result = mod.exports.classifyPaymentRevenue(payment, verification);
    summary[result.revenueStatus]++;
    if (result.revenueStatus === "LIVE")
      summary.liveRevenueNgn += payment.amountNgn;
    report.push({
      id: payment.id,
      reference: payment.paystackReference,
      amountNgn: payment.amountNgn,
      ...result,
    });
    if (process.argv.includes("--apply"))
      await db.paymentRecord.update({
        where: { id: payment.id },
        data: result,
      });
  }
  fs.mkdirSync("backups/payment-audits", { recursive: true });
  const reportPath = `backups/payment-audits/${new Date().toISOString().replaceAll(":", "-")}.json`;
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { applied: process.argv.includes("--apply"), summary, payments: report },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ summary, reportPath }));
}
main()
  .catch(() => {
    console.error(
      "Payment audit failed; check database/provider connectivity.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
