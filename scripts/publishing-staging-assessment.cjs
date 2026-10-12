/* Runs only against a fresh local PostgreSQL cluster. Never accepts a production
 * URL, never calls publishing providers, and cleans up its own fixture cluster. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const { PrismaClient, Prisma } = require('@prisma/client');
const { load } = require('../tests/helpers/load-typescript.cjs');
const pgRoot = process.env.SHOWWORK_POSTGRES_ROOT || '/tmp/showwork-postgres-build/install';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'showwork-publishing-stage-'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const platforms = ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'X'];
const extendedOnly = process.argv.includes('--extended');
const results = extendedOnly ? JSON.parse(fs.readFileSync('/tmp/showwork-phase2-staging-results.json','utf8')) : { isolatedDatabase: true, actualPostgresWrites: true, realPublishing: false, correctness: [], workloads: [], continuousArrivals: [] };
let server, db, port;
async function unusedPort() {
  const socket = net.createServer(); await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const value = socket.address().port; await new Promise(resolve => socket.close(resolve)); return value;
}
async function fixtures(count, prefix = randomUUID(), onlyPlatform) {
  const now = new Date();
  const values = Array.from({ length: count }, (_, i) => Prisma.sql`(${`${prefix}-${i}`}, ${onlyPlatform || platforms[i % 5]}::"SocialPlatform", ${new Date(now.getTime() - 10000 + i)}, 'APPROVED', false, 'SCHEDULED', 'SCHEDULED', 'SCHEDULED', ${new Date(now.getTime() - 20000)})`);
  await db.$executeRaw(Prisma.sql`INSERT INTO "CalendarPost" ("id", "platform", "postDate", "approvalStatus", "isAiDraft", "instagramPublishStatus", "tikTokPublishStatus", "publishStatus", "updatedAt") VALUES ${Prisma.join(values)}`);
}
async function countScheduled() {
  const rows = await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "CalendarPost" WHERE CASE WHEN "platform"='INSTAGRAM' THEN "instagramPublishStatus"::text WHEN "platform"='TIKTOK' THEN "tikTokPublishStatus"::text ELSE "publishStatus"::text END = 'SCHEDULED'`;
  return rows[0].count;
}
function databaseWithLatency(latencyMs, coldMs = 0) {
  let ready, active = 0, peak = 0;
  return {
    get peak() { return peak; },
    $transaction: async (callback, options) => {
      if (!ready) ready = sleep(coldMs); await ready;
      active++; peak = Math.max(peak, active);
      try {
        return await db.$transaction(async tx => {
          await sleep(latencyMs * .30);
          const proxy = {
            $executeRaw: async (...args) => { await sleep(latencyMs * .28); return tx.$executeRaw(...args); },
            $queryRaw: async (...args) => { await sleep(latencyMs * .28); return tx.$queryRaw(...args); },
          };
          const value = await callback(proxy); await sleep(latencyMs * .14); return value;
        }, options);
      } finally { active--; }
    },
  };
}
async function main() {
  assert.ok(fs.existsSync(path.join(pgRoot, 'bin/postgres')), 'Set SHOWWORK_POSTGRES_ROOT to an installed PostgreSQL server');
  port = await unusedPort();
  const data = path.join(directory, 'data');
  const initialized = spawnSync(path.join(pgRoot, 'bin/initdb'), ['-D', data, '-U', 'showwork_stage', '--auth=trust', '--no-locale', '-E', 'UTF8'], { encoding: 'utf8' });
  assert.equal(initialized.status, 0, 'isolated initdb failed');
  const log = fs.openSync(path.join(directory, 'postgres.log'), 'a');
  server = spawn(path.join(pgRoot, 'bin/postgres'), ['-D', data, '-h', '127.0.0.1', '-p', String(port), '-k', directory, '-c', 'max_connections=20', '-c', 'shared_buffers=32MB', '-c', 'fsync=off', '-c', 'timezone=UTC'], { stdio: ['ignore', log, log] });
  const url = `postgresql://showwork_stage@127.0.0.1:${port}/postgres?connection_limit=5&connect_timeout=3&pool_timeout=3`;
  process.env.DIRECT_URL = url;
  db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  for (let i = 0; ; i++) { try { await db.$connect(); break; } catch { if (i >= 30) throw new Error('isolated server unavailable'); await sleep(100); } }
  for (const sql of [
    `CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X','WHATSAPP')`,
    `CREATE TYPE "InstagramPublishStatus" AS ENUM ('NOT_SCHEDULED','SCHEDULED','PUBLISHING','PUBLISHED','FAILED')`,
    `CREATE TYPE "TikTokPublishStatus" AS ENUM ('NOT_SCHEDULED','SCHEDULED','PUBLISHING','PUBLISHED','FAILED')`,
    `CREATE TYPE "PostApprovalStatus" AS ENUM ('PENDING','APPROVED','NEEDS_REVISION')`,
    `CREATE TABLE "CalendarPost" ("id" text PRIMARY KEY,"platform" "SocialPlatform" NOT NULL,"postDate" timestamp(3) NOT NULL,"approvalStatus" "PostApprovalStatus" NOT NULL,"isAiDraft" boolean NOT NULL DEFAULT false,"instagramPublishStatus" "InstagramPublishStatus" NOT NULL,"tikTokPublishStatus" "TikTokPublishStatus" NOT NULL,"publishStatus" "InstagramPublishStatus" NOT NULL,"instagramPublishError" text,"tikTokPublishError" text,"publishError" text,"tikTokPublishId" text,"publishWorkerStartedAt" timestamp(3),"updatedAt" timestamp(3) NOT NULL)`,
    `CREATE INDEX ON "CalendarPost" ("publishStatus","postDate")`,
  ]) await db.$executeRawUnsafe(sql);
  const { claimPublishingBatch, failPublishingDispatchBatch } = load('lib/publishing/batchClaims.ts');
  const { runPublishingBatchScheduler } = load('lib/publishing/batchScheduler.ts', { '@/lib/db': { db } });
  const claim = platform => db.$transaction(tx => claimPublishingBatch(tx, platform, new Date(), 20, true));
  async function dispatch(claim, published, acknowledgementMs = 0) {
    await sleep(acknowledgementMs);
    const field = Prisma.raw(claim.platform === 'INSTAGRAM' ? '"instagramPublishStatus"' : claim.platform === 'TIKTOK' ? '"tikTokPublishStatus"' : '"publishStatus"');
    const statusField = claim.platform === 'INSTAGRAM' ? 'instagramPublishStatus' : claim.platform === 'TIKTOK' ? 'tikTokPublishStatus' : 'publishStatus';
    const count = await db.calendarPost.updateMany({ where:{ id:claim.id,platform:claim.platform,updatedAt:claim.dispatchedAt,publishWorkerStartedAt:null,[statusField]:'PUBLISHING',approvalStatus:'APPROVED',isAiDraft:false }, data:{publishWorkerStartedAt:new Date()} });
    if (!count.count) return; // Exactly the existing worker lease guard.
    assert.ok(!published.has(claim.id), 'duplicate fixture publication'); published.add(claim.id);
    await db.$executeRaw(Prisma.sql`UPDATE "CalendarPost" SET ${field}='PUBLISHED' WHERE "id"=${claim.id}`);
  }

  if (extendedOnly) {
    await fixtures(250,'cold-peak');const done=new Set(),ticks=[];
    const adapter=databaseWithLatency(1923,5000);
    for(let tick=0;tick<5&&await countScheduled();tick++){
      const value=await runPublishingBatchScheduler({database:adapter,dispatch:c=>dispatch(c,done,500)});
      ticks.push({durationMs:value.durationMs,claimed:Object.values(value.platforms).reduce((n,p)=>n+p.claimed,0),remaining:await countScheduled(),perPlatform:value.platforms});
    }
    assert.equal(done.size,250);assert.ok(ticks.every(t=>t.durationMs<27000));
    results.coldPeak={count:250,latencyMs:1923,connectionDelayMs:5000,ticks,duplicateWorkers:0,peakDatabaseOperations:adapter.peak};
    console.log('staging cold peak',JSON.stringify(results.coldPeak));return;
  }

  await fixtures(80, 'overlap', 'FACEBOOK');
  const overlapping = await Promise.all(Array.from({ length: 5 }, () => claim('FACEBOOK')));
  const owned = overlapping.flatMap(batch => batch.claims);
  assert.equal(owned.length, 80); assert.equal(new Set(owned.map(c => c.id)).size, 80);
  for (const c of owned) { const row = await db.$queryRaw(Prisma.sql`SELECT "updatedAt" FROM "CalendarPost" WHERE "id"=${c.id}`); assert.equal(row[0].updatedAt.toISOString(), c.dispatchedAt.toISOString()); }
  results.correctness.push('five simultaneous conditional claim transactions: 80 distinct committed IDs and exact leases');
  await db.$executeRaw`TRUNCATE "CalendarPost"`;
  await fixtures(4, 'eligibility', 'INSTAGRAM');
  await db.$executeRaw`UPDATE "CalendarPost" SET "approvalStatus"='PENDING' WHERE "id"='eligibility-1'`;
  await db.$executeRaw`UPDATE "CalendarPost" SET "isAiDraft"=true WHERE "id"='eligibility-2'`;
  await db.$executeRaw`UPDATE "CalendarPost" SET "postDate"=CURRENT_TIMESTAMP + interval '1 day' WHERE "id"='eligibility-3'`;
  assert.deepEqual((await claim('INSTAGRAM')).claims.map(c => c.id), ['eligibility-0']);
  results.correctness.push('pending approval, AI drafts, and future posts remain unclaimed');
  await db.$executeRaw`TRUNCATE "CalendarPost"`;
  await fixtures(1, 'rollback', 'X');
  await assert.rejects(db.$transaction(async tx => { await claimPublishingBatch(tx, 'X', new Date(), 20, true); throw new Error('rollback'); }));
  assert.equal(await countScheduled(), 1); results.correctness.push('claim rollback leaves the post scheduled');

  await db.$executeRaw`TRUNCATE "CalendarPost"`;
  await fixtures(3, 'tiktok', 'TIKTOK');
  await db.$executeRaw`UPDATE "CalendarPost" SET "tikTokPublishStatus"='PUBLISHING', "updatedAt"=CURRENT_TIMESTAMP - interval '20 minutes'`;
  await db.$executeRaw`UPDATE "CalendarPost" SET "tikTokPublishId"='accepted-operation' WHERE "id" IN ('tiktok-0','tiktok-1')`;
  await db.$executeRaw`UPDATE "CalendarPost" SET "publishWorkerStartedAt"=CURRENT_TIMESTAMP WHERE "id"='tiktok-1'`;
  const recovered = await claim('TIKTOK'); assert.equal(recovered.stale, 1); assert.equal(recovered.claims.length, 2);
  assert.ok(recovered.claims.every(c => c.recoveringTikTok));
  const excluded = await db.$transaction(tx => claimPublishingBatch(tx, 'TIKTOK', new Date(), 20, false, recovered.claims.map(c => c.id)));
  assert.equal(excluded.claims.length, 0);
  assert.equal(await db.$transaction(tx => failPublishingDispatchBatch(tx, 'TIKTOK', recovered.claims)), 2);
  const statuses = await db.$queryRaw`SELECT "id","tikTokPublishStatus" FROM "CalendarPost" ORDER BY "id"`;
  assert.deepEqual(statuses.map(row => row.tikTokPublishStatus), ['PUBLISHING','PUBLISHING','FAILED']);
  results.correctness.push('accepted TikTok operations recover; stale unaccepted operations fail; per-run exclusion prevents repeat recovery');

  await db.$executeRaw`TRUNCATE "CalendarPost"`;
  await fixtures(1, 'new-lease', 'FACEBOOK');
  const oldClaim = (await claim('FACEBOOK')).claims[0];
  await db.$executeRaw`UPDATE "CalendarPost" SET "updatedAt"="updatedAt" + interval '1 millisecond'`;
  assert.equal(await db.$transaction(tx => failPublishingDispatchBatch(tx, 'FACEBOOK', [oldClaim])), 0);
  results.correctness.push('cleanup cannot overwrite a newer dispatch lease');

  await db.$executeRaw`TRUNCATE "CalendarPost"`;
  await fixtures(20, 'locked', 'LINKEDIN');
  let signalLocked, unlock;
  const locked = new Promise(resolve => { signalLocked = resolve; });
  const unlocked = new Promise(resolve => { unlock = resolve; });
  const holding = db.$transaction(async tx => { await tx.$queryRaw`SELECT "id" FROM "CalendarPost" WHERE "id"='locked-0' FOR UPDATE`; signalLocked(); await unlocked; });
  await locked; const skipped = await claim('LINKEDIN'); assert.equal(skipped.claims.length,19); assert.ok(!skipped.claims.some(c=>c.id==='locked-0'));
  unlock(); await holding; assert.deepEqual((await claim('LINKEDIN')).claims.map(c=>c.id),['locked-0']);
  results.correctness.push('a locked oldest row is skipped without blocking and admitted after its lock releases');

  await db.$executeRaw`TRUNCATE "CalendarPost"`; await fixtures(1,'timezone','FACEBOOK');
  const timezoneClaim = await db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL TIME ZONE 'Africa/Lagos'`;return claimPublishingBatch(tx,'FACEBOOK',new Date(),20,true);});
  assert.equal(timezoneClaim.claims.length,1);
  assert.equal(await db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL TIME ZONE 'Africa/Lagos'`;return failPublishingDispatchBatch(tx,'FACEBOOK',timezoneClaim.claims);}),1);
  results.correctness.push('exact claim/cleanup leases remain valid in a non-UTC database session');

  await db.$executeRaw`TRUNCATE "CalendarPost"`;
  await fixtures(250, 'overlapping-runs'); const published = new Set();
  const overlappingRuns = await Promise.all([1,2].map(() => runPublishingBatchScheduler({ database: db, dispatch: c => dispatch(c, published) })));
  if (published.size !== 250) console.log('overlap diagnostics', JSON.stringify(overlappingRuns));
  assert.equal(published.size, 250); assert.equal(await countScheduled(), 0);
  results.correctness.push('two full overlapping scheduler runs: 250 fixture workers claimed once with no duplicates');
  await db.$executeRaw`TRUNCATE "CalendarPost"`; await fixtures(50,'accepted-overlap','TIKTOK');
  await db.$executeRaw`UPDATE "CalendarPost" SET "tikTokPublishStatus"='PUBLISHING',"tikTokPublishId"='existing-provider-operation'`;
  const acceptedPublished=new Set();
  await Promise.all([1,2].map(()=>runPublishingBatchScheduler({database:db,dispatch:c=>dispatch(c,acceptedPublished,10)})));
  assert.equal(acceptedPublished.size,50);
  results.correctness.push('overlapping accepted TikTok recovery runs: 50 worker starts, no repeated fixture publication');

  for (const latencyMs of [1380, 1923]) for (const count of [10,25,50,100,250]) {
    await db.$executeRaw`TRUNCATE "CalendarPost"`; await fixtures(count, `load-${latencyMs}-${count}`);
    const adapter = databaseWithLatency(latencyMs); const completed = new Set(); const ticks = [];
    const started = performance.now();
    for (let tick = 0; tick < 5 && await countScheduled(); tick++) {
      const value = await runPublishingBatchScheduler({ database: adapter, dispatch: c => dispatch(c, completed, 500) });
      ticks.push(value);
    }
    assert.equal(completed.size, count); assert.equal(await countScheduled(), 0); assert.ok(adapter.peak <= 3);
    const value = { count, latencyMs, elapsedMs: Math.round(performance.now()-started), ticks: ticks.map(t => ({ durationMs:t.durationMs, claimed:Object.values(t.platforms).reduce((n,p)=>n+p.claimed,0), perPlatform:t.platforms })), peakDatabaseOperations:adapter.peak, duplicateWorkers:0 };
    results.workloads.push(value); console.log('staging workload', JSON.stringify({ count, latencyMs, elapsedMs:value.elapsedMs, ticks:value.ticks.map(t=>({durationMs:t.durationMs,claimed:t.claimed})), peak:adapter.peak }));
  }
  for (let tick = 0; tick < 10; tick++) {
    if (!tick) await db.$executeRaw`TRUNCATE "CalendarPost"`;
    await fixtures(25, `continuous-${tick}`); const done = new Set();
    const value = await runPublishingBatchScheduler({ database: db, startedAt: Date.now() + tick * 60000, dispatch: c => dispatch(c, done) });
    assert.equal(done.size, 25); assert.ok(platforms.every(p => value.platforms[p].dispatched === 5));
    results.continuousArrivals.push({ tick:tick+1, dispatched:25, perPlatform:5 });
  }
  results.correctness.push('ten continuous-arrival rounds: every platform dispatched five posts on every round');
  await db.$executeRaw`TRUNCATE "CalendarPost"`; await fixtures(250,'skew','INSTAGRAM');
  const skewPublished=new Set(),skewTicks=[];const skewAdapter=databaseWithLatency(1380);
  for(let tick=0;tick<5&&await countScheduled();tick++)skewTicks.push(await runPublishingBatchScheduler({database:skewAdapter,dispatch:c=>dispatch(c,skewPublished,500)}));
  assert.equal(skewPublished.size,250);results.skew={count:250,platform:'INSTAGRAM',ticks:skewTicks.map(t=>({durationMs:t.durationMs,claimed:t.platforms.INSTAGRAM.claimed}))};
  await db.$executeRaw`TRUNCATE "CalendarPost"`; await fixtures(100,'cold');
  const coldPublished = new Set(); const coldResult = await runPublishingBatchScheduler({ database:databaseWithLatency(1380,2400), dispatch:c=>dispatch(c,coldPublished,500) });
  results.cold = { durationMs:coldResult.durationMs, dispatched:coldPublished.size, databaseConnectionDelayMs:2400 };
  assert.equal(coldPublished.size,100);
  await db.$executeRaw`TRUNCATE "CalendarPost"`; await fixtures(100,'dispatch-failure');
  const failure = await runPublishingBatchScheduler({ database:databaseWithLatency(1380), dispatch:async()=>{await sleep(5000);throw new Error('synthetic lost acknowledgement');} });
  results.failure = {durationMs:failure.durationMs,failures:Object.values(failure.platforms).reduce((n,p)=>n+p.dispatchFailures,0),errors:Object.values(failure.platforms).reduce((n,p)=>n+p.errors,0)};
  assert.equal(results.failure.failures,100); assert.equal(results.failure.errors,0); assert.ok(failure.durationMs < 27000);
  console.log('staging correctness', JSON.stringify(results.correctness));
  console.log('staging cold/failure',JSON.stringify({cold:results.cold,failure:results.failure}));
}
main().catch(error=>{ console.error('Staging assessment failed:',error.stack);process.exitCode=1; }).finally(async()=>{
  fs.writeFileSync('/tmp/showwork-phase2-staging-results.json',JSON.stringify(results,null,2));
  if(db)await db.$disconnect().catch(()=>{});
  if(server){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
  fs.rmSync(directory,{recursive:true,force:true});
});
