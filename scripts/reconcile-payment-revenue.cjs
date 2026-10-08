// Read-only unless --apply is specified. Provider keys are read from the environment, never logged.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
require("dotenv").config({ quiet: true });
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/") ? path.join(root, name.slice(2)) : name,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );
const apply = process.argv.includes("--apply");
const {
  reconcileAllPaymentHistory,
  paymentIntegration,
} = require("../lib/paymentReconciliation.ts");
const { db } = require("../lib/db.ts");
fs.mkdirSync(path.join(root, "backups/payment-audits"), { recursive: true });
const reportPath = path.join(
  root,
  "backups/payment-audits",
  `reconciliation-${new Date().toISOString().replaceAll(":", "-")}.jsonl`,
);
const report = fs.openSync(reportPath, "wx", 0o600);
(async () => {
  const integration = paymentIntegration();
  console.log(
    JSON.stringify({
      mode: integration.live ? "live" : "test",
      apply,
      reportPath,
    }),
  );
  const summary = await reconcileAllPaymentHistory({
    apply,
    onResult: (row) => fs.writeSync(report, JSON.stringify(row) + "\n"),
  });
  fs.writeSync(report, JSON.stringify({ summary }) + "\n");
  console.log(JSON.stringify(summary));
  if (!summary.complete) process.exitCode = 2;
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.closeSync(report);
    await db.$disconnect();
  });
