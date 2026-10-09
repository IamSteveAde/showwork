const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('lib/retryDatabaseRead.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('module', 'exports', code)(mod, mod.exports);
const { retryDatabaseRead } = mod.exports;

test('a dropped connection gets one retry and returns real data', async () => {
  for (const code of ['P1001', 'P1017']) {
    let calls = 0;
    const result = await retryDatabaseRead(async () => {
      if (++calls === 1) throw Object.assign(new Error('connection'), { code });
      return { clientName: 'Client' };
    });
    assert.deepEqual(result, { clientName: 'Client' });
    assert.equal(calls, 2);
  }
});
test('persistent connection failures propagate after the second attempt', async () => {
  let calls = 0;
  const error = Object.assign(new Error('connection'), { code: 'P1001' });
  await assert.rejects(retryDatabaseRead(async () => { calls++; throw error; }), e => e === error);
  assert.equal(calls, 2);
});
test('other failures propagate immediately', async () => {
  for (const error of [Object.assign(new Error('schema'), { code: 'P2022' }), new Error('unexpected'), null]) {
    let calls = 0;
    await assert.rejects(retryDatabaseRead(async () => { calls++; throw error; }), e => e === error);
    assert.equal(calls, 1);
  }
});
test('healthy reads run once', async () => {
  let calls = 0;
  assert.equal(await retryDatabaseRead(async () => { calls++; return 7; }), 7);
  assert.equal(calls, 1);
});
