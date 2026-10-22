const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
const approved = 'https://useshowwork.com/api/calendars/tiktok/callback';
afterEach(() => {
  global.fetch = originalFetch;
  for (const key of ['NODE_ENV', 'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
  }
});
test('production authorization and exchange use only approved scopes, exact callback and server credentials', async () => {
  process.env.NODE_ENV = 'production';
  process.env.TIKTOK_CLIENT_KEY = 'live-key-test'; process.env.TIKTOK_CLIENT_SECRET = 'private-secret-test';
  const { tikTokRedirectUri } = load('lib/tiktokOAuthConfig.ts', { '@/lib/url': { appUrl: () => 'https://www.useshowwork.com' } });
  const redirectUri = tikTokRedirectUri(); assert.equal(redirectUri, approved);
  const api = load('lib/tiktok.ts', {
    '@/lib/publishing/applicationBoundary': {},
    '@/lib/publishing/executionContext': { publishingFetch: (...args) => global.fetch(...args) },
  });
  const url = new URL(api.buildTikTokAuthUrl({ redirectUri, state: 'signed-state', codeChallenge: 'challenge' }));
  assert.equal(url.searchParams.get('scope'), 'user.info.basic,video.publish');
  assert.equal(url.searchParams.get('client_key'), 'live-key-test');
  assert.equal(url.searchParams.get('redirect_uri'), approved);
  assert.equal(url.searchParams.get('state'), 'signed-state');
  assert.equal(url.searchParams.get('code_challenge'), 'challenge');
  assert.ok(!url.toString().includes('private-secret-test'));
  let calls = 0;
  global.fetch = async (input, init) => {
    calls++;assert.equal(input, 'https://open.tiktokapis.com/v2/oauth/token/');
    const body = new URLSearchParams(init.body);
    assert.equal(body.get('client_key'), 'live-key-test');assert.equal(body.get('client_secret'), 'private-secret-test');
    assert.equal(body.get('redirect_uri'), approved);assert.equal(body.get('code_verifier'), 'verifier');
    return Response.json({ open_id: 'account', access_token: 'access', refresh_token: 'refresh', expires_in: 86400, refresh_expires_in: 864000, scope: 'user.info.basic,video.publish' });
  };
  const token = await api.exchangeCodeForTikTokTokens('code', redirectUri, 'verifier');
  assert.equal(calls, 1);assert.equal(token.scope, 'user.info.basic,video.publish');
});
test('development callback retains the configured development origin', () => {
  process.env.NODE_ENV = 'development';
  assert.equal(load('lib/tiktokOAuthConfig.ts', { '@/lib/url': { appUrl: () => 'http://localhost:3000' } }).tikTokRedirectUri(), 'http://localhost:3000/api/calendars/tiktok/callback');
});
function reporting() {
  return load('lib/reporting/adapters/tiktok.ts', { '@/lib/db': {}, '@/lib/tiktokConnection': {} }).tiktokReportingAdapter;
}
test('production publishing-only grant does not call analytics APIs or invent zero counters', async () => {
  global.fetch = async () => { throw Error('No analytics API call should be made'); };
  const api = reporting();const connection = { accessToken: 'token', tokenScopes: 'user.info.basic,video.publish' };
  const metrics = await api.fetchAccountMetrics(connection);
  assert.equal(metrics.followers, null);assert.equal(metrics.views, null);assert.deepEqual(metrics.accountPosts, []);
  assert.equal(metrics.additionalMetrics.reportedVideos, undefined);
  assert.match(metrics.reportingWarnings[0], /user.info.stats, video.list/);
  assert.equal((await api.fetchPostMetrics(connection, [{id:'post',platformPostId:'video'}])).size, 0);
});
test('existing analytics grants retain their supported metrics independently', async () => {
  for (const scope of ['user.info.stats', 'video.list', 'user.info.stats,video.list']) {
    const calls = [];
    global.fetch = async input => {
      calls.push(input);
      return Response.json({ error: { code: 'ok' }, data: input.includes('/user/info/') ? { user: { follower_count: 12 } } : {
        videos: [{ id: 'video', create_time: 1780000000, view_count: 40, like_count: 3, comment_count: 1, share_count: 2 }], has_more: false,
      } });
    };
    const metrics = await reporting().fetchAccountMetrics({ accessToken: 'token', tokenScopes: scope });
    assert.equal(calls.some(url => url.includes('/user/info/')), scope.includes('user.info.stats'));
    assert.equal(calls.some(url => url.includes('/video/list/')), scope.includes('video.list'));
    assert.equal(metrics.followers, scope.includes('user.info.stats') ? 12 : null);
    assert.equal(metrics.accountPosts.length, scope.includes('video.list') ? 1 : 0);
  }
});
test('callback accepts approved grant, saves actual scopes and keeps scheduled-account safeguards', async () => {
  process.env.NODE_ENV = 'production';
  const saved = [], schedules = [];
  const route = load('app/api/calendars/tiktok/callback/route.ts', {
    '@/lib/publishing/applicationBoundary': { publishingIntegrationInstalled: () => false },
    '@/lib/auth': { getCurrentCreator: async () => ({id:'creator'}) },
    '@/lib/calendarPermissions': { hasCalendarPermission: async () => true },
    '@/lib/channelOAuthState': { verifyChannelOAuthState: () => 'calendar', channelOAuthCookieOptions: () => ({path:'/api/calendars/tiktok/callback',httpOnly:true,maxAge:0}) },
    '@/lib/tiktokOAuthPkce': { readTikTokVerifier: () => 'verifier', TIKTOK_PKCE_COOKIE:'showwork_tiktok_pkce' },
    '@/lib/url': { appUrl: () => 'https://www.useshowwork.com' },
    '@/lib/db': {db:{socialCalendar:{findUnique:async()=>({id:'calendar',managerId:'creator'}),update:async input=>saved.push(input)},calendarPost:{updateMany:async input=>schedules.push(input)}}},
    '@/lib/socialReporting': { upsertSocialConnection: async input => saved.push(input) },
    '@/lib/tiktok': {
      exchangeCodeForTikTokTokens: async (code, redirect, verifier) => {
        assert.equal(redirect, approved);assert.equal(verifier, 'verifier');assert.equal(code, 'code');
        return {open_id:'account',access_token:'token',refresh_token:'refresh',expires_in:86400,refresh_expires_in:864000,scope:'user.info.basic,video.publish'};
      }, getTikTokDisplayName: async () => 'Test creator',
    },
  });
  const result = await route.GET({nextUrl:new URL(approved+'?code=code&state=signed'),cookies:{get:()=>({value:'cookie'})}});
  assert.match(result.headers.get('location'), /tiktokConnected=true/);
  assert.equal(saved[1].tokenScopes,'user.info.basic,video.publish');
  assert.equal(schedules[0].where.tikTokPublishStatus,'SCHEDULED');
  assert.deepEqual(schedules[0].where.tikTokConsentAccountId,{not:'account'});
  assert.equal(result.cookies.get('showwork_tiktok_pkce').maxAge,0);
});
