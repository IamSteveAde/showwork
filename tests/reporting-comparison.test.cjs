const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('lib/reporting/comparison.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(moduleUnderTest, moduleUnderTest.exports);
const { change, compareAccounts } = moduleUnderTest.exports;
const start = new Date('2026-10-01T00:00:00Z');
const end = new Date('2026-10-02T23:59:59.999Z');
const previousStart = new Date('2026-09-29T00:00:00Z');
const snapshot = (day, reach, followers = 100, views = null, engagement = null) => ({ snapshotDate: `${day}T00:00:00Z`, reach, followers, views, engagement });
const account = (snapshots, platform = 'FACEBOOK') => ({ id: 'a', platform, status: 'CONNECTED', accountMetricSnapshots: snapshots });
test('compares full equal periods, not first and last daily values', () => {
  const result = compareAccounts([account([snapshot('2026-09-29', 20), snapshot('2026-09-30', 40), snapshot('2026-10-01', 50), snapshot('2026-10-02', 40, 110)])], start, end, previousStart);
  assert.deepEqual(result.reach, { value: 90, delta: 30, percent: 50, basis: 'observed totals vs previous period' });
  assert.equal(result.followers.delta, 10);
});
test('declines are negative and zero baseline never produces infinity', () => {
  assert.deepEqual(change(0, 10, 'test'), { value: 0, delta: -10, percent: -100, basis: 'test' });
  assert.equal(change(10, 0, 'test').percent, null);
  assert.equal(change(0, 0, 'test').delta, 0);
});
test('missing days and missing follower baselines do not imply zero', () => {
  const result = compareAccounts([account([snapshot('2026-10-01', 50), snapshot('2026-10-02', 70)])], start, end, previousStart);
  assert.equal(result.reach.value, 120);
  assert.equal(result.reach.delta, null);
  assert.equal(result.followers.delta, 0);
  assert.equal(result.followers.basis, 'between available follower snapshots');
  const partial = compareAccounts([account([snapshot('2026-09-29', 5), snapshot('2026-10-01', 50), snapshot('2026-10-02', 70)])], start, end, previousStart);
  assert.equal(partial.reach.delta, 115);
});
test('rolling Instagram totals use the latest value and compare between syncs', () => {
  const result = compareAccounts([account([snapshot('2026-10-01', 10, 100, 1000, 50), snapshot('2026-10-02', 20, 100, 1100, 60)], 'INSTAGRAM')], start, end, previousStart);
  assert.equal(result.views.value, 1100);
  assert.equal(result.views.delta, 100);
  assert.equal(result.views.basis, "rolling total change between syncs");
  assert.equal(result.engagement.value, 60);
  assert.equal(result.engagement.delta, 10);
  assert.equal(result.reach.value, 30);
});
test('accounts with only earlier observations cannot silently distort comparisons', () => {
  const result = compareAccounts([account([snapshot('2026-09-29', 20), snapshot('2026-09-30', 40)]), account([snapshot('2026-09-29', 20), snapshot('2026-09-30', 40), snapshot('2026-10-01', 50), snapshot('2026-10-02', 40)])], start, end, previousStart);
  assert.equal(result.reach.delta, null);
});
test('disconnected accounts and empty histories are excluded', () => {
  const result = compareAccounts([{ ...account([snapshot('2026-10-01', 100)]), status: 'DISCONNECTED' }], start, end, previousStart);
  assert.equal(result.followers.value, null);
  assert.equal(result.reach.value, null);
});
function reportingData(leadQueries = []) {
  const db = {
    calendarReportingPermission: { findUnique: async () => null },
    socialConnection: { findMany: async () => [], findFirst: async () => null },
    publishedSocialPost: { findMany: async () => [] },
    reportingInsight: { findMany: async () => [] },
    calendarLead: { count: async args => { leadQueries.push(args); return 0; }, findMany: async args => { leadQueries.push(args); return []; } },
  };
  const mod = { exports: {} };
  const mocks = { '@/lib/db': { db }, '@/lib/r2': { publicUrlFor: () => null }, '@/lib/reporting/adapters': { getSocialReportingAdapter: () => null }, '@/lib/reporting/comparison': moduleUnderTest.exports };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync('lib/reporting/data.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => { assert.ok(mocks[name], `Unexpected dependency ${name}`); return mocks[name]; }, mod, mod.exports);
  return mod.exports;
}
test('rejects impossible calendar dates and uses whole-day default periods', () => {
  const { reportingPeriod } = reportingData();
  assert.throws(() => reportingPeriod(new URLSearchParams({ from: '2026-02-30', to: '2026-03-05' })), /valid/);
  const period = reportingPeriod(new URLSearchParams({ to: '2026-10-02' }));
  assert.equal(period.start.toISOString(), '2026-09-03T00:00:00.000Z');
  assert.equal(period.end.toISOString(), '2026-10-02T23:59:59.999Z');
});
test('shared reports do not query or expose private lead records', async () => {
  const calls = [];
  const report = await reportingData(calls).getCalendarReportingData('workspace', new URLSearchParams({ from: '2026-10-01', to: '2026-10-02' }), false);
  assert.equal(report.leads, null);
  assert.equal(calls.length, 0);
  assert.deepEqual(report.comparisonPeriod, { start: '2026-09-29T00:00:00.000Z', end: '2026-09-30T23:59:59.999Z' });
});
test('hot-lead shortlist stays in workspace, period and platform and excludes closed leads', async () => {
  const calls = [];
  await reportingData(calls).getCalendarReportingData('workspace', new URLSearchParams({ from: '2026-10-01', to: '2026-10-02', platform: 'INSTAGRAM' }), true);
  const query = calls.at(-1);
  assert.equal(query.take, 5);
  assert.equal(query.where.calendarId, 'workspace');
  assert.equal(query.where.temperature, 'HOT');
  assert.deepEqual(query.where.status, { notIn: ['CUSTOMER', 'LOST'] });
  assert.deepEqual(query.where.socialConversation, { platform: 'INSTAGRAM' });
  assert.equal(query.where.createdAt.gte.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(query.select.email, undefined);
});
test('TikTok native posts restore views and engagement without inventing daily counters', () => {
  const a = account([snapshot('2026-10-02', null)], 'TIKTOK');
  a.accountPosts = [
    { publishedAt: '2026-10-01', views: 1200, engagement: 80, reach: null, likes: 60 },
    { publishedAt: '2026-09-29', views: 1000, engagement: 100, reach: null, likes: 70 },
  ];
  const result = compareAccounts([a], start, end, previousStart);
  assert.equal(result.views.value, 1200);
  assert.equal(result.views.delta, 200);
  assert.equal(result.engagement.delta, -20);
  assert.equal(result.views.basis, 'lifetime totals of posts published in each period');
});
test('single rolling snapshot displays totals with a specific missing-history explanation', () => {
  const result = compareAccounts([account([snapshot('2026-10-02', 20, 100, 1100, 60)], 'INSTAGRAM')], start, end, previousStart);
  assert.equal(result.views.value, 1100);
  assert.equal(result.engagement.value, 60);
  assert.equal(result.views.delta, null);
  assert.match(result.views.note, /No earlier matching data/);
  assert.equal(result.followers.delta, null);
});
test('unchanged follower totals explain the actual counts and limited history', () => {
  const result = compareAccounts([account([snapshot('2026-10-01', 10, 55), snapshot('2026-10-02', 20, 55)])], start, end, previousStart);
  assert.equal(result.followers.value, 55);
  assert.equal(result.followers.delta, 0);
  assert.match(result.followers.note, /55 → 55/);
  assert.match(result.followers.note, /2026-10-01 → 2026-10-02/);
  assert.match(result.followers.note, /History before the first recorded count is unavailable/);
});
test('follower gains use the earlier recorded count rather than the total audience', () => {
  const result = compareAccounts([account([snapshot('2026-09-30', 10, 50), snapshot('2026-10-02', 20, 55)])], start, end, previousStart);
  assert.equal(result.followers.delta, 5);
  assert.match(result.followers.note, /50 → 55/);
});
