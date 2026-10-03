const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('lib/paymentRevenue.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod, mod.exports);
const classify = mod.exports.classifyPaymentRevenue;
const payment = { paystackReference: 'real-reference', amountNgn: 5000 };
const live = { status: true, data: { domain: 'live', status: 'success', reference: 'real-reference', currency: 'NGN', amount: 500000 } };
test('only verified matching live revenue is counted', () => {
  assert.equal(classify(payment, live).revenueStatus, 'LIVE');
  assert.equal(classify(payment, { ...live, data: { ...live.data, domain: 'test' } }).revenueStatus, 'EXCLUDED');
});
test('fake or mismatched charges never count as revenue', () => {
  for (const override of [{ reference: 'another-charge' }, { status: 'failed' }, { currency: 'USD' }, { amount: 100 }, { amount: 500001 }]) {
    assert.equal(classify(payment, { ...live, data: { ...live.data, ...override } }).revenueStatus, 'EXCLUDED');
  }
  assert.equal(classify(payment, { status: false, code: 'transaction_not_found' }).revenueStatus, 'UNVERIFIED');
  assert.equal(classify({ amountNgn: 5000 }, null).revenueStatus, 'EXCLUDED');
  assert.equal(classify({ ...payment, amountNgn: 0 }, { ...live, data: { ...live.data, amount: 0 } }).revenueStatus, 'EXCLUDED');
});
test('provider outages and unknown environments remain unverified for reconciliation', () => {
  assert.equal(classify(payment, null).revenueStatus, 'UNVERIFIED');
  assert.equal(classify(payment, { status: false }).revenueStatus, 'UNVERIFIED');
  assert.equal(classify(payment, { ...live, data: { ...live.data, domain: undefined } }).revenueStatus, 'UNVERIFIED');
});
