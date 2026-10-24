const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(processReplies, after) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/socialMessaging/dispatchAutoReply.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name === './autoReply') return { processSocialInboxAutoReplies: processReplies };
    if (name === 'next/server') return { after };
    throw Error(`Unexpected import ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
test('dispatch registers targeted processing with the response lifecycle and awaits completion', async () => {
  let callback; let release; let completed = false; const calls = [];
  const pending = new Promise(resolve => { release = resolve; });
  const api = load(async ids => { calls.push(ids); await pending; completed = true; }, task => { callback = task; });
  assert.equal(await api.dispatchSocialInboxAutoReply('incoming'), true);
  assert.deepEqual(calls, []);
  const work = callback();
  assert.deepEqual(calls, [['incoming']]);
  assert.equal(completed, false);
  release(); await work;
  assert.equal(completed, true);
});
test('background failure is logged without rejecting the completed webhook', async () => {
  let callback; const errors = []; const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const api = load(async () => { throw Error('provider unavailable'); }, task => { callback = task; });
    await api.dispatchSocialInboxAutoReply('incoming');
    await callback();
    assert.equal(errors.length, 1);
    assert.match(errors[0][1].message, /provider unavailable/);
  } finally { console.error = original; }
});
