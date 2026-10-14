const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load}=require('./helpers/load-typescript.cjs');
const {startOwnershipCluster}=require('./helpers/ownership-cluster.cjs');
const {createPublishingOwnership}=load('lib/publishing/ownership.ts');

test('Stage 3A on fresh disposable PostgreSQL (no existing database)',async t=>{
 const cluster=await startOwnershipCluster();const {pool}=cluster;
 try{
  await pool.query(`CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X')`);
  await pool.query(fs.readFileSync('scripts/publishing-reliability/schema.sql','utf8'));
  await pool.query(`INSERT INTO "PublishingAdmission" VALUES('legacy-admission','INSTAGRAM',now());
    INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase,"remoteId",confirmation)
    VALUES('legacy','legacy-admission','old-post','INSTAGRAM',now(),'OUTCOME_UNKNOWN','existing-reference','{"preserved":true}')`);
  await pool.query(fs.readFileSync('scripts/publishing-reliability/ownership-schema.sql','utf8'));
  let loseCommit=false;
  const db={transaction:async run=>{
   const client=await pool.connect();let committed=false;
   try{await client.query('BEGIN');const value=await run(client);await client.query('COMMIT');committed=true;if(loseCommit){loseCommit=false;throw Error('synthetic lost acknowledgement');}return value;}
   catch(e){if(!committed)await client.query('ROLLBACK');throw e;}finally{client.release();}
  }};
  const service=createPublishingOwnership(db);
  const transition=(operationId,expectedEpoch,to,activate=false)=>service.transition({operationId,actor:'test-operator',expectedEpoch,to,activate});
  await t.test('additive schema preserves legacy evidence and starts inactive',async()=>{
   const owner=(await pool.query('SELECT * FROM "PublishingOwnership"')).rows[0];assert.equal(owner.enabled,false);assert.equal(owner.state,'DRAINING');
   const legacy=(await pool.query('SELECT * FROM "PublishingJob" WHERE id=\'legacy\'')).rows[0];assert.equal(legacy.remoteId,'existing-reference');assert.deepEqual(legacy.confirmation,{preserved:true});assert.equal(legacy.intentId,null);
   await assert.rejects(transition('inactive',0n,'VPS'),/OWNERSHIP_INACTIVE/);
  });
  await t.test('competing transitions and stale epochs',async()=>{
   const outcomes=await Promise.allSettled([transition('activate-a',0n,'NETLIFY',true),transition('activate-b',0n,'NETLIFY',true)]);
   assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
   await assert.rejects(transition('stale',0n,'DRAINING'),/STALE_EPOCH/);
   await assert.rejects(transition('direct',1n,'VPS'),/INVALID_TRANSITION/);
  });
  await t.test('lost transition acknowledgement is recovered without epoch increment',async()=>{
   loseCommit=true;await assert.rejects(transition('drain',1n,'DRAINING'),/UNCONFIRMED/);
   assert.deepEqual(await transition('drain',1n,'DRAINING'),{epoch:2n,replay:true});
   await assert.rejects(transition('vps',2n,'VPS'),/UNRESOLVED_LEGACY_JOBS/);
   // Synthetic reconciliation only; reference and evidence remain intact.
   await pool.query(`UPDATE "PublishingJob" SET phase='CONFIRMED' WHERE id='legacy'`);
   await transition('vps',2n,'VPS');
  });
  await service.createIntent({id:'intent',postId:'post',platform:'TIKTOK',dueAt:new Date(0)});
  await t.test('competing revisions and unique jobs',async()=>{
   const r=await Promise.allSettled([service.reviseIntent('intent',1,new Date(0)),service.reviseIntent('intent',1,new Date(0))]);assert.equal(r.filter(v=>v.status==='fulfilled').length,1);
   await assert.rejects(pool.query(`INSERT INTO "PublishingIntentRevision" VALUES('intent',2,now(),now())`),e=>e.code==='23505');
   await pool.query(`INSERT INTO "PublishingAdmission" VALUES('new-admission','TIKTOK',now());
    INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase,"intentId","intentRevision","ownershipEpoch") VALUES('job','new-admission','post','TIKTOK',now(),'PREPARED','intent',2,3)`);
   await assert.rejects(pool.query(`INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase,"intentId","intentRevision","ownershipEpoch") VALUES('duplicate','new-admission','post','TIKTOK',now()+interval '1 second','PREPARED','intent',2,3)`),e=>e.code==='23505');
  });
  const request={attemptId:'attempt',intentId:'intent',revision:2,jobId:'job',owner:'VPS',epoch:3n,actor:'worker'};
  await t.test('stale epoch fails; competing authorization grants one send',async()=>{
   await assert.rejects(service.authorize({...request,epoch:2n}),/FENCED/);
   const r=await Promise.all([service.authorize(request),service.authorize(request)]);assert.equal(r.filter(v=>v.maySend).length,1);
   await assert.rejects(service.authorize({...request,attemptId:'different'}),/ATTEMPT_EXISTS/);
  });
  await t.test('uncertain outcomes and references survive draining; no reauthorization',async()=>{
   const outcome={operationId:'unknown',attemptId:'attempt',actor:'worker',outcome:'UNKNOWN',remoteReference:'provider-reference'};
   loseCommit=true;await assert.rejects(service.recordOutcome(outcome),/UNCONFIRMED/);
   await service.recordOutcome(outcome);
   assert.equal((await pool.query('SELECT count(*)::int AS n FROM "PublishingAttemptEvent" WHERE "operationId"=$1',['unknown'])).rows[0].n,1);
   await transition('drain-again',3n,'DRAINING');
   await assert.rejects(transition('unsafe-takeover',4n,'NETLIFY'),/UNRESOLVED_ATTEMPTS/);
   await assert.rejects(service.reviseIntent('intent',2,new Date()),/ATTEMPT_EXISTS/);
   const recovered=await service.recoverAttempt('attempt');assert.equal(recovered.maySend,false);assert.equal(recovered.record.remoteReference,'provider-reference');
   await assert.rejects(pool.query('DELETE FROM "PublishingExternalAttempt" WHERE id=$1',['attempt']),/IMMUTABLE/);
   await assert.rejects(pool.query('DELETE FROM "PublishingAttemptEvent"'),/IMMUTABLE/);
   await assert.rejects(service.recordOutcome({operationId:'wrong-proof',attemptId:'attempt',actor:'reconciler',outcome:'CONFIRMED',remoteReference:'different'}),/REFERENCE_CONFLICT/);
   await service.recordOutcome({operationId:'confirmed',attemptId:'attempt',actor:'reconciler',outcome:'CONFIRMED',remoteReference:'provider-reference'});
   await assert.rejects(pool.query(`UPDATE "PublishingExternalAttempt" SET outcome='AUTHORIZED' WHERE id='attempt'`),/TERMINAL/);
   await assert.rejects(pool.query(`UPDATE "PublishingOwnership" SET epoch=epoch WHERE id=1`),/EPOCH_INVALID/);
   await transition('netlify-return',4n,'NETLIFY');
  });
  await t.test('lost authorization acknowledgement never grants send on recovery',async()=>{
   await service.createIntent({id:'second',postId:'post2',platform:'X',dueAt:new Date(0)});
   await pool.query(`INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase,"intentId","intentRevision","ownershipEpoch") VALUES('job2','new-admission','post2','X',now(),'PREPARED','second',1,5)`);
   const args={attemptId:'attempt2',intentId:'second',revision:1,jobId:'job2',owner:'NETLIFY',epoch:5n,actor:'worker'};
   loseCommit=true;await assert.rejects(service.authorize(args),/UNCONFIRMED/);
   assert.equal((await service.recoverAttempt('attempt2')).maySend,false);
   assert.equal((await service.authorize(args)).maySend,false);
   assert.equal((await pool.query('SELECT count(*)::int AS n FROM "PublishingExternalAttempt" WHERE id=$1',['attempt2'])).rows[0].n,1);
  });
 }finally{await cluster.close();}
});
