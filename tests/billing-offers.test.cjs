const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, cache = new Map()) {
  // Route tests isolate email side effects; the outbox has its own integration tests.
  mocks = { '@/lib/billingBenefitNotifications': { queueOfferEmails: async () => 0, scheduleBenefitEmailDelivery: () => {} }, ...mocks };
  if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', js)(name => name.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : name in mocks ? mocks[name] : name.startsWith('@/') ? load(`${name.slice(2)}.ts`, mocks, cache) : require(name), mod, mod.exports);
  cache.set(file, mod.exports); return mod.exports;
}
const rules = load('lib/billingOfferRules.ts');
const access = load('lib/complimentaryAccess.ts');
const parse = load('lib/adminBillingOfferRules.ts').parseBillingOffer;
const now = new Date('2026-10-06T12:00:00Z');
const offer = (changes = {}) => ({ id: 'offer', title: 'Community discount', product: 'BOTH', deliveryTier: null, workspacePlan: null, billingCycle: null, percent: 20, durationMonths: 3, audience: 'ALL', availableUntil: null, revokedAt: null, createdAt: now, ...changes });
const validInput = { title: 'Welcome creators', product: 'BOTH', deliveryTier: '', workspacePlan: '', billingCycle: 'MONTHLY', percent: 20, durationMonths: 3, audience: 'ALL', creatorIds: [] };

