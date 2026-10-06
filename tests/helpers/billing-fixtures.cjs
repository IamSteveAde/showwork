// Existing route tests isolate catalogue checkout from offer policy. Offer policy
// and provider transitions are exercised against the real module in billing-offers.test.cjs.
const fs = require('node:fs');
const ts = require('typescript');
function pure(file) {
  const mod = { exports: {} };
  new Function('module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod, mod.exports);
  return mod.exports;
}
const access = pure('lib/complimentaryAccess.ts');
const delivery = pure('lib/subscriptionTiers.ts');
const workspace = pure('lib/contentWorkspaceEntitlements.ts');
exports.withBillingDependencies = dependencies => ({
  '@/lib/complimentaryAccess': access,
  '@/components/billing/SubscriptionCheckoutButton': { default: ({ label }) => require('react').createElement('button', null, label), __esModule: true },
  '@/components/billing/BillingBenefits': { default: () => null, __esModule: true },
  '@/lib/billingOffers': {
    initializeOfferSubscription: params => dependencies['@/lib/paystack'].initializeSubscription(params),
    resolveDeliveryPlan: async code => (dependencies["@/lib/subscriptionTiers"] ?? delivery).tierFromPlanCode(code),
    resolveWorkspacePlan: async code => (dependencies["@/lib/contentWorkspaceEntitlements"] ?? workspace).contentWorkspacePlanFromPaystackPlanCode(code),
    recordOfferPayment: async () => {}, offerSubscriptionId: async () => null, billingPriceQuotes: async () => ({}),
  },
  ...dependencies,
});
