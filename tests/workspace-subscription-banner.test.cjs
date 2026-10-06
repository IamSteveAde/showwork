const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, dependencies = {}) {
  dependencies = require("./helpers/billing-fixtures.cjs").withBillingDependencies(dependencies);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => name in dependencies ? dependencies[name] : require(name), mod, mod.exports);
  return mod.exports;
}
const plans = load('lib/contentWorkspaceEntitlements.ts');
const Banner = load('components/calendars/TrialCountdownBanner.tsx', { '@/lib/contentWorkspaceEntitlements': plans }).default;
const props = { plan: 'STUDIO', trialEndsAt: '2099-10-17T00:00:00Z', compedUntil: '2099-10-17T00:00:00Z' };
test('paid subscribers without complimentary access do not see the trial banner', () => {
  assert.equal(renderToStaticMarkup(React.createElement(Banner, { ...props, trialEndsAt: '', billingStatus: 'ACTIVE' })), '');
});
test('paid subscribers retain the complimentary banner with a disabled subscribed button', () => {
  for (const compedUntil of [props.compedUntil, null]) {
    const html = renderToStaticMarkup(React.createElement(Banner, { ...props, billingStatus: 'ACTIVE', isComped: true, compedUntil }));
    assert.match(html, /Complimentary access status/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Subscribed<\/button>/);
    assert.doesNotMatch(html, /Subscribe now|Subscribe &amp; restore access/);
  }
});
test('unpaid complimentary access keeps the banner and subscribe action', () => {
  const html = renderToStaticMarkup(React.createElement(Banner, { ...props, billingStatus: 'TRIAL', isComped: true }));
  assert.match(html, /Complimentary access status/);
  assert.match(html, /Subscribe now/);
});
test('unpaid trials still show their subscription action', () => {
  const html = renderToStaticMarkup(React.createElement(Banner, { ...props, billingStatus: 'TRIAL' }));
  assert.match(html, /Subscribe now/);
  assert.match(html, /Free trial/);
});

test('paid subscribers keep Agency trial access visible until their original deadline', () => {
  const html = renderToStaticMarkup(React.createElement(Banner, { ...props, billingStatus: 'ACTIVE' }));
  assert.match(html, /full Agency access/);
  assert.match(html, /Studio subscription active/);
  assert.doesNotMatch(html, /Free trial|Subscribe now|Continue without interruption|Billing cycle/);
});

test('paid Agency subscribers do not see trial messaging even with a future trial deadline', () => {
  assert.equal(renderToStaticMarkup(React.createElement(Banner, { ...props, plan: 'UNLIMITED', billingStatus: 'ACTIVE' })), '');
});
const Notice = load('components/calendars/WorkspaceFeatureNotice.tsx', {
  '@/lib/contentWorkspaceEntitlements': plans,
  'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children), __esModule: true },
}).default;
test('workspace trial notice identifies paid subscriptions and the original deadline', () => {
  const trialEndsAt = new Date('2099-10-17T00:00:00Z');
  const paid = renderToStaticMarkup(React.createElement(Notice, { trial: true, paidPlan: 'STUDIO', trialEndsAt }));
  assert.match(paid, /Studio subscription active/);
  assert.match(paid, /2099/);
  assert.match(paid, /paid plan continues afterward/);
  assert.doesNotMatch(paid, /Your selected plan applies|available for 7 days/);
  assert.equal(renderToStaticMarkup(React.createElement(Notice, { trial: true, paidPlan: 'UNLIMITED', trialEndsAt })), '');
  const unpaid = renderToStaticMarkup(React.createElement(Notice, { trial: true, trialEndsAt }));
  assert.match(unpaid, /Agency trial access/);
  assert.match(unpaid, /2099/);
});