test('targeted offers take priority, never stack, and respect product, plan and cycle', () => {
  const global = offer({ percent: 40 });
  const selected = offer({ id: 'personal', audience: 'SELECTED', percent: 15, product: 'CONTENT_WORKSPACE', workspacePlan: 'STUDIO', billingCycle: 'MONTHLY' });
  assert.equal(rules.chooseOffer([global, selected], 'CONTENT_WORKSPACE', 'STUDIO', 'MONTHLY', now).percent, 15);
  assert.equal(rules.chooseOffer([global, selected], 'DELIVERY', 'STARTER', 'MONTHLY', now).percent, 40);
  assert.equal(rules.chooseOffer([global, selected], 'CONTENT_WORKSPACE', 'CREATOR', 'MONTHLY', now).percent, 40);
  assert.equal(rules.chooseOffer([offer({ availableUntil: now })], 'DELIVERY', 'STARTER', 'MONTHLY', now), null);
  assert.equal(rules.chooseOffer([offer({ revokedAt: now })], 'DELIVERY', 'STARTER', 'MONTHLY', now), null);
});
test('annual discounts require whole years and use the already discounted annual catalogue price', () => {
  assert.equal(rules.chooseOffer([offer()], 'DELIVERY', 'STARTER', 'ANNUAL', now), null);
  assert.equal(rules.discountCycles(24, 'ANNUAL'), 2);
  assert.throws(() => rules.discountCycles(3, 'ANNUAL'));
  assert.equal(rules.discountedPrice(rules.priceForProduct('CONTENT_WORKSPACE', 'CREATOR', 'ANNUAL'), 20), 44688);
  assert.equal(rules.addCalendarMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString(), '2026-02-28T10:00:00.000Z');
});
test('admin validation rejects invalid percentages, durations, scopes and unacknowledged complimentary billing', () => {
  for (const change of [{ percent: 20.5 }, { percent: 0 }, { percent: 101 }, { durationMonths: 0 }, { durationMonths: 3.5 }, { durationMonths: 37 }, { product: 'PORTFOLIO' }, { deliveryTier: 'FREE' }, { workspacePlan: 'BAD' }, { billingCycle: 'ANNUAL' }, { audience: 'SELECTED' }, { percent: 100 }]) assert.throws(() => parse({ ...validInput, ...change }, now));
  const comp = parse({ ...validInput, percent: 100, deliveryTier: 'GROWTH', workspacePlan: 'STUDIO', audience: 'SELECTED', creatorIds: ['one', 'one', 'two'], acknowledgeExistingBilling: true }, now);
  assert.deepEqual(comp.creatorIds, ['one', 'two']); assert.equal(comp.billingCycle, null);
  assert.throws(() => parse({ ...validInput, availableUntil: '2026-10-05' }, now));
});
test('complimentary grants are scoped, expire precisely, and fall back through overlaps', () => {
  const account = { isComped: false, billingComplimentaryGrants: [
    { product: 'DELIVERY', plan: 'GROWTH', startsAt: '2026-09-01', endsAt: '2026-12-01' },
    { product: 'DELIVERY', plan: 'UNLIMITED', startsAt: '2026-09-01', endsAt: now.toISOString() },
  ] };
  assert.equal(access.deliveryComplimentaryTier(account, now), 'GROWTH');
  assert.equal(access.workspaceComplimentaryPlan(account, now), null);
  assert.equal(access.workspaceComplimentaryPlan({ isComped: true, compedUntil: now }, now), null);
  assert.equal(access.deliveryComplimentaryTier({ isComped: true }, now), null);
  assert.equal(access.workspaceComplimentaryPlan({ isComped: true }, now), 'STUDIO');
});
test('complimentary Delivery quota cycles reset monthly without restarting on every read', () => {
  const account = { billingComplimentaryGrants: [{ product: 'DELIVERY', plan: 'STARTER', startsAt: '2026-01-31T10:00:00Z', endsAt: '2027-01-31T10:00:00Z' }] };
  assert.equal(access.deliveryComplimentaryCycleStart(account, new Date('2026-03-01T12:00:00Z')).toISOString(), '2026-02-28T10:00:00.000Z');
  assert.equal(access.deliveryComplimentaryCycleStart(account, new Date('2026-03-31T10:00:00Z')).toISOString(), '2026-03-31T10:00:00.000Z');
});
function fixture(options = {}) {
  const state = { offers: options.offers ?? [offer()], subscriptions: [], redemptions: [], charges: [], createdPlans: [], initialized: [], restored: [], restoreFailures: 0, conflicts: 0 };
  const tx = {
    billingOffer: { findMany: async ({ where }) => {
      const id = where.AND[0].OR[1].recipients.some.creatorId;
      return state.offers.filter(o => !o.revokedAt && (!o.availableUntil || o.availableUntil > new Date()) && (o.audience === 'ALL' || o.creatorIds?.includes(id)));
    } },
    billingOfferSubscription: {
      create: async ({ data }) => { const s = { id: `snapshot-${state.subscriptions.length}`, status: 'CHECKOUT', paidCycles: 0, activatedAt: null, restoredAt: null, subscriptionCode: null, ...data }; state.subscriptions.push(s); return s; },
      findUnique: async ({ where }) => state.subscriptions.find(s => Object.entries(where).every(([key,value]) => s[key] === value)) ?? null,
      findFirst: async ({ where }) => { const s = state.subscriptions.find(s => where.OR.some(part => Object.entries(part).every(([key,value]) => s[key] === value))); return s ? { ...s, creator: { email: `${s.creatorId}@example.com` } } : null; },
      findMany: async ({ where }) => state.subscriptions.filter(s => Object.entries(where).every(([key,value]) => typeof value === 'object' && value !== null ? true : s[key] === value)),
      update: async ({ where, data }) => { const s = state.subscriptions.find(s => s.id === where.id); for (const [key,value] of Object.entries(data)) s[key] = value?.increment !== undefined ? s[key] + value.increment : value; return s; },
      updateMany: async ({ where, data }) => { for (const s of state.subscriptions.filter(s => ['offerId','creatorId','product'].every(k => s[k] === where[k]) && !s.restoredAt)) Object.assign(s, data); return { count: 1 }; },
    },
    billingOfferRedemption: {
      findMany: async ({ where }) => state.redemptions.filter(r => Object.entries(where).every(([key,value]) => r[key] === value)),
      findUnique: async ({ where }) => state.redemptions.find(r => Object.entries(where.offerId_creatorId_product).every(([key,value]) => r[key] === value)) ?? null,
      create: async ({ data }) => { const r = { id: `redemption-${state.redemptions.length}`, paidCycles: 0, ...data }; state.redemptions.push(r); return r; },
      update: async ({ where, data }) => { const r = state.redemptions.find(r => r.id === where.id); for (const [key,value] of Object.entries(data)) r[key] = value?.increment !== undefined ? r[key] + value.increment : value; return r; },
    },
    billingOfferCharge: {
      findUnique: async ({ where }) => state.charges.find(c => c.reference === where.reference) ?? null,
      create: async ({ data }) => { state.charges.push(data); return data; },
    },
  };
  const db = { ...tx, $transaction: async (fn, opts) => { assert.equal(opts.isolationLevel, 'Serializable'); if (state.conflicts-- > 0) throw Object.assign(new Error('conflict'), { code: 'P2034' }); return fn(tx); } };
  const paystack = {
    createPlan: async params => { state.createdPlans.push(params); return { status: true, data: { plan_code: `private-${state.createdPlans.length}` } }; },
    initializeSubscription: async params => { state.initialized.push(params); return { status: true, data: { authorization_url: 'https://checkout.paystack.com/test' } }; },
    updatePrivatePlanPrice: async (code, amount) => { if (state.restoreFailures-- > 0) throw new Error('provider offline'); state.restored.push({ code, amount }); },
    verifyTransaction: async () => { throw new Error('Use a verified fixture'); },
  };
  process.env.PAYSTACK_PLAN_CODE_STARTER_MONTHLY = 'delivery-starter';
  process.env.PAYSTACK_CONTENT_WORKSPACE_CREATOR_MONTHLY_PLAN_CODE = 'workspace-creator';
  process.env.PAYSTACK_CONTENT_WORKSPACE_CREATOR_ANNUAL_PLAN_CODE = 'workspace-creator-annual';
  const service = load('lib/billingOffers.ts', { '@/lib/db': { db }, '@/lib/paystack': paystack });
  function params(product = 'DELIVERY', reference = 'checkout-1') {
    return { email: 'owner@example.com', reference, callbackUrl: 'https://example.com/billing', planCode: product === 'DELIVERY' ? 'delivery-starter' : 'workspace-creator', amount: product === 'DELIVERY' ? 590000 : 490000, metadata: { creatorId: 'owner' } };
  }
  function verified(snapshot, reference = snapshot.checkoutReference, changes = {}) {
    return { status: true, data: { reference, status: 'success', domain: 'live', currency: 'NGN', amount: snapshot.discountedPriceNgn * 100, plan: { plan_code: snapshot.paystackPlanCode }, customer: { email: 'owner@example.com' }, paid_at: new Date().toISOString(), ...changes } };
  }
  return { service, state, params, verified };
}
test('both product checkouts use private recurring plans with an authoritative discount snapshot', async () => {
  for (const product of ['DELIVERY', 'CONTENT_WORKSPACE']) {
    const f = fixture(); await f.service.initializeOfferSubscription(f.params(product));
    assert.equal(f.state.createdPlans.length, 1);
    assert.equal(f.state.createdPlans[0].amountNgn, product === 'DELIVERY' ? 4720 : 3920);
    assert.equal(f.state.subscriptions[0].product, product);
    assert.equal(f.state.initialized[0].planCode, 'private-1');
    assert.equal(f.state.initialized[0].metadata.creatorId, 'owner');
    assert.equal(f.state.initialized[0].metadata.billingOfferSubscriptionId, 'snapshot-0');
    assert.equal(f.state.subscriptions[0].activatedAt, null);
  }
});
test('an audience mismatch or revoked offer keeps normal checkout; stale accepted prices are rejected', async () => {
  const f = fixture({ offers: [offer({ audience: 'SELECTED', creatorIds: ['someone-else'] })] });
  await f.service.initializeOfferSubscription(f.params()); assert.equal(f.state.createdPlans.length, 0); assert.equal(f.state.initialized[0].amount, 590000);
  await assert.rejects(() => f.service.initializeOfferSubscription({ ...f.params(), expectedQuote: { amountNgn: 4720, offerId: 'offer' } }), /BILLING_QUOTE_CHANGED/);
});
test('annual checkout uses the annual recurring interval and correct discounted annual amount', async () => {
  const f = fixture({ offers: [offer({ durationMonths: 12 })] });
  await f.service.initializeOfferSubscription({ ...f.params('CONTENT_WORKSPACE'), planCode: 'workspace-creator-annual', amount: 5586000 });
  assert.equal(f.state.createdPlans[0].interval, 'annually'); assert.equal(f.state.createdPlans[0].amountNgn, 44688);
  assert.equal(f.state.subscriptions[0].billingCycle, 'ANNUAL');
});
test('private plan mapping survives renewal and binds callbacks to the correct owner', async () => {
  const f = fixture(); await f.service.initializeOfferSubscription(f.params());
  assert.deepEqual(await f.service.resolveDeliveryPlan('private-1', 'owner'), { tier: 'STARTER', cycle: 'MONTHLY' });
  assert.equal(await f.service.resolveDeliveryPlan('private-1', 'another-owner'), null);
  assert.equal(await f.service.resolveWorkspacePlan('private-1'), null);
});
test('duration starts after payment, duplicates count once, and final discounted invoice restores the next price', async () => {
  const f = fixture({ offers: [offer({ durationMonths: 2 })] }); await f.service.initializeOfferSubscription(f.params());
  const snapshot = f.state.subscriptions[0];
  await f.service.recordOfferPayment('checkout-1', f.verified(snapshot));
  const anchor = snapshot.discountEndsAt.toISOString();
  await f.service.recordOfferPayment('checkout-1', f.verified(snapshot));
  assert.equal(f.state.charges.length, 1); assert.equal(f.state.redemptions[0].paidCycles, 1); assert.equal(f.state.restored.length, 0);
  await f.service.recordOfferPayment('renewal-1', f.verified(snapshot, 'renewal-1'));
  assert.equal(f.state.redemptions[0].paidCycles, 2); assert.deepEqual(f.state.restored, [{ code: 'private-1', amount: 5900 }]);
  assert.equal(snapshot.discountEndsAt.toISOString(), anchor); assert.equal(snapshot.status, 'STANDARD');
  assert.equal((await f.service.offerQuote('owner', 'DELIVERY', 'STARTER', 'MONTHLY')).offer, null);
  assert.equal((await f.service.offerQuote('owner', 'CONTENT_WORKSPACE', 'CREATOR', 'MONTHLY')).offer.id, 'offer');
});
test('switching checkout preserves the original expiry and shares the remaining invoice budget', async () => {
  const f = fixture(); await f.service.initializeOfferSubscription(f.params());
  await f.service.recordOfferPayment('checkout-1', f.verified(f.state.subscriptions[0]));
  const originalEnd = f.state.redemptions[0].discountEndsAt.toISOString();
  await f.service.initializeOfferSubscription(f.params('DELIVERY', 'checkout-2'));
  await f.service.recordOfferPayment('checkout-2', f.verified(f.state.subscriptions[1]));
  assert.equal(f.state.subscriptions[1].discountEndsAt.toISOString(), originalEnd);
  assert.equal(f.state.redemptions[0].paidCycles, 2);
});
test('verification failures, owner mismatches and amount mismatches cannot activate an offer', async () => {
  const f = fixture(); await f.service.initializeOfferSubscription(f.params()); const s = f.state.subscriptions[0];
  for (const changes of [{ status: 'failed' }, { currency: 'USD' }, { domain: 'unknown' }, { reference: 'other' }]) await f.service.recordOfferPayment('checkout-1', f.verified(s, 'checkout-1', changes));
  await assert.rejects(() => f.service.recordOfferPayment('checkout-1', f.verified(s, 'checkout-1', { customer: { email: 'attacker@example.com' } })), /owner mismatch/);
  await assert.rejects(() => f.service.recordOfferPayment('checkout-1', f.verified(s, 'checkout-1', { amount: 1 })), /amount mismatch/);
  assert.equal(f.state.redemptions.length, 0); assert.equal(f.state.charges.length, 0);
});
test('provider restoration errors persist for retry without counting an invoice twice', async () => {
  const f = fixture({ offers: [offer({ durationMonths: 1 })] }); await f.service.initializeOfferSubscription(f.params()); const s = f.state.subscriptions[0];
  f.state.restoreFailures = 1;
  await assert.rejects(() => f.service.recordOfferPayment('checkout-1', f.verified(s)), /provider offline/);
  assert.equal(s.status, 'RESTORE_PENDING'); assert.equal(f.state.charges.length, 1);
  await f.service.recordOfferPayment('checkout-1', f.verified(s));
  assert.equal(s.status, 'STANDARD'); assert.equal(f.state.charges.length, 1); assert.equal(f.state.restored.length, 1);
});
test('serialization conflicts retry before changing the redemption budget', async () => {
  const f = fixture(); await f.service.initializeOfferSubscription(f.params()); f.state.conflicts = 1;
  await f.service.recordOfferPayment('checkout-1', f.verified(f.state.subscriptions[0])); assert.equal(f.state.charges.length, 1);
});
test('Workspace grants preserve the exact selected feature tier and paid higher tiers remain available', () => {
  const service = load('lib/contentWorkspaceUsage.ts', { '@/lib/db': { db: {} } });
  const account = { id: 'owner', isComped: false, compedUntil: null, contentWorkspacePlan: null, contentWorkspaceBillingStatus: 'OFFLINE', contentWorkspaceTrialEndsAt: null,
    workspaceCompedPlan: 'CREATOR', workspaceCompedUntil: new Date(Date.now() + 86400000) };
  assert.equal(service.canAccessContentWorkspace(account), true);
  assert.equal(service.getContentWorkspacePlan(account), 'CREATOR');
  assert.equal(service.canUseContentWorkspaceFeature(account, 'socialInbox'), false);
  assert.equal(service.getContentWorkspacePlan({ ...account, contentWorkspacePlan: 'UNLIMITED', contentWorkspaceBillingStatus: 'ACTIVE' }), 'UNLIMITED');
});
test('user benefit cards distinguish available discounts from applied access with exact savings and end dates', async () => {
  const Benefits = load('components/billing/BillingBenefits.tsx', {
    '@/components/billing/SubscriptionCheckoutButton': { default: () => null, __esModule: true },
    '@/lib/db': { db: { billingOfferSubscription: { findMany: async () => [{ id: 'gift', product: 'DELIVERY', plan: 'GROWTH', title: 'Studio thank-you', status: 'COMPLIMENTARY', discountEndsAt: new Date('2027-01-06'), percent: 100 }] } } },
    '@/lib/billingOffers': { billingPriceQuotes: async () => ({ 'CONTENT_WORKSPACE:CREATOR:MONTHLY': { title: 'Welcome offer', percent: 20, months: 3, standardPriceNgn: 4900, priceNgn: 3920, remainingCycles: 3 } }) },
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children), __esModule: true },
  }).default;
  const html = renderToStaticMarkup(await Benefits({ creator: { id: 'owner' } }));
  assert.match(html, /Project Delivery.*Growth/); assert.match(html, /Free access/); assert.match(html, /6 Jan 2027/);
  assert.match(html, /Offers available on your next checkout/); assert.match(html, /₦3,920/); assert.match(html, /3 payment/);
});


