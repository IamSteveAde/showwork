const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const connection = scopes => ({ platformAccountId: 'account', accessToken: 'test', tokenScopes: scopes });
const media = id => ({ id, timestamp: '2026-10-20T12:00:00Z', like_count: 10, comments_count: 2 });
const insight = (name, value) => ({ name, values: [{ value }] });
function mock({ rejectBatch = false, scopes = true } = {}) {
  const calls = [];
  global.fetch = async input => {
    const url = new URL(input); calls.push(url);
    if (url.pathname.endsWith('/account/media')) return Response.json({ data: [media('native')] });
    if (url.pathname.endsWith('/account/insights')) return Response.json({ data: [] });
    if (url.pathname.endsWith('/native/insights')) {
      const metric = url.searchParams.get('metric');
      if (rejectBatch && (metric.includes(',') || metric === 'views')) return Response.json({ error: { message: 'Unsupported metric', code: 100 } }, { status: 400 });
      const values = { reach: 40, views: 70, saved: 1, shares: 0, total_interactions: 13 };
      return Response.json({ data: metric.split(',').map(name => insight(name, values[name])) });
    }
    return Response.json({ followers_count: 100, media_count: 1 });
  };
  return { calls, run: () => load('lib/reporting/adapters/instagram.ts').instagramReportingAdapter.fetchAccountMetrics(connection(scopes ? 'instagram_manage_insights' : 'instagram_basic')) };
}
test('native Instagram posts import saves, shares and provider interaction totals', async () => {
  const api = mock(); const result = await api.run(); const post = result.accountPosts[0];
  assert.equal(post.saves, 1); assert.equal(post.shares, 0);
  assert.equal(post.engagement, 13); assert.equal(post.reach, 40); assert.equal(post.views, 70);
});
test('one unsupported metric does not discard supported save/share counts', async () => {
  const result = await mock({ rejectBatch: true }).run(); const post = result.accountPosts[0];
  assert.equal(post.saves, 1); assert.equal(post.shares, 0); assert.equal(post.views, null);
  assert.equal(post.engagement, 13);
});
test('missing Insights permission preserves basic feed and avoids unauthorized per-post calls', async () => {
  const api = mock({ scopes: false }); const result = await api.run();
  assert.equal(result.accountPosts.length, 1); assert.equal(result.accountPosts[0].likes, 10);
  assert.equal(result.accountPosts[0].saves, undefined);
  assert.equal(api.calls.some(url => url.pathname.endsWith('/native/insights')), false);
});
