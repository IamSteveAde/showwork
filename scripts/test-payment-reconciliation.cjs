const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
const mod = { exports: {} };
let state = null,
  providerCalls = [],
  calls = [],
  issues = new Map(),
  busy = false,
  fail = false;
const db = {
  paymentRevenueSyncState: {
    upsert: async ({ create }) => {
      state ??= { ...create, nextPage: 1, scanTo: null, lastSyncedAt: null };
      return state;
    },
    findUnique: async () => ({ ...state }),
    updateMany: async ({ where, data }) => {
      if (where.OR && busy) return { count: 0 };
      if (where.leaseToken && state.leaseToken !== where.leaseToken)
        return { count: 0 };
      Object.assign(state, data);
      return { count: 1 };
    },
  },
  paymentRevenueSyncIssue: {
    findMany: async ({ where }) =>
      [...issues.values()].filter(
        (i) =>
          !i.resolvedAt &&
          !(where.reference?.notIn ?? []).includes(i.reference),
      ),
    updateMany: async ({ where, data }) => {
      if (issues.has(where.reference))
        Object.assign(issues.get(where.reference), data);
      return { count: 1 };
    },
    upsert: async ({ where, create, update }) => {
      const key = where.integration_reference.reference;
      if (issues.has(key)) {
        const issue = issues.get(key);
        Object.assign(issue, {
          reason: update.reason,
          attempts: issue.attempts + 1,
          resolvedAt: null,
        });
      } else issues.set(key, { attempts: 1, ...create });
    },
  },
  paymentRecord: { findMany: async () => [] },
};
let history = false;
let schemaReady = true;
let archiveCharge = false;
let processingDelay = 0;
let fakeNow = null;
db.paymentRevenueReceipt = {
  findUnique: async ({ where }) =>
    where.reference === "charge-1"
      ? { integration: state.id, amountKobo: 100n }
      : null,
};
const dependencies = {
  crypto: require("node:crypto"),
  "@/lib/db": { db },
  "@/lib/paymentRevenueSchema": {
    paymentRevenueSchema: async () => ({
      receipts: schemaReady,
      state: schemaReady,
      issues: schemaReady,
    }),
  },
  "@/lib/paymentRevenue": {
    classifyPaymentRevenue: () => ({ revenueStatus: "LIVE" }),
  },
  "@/lib/livePaymentRevenue": {
    getLiveRevenueTotals: async () => ({ amountNgn: 12, count: 12 }),
  },
  "@/lib/paystack": {
    listSuccessfulTransactions: async (params) => {
      providerCalls.push(params);
      const total = history ? 51 : 12;
      const offset = (params.page - 1) * params.perPage;
      const length = Math.max(0, Math.min(params.perPage, total - offset));
      return {
        data: Array.from({ length }, (_, i) => ({
          reference: `charge-${offset + i}`,
          domain: "live",
          currency: "NGN",
          amount: 100,
        })),
        meta: { total },
      };
    },
    verifyTransaction: async () => ({
      status: true,
      data: { status: "success", domain: "live" },
    }),
  },
  "@/lib/paymentSync": {
    syncVerifiedPayment: async (reference, verified, options) => {
      calls.push({ reference, apply: options?.apply });
      if (fakeNow !== null) fakeNow += processingDelay;
      if (archiveCharge && reference === "charge-1")
        throw new Error("No account matches the verified payment");
      if (fail && reference === "charge-0")
        throw new Error("Cannot attribute charge");
      return {
        action: "import",
        payment: { id: reference, amountNgn: 1, revenueStatus: "LIVE" },
      };
    },
  },
};
new Function(
  "module",
  "exports",
  "require",
  ts.transpileModule(fs.readFileSync("lib/paymentReconciliation.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
)(mod, mod.exports, (n) => {
  if (n in dependencies) return dependencies[n];
  throw new Error(`Unexpected dependency ${n}`);
});
const { reconcilePaymentBatch, reconcileAllPaymentHistory } = mod.exports;
const previousKey = process.env.PAYSTACK_SECRET_KEY;
process.env.PAYSTACK_SECRET_KEY = "sk_live_unit_test";
(async () => {
  const first = await reconcilePaymentBatch({ maxPages: 1 });
  assert.equal(first.imported, 1);
  assert.equal(first.complete, false);
  assert.equal(state.nextPage, 2);
  assert.equal(state.leaseToken, null);
  const snapshot = state.scanTo;
  const second = await reconcilePaymentBatch({ maxPages: 20 });
  assert.equal(second.complete, true);
  assert.equal(second.imported, 11);
  assert.equal(state.nextPage, 1);
  assert.equal(state.scanTo, null);
  assert.equal(state.lastSyncedAt.getTime(), snapshot.getTime());
  assert.equal(providerCalls[1].to.getTime(), providerCalls[0].to.getTime());
  busy = true;
  const before = providerCalls.length;
  assert.equal((await reconcilePaymentBatch()).busy, true);
  assert.equal(providerCalls.length, before);
  busy = false;
  fail = true;
  const failed = await reconcilePaymentBatch({ maxPages: 2 });
  assert.equal(failed.failed, 1);
  assert.equal(issues.get("charge-0").attempts, 1);
  assert.equal(issues.get("charge-0").resolvedAt, undefined);
  fail = false;
  await reconcilePaymentBatch({ maxPages: 1 });
  assert(issues.get("charge-0").resolvedAt instanceof Date);
  archiveCharge = true;
  state.scanTo = null;
  state.nextPage = 1;
  const archived = await reconcilePaymentBatch({ maxPages: 2 });
  assert.equal(
    archived.failed,
    0,
    "verified revenue from unavailable historical accounts must be retained without permanent retries",
  );
  assert.equal(archived.reconciled, 1);
  archiveCharge = false;
  const savedDateNow = Date.now;
  fakeNow = savedDateNow();
  Date.now = () => fakeNow;
  try {
    const previousPage = state.nextPage;
    processingDelay = 100;
    const interrupted = await reconcilePaymentBatch({
      maxPages: 5,
      budgetMs: 50,
    });
    assert.equal(interrupted.imported, 1);
    assert.equal(
      state.nextPage,
      previousPage + 1,
      "checkpoint must advance after each durable charge even when budget expires",
    );
    processingDelay = 0;
    await reconcilePaymentBatch({ maxPages: 1, budgetMs: 50 });
    assert.equal(
      state.nextPage,
      previousPage + 2,
      "the next run must continue beyond the prior charge",
    );
  } finally {
    Date.now = savedDateNow;
    fakeNow = null;
    processingDelay = 0;
  }
  schemaReady = false;
  await assert.rejects(reconcilePaymentBatch(), /database migration/);
  schemaReady = true;
  history = true;
  providerCalls = [];
  calls = [];
  const dry = await reconcileAllPaymentHistory();
  assert.equal(dry.providerCharges, 51);
  assert.equal(dry.imported, 51);
  assert.equal(dry.providerRevenueNgn, 51);
  assert.equal(providerCalls.length, 2);
  assert(calls.every((c) => c.apply === false));
  assert.equal(dry.applied, false);
  process.env.PAYSTACK_SECRET_KEY = "sk_test_unit_test";
  await assert.rejects(reconcilePaymentBatch());
  await assert.rejects(reconcileAllPaymentHistory({ apply: true }));
  console.log(
    "Reconciliation checks passed: all pages, stable snapshots, resume checkpoints, worker leases, unresolved retries, read-only audits and live-key enforcement.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (previousKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = previousKey;
  });