test('delayed older payment events preserve the earliest qualifying payment as the duration anchor', async () => {
  const f = fixture(); await f.service.initializeOfferSubscription(f.params()); const s = f.state.subscriptions[0];
  const today = new Date(); const earlier = new Date(today.getTime() - 86400000);
  await f.service.recordOfferPayment('renewal', f.verified(s, 'renewal', { paid_at: today.toISOString() }));
  await f.service.recordOfferPayment('checkout-1', f.verified(s, 'checkout-1', { paid_at: earlier.toISOString() }));
  assert.equal(f.state.redemptions[0].activatedAt.toISOString(), earlier.toISOString());
  assert.equal(s.discountEndsAt.toISOString(), rules.addCalendarMonths(earlier, 3).toISOString());
});

test('admin offer creation checks authorization before touching data', async () => {
  const route = load('app/api/admin/billing-offers/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ id: 'customer', email: 'customer@example.com' }) },
    '@/lib/admin': { isAdminEmail: () => false }, '@/lib/db': { db: {} },
  });
  const result = await route.POST({ json: async () => { throw new Error('Must not read a request before authorization'); } });
  assert.equal(result.status, 401);
});

test('selected-user discounts cannot silently include missing or deactivated accounts', async () => {
  const route = load('app/api/admin/billing-offers/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ id: 'admin', email: 'admin@example.com' }) },
    '@/lib/admin': { isAdminEmail: () => true },
    '@/lib/db': { db: { billingOffer: { findUnique: async () => null }, creator: { count: async () => 1 } } },
  });
  const response = await route.POST({ json: async () => ({ ...validInput, audience: 'SELECTED', creatorIds: ['one', 'missing'], requestId: 'b0d2c052-19ba-49e4-b570-374947e581b0' }) });
  assert.equal(response.status, 400); assert.match(response.body.error, /unavailable/);
});

