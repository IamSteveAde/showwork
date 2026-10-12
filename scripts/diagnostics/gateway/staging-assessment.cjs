'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomBytes,generateKeyPairSync}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {Prisma,PrismaClient}=require('@prisma/client');
const {startCluster}=require('../../../tests/helpers/isolated-postgres.cjs');
const {load}=require('../../../tests/helpers/load-typescript.cjs');
const {auditRole}=require('./audit-role.cjs'),{Supervisor}=require('./supervisor.cjs');
const {createGateway,createServer}=require('./ingress.cjs');
const {signedRequest}=require('./protocol.cjs'),{queryHash}=require('./contract.cjs');
const {PLATFORMS}=require('./profiles.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const faultsOnly=process.argv.includes('--faults-only');
const gatewayOnly=process.argv.includes('--gateway-only');
const output=faultsOnly?'/tmp/showwork-gateway-staging-fault-results.json':gatewayOnly?'/tmp/showwork-gateway-security-staging-results.json':'/tmp/showwork-gateway-staging-results.json';
const results={productionAccess:false,realPublishing:false,syntheticDataOnly:true,sqlPoolLimit:5,gatewayPoolLimit:1,profiles:[],workloads:[],continuous:[],correctness:[]};
let cluster,gateway,supervisor,server,roleClient,role;
async function schema(db){
  for(const sql of [
    `CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X','WHATSAPP')`,
    `CREATE TYPE "InstagramPublishStatus" AS ENUM ('NOT_SCHEDULED','SCHEDULED','PUBLISHING','PUBLISHED','FAILED')`,
    `CREATE TYPE "TikTokPublishStatus" AS ENUM ('NOT_SCHEDULED','SCHEDULED','PUBLISHING','PUBLISHED','FAILED')`,
    `CREATE TYPE "PostApprovalStatus" AS ENUM ('PENDING','APPROVED','NEEDS_REVISION')`,
    `CREATE TABLE "Creator" (id text PRIMARY KEY,email text NOT NULL)`,
    `CREATE TABLE "SocialCalendar" (id text PRIMARY KEY,"creatorId" text REFERENCES "Creator"(id))`,
    `CREATE TABLE "SocialConnection" (id text PRIMARY KEY,"accessToken" text,"refreshToken" text)`,
    `CREATE TABLE "CalendarPost" ("id" text PRIMARY KEY,"calendarId" text NOT NULL DEFAULT 'synthetic-calendar' REFERENCES "SocialCalendar"(id),"platform" "SocialPlatform" NOT NULL,"postDate" timestamp(3) NOT NULL,"approvalStatus" "PostApprovalStatus" NOT NULL,"isAiDraft" boolean NOT NULL DEFAULT false,"instagramPublishStatus" "InstagramPublishStatus" NOT NULL,"tikTokPublishStatus" "TikTokPublishStatus" NOT NULL,"publishStatus" "InstagramPublishStatus" NOT NULL,"instagramPublishError" text,"tikTokPublishError" text,"publishError" text,"tikTokPublishId" text,"tikTokInitStartedAt" timestamp(3),"publishWorkerStartedAt" timestamp(3),"updatedAt" timestamp(3) NOT NULL,"caption" text DEFAULT 'SYNTHETIC_CUSTOMER_CONTENT_DO_NOT_RETURN',"createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX "CalendarPost_publishStatus_postDate_idx" ON "CalendarPost"("publishStatus","postDate")`,
    `CREATE INDEX "CalendarPost_calendarId_idx" ON "CalendarPost"("calendarId")`,
    `CREATE INDEX "CalendarPost_calendarId_postDate_idx" ON "CalendarPost"("calendarId","postDate")`,
    `INSERT INTO "Creator" VALUES ('synthetic-creator','SYNTHETIC_CUSTOMER_EMAIL_DO_NOT_RETURN')`,
    `INSERT INTO "SocialCalendar" VALUES ('synthetic-calendar','synthetic-creator')`,
    `INSERT INTO "SocialConnection" VALUES ('synthetic-provider','SYNTHETIC_ACCESS_TOKEN_DO_NOT_RETURN','SYNTHETIC_REFRESH_TOKEN_DO_NOT_RETURN')`,
  ])await db.$executeRawUnsafe(sql);
}
async function fixtures(db,count,prefix,only){
  const now=new Date();await db.$executeRaw(Prisma.sql`INSERT INTO "CalendarPost"("id","platform","postDate","approvalStatus","isAiDraft","instagramPublishStatus","tikTokPublishStatus","publishStatus","updatedAt") VALUES ${Prisma.join(Array.from({length:count},(_,i)=>Prisma.sql`(${`${prefix}-${i}`},${only||PLATFORMS[i%5]}::"SocialPlatform",${new Date(now.getTime()-10000+i)},'APPROVED',false,'SCHEDULED','SCHEDULED','SCHEDULED',${new Date(now.getTime()-20000)})`))}`);
}
async function digest(db){return (await db.$queryRawUnsafe(`SELECT md5(string_agg(row_to_json(p)::text,',' ORDER BY "id")) AS digest FROM "CalendarPost" p`))[0].digest;}
async function main(){
  cluster=await startCluster();const db=cluster.stage;results.postgres=cluster.version;results.fsync=true;results.tls=true;results.prisma=require('@prisma/client/package.json').version;
  await schema(db);
  if(faultsOnly){await faultBench(db);results.success=true;return;}
  await fixtures(db,250,'gateway-fixture');role=cluster.role;
  const password=randomBytes(32).toString('hex'),expiry=new Date(Date.now()+7200000-10000).toISOString();
  await cluster.admin.$executeRawUnsafe(`CREATE ROLE "${role}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1 PASSWORD '${password}' VALID UNTIL '${expiry}'`);
  for(const sql of [
    `GRANT CONNECT ON DATABASE "${cluster.database}" TO "${role}"`,
    `GRANT USAGE ON SCHEMA public TO "${role}"`,
    `GRANT SELECT ("id","platform","postDate","approvalStatus","isAiDraft","instagramPublishStatus","tikTokPublishStatus","publishStatus","tikTokPublishId","publishWorkerStartedAt","updatedAt") ON "CalendarPost" TO "${role}"`,
    `ALTER ROLE "${role}" SET default_transaction_read_only=on`,
    `ALTER ROLE "${role}" SET statement_timeout='2s'`,
    `ALTER ROLE "${role}" SET lock_timeout='250ms'`,
    `ALTER ROLE "${role}" SET idle_in_transaction_session_timeout='5s'`,
    `ALTER ROLE "${role}" SET row_security=on`,
    `ALTER ROLE "${role}" SET search_path=pg_catalog,public`,
  ])await db.$executeRawUnsafe(sql);
  results.permissions=await auditRole(db,role);assert.equal(results.permissions.applicationScopePass,true);
  // Prove the independent audit detects direct, inherited PUBLIC and definer escalation.
  await db.$executeRawUnsafe(`GRANT SELECT (caption) ON "CalendarPost" TO "${role}"`);assert.equal((await auditRole(db,role)).applicationScopePass,false);await db.$executeRawUnsafe(`REVOKE SELECT (caption) ON "CalendarPost" FROM "${role}"`);
  await db.$executeRawUnsafe(`GRANT SELECT ON "SocialConnection" TO PUBLIC`);assert.equal((await auditRole(db,role)).applicationScopePass,false);await db.$executeRawUnsafe(`REVOKE SELECT ON "SocialConnection" FROM PUBLIC`);
  await db.$executeRawUnsafe(`CREATE FUNCTION public.fixture_definer() RETURNS int LANGUAGE SQL SECURITY DEFINER AS 'SELECT 1'`);assert.equal((await auditRole(db,role)).applicationScopePass,false);await db.$executeRawUnsafe(`DROP FUNCTION public.fixture_definer()`);
  results.correctness.push('Independent catalog audit catches direct content grant, PUBLIC token-table SELECT and SECURITY DEFINER escalation');
  const url=new URL(cluster.stageUrl);url.username=role;url.password=password;url.searchParams.set('connection_limit','1');url.searchParams.set('connect_timeout','4');url.searchParams.set('pool_timeout','1');
  const configFile=path.join(cluster.directory,'executor.json');fs.writeFileSync(configFile,JSON.stringify({mode:'isolated-staging',url:url.toString(),role,caFile:cluster.ca,caFingerprint:cluster.caFingerprint,expiresAt:expiry}),{mode:0o600});
  roleClient=new PrismaClient({datasources:{db:{url:url.toString()}},log:[]});await roleClient.$connect();
  for(const sql of ['SELECT caption FROM "CalendarPost"','SELECT "accessToken" FROM "SocialConnection"','SELECT email FROM "Creator"','UPDATE "CalendarPost" SET caption=caption WHERE false'])await assert.rejects(roleClient.$queryRawUnsafe(sql));
  const statementTimeoutStarted=performance.now();await assert.rejects(roleClient.$queryRawUnsafe('SELECT pg_sleep(3)'));results.statementTimeoutMs=performance.now()-statementTimeoutStarted;assert.ok(results.statementTimeoutMs>=1800&&results.statementTimeoutMs<2800);
  await roleClient.$disconnect();roleClient=null;results.correctness.push('Executor role rejects synthetic customer content, provider tokens, customer table reads and writes');
  const keys=generateKeyPairSync('ed25519');let clock=Date.now();
  const manifest={version:1,runId:randomBytes(16).toString('hex'),audience:'127.0.0.1',publicKey:keys.publicKey.export({type:'spki',format:'pem'}),queryHash,notBefore:new Date(clock-1000).toISOString(),expiresAt:expiry};
  supervisor=new Supervisor(configFile);gateway=createGateway({manifest,directory:path.join(cluster.directory,'ledger'),executor:supervisor,clock:()=>clock,emergencyFile:path.join(cluster.directory,'STOP')});
  server=createServer(gateway,{clock:()=>clock,tlsOptions:{key:fs.readFileSync(cluster.key),cert:fs.readFileSync(cluster.cert),minVersion:'TLSv1.2'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const https=require('node:https');
  async function call(profile){clock+=11000;const request=signedRequest(manifest,keys.privateKey,profile,clock),start=performance.now();const response=await new Promise((resolve,reject)=>{const r=https.request({host:'127.0.0.1',port:server.address().port,path:request.path,method:'POST',headers:request.headers,ca:fs.readFileSync(cluster.ca),rejectUnauthorized:true},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,value:JSON.parse(body)}));});r.on('error',reject);r.end(request.body);});assert.equal(response.status,200);assert.doesNotMatch(JSON.stringify(response),/SYNTHETIC_|caption|accessToken|refreshToken|QUERY PLAN|postgresql:\/\//);results.profiles.push({profile,httpMs:performance.now()-start,...response.value.timings});}
  const before=await digest(db);
  for(const profile of ['transport','fresh-connection','warm-roundtrip','warm-transaction'])for(let i=0;i<5;i++)await call(profile);
  for(let i=0;i<20;i++)await call('scheduler-select-plan');
  assert.equal(await digest(db),before);results.correctness.push('40 authenticated HTTPS measurements with strict database TLS returned timings only and left every fixture post unchanged');
  // Hold ACCESS EXCLUSIVE on the synthetic table to measure role lock timeout.
  let release,locked;const ready=new Promise(r=>locked=r),hold=new Promise(r=>release=r);
  const locking=db.$transaction(async tx=>{await tx.$executeRawUnsafe('LOCK TABLE "CalendarPost" IN ACCESS EXCLUSIVE MODE');locked();await hold;},{timeout:10000});await ready;
  // Use executor directly: gateway plan quota is deliberately exhausted; it cannot
  // be overridden through ingress. This is an internal staging-only fault probe.
  const timeoutStart=performance.now();await assert.rejects(supervisor.measure({profile:'scheduler-select-plan',ordinal:0}));results.lockTimeoutMs=performance.now()-timeoutStart;release();await locking;
  assert.ok(results.lockTimeoutMs<2000);results.correctness.push('Blocked SELECT fails at the 250-ms database lock timeout and fixture remains unchanged');
  await gateway.close();gateway=null;await new Promise(r=>server.close(r));server=null;
  if(!gatewayOnly)await schedulerBench(db);
  results.success=true;
}
async function faultBench(db){
  const {runPublishingBatchScheduler}=load('lib/publishing/batchScheduler.ts');
  const {claimPublishingBatch}=load('lib/publishing/batchClaims.ts');
  let active=0,peak=0;
  function delayed(coldMs=0){let ready;return {$transaction:async(cb,options)=>{ready??=sleep(coldMs);await ready;active++;peak=Math.max(peak,active);try{return await db.$transaction(async tx=>{await sleep(1923*.3);const proxy={$executeRaw:async(...a)=>{await sleep(1923*.28);return tx.$executeRaw(...a);},$queryRaw:async(...a)=>{await sleep(1923*.28);return tx.$queryRaw(...a);}};const r=await cb(proxy);await sleep(1923*.14);return r;},options);}finally{active--;}}};}
  await fixtures(db,250,'cold-peak');const done=new Set(),ticks=[],adapter=delayed(5000);
  const dispatch=async claim=>{await sleep(500);const field=claim.platform==='INSTAGRAM'?'instagramPublishStatus':claim.platform==='TIKTOK'?'tikTokPublishStatus':'publishStatus';const r=await db.calendarPost.updateMany({where:{id:claim.id,platform:claim.platform,updatedAt:claim.dispatchedAt,publishWorkerStartedAt:null,[field]:'PUBLISHING'},data:{publishWorkerStartedAt:new Date()}});if(!r.count)return;assert.ok(!done.has(claim.id));done.add(claim.id);await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "${field}"='PUBLISHED' WHERE id=$1`,claim.id);};
  for(let tick=0;tick<5&&done.size<250;tick++){const value=await runPublishingBatchScheduler({database:adapter,dispatch});ticks.push({durationMs:value.durationMs,claimed:Object.values(value.platforms).reduce((n,p)=>n+p.claimed,0),deferred:250-done.size,perPlatform:value.platforms});}
  assert.equal(done.size,250);assert.ok(ticks.every(t=>t.durationMs<27000));results.coldPeak={injectedConnectMs:5000,injectedTransactionMs:1923,ticks,peak,duplicates:0};
  await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,100,'failed-ack');const failure=await runPublishingBatchScheduler({database:delayed(),dispatch:async()=>{await sleep(5000);throw new Error('Synthetic lost acknowledgement');}});
  const failures=Object.values(failure.platforms).reduce((n,p)=>n+p.dispatchFailures,0),errors=Object.values(failure.platforms).reduce((n,p)=>n+p.errors,0);assert.equal(failures,100);assert.equal(errors,0);assert.ok(failure.durationMs<27000);results.cleanup={durationMs:failure.durationMs,failures,errors};
  await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,20,'locked-oldest','LINKEDIN');let locked,release;const ready=new Promise(r=>locked=r),hold=new Promise(r=>release=r);const locker=db.$transaction(async tx=>{await tx.$queryRawUnsafe(`SELECT id FROM "CalendarPost" WHERE id='locked-oldest-0' FOR UPDATE`);locked();await hold;});await ready;
  const skipped=await db.$transaction(tx=>claimPublishingBatch(tx,'LINKEDIN',new Date(),20,true));assert.equal(skipped.claims.length,19);assert.ok(!skipped.claims.some(c=>c.id==='locked-oldest-0'));release();await locker;const later=await db.$transaction(tx=>claimPublishingBatch(tx,'LINKEDIN',new Date(),20,true));assert.deepEqual(later.claims.map(c=>c.id),['locked-oldest-0']);results.correctness.push('Locked oldest row skipped and admitted once immediately after release');
}
async function schedulerBench(db){
  const {runPublishingBatchScheduler}=load('lib/publishing/batchScheduler.ts');
  const {claimPublishingBatch,failPublishingDispatchBatch}=load('lib/publishing/batchClaims.ts');
  async function remaining(){return (await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "CalendarPost" WHERE CASE WHEN platform='INSTAGRAM' THEN "instagramPublishStatus"::text WHEN platform='TIKTOK' THEN "tikTokPublishStatus"::text ELSE "publishStatus"::text END='SCHEDULED'`))[0].count;}
  function adapter(latencyMs){let active=0,peak=0;const times=[];return {get peak(){return peak;},times,$transaction:async(cb,options)=>{const started=performance.now();active++;peak=Math.max(peak,active);try{return await db.$transaction(async tx=>{await sleep(latencyMs*.3);const proxy={$executeRaw:async(...a)=>{await sleep(latencyMs*.28);return tx.$executeRaw(...a);},$queryRaw:async(...a)=>{await sleep(latencyMs*.28);return tx.$queryRaw(...a);}};const r=await cb(proxy);await sleep(latencyMs*.14);return r;},options);}finally{active--;times.push(performance.now()-started);}}};}
  async function worker(claim,done,ack=0){await sleep(ack);const field=claim.platform==='INSTAGRAM'?'instagramPublishStatus':claim.platform==='TIKTOK'?'tikTokPublishStatus':'publishStatus';
    const result=await db.calendarPost.updateMany({where:{id:claim.id,platform:claim.platform,updatedAt:claim.dispatchedAt,publishWorkerStartedAt:null,[field]:'PUBLISHING',approvalStatus:'APPROVED',isAiDraft:false},data:{publishWorkerStartedAt:new Date()}});
    if(!result.count)return;assert.ok(!done.has(claim.id),'Duplicate synthetic worker');done.add(claim.id);
    await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "${field}"='PUBLISHED' WHERE id=$1`,claim.id);
  }
  for(const concurrency of [1,2,3])for(const count of [10,25,50,100,250]){
    await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,count,`load-${concurrency}-${count}`);const done=new Set(),a=adapter(1380),ticks=[];
    for(let tick=0;tick<8&&await remaining();tick++){const value=await runPublishingBatchScheduler({database:a,concurrency,dispatch:c=>worker(c,done,500)});ticks.push({durationMs:value.durationMs,claimed:Object.values(value.platforms).reduce((n,p)=>n+p.claimed,0),perPlatform:value.platforms});}
    assert.equal(done.size,count);assert.ok(a.peak<=concurrency);assert.ok(ticks.every(t=>t.durationMs<27000));
    results.workloads.push({count,concurrency,injectedTransactionMs:1380,injectedAckMs:500,ticks,transactionTimesMs:a.times,peak:a.peak,duplicates:0});console.log(JSON.stringify({stage:'scheduler',count,concurrency,ticks:ticks.map(t=>({ms:t.durationMs,claimed:t.claimed}))}));
  }
  for(const count of [10,25,50,100,250]){await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,count,`tail-${count}`);const done=new Set(),a=adapter(1923),ticks=[];
    for(let tick=0;tick<8&&await remaining();tick++){const value=await runPublishingBatchScheduler({database:a,concurrency:3,dispatch:c=>worker(c,done,500)});ticks.push({durationMs:value.durationMs,claimed:Object.values(value.platforms).reduce((n,p)=>n+p.claimed,0),perPlatform:value.platforms});}
    assert.equal(done.size,count);results.workloads.push({count,concurrency:3,injectedTransactionMs:1923,injectedAckMs:500,ticks,transactionTimesMs:a.times,peak:a.peak,duplicates:0});console.log(JSON.stringify({stage:'tail',count,ticks:ticks.map(t=>({ms:t.durationMs,claimed:t.claimed}))}));}
  // Fairness under a persistently hot platform: fresh arrivals coexist with a backlog.
  await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');const continuousDone=new Set(),a=adapter(1380);
  for(let tick=0;tick<5;tick++){await fixtures(db,100,`hot-${tick}`,'INSTAGRAM');await fixtures(db,25,`continuous-${tick}`);const value=await runPublishingBatchScheduler({database:a,dispatch:c=>worker(c,continuousDone,100)});assert.ok(PLATFORMS.every(p=>value.platforms[p].dispatched>=5));results.continuous.push({tick,perPlatform:value.platforms,durationMs:value.durationMs});}
  assert.equal(await remaining(),0);assert.equal(continuousDone.size,625);results.correctness.push('Five injected-latency arrival rounds with hot Instagram backlog: all five platforms progress every round, 625 unique fixture workers');
  await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,250,'overlap');const done=new Set(),overlapAdapter=adapter(1380);
  const runs=await Promise.all([1,2].map(()=>runPublishingBatchScheduler({database:overlapAdapter,dispatch:c=>worker(c,done,100)})));
  for(let i=0;i<5&&await remaining();i++)await runPublishingBatchScheduler({database:overlapAdapter,dispatch:c=>worker(c,done,100)});
  assert.equal(done.size,250);results.overlap={peakAggregateRequestedOperations:overlapAdapter.peak,poolLimit:5,duplicates:0,runs};results.correctness.push('Two overlapping schedulers plus fixture writes drain 250 unique posts through the shared five-connection pool');
  // Core correctness with real PostgreSQL, not synthetic SQL mocks.
  await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,4,'eligibility','INSTAGRAM');
  await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "approvalStatus"='PENDING' WHERE id='eligibility-1'`);await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "isAiDraft"=true WHERE id='eligibility-2'`);await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "postDate"=CURRENT_TIMESTAMP+interval '1 day' WHERE id='eligibility-3'`);
  const batch=await db.$transaction(tx=>claimPublishingBatch(tx,'INSTAGRAM',new Date(),20,true));assert.deepEqual(batch.claims.map(c=>c.id),['eligibility-0']);
  const lease=(await db.$queryRawUnsafe(`SELECT "updatedAt" FROM "CalendarPost" WHERE id=$1`,batch.claims[0].id))[0].updatedAt;assert.equal(lease.toISOString(),batch.claims[0].dispatchedAt.toISOString());
  await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "updatedAt"="updatedAt"+interval '1 millisecond' WHERE id=$1`,batch.claims[0].id);assert.equal(await db.$transaction(tx=>failPublishingDispatchBatch(tx,'INSTAGRAM',batch.claims)),0);
  results.correctness.push('Approval/AI/future guards, exact committed leases and newer-lease cleanup protection pass');
  await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,1,'rollback','X');await assert.rejects(db.$transaction(async tx=>{await claimPublishingBatch(tx,'X',new Date(),20,true);throw new Error('fixture rollback');}));assert.equal(await remaining(),1);
  await db.$executeRawUnsafe('TRUNCATE "CalendarPost"');await fixtures(db,3,'recovery','TIKTOK');await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "tikTokPublishStatus"='PUBLISHING',"updatedAt"=CURRENT_TIMESTAMP-interval '20 minutes'`);await db.$executeRawUnsafe(`UPDATE "CalendarPost" SET "tikTokPublishId"='synthetic-existing-operation' WHERE id IN ('recovery-0','recovery-1')`);
  const recovered=await db.$transaction(tx=>claimPublishingBatch(tx,'TIKTOK',new Date(),20,true));assert.equal(recovered.stale,1);assert.equal(recovered.claims.length,2);assert.ok(recovered.claims.every(c=>c.recoveringTikTok));assert.equal((await db.$transaction(tx=>claimPublishingBatch(tx,'TIKTOK',new Date(),20,false,recovered.claims.map(c=>c.id)))).claims.length,0);
  results.correctness.push('Rollback leaves due job scheduled; accepted TikTok IDs recover without repeat selection; stale unaccepted operation fails');
}
if(require.main===module){
main().catch(error=>{results.success=false;results.failure={code:error.code||error.name,message:error.message.startsWith('Staging')?error.message:'STAGING_CHECK_FAILED'};console.error('Gateway staging assessment failed',results.failure);process.exitCode=1;}).finally(async()=>{
  await roleClient?.$disconnect().catch(()=>{});await gateway?.close().catch(()=>{});await supervisor?.stop().catch(()=>{});if(server)await new Promise(r=>server.close(r));
  if(cluster&&role){try{await cluster.admin.$executeRawUnsafe(`ALTER ROLE "${role}" NOLOGIN PASSWORD NULL`);await cluster.stage.$executeRawUnsafe(`DROP OWNED BY "${role}"`);await cluster.admin.$executeRawUnsafe(`DROP ROLE "${role}"`);results.roleRemoved=true;}catch{results.roleRemoved=false;}}
  await cluster?.close();results.clusterRemoved=cluster?!fs.existsSync(cluster.directory):false;fs.writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify({resultsFile:output,success:results.success,roleRemoved:results.roleRemoved,clusterRemoved:results.clusterRemoved}));
});

}
module.exports={schema,fixtures,digest};
