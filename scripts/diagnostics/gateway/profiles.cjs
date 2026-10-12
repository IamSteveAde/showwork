'use strict';
const { createHash } = require('node:crypto');
const PLATFORMS = Object.freeze(['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'X']);
const QUOTAS = Object.freeze({ transport: 10, 'fresh-connection': 10, 'warm-roundtrip': 10, 'warm-transaction': 10, 'scheduler-select-plan': 20 });
const COLUMNS = Object.freeze(['id','platform','postDate','approvalStatus','isAiDraft','instagramPublishStatus','tikTokPublishStatus','publishStatus','tikTokPublishId','publishWorkerStartedAt','updatedAt']);
const templates = {};
for (const platform of PLATFORMS) {
  const status = platform === 'INSTAGRAM' ? 'instagramPublishStatus' : platform === 'TIKTOK' ? 'tikTokPublishStatus' : 'publishStatus';
  const accepted = platform === 'TIKTOK' ? `OR (p."${status}"='PUBLISHING' AND p."tikTokPublishId" IS NOT NULL AND (p."publishWorkerStartedAt" IS NULL OR p."updatedAt" <= $2::timestamp))` : '';
  templates[`${platform}:admission`] = `EXPLAIN (ANALYZE, FORMAT JSON, TIMING OFF, SUMMARY ON) SELECT p."id",p."updatedAt" FROM public."CalendarPost" p WHERE p."platform"='${platform}'::public."SocialPlatform" AND (p."${status}"='SCHEDULED' ${accepted}) AND p."approvalStatus"='APPROVED' AND NOT p."isAiDraft" AND p."postDate" <= $1::timestamp ORDER BY p."postDate",p."id" LIMIT 20`;
  templates[`${platform}:stale`] = `EXPLAIN (ANALYZE, FORMAT JSON, TIMING OFF, SUMMARY ON) SELECT p."id",p."updatedAt" FROM public."CalendarPost" p WHERE p."platform"='${platform}'::public."SocialPlatform" AND p."${status}"='PUBLISHING' AND p."updatedAt" <= $1::timestamp ${platform === 'TIKTOK' ? 'AND p."tikTokPublishId" IS NULL' : ''} ORDER BY p."updatedAt",p."id" LIMIT 100`;
}
Object.freeze(templates);
const queryHash = createHash('sha256').update(JSON.stringify(templates)).digest('hex');
function selection(ordinal) {
  if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= 20) throw new Error('INVALID_SAMPLE');
  const round = Math.floor(ordinal / 5);
  return Object.freeze({ platform: PLATFORMS[(ordinal % 5 + round) % 5], family: round < 2 ? 'admission' : 'stale' });
}
function planQuery(ordinal, now = new Date()) {
  const { platform, family } = selection(ordinal);
  const stale = new Date(now.getTime() - 16 * 60000);
  return { sql: templates[`${platform}:${family}`], values: family === 'stale' ? [stale] : platform === 'TIKTOK' ? [now, stale] : [now], platform, family };
}
module.exports = { PLATFORMS, QUOTAS, COLUMNS, templates, queryHash, selection, planQuery };
