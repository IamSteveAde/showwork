const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load() {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/paystack.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(require, mod, mod.exports);
  return mod.exports;
}
test('subscription checkout uses the current API key after configuration reload', async () => {
  const previousKey = process.env.PAYSTACK_SECRET_KEY;
  const previousFetch = global.fetch;
  const requests = [];
  try {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_old';
    const paystack = load();
    global.fetch = async (url, options) => {
      requests.push(options);
      return { ok: true, json: async () => ({ status: true, data: { authorization_url: 'https://checkout.test' } }) };
    };
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_current';
    await paystack.initializeSubscription({ email: 'test@example.com', reference: 'test', callbackUrl: 'https://example.com', planCode: 'PLN_current', amount: 590000 });
    assert.equal(requests[0].headers.Authorization, 'Bearer sk_test_current');
    assert.equal(JSON.parse(requests[0].body).plan, 'PLN_current');
    delete process.env.PAYSTACK_SECRET_KEY;
    await assert.rejects(paystack.initializeSubscription({ email: 'test@example.com', reference: 'test', callbackUrl: 'https://example.com', planCode: 'PLN_current', amount: 590000 }), /Missing PAYSTACK_SECRET_KEY/);
    assert.equal(requests.length, 1);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = previousKey;
  }
});
