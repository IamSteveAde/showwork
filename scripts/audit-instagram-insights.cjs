/* Read-only diagnostic. Never print tokens, credentials, raw Meta errors or URLs. */
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { PrismaClient } = require('@prisma/client');
const [calendarId, handle, confirmation] = process.argv.slice(2);
if (!calendarId || !handle || confirmation !== '--app-role-confirmed') {
  console.error('Usage: node scripts/audit-instagram-insights.cjs WORKSPACE_ID HANDLE --app-role-confirmed');
  process.exit(1);
}
let datasource;
if (process.env.SHOWWORK_CANONICAL_APPLICATION_ENABLED === 'true') {
  if (!process.env.PUBLISHING_DATABASE_URL) throw Error('Canonical database is not configured.');
  try {
    const url = new URL(process.env.PUBLISHING_DATABASE_URL);
    url.searchParams.set('schema', process.env.PUBLISHING_DATABASE_SCHEMA || 'public');
    datasource = url.toString();
  } catch { console.error('Canonical database configuration is invalid.'); process.exit(1); }
}
const db = new PrismaClient({ log: [], ...(datasource ? { datasources: { db: { url: datasource } } } : {}) });
const base = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v26.0'}`;
async function request(path, token, params = {}) {
  const url = new URL(base + path); url.search = new URLSearchParams(params).toString();
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (!response.ok || body.error) return { ok: false, status: response.status, code: body.error?.code, subcode: body.error?.error_subcode };
    return { ok: true, body };
  } catch { return { ok: false, reason: 'Network, timeout or invalid JSON response' }; }
}
function metrics(result) {
  if (!result.ok) return result;
  return { ok: true, metrics: (result.body.data || []).map(metric => ({ name: metric.name,
    value: metric.total_value?.value ?? metric.values?.[0]?.value ?? null })) };
}
(async () => {
  try {
    const connection = await db.socialConnection.findFirst({ where: {
      calendarId, platform: 'INSTAGRAM', username: handle.replace(/^@/, ''),
    }, select: { status: true, tokenScopes: true, accessToken: true, platformAccountId: true } });
    if (!connection) { console.log(JSON.stringify({ ready: false, reason: 'Review account not found in this workspace' })); process.exitCode = 2; return; }
    console.log(JSON.stringify({ status: connection.status,
      storedInsightsGrant: (connection.tokenScopes || '').split(/[\s,]+/).includes('instagram_manage_insights'),
      tokenPresent: !!connection.accessToken }));
    if (connection.status !== 'CONNECTED' || !connection.accessToken) {
      console.log(JSON.stringify({ ready: false, reason: 'Reconnect the authorized app-role account before live verification' })); process.exitCode = 2; return;
    }
    const appId = process.env.INSTAGRAM_APP_ID, secret = process.env.INSTAGRAM_APP_SECRET;
    if (!appId || !secret) { console.log(JSON.stringify({ ready: false, reason: 'Instagram app credentials are not configured' })); process.exitCode = 2; return; }
    const debug = await request('/debug_token', `${appId}|${secret}`, { input_token: connection.accessToken });
    if (!debug.ok) { console.log(JSON.stringify({ tokenVerification: debug })); process.exitCode = 2; return; }
    const token = debug.body.data || {};
    const verified = token.is_valid === true && token.app_id === appId && (token.scopes || []).includes('instagram_manage_insights');
    console.log(JSON.stringify({ tokenVerification: { valid: token.is_valid === true, configuredAppMatches: token.app_id === appId,
      insightsGranted: (token.scopes || []).includes('instagram_manage_insights'), expiresAt: token.expires_at || null } }));
    if (!verified) { process.exitCode = 2; return; }
    const until = Math.floor(Date.now() / 1000), since = until - 7 * 86400;
    const account = metrics(await request(`/${connection.platformAccountId}/insights`, connection.accessToken,
      { metric: 'reach', period: 'day', since: String(since), until: String(until) }));
    console.log(JSON.stringify({ accountInsights: account }));
    const media = await request(`/${connection.platformAccountId}/media`, connection.accessToken, { fields: 'id', limit: '1' });
    const mediaId = media.ok && media.body.data?.[0]?.id;
    const postResults = [];
    if (mediaId) {
      for (const metric of ['reach', 'saved', 'shares']) {
        const result = metrics(await request(`/${mediaId}/insights`, connection.accessToken, { metric }));
        postResults.push(result);console.log(JSON.stringify({ postInsight: metric, result }));
      }
    } else console.log(JSON.stringify({ postInsights: { ok: false, reason: media.ok ? 'No media available' : 'Media list request failed' } }));
    const accountVerified = account.ok && account.metrics.some(metric => typeof metric.value === 'number');
    const postVerified = postResults.some(result => result.ok && result.metrics.some(metric => typeof metric.value === 'number'));
    console.log(JSON.stringify({ accountVerified, postVerified, note: 'This verifies sampled API reads only. Record the complete authorization and dashboard flow separately.' }));
    if (!accountVerified || !postVerified) process.exitCode = 2;
  } catch (error) {
    console.log(JSON.stringify({ ready: false, reason: 'Database or diagnostic failed', code: typeof error.code === 'string' && /^P\d+$/.test(error.code) ? error.code : undefined }));
    process.exitCode = 2;
  } finally { await db.$disconnect(); }
})();
