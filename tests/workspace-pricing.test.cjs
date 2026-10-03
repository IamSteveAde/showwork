const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, deps = {}) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => {
    if (name in deps) return deps[name];
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const plans = load('lib/contentWorkspaceEntitlements.ts');
test('Unlimited survives usage JSON and remains above normal account usage', () => {
  const limits = JSON.parse(JSON.stringify(plans.getContentWorkspaceEntitlements('UNLIMITED')));
  assert.ok(100000 < limits.activeWorkspaces);
  assert.ok(100000 < limits.collaborators);
  assert.equal(plans.formatWorkspaceLimit(limits.activeWorkspaces), 'Unlimited');
  assert.equal(limits.storageBytes, 200000000000);
  assert.equal(limits.aiGenerations, 2000);
});
test('upgrade path includes Unlimited and resolves its monthly and annual webhook codes', () => {
  assert.equal(plans.getNextContentWorkspacePlan('STUDIO'), 'UNLIMITED');
  assert.equal(plans.getNextContentWorkspacePlan('UNLIMITED'), null);
  for (const cycle of ['MONTHLY', 'ANNUAL']) {
    const key = plans.getContentWorkspacePlanCodeEnv('UNLIMITED', cycle);
    const old = process.env[key];
    try {
      process.env[key] = `test_${cycle}`;
      assert.deepEqual(plans.contentWorkspacePlanFromPaystackPlanCode(`test_${cycle}`), { plan: 'UNLIMITED', cycle });
    } finally { if (old === undefined) delete process.env[key]; else process.env[key] = old; }
  }
});
function upgradeHarness(status, configured = true, current = "STUDIO", target = "UNLIMITED") {
  const updates = [];
  const checkouts = [];
  const account = { id: 'owner', email: 'test@example.com', contentWorkspacePlan: current, contentWorkspaceBillingStatus: status, contentWorkspaceBillingCycle: 'MONTHLY', contentWorkspaceTrialEndsAt: new Date(Date.now() + 86400000) };
  const handler = load('app/api/calendars/upgrade-to-company/route.ts', {
    '@/lib/calendarPaymentReturn': { calendarPaymentReturn: async () => 'https://example.com/callback' },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ id: 'owner' }) },
    '@/lib/db': { db: { creator: { findUnique: async () => account, update: async ({ data }) => updates.push(data) } } },
    '@/lib/paystack': { initializeSubscription: async body => { checkouts.push(body); return { data: { authorization_url: 'https://checkout.test' } }; }, cancelSubscription: async () => {} },
    '@/lib/url': { appUrl: () => 'https://example.com' },
    '@/lib/contentWorkspaceEntitlements': { ...plans, getContentWorkspacePlanCode: () => { if (!configured) throw new Error('Missing test configuration'); return 'test_plan'; } },
  });
  return { updates, checkouts, run: () => handler.POST({ json: async () => ({ plan: target, billingCycle: 'ANNUAL' }) }) };
}
test('paid Unlimited upgrade charges annual kobo amount without granting unpaid entitlements', async () => {
  const h = upgradeHarness('ACTIVE');
  const result = await h.run();
  assert.equal(result.body.authorizationUrl, 'https://checkout.test');
  assert.equal(h.checkouts[0].amount, 68286000);
  assert.equal(h.checkouts[0].metadata.contentWorkspacePlan, 'UNLIMITED');
  assert.ok(h.updates.every(data => !('contentWorkspacePlan' in data)));
});
test('active trial can upgrade without payment or extending the trial deadline', async () => {
  const h = upgradeHarness('TRIAL');
  const result = await h.run();
  assert.equal(result.body.stillInTrial, true);
  assert.equal(h.checkouts.length, 0);
  assert.equal(h.updates[0].contentWorkspacePlan, 'UNLIMITED');
  assert.ok(!('contentWorkspaceTrialEndsAt' in h.updates[0]));
});
test('historical workspace subscription codes remain recognizable after repricing', () => {
  const key = plans.getContentWorkspacePlanCodeEnv('STUDIO', 'ANNUAL');
  const old = process.env[key];
  const legacy = process.env[`${key}_LEGACY`];
  try {
    process.env[key] = 'new_annual'; process.env[`${key}_LEGACY`] = 'old_annual';
    assert.equal(plans.getContentWorkspacePlanCode('STUDIO', 'ANNUAL'), 'new_annual');
    assert.deepEqual(plans.contentWorkspacePlanFromPaystackPlanCode('old_annual'), { plan: 'STUDIO', cycle: 'ANNUAL' });
  } finally {
    if (old === undefined) delete process.env[key]; else process.env[key] = old;
    if (legacy === undefined) delete process.env[`${key}_LEGACY`]; else process.env[`${key}_LEGACY`] = legacy;
  }
});
test('failed Creator checkout preserves the current plan and subscription', async () => {
  const updates = [];
  let cancellations = 0;
  const account = { id: 'owner', email: 'test@example.com', contentWorkspacePlan: 'STUDIO', contentWorkspaceBillingStatus: 'ACTIVE', contentWorkspaceBillingCycle: 'ANNUAL', contentWorkspaceTrialEndsAt: null, contentWorkspacePaystackSubscriptionCode: 'existing', contentWorkspacePaystackEmailToken: 'existing_token' };
  const handler = load('app/api/calendars/downgrade-to-individual/route.ts', {
    '@/lib/calendarPaymentReturn': { calendarPaymentReturn: async () => 'https://example.com/callback' },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ id: 'owner' }) },
    '@/lib/db': { db: { creator: { findUnique: async () => account, update: async ({ data }) => updates.push(data) }, socialCalendar: { count: async () => 1 } } },
    '@/lib/paystack': { initializeSubscription: async () => { throw new Error('Plan not found'); }, cancelSubscription: async () => { cancellations++; } },
    '@/lib/url': { appUrl: () => 'https://example.com' },
    '@/lib/contentWorkspaceEntitlements': { ...plans, getContentWorkspacePlanCode: () => 'test_plan' },
  });
  const response = await handler.POST({ json: async () => ({ billingCycle: 'MONTHLY' }) });
  assert.equal(response.status, 500);
  assert.deepEqual(updates, []);
  assert.equal(cancellations, 0);
});