test('complimentary access stores product grants and recipient projections atomically without changing paid subscriptions', async () => {
  const grants = [], writes = [];
  const tx = {
    billingOffer: { create: async ({ data }) => data },
    billingOfferSubscription: {
      createMany: async ({ data }) => { grants.push(...data.map((d,i) => ({ id: `grant-${i}`, createdAt: new Date(), ...d }))); },
      findMany: async () => grants,
    },
    creator: { updateMany: async args => { writes.push(args); } },
  };
  const route = load('app/api/admin/billing-offers/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ id: 'admin', email: 'admin@example.com' }) },
    '@/lib/admin': { isAdminEmail: () => true },
    '@/lib/db': { db: { billingOffer: { findUnique: async () => null }, creator: { count: async () => 2 }, $transaction: async (fn, options) => { assert.equal(options.isolationLevel, 'Serializable'); return fn(tx); } } },
  });
  const response = await route.POST({ json: async () => ({ ...validInput, percent: 100, audience: 'SELECTED', deliveryTier: 'GROWTH', workspacePlan: 'CREATOR', creatorIds: ['one','two'], acknowledgeExistingBilling: true, requestId: 'b0d2c052-19ba-49e4-b570-374947e581b0' }) });
  assert.equal(response.status, 201); assert.equal(grants.length, 4); assert.equal(writes.length, 1);
  assert.equal(writes[0].data.deliveryCompedTier, 'GROWTH'); assert.equal(writes[0].data.workspaceCompedPlan, 'CREATOR');
  assert.equal(writes[0].data.billingComplimentaryGrants.length, 2); assert.equal(writes[0].data.subscriptionActive, undefined);
});

