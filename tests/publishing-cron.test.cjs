const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalNow = Date.now;
afterEach(() => { Date.now = originalNow; });
function load(file, mocks, cache = new Map()) {
  file = path.resolve(root, file); if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      return load(target.endsWith('.ts') ? target : target + '.ts', mocks, cache);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', 'console', source)(localRequire, mod, mod.exports, { info() {}, error() {} });
  cache.set(file, mod.exports); return mod.exports;
}
exports.load = load;
const platforms = ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'X'];
function scheduler(claims, db = database()) {
  const api = load('lib/publishing/batchScheduler.ts', { './batchClaims': claims });
  return { ...api, runPublishingBatchScheduler: options => api.runPublishingBatchScheduler({ ...options, database: db }) };
}
function database(before = () => {}) {
  return { $transaction: async (callback, options) => {
    assert.ok(options.maxWait <= 1500); assert.ok(options.timeout <= 2500);
    const tx = { committed: false, $executeRaw: async strings => assert.equal(strings.join(''), "SET LOCAL statement_timeout = '2000ms'") };
    await before(tx); const result = await callback(tx); tx.committed = true; return result;
  } };
}
test('database gate bounds concurrent operations to three and releases after errors', async () => {
  const { PublishingDatabaseGate } = scheduler({}); const gate = new PublishingDatabaseGate(3);
  let active = 0, peak = 0;
  const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => gate.run(async () => {
    active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 2)); active--;
    if (i === 0) throw new Error('query failed');
  })));
  assert.equal(peak, 3); assert.equal(results.filter(r => r.status === 'fulfilled').length, 19);
  await gate.run(async () => {});
});
test('rounds are fair, first platform rotates, and dispatch waits for commit', async () => {
  for (let minute = 0; minute < 5; minute++) {
    Date.now = () => minute * 60000; const batches = [], sources = new Map();
    const { runPublishingBatchScheduler } = scheduler({ claimPublishingBatch: async (tx, platform, now, limit, recoverStale, excluded) => {
      batches.push({ platform, recoverStale });
      if (!recoverStale) { assert.equal(excluded.length, 20); return { stale: 0, claims: [] }; }
      return { stale: 0, claims: Array.from({ length: limit }, (_, i) => {
        const claim = { id: `${platform}-${i}`, platform, dispatchedAt: now }; sources.set(claim.id, tx); return claim;
      }) };
    } });
    const result = await runPublishingBatchScheduler({ dispatch: async claim => assert.ok(sources.get(claim.id).committed) });
    assert.equal(batches[0].platform, platforms[minute]); assert.equal(batches.length, 10);
    assert.ok(batches.slice(0, 5).every(b => b.recoverStale)); assert.ok(batches.slice(5).every(b => !b.recoverStale));
    assert.ok(Object.values(result.platforms).every(p => p.claimed === 20 && p.dispatched === 20));
  }
});
test('platform failure does not cancel other platforms', async () => {
  const { runPublishingBatchScheduler } = scheduler({ claimPublishingBatch: async (_tx, platform) => {
    if (platform === 'INSTAGRAM') throw new Error('query failed');
    return { stale: 0, claims: [{ id: platform, platform, dispatchedAt: new Date() }] };
  } });
  const sent = []; const result = await runPublishingBatchScheduler({ dispatch: async claim => sent.push(claim.platform) });
  assert.equal(result.platforms.INSTAGRAM.errors, 1); assert.deepEqual(sent.sort(), platforms.slice(1).sort());
});
test('commit failure never dispatches returned IDs', async () => {
  const db = { $transaction: async callback => { await callback({ $executeRaw: async () => {} }); throw new Error('commit failed'); } };
  const { runPublishingBatchScheduler } = scheduler({ claimPublishingBatch: async (_tx, platform) => ({ stale: 0, claims: [{ id: platform, platform, dispatchedAt: new Date() }] }) }, db);
  const result = await runPublishingBatchScheduler({ dispatch: async () => assert.fail('uncommitted claim') });
  assert.ok(Object.values(result.platforms).every(p => p.errors === 1 && p.claimed === 0));
});
test('deadline stops queued claims, and concurrency above three is rejected', async () => {
  let clock = 0; Date.now = () => clock;
  const { runPublishingBatchScheduler } = scheduler({ claimPublishingBatch: () => assert.fail('late claim') }, database(() => { clock = 15000; }));
  const result = await runPublishingBatchScheduler({ dispatch: async () => assert.fail('late dispatch') });
  assert.ok(Object.values(result.platforms).every(p => p.deferred && p.claimed === 0));
  await assert.rejects(runPublishingBatchScheduler({ concurrency: 4, dispatch: async () => {} }), /between one and three/);
});
test('zero publishing crons remain in netlify/functions as BullMQ worker handles scheduling', () => {
  const files = fs.readdirSync(path.join(root, 'netlify/functions')).filter(name => /publish-cron\.(ts|js|mts|mjs)$/.test(name));
  assert.deepEqual(files, []);
});