test('every lower plan is selectable and checkout uses its price without changing paid access', async () => {
  for (const [current, target] of [['UNLIMITED', 'STUDIO'], ['UNLIMITED', 'CREATOR'], ['STUDIO', 'CREATOR']]) {
    for (const cycle of ['MONTHLY', 'ANNUAL']) {
      const updates = [], checkouts = [];
      const handler = load('app/api/calendars/downgrade-to-individual/route.ts', {
        '@/lib/calendarPaymentReturn': { calendarPaymentReturn: async () => 'https://example.com/callback' },
        'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
        '@/lib/auth': { getCurrentCreator: async () => ({ id: 'owner' }) },
        '@/lib/db': { db: { creator: { findUnique: async () => ({ id: 'owner', email: 'test@example.com', contentWorkspacePlan: current, contentWorkspaceBillingStatus: 'ACTIVE' }), update: async ({ data }) => updates.push(data) }, socialCalendar: { count: async () => target === 'STUDIO' ? 10 : 1 } } },
        '@/lib/paystack': { initializeSubscription: async body => { checkouts.push(body); return { data: { authorization_url: 'https://checkout.test' } }; } },
        '@/lib/contentWorkspaceEntitlements': { ...plans, getContentWorkspacePlanCode: () => 'test_plan' },
      });
      const result = await handler.POST({ json: async () => ({ plan: target, billingCycle: cycle }) });
      assert.equal(result.status, 200);
      assert.equal(checkouts[0].metadata.contentWorkspacePlan, target);
      assert.equal(checkouts[0].amount, plans.CONTENT_WORKSPACE_PLANS[target][cycle === 'ANNUAL' ? 'priceNgnAnnual' : 'priceNgnMonthly'] * 100);
      assert.ok(updates.every(data => !('contentWorkspacePlan' in data)));
    }
  }
});

test('renewal recovery selects the exact subscription and persists its next payment date', async () => {
  const updates = [];
  const { syncContentWorkspaceRenewal } = load('lib/syncContentWorkspaceRenewal.ts', {
    '@/lib/db': { db: { creator: { findUnique: async () => ({ contentWorkspaceBillingStatus: 'ACTIVE', contentWorkspacePaystackCustomerCode: 'customer', contentWorkspacePaystackSubscriptionCode: 'workspace', contentWorkspaceSubscriptionRenewsAt: null }), update: async ({ data }) => updates.push(data) } } },
    '@/lib/paystack': { fetchCustomerSubscriptions: async () => ({ data: [{ subscription_code: 'delivery', next_payment_date: '2026-10-10T00:00:00Z' }, { subscription_code: 'workspace', next_payment_date: '2026-11-03T00:00:00Z' }] }) },
  });
  const date = await syncContentWorkspaceRenewal('owner');
  assert.equal(date.toISOString(), '2026-11-03T00:00:00.000Z');
  assert.equal(updates[0].contentWorkspaceSubscriptionRenewsAt.toISOString(), date.toISOString());
});

 test('all higher plans are selectable', async () => {
  for (const [current, target] of [['CREATOR', 'STUDIO'], ['CREATOR', 'UNLIMITED'], ['STUDIO', 'UNLIMITED']]) {
    const h = upgradeHarness('ACTIVE', true, current, target);
    const result = await h.run();
    assert.equal(result.status, 200);
    assert.equal(h.checkouts[0].metadata.contentWorkspacePlan, target);
    assert.equal(h.checkouts[0].amount, plans.CONTENT_WORKSPACE_PLANS[target].priceNgnAnnual * 100);
  }
});
