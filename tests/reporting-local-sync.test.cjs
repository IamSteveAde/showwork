const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
function setup({ authorized = true, active = true, connected = 1, connections = [] } = {}) {
  const jobs = [], calls = [];
  const api = load('app/api/calendars/[id]/reporting/sync/route.ts', {
    'next/server': { after: fn => jobs.push(fn), NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200, headers: opts?.headers }) } },
    '@/lib/auth': { getCurrentCreator: async () => ({ id: 'owner' }) },
    '@/lib/calendarPermissions': { hasCalendarPermission: async () => authorized, canAccessCalendarById: async () => active },
    '@/lib/db': { db: { socialConnection: { count: async () => connected, findMany: async args => { calls.push(['status', args]); return connections; } } } },
    '@/lib/reporting/sync': { syncCalendarSocialReporting: async id => calls.push(['sync', id]) },
  });
  const context = { params: Promise.resolve({ id: 'workspace' }) };
  return { jobs, calls, run: () => api.POST({}, context), status: since => api.GET({ url: `https://example.test/api/calendars/workspace/reporting/sync?since=${encodeURIComponent(since)}` }, context) };
}
test('reporting sync returns a server timestamp and runs through the response lifecycle', async () => {
  const f = setup(); const r = await f.run();
  assert.equal(r.status, 202); assert.equal(r.body.queued, true);
  assert.ok(Number.isFinite(new Date(r.body.queuedAt).getTime()));
  assert.equal(f.jobs.length, 1); assert.equal(f.calls.length, 0);
  await f.jobs[0](); assert.deepEqual(f.calls, [['sync', 'workspace']]);
});
test('sync permission and workspace access remain enforced', async () => {
  for (const config of [{ authorized: false }, { active: false }, { connected: 0 }]) {
    const f = setup(config); assert.ok([403, 409].includes((await f.run()).status)); assert.equal(f.jobs.length, 0);
  }
});
const since = '2026-10-21T02:30:00Z';
const old = new Date('2026-10-21T02:20:00Z');
const recent = new Date('2026-10-21T02:31:00Z');
test('an old successful sync does not prematurely finish the current one', async () => {
  const f = setup({ connections: [{ lastSyncAt: old, lastSyncAttemptAt: recent, lastSyncError: null }] });
  assert.deepEqual((await f.status(since)).body, { completed: false, failed: 0 });
});
test('all accounts must finish before the report is refreshed', async () => {
  const fresh = { lastSyncAt: recent, lastSyncAttemptAt: recent, lastSyncError: null };
  const pending = { lastSyncAt: old, lastSyncAttemptAt: old, lastSyncError: null };
  assert.equal((await setup({ connections: [fresh, pending] }).status(since)).body.completed, false);
  const completed = await setup({ connections: [fresh, fresh] }).status(since);
  assert.deepEqual(completed.body, { completed: true, failed: 0 });
  assert.equal(completed.headers['Cache-Control'], 'no-store, private');
});
test('failed current attempts finish with an error instead of polling indefinitely', async () => {
  const f = setup({ connections: [{ lastSyncAt: old, lastSyncAttemptAt: recent, lastSyncError: 'Permission missing' }] });
  assert.deepEqual((await f.status(since)).body, { completed: true, failed: 1 });
});
test('status endpoint validates input and permission before reading account state', async () => {
  const invalid = setup(); assert.equal((await invalid.status('invalid')).status, 400); assert.equal(invalid.calls.length, 0);
  const denied = setup({ authorized: false }); assert.equal((await denied.status(since)).status, 404); assert.equal(denied.calls.length, 0);
});