test('turning off the legacy global discount also stops its imported offer atomically', async () => {
  const mutations = [];
  const route = load('app/api/admin/settings/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ email: 'admin@example.com' }) }, '@/lib/admin': { isAdminEmail: () => true },
    '@/lib/db': { db: { $transaction: async fn => fn({ platformSettings: { upsert: async args => mutations.push(args) }, billingOffer: { updateMany: async args => mutations.push(args) } }) } },
  });
  const result = await route.POST({ json: async () => ({ globalDiscountPercent: 0 }) });
  assert.equal(result.status, 200); assert.equal(mutations[0].update.globalDiscountPercent, 0);
  assert.equal(mutations[1].where.id, 'legacy-global-delivery'); assert.equal(mutations[1].data.revokedBy, 'admin@example.com');
});

test('legacy controls cannot create unspecified financial benefits or erase a running provider subscription', async () => {
  const route = load('app/api/admin/creators/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ email: 'admin@example.com' }) }, '@/lib/admin': { isAdminEmail: () => true },
    '@/lib/db': { db: { creator: { findUnique: async () => ({ id: 'owner', paystackSubscriptionCode: 'active-provider-subscription' }) } } },
  });
  const params = { params: Promise.resolve({ id: 'owner' }) };
  for (const body of [{ isComped: true }, { discountPercent: 20 }, { resetBilling: true }]) {
    const result = await route.PATCH({ json: async () => body }, params); assert.equal(result.status, 409);
  }
  const invalid = await route.PATCH({ json: async () => ({ freeTierLimitOverride: 2147483648 }) }, params);
  assert.equal(invalid.status, 400);
});


test('an optional benefits panel cannot crash the dashboard when development has an old Prisma client', async () => {
  const Benefits = load('components/billing/BillingBenefits.tsx', {
    '@/lib/db': { db: {} }, '@/lib/billingOffers': { billingPriceQuotes: async () => { throw new Error('Should not query'); } },
    '@/components/billing/SubscriptionCheckoutButton': { default: () => null, __esModule: true },
    'next/link': { default: () => null, __esModule: true },
  }).default;
  assert.equal(await Benefits({ creator: { id: 'owner' } }), null);
});
test('an unapplied billing migration hides the optional benefits panel instead of crashing the dashboard', async () => {
  const Benefits = load('components/billing/BillingBenefits.tsx', {
    '@/lib/db': { db: { billingOfferSubscription: { findMany: async () => { throw Object.assign(new Error('missing table'), { code: 'P2021' }); } } } },
    '@/lib/billingOffers': { billingPriceQuotes: async () => ({}) },
    '@/components/billing/SubscriptionCheckoutButton': { default: () => null, __esModule: true },
    'next/link': { default: () => null, __esModule: true },
  }).default;
  assert.equal(await Benefits({ creator: { id: 'owner' } }), null);
});
