const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function route({ creator = { id: 'owner' }, owner = 'owner', confirmation = 'RESET', publishing = 0, fail = false, active = true } = {}) {
  const calls = [];
  const tx = {
    calendarPost: { count: async () => publishing, deleteMany: async (args) => { calls.push(['posts', args]); return { count: 3 }; } },
    calendarPostAsset: { findMany: async () => [{ fileKey: 'asset' }] },
    calendarImport: { deleteMany: async (args) => calls.push(['imports', args]) },
    socialCalendar: { update: async (args) => calls.push(['plan', args]) },
  };
  const mocks = {
    '@/lib/calendarPermissions': { canAccessCalendarById: async () => active },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/auth': { getCurrentCreator: async () => creator },
    '@/lib/db': { db: { socialCalendar: { findUnique: async () => owner ? { managerId: owner } : null }, $transaction: async (fn) => { const result = await fn(tx); if (fail) throw new Error('rollback'); calls.push(['commit']); return result; } } },
    '@/lib/r2': { deleteObject: async (key) => calls.push(['file', key]) },
  };
  const mod = { exports: {} };
  const source = fs.readFileSync('app/api/calendars/[id]/reset/route.ts', 'utf8');
  new Function('require', 'module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => mocks[name], mod, mod.exports);
  return { calls, run: () => mod.exports.POST({ json: async () => ({ confirmation }) }, { params: Promise.resolve({ id: 'calendar' }) }) };
}

test('reset requires an authenticated owner and explicit confirmation', async () => {
  for (const [options, status] of [[{ creator: null }, 401], [{ owner: null }, 404], [{ owner: 'someone-else' }, 403], [{ confirmation: '' }, 400]]) {
    const r = route(options);
    assert.equal((await r.run()).status, status);
    assert.deepEqual(r.calls, []);
  }
});

test('reset blocks while a post is publishing', async () => {
  const r = route({ publishing: 1 });
  assert.equal((await r.run()).status, 409);
  assert.equal(r.calls.some(([kind]) => ['posts', 'file', 'plan'].includes(kind)), false);
});

test('reset clears only this calendar and removes files after committing', async () => {
  const r = route();
  const response = await r.run();
  assert.equal(response.status, 200);
  assert.equal(response.body.deletedCount, 3);
  assert.deepEqual(r.calls[0], ['posts', { where: { calendarId: 'calendar' } }]);
  assert.deepEqual(r.calls[1], ['imports', { where: { calendarId: 'calendar' } }]);
  assert.equal(r.calls[2][1].data.planStatus, 'BUILDING');
  assert.deepEqual(r.calls.slice(-2), [['commit'], ['file', 'asset']]);
});

test('transaction failure never deletes attached files', async () => {
  const r = route({ fail: true });
  assert.equal((await r.run()).status, 500);
  assert.equal(r.calls.some(([kind]) => kind === 'file'), false);
});

test('expired workspace reset is blocked without deleting trial data', async () => {
  const r = route({ active: false });
  assert.equal((await r.run()).status, 403);
  assert.deepEqual(r.calls, []);
});
