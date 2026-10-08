const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
function load(file, deps = {}) {
  const mod = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
  )(mod, mod.exports, (name) => {
    if (name in deps) return deps[name];
    if (name === "crypto") return require("node:crypto");
    throw new Error(`Unexpected dependency: ${name}`);
  });
  return mod.exports;
}
const classifier = load("lib/paymentRevenue.ts");
const receiptModule = load("lib/verifiedPaymentReceipt.ts", {
  "@/lib/paymentRevenue": classifier,
});
const planModule = load("lib/paystackPlan.ts");
const creatorId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const portfolioId = "33333333-3333-4333-8333-333333333333";
const account = { id: creatorId, email: "subscriber@example.com" };
const records = new Map(),
  receipts = new Map();
let commissions = 0;
const db = {
  paymentRecord: {
    findUnique: async ({ where }) =>
      records.get(where.paystackReference) ?? null,
    upsert: async ({ where, create, update }) => {
      const value = records.has(where.paystackReference)
        ? { ...records.get(where.paystackReference), ...update }
        : { id: `payment-${records.size}`, ...create };
      records.set(where.paystackReference, value);
      return value;
    },
  },
  paymentRevenueReceipt: {
    upsert: async ({ where, create, update }) => {
      const value = receipts.has(where.reference)
        ? { ...receipts.get(where.reference), ...update }
        : create;
      receipts.set(where.reference, value);
      return value;
    },
    update: async ({ where, data }) => {
      const value = { ...receipts.get(where.reference), ...data };
      receipts.set(where.reference, value);
      return value;
    },
  },
  creator: {
    findUnique: async ({ where }) => (where.id === creatorId ? account : null),
    findFirst: async ({ where }) =>
      where.email.equals.toLowerCase() === account.email ? account : null,
  },
  project: {
    findUnique: async ({ where }) =>
      where.id === projectId ? { id: projectId, creatorId } : null,
    findFirst: async () => null,
  },
  portfolio: {
    findUnique: async ({ where }) =>
      where.id === portfolioId ? { id: portfolioId, creatorId } : null,
    findFirst: async () => ({ id: portfolioId, creatorId }),
  },
  billingOfferSubscription: { findFirst: async () => null },
};
let schemaReady = true;
const { syncVerifiedPayment } = load("lib/paymentSync.ts", {
  "@/lib/db": { db },
  "@/lib/paymentRevenueSchema": {
    paymentRevenueSchema: async () => ({
      receipts: schemaReady,
      state: schemaReady,
      issues: schemaReady,
    }),
  },
  "@/lib/paystack": {
    verifyTransaction: async () => {
      throw new Error("Unexpected provider fetch");
    },
  },
  "@/lib/paystackPlan": planModule,
  "@/lib/verifiedPaymentReceipt": receiptModule,
  "@/lib/billingOffers": {
    resolveDeliveryPlan: async (code) =>
      code === "PLN_delivery" ? { tier: "STARTER", cycle: "MONTHLY" } : null,
    resolveWorkspacePlan: async (code) =>
      code === "PLN_workspace" ? { plan: "CREATOR", cycle: "MONTHLY" } : null,
  },
  "@/lib/partnerCommissions": {
    processReferralCommission: async () => {
      commissions++;
    },
  },
});
function charge(reference, overrides = {}) {
  return {
    status: true,
    data: {
      reference,
      status: "success",
      domain: "live",
      currency: "NGN",
      amount: 590000,
      paid_at: "2026-10-08T10:00:00Z",
      customer: { email: account.email },
      metadata: { creatorId },
      ...overrides,
    },
  };
}
const saved = {
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PORTFOLIO_PLAN_CODE: process.env.PAYSTACK_PORTFOLIO_PLAN_CODE,
  PAYSTACK_AI_ASSISTANT_PLAN_CODE: process.env.PAYSTACK_AI_ASSISTANT_PLAN_CODE,
  PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE:
    process.env.PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE,
};
Object.assign(process.env, {
  PAYSTACK_SECRET_KEY: "sk_live_unit_test",
  PAYSTACK_PORTFOLIO_PLAN_CODE: "PLN_portfolio",
  PAYSTACK_AI_ASSISTANT_PLAN_CODE: "PLN_ai",
  PAYSTACK_CALENDAR_INDIVIDUAL_PLAN_CODE: "PLN_calendar",
});
(async () => {
  const cases = [
    [
      `showwork_sub_${creatorId}_first`,
      { plan_object: { plan_code: "PLN_delivery" } },
      "SUBSCRIPTION_INITIAL",
      "delivery",
    ],
    [
      "delivery-renewal",
      { plan: { plan_code: "PLN_delivery" } },
      "SUBSCRIPTION_RENEWAL",
      "delivery",
    ],
    [
      `showwork_content_workspace_sub_${creatorId}_first`,
      { plan: "PLN_workspace" },
      "CONTENT_WORKSPACE_SUBSCRIPTION_INITIAL",
      "workspace",
    ],
    [
      "workspace-renewal",
      { plan: "PLN_workspace" },
      "CONTENT_WORKSPACE_SUBSCRIPTION_RENEWAL",
      "workspace",
    ],
    [
      `showwork_portfolio_sub_${portfolioId}_first`,
      { plan: "PLN_portfolio", metadata: { portfolioId } },
      "PORTFOLIO_SUBSCRIPTION_INITIAL",
      "portfolio",
    ],
    [
      "portfolio-renewal",
      { plan: "PLN_portfolio" },
      "PORTFOLIO_SUBSCRIPTION_RENEWAL",
      "portfolio",
    ],
    [
      "legacy-calendar-renewal",
      { plan: "PLN_calendar" },
      "CALENDAR_SUBSCRIPTION_RENEWAL",
      "workspace",
    ],
    [
      "ai-renewal",
      { plan: "PLN_ai" },
      "AI_ASSISTANT_SUBSCRIPTION_RENEWAL",
      "ai",
    ],
    [
      `spotlite_${projectId}_first`,
      { metadata: { projectId }, customer: { email: "client@example.com" } },
      "PROJECT_ONE_TIME",
      "delivery",
    ],
  ];
  cases.push(
    [
      `spotlite_66666666-6666-4666-8666-666666666666_deleted`,
      { metadata: { projectId: "66666666-6666-4666-8666-666666666666" } },
      "PROJECT_ONE_TIME",
      "delivery",
    ],
    [
      `showwork_portfolio_setup_77777777-7777-4777-8777-777777777777_legacy`,
      { metadata: {} },
      "PORTFOLIO_ONE_TIME",
      "portfolio",
    ],
  );
  for (const [ref, overrides, type, tool] of cases) {
    const result = await syncVerifiedPayment(ref, charge(ref, overrides));
    assert.equal(result.payment.type, type);
    assert.equal(result.payment.revenueStatus, "LIVE");
    assert.equal(receipts.get(ref).tool, tool);
    assert.equal(receipts.get(ref).amountKobo, 590000n);
    assert.equal(
      result.payment.createdAt.toISOString(),
      "2026-10-08T10:00:00.000Z",
    );
  }
  const [ref, overrides] = cases[0];
  await Promise.all([
    syncVerifiedPayment(ref, charge(ref, overrides)),
    syncVerifiedPayment(ref, charge(ref, overrides)),
  ]);
  assert.equal(records.size, cases.length);
  assert.equal(receipts.size, cases.length);
  records.set(ref, {
    ...records.get(ref),
    amountNgn: 1,
    revenueStatus: "UNVERIFIED",
  });
  await syncVerifiedPayment(ref, charge(ref, overrides));
  assert.equal(records.get(ref).amountNgn, 5900);
  assert.equal(records.get(ref).revenueStatus, "LIVE");
  const before = {
    records: records.size,
    receipts: receipts.size,
    commissions,
  };
  const preview = "showwork_sub_" + creatorId + "_preview";
  await syncVerifiedPayment(preview, charge(preview), { apply: false });
  assert.equal(records.size, before.records);
  assert.equal(receipts.size, before.receipts);
  assert.equal(commissions, before.commissions);
  const testRef = `showwork_sub_${creatorId}_test`;
  const test = await syncVerifiedPayment(
    testRef,
    charge(testRef, { domain: "test" }),
  );
  assert.equal(test.payment.revenueStatus, "EXCLUDED");
  assert(!receipts.has(testRef));
  const ghostRef = "showwork_sub_44444444-4444-4444-8444-444444444444_deleted";
  await assert.rejects(
    syncVerifiedPayment(
      ghostRef,
      charge(ghostRef, {
        metadata: {},
        customer: { email: "deleted@example.com" },
      }),
    ),
  );
  assert(
    receipts.has(ghostRef),
    "deleted accounts must retain verified revenue",
  );
  assert.equal(
    receipts.get(ghostRef).creatorId,
    "44444444-4444-4444-8444-444444444444",
    "verified historical account identity survives deletion",
  );
  const fractionalRef = `showwork_sub_${creatorId}_fractional`;
  await assert.rejects(
    syncVerifiedPayment(
      fractionalRef,
      charge(fractionalRef, { amount: 590001 }),
    ),
  );
  assert.equal(
    receipts.get(fractionalRef).amountKobo,
    590001n,
    "exact kobo retained even before attribution",
  );
  const tinyRef = `showwork_sub_${creatorId}_minor-units`;
  await assert.rejects(
    syncVerifiedPayment(tinyRef, charge(tinyRef, { amount: 29 })),
  );
  assert.equal(
    receipts.get(tinyRef).amountKobo,
    29n,
    "decimal NGN rounding must not exclude a real receipt",
  );
  for (const data of [
    { status: "failed" },
    { reference: "wrong" },
    { amount: 0 },
    { currency: "USD" },
    { domain: "unknown" },
    { paid_at: "bad" },
  ]) {
    const invalid = `showwork_sub_${creatorId}_invalid`;
    await assert.rejects(syncVerifiedPayment(invalid, charge(invalid, data)));
    assert(!receipts.has(invalid));
  }
  const foreign = `showwork_sub_${creatorId}_foreign`;
  await assert.rejects(
    syncVerifiedPayment(foreign, charge(foreign), {
      expectedCreatorId: "another-user",
    }),
  );
  assert(!records.has(foreign));
  const conflict = `showwork_sub_${creatorId}_conflict`;
  await assert.rejects(
    syncVerifiedPayment(
      conflict,
      charge(conflict, { metadata: { creatorId: "another-user" } }),
    ),
  );
  assert(!records.has(conflict));
  schemaReady = false;
  const legacyRef = `showwork_sub_${creatorId}_before-migration`;
  const legacyResult = await syncVerifiedPayment(legacyRef, charge(legacyRef));
  assert.equal(legacyResult.payment.revenueStatus, "LIVE");
  assert(
    !receipts.has(legacyRef),
    "matched payments must still be recorded before migration",
  );
  console.log(
    "Universal payment sync checks passed: all products, initial/renewal charges, duplicate events, amount repair, dry run, test exclusion, deleted accounts, exact kobo, verification and ownership.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
