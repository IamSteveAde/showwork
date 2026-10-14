'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load}=require('./helpers/load-typescript.cjs');
const {startOwnershipCluster}=require('./helpers/ownership-cluster.cjs');
const {createPublishingIntentActions}=load('lib/publishing/intentActions.ts');
const {createPublishingOwnership}=load('lib/publishing/ownership.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('Stage 4A isolated PostgreSQL transactions and constraints',async t=>{
 const cluster=await startOwnershipCluster(),{pool}=cluster;
 let serial=0;
 async function fixture(run){
  const schema='action_'+ ++serial;
  await pool.query(`CREATE SCHEMA ${schema}`);
  const q=async(sql,args)=>{const c=await pool.connect();try{await c.query(`SET search_path TO ${schema}`);return await c.query(sql,args);}finally{c.release();}};
  await q(`CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X');
    CREATE TABLE "SyntheticPost"(id text PRIMARY KEY,content text NOT NULL DEFAULT 'original',approved boolean NOT NULL DEFAULT true,entitled boolean NOT NULL DEFAULT true,status text NOT NULL DEFAULT 'SCHEDULED');
    INSERT INTO "SyntheticPost"(id) VALUES('post')`);
  for(const name of ['schema','ownership-schema','intent-actions-schema'])await q(fs.readFileSync(`scripts/publishing-reliability/${name}.sql`,'utf8'));
  if(process.env.SHOWWORK_TEST_CANONICAL_SCHEMA==='1')await q(fs.readFileSync('scripts/publishing-reliability/canonical-schema.sql','utf8'));
  let failEdit=false, deny=false, loseAck=false;
  const db={transaction:async fn=>{
   const c=await pool.connect();let broken=false;
   try{
    await c.query('BEGIN');await c.query(`SET LOCAL search_path TO ${schema}`);
    const result=await fn(c);
    if(loseAck){
     loseAck=false;
     const op=(await c.query(`SELECT "operationId" FROM "PublishingAction" WHERE xmin=pg_current_xact_id()::xid`)).rows[0].operationId;
     broken=true;c.on('error',()=>{});c.connection.stream.pause();const pending=c.query('COMMIT').catch(()=>{});
     // Verify the durable write from another connection while this socket cannot receive COMMIT.
     for(let n=0;;n++){if((await q(`SELECT count(*)::int AS n FROM "PublishingAction" WHERE "operationId"=$1`,[op])).rows[0].n>0)break;if(n>100)throw Error('COMMIT_NOT_VISIBLE');await delay(10);}
     c.connection.stream.destroy();await pending;throw Error('real lost COMMIT acknowledgement');
    }
    await c.query('COMMIT');return result;
   }catch(e){if(!broken)await c.query('ROLLBACK');throw e;}finally{c.release(broken);}
  }};
  const proofs=new Map();
  const deps={database:db,
   lockAndValidatePost:async(tx,input)=>{const p=(await tx.query(`SELECT * FROM "SyntheticPost" WHERE id=$1 FOR UPDATE`,[input.postId])).rows[0];if(!p||!p.approved||!p.entitled||deny||input.actor!=='operator')throw Error('validation denied');},
   validateDueTime:async(tx,input)=>{assert.ok(Number.isFinite(input.dueAt.getTime()));if(input.dueAt.getTime()<0)throw Error('bad due');},
   applyEdit:async(tx,input)=>{await tx.query(`UPDATE "SyntheticPost" SET content=$2 WHERE id=$1`,[input.postId,input.edit]);if(failEdit)throw Error('edit fails');},
   verifyRetryEvidence:async(tx,input)=>{const p=proofs.get(input.evidenceReference);if(!p)throw Error('untrusted proof');return p;},
  };
  const actions=createPublishingIntentActions(deps),owner=createPublishingOwnership(db);
  await owner.transition({operationId:'activate',actor:'operator',expectedEpoch:0n,to:'NETLIFY',activate:true});
  const request=(operationId,expectedRevision=1,extra={})=>({operationId,actor:'operator',intentId:'intent',postId:'post',platform:'X',expectedRevision,...extra});
  const schedule=()=>actions.schedule(request('schedule',0,{dueAt:new Date(0)}));
  async function prepare(jobId){await db.transaction(async c=>{await c.query(`SELECT id FROM "PublishingIntent" WHERE id='intent' FOR UPDATE`);await c.query(`UPDATE "PublishingJob" SET phase='PREPARED',"ownershipEpoch"=1 WHERE id=$1`,[jobId]);});}
  const authorize=jobId=>owner.authorize({attemptId:'attempt',intentId:'intent',revision:1,jobId,owner:'NETLIFY',epoch:1n,actor:'worker'});
  const outcome=(value,ref)=>owner.recordOutcome({operationId:'outcome-'+value,attemptId:'attempt',actor:'worker',outcome:value,remoteReference:ref});
  const proof=async(kind='NOT_SENT',predecessorId='attempt',evidenceId='proof')=>{
   proofs.set(evidenceId,{kind,actorStopped:true,verified:true,retryable:true});
   return actions.recordRetryEvidence({id:evidenceId,actor:'operator',intentId:'intent',predecessorId,evidenceReference:evidenceId});
  };
  await run({q,db,deps,actions,owner,request,schedule,prepare,authorize,outcome,proof,proofs,
   lose:()=>{loseAck=true;},failEdit:()=>{failEdit=true;},deny:()=>{deny=true;}});
 }
 try{
  await t.test('scheduling validates eligibility and due time; no partial transaction',()=>fixture(async h=>{
   await assert.rejects(h.actions.schedule(h.request('bad',0,{dueAt:new Date(-1)})));
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingIntent"`)).rows[0].n,0);
   h.deny();await assert.rejects(h.schedule());assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob"`)).rows[0].n,0);
  }));
  await t.test('two simultaneous initial schedules have one intent/revision/job',()=>fixture(async h=>{
   const r=await Promise.allSettled([h.schedule(),h.actions.schedule(h.request('other',0,{dueAt:new Date(0)}))]);assert.equal(r.filter(x=>x.status==='fulfilled'&&x.value.outcome==='APPLIED').length,1);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob"`)).rows[0].n,1);
  }));
  await t.test('scheduling versus cancellation serializes with expected revision',()=>fixture(async h=>{
   await h.schedule();await h.actions.cancel(h.request('cancel-before'));
   const r=await Promise.all([h.actions.schedule(h.request('again',1,{dueAt:new Date(0)})),h.actions.cancel(h.request('cancel-race'))]);
   assert.equal(r[0].outcome,'APPLIED');assert.ok(['APPLIED','CONFLICT'].includes(r[1].outcome));
   const i=(await h.q(`SELECT * FROM "PublishingIntent"`)).rows[0];assert.equal(i.currentRevision,2);
   assert.equal((await h.q(`SELECT phase FROM "PublishingJob" WHERE "intentRevision"=1`)).rows[0].phase,'CANCELLED');
  }));
  await t.test('scheduling versus rescheduling cannot create competing current jobs',()=>fixture(async h=>{
   await h.schedule();const r=await Promise.all([h.actions.schedule(h.request('s2',1,{dueAt:new Date(0)})),h.actions.reschedule(h.request('r2',1,{dueAt:new Date(0)}))]);
   assert.equal(r.filter(x=>x.outcome==='APPLIED').length,1);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob" WHERE phase='READY'`)).rows[0].n,1);
  }));
  await t.test('editing versus worker authorization: exactly one wins the intent lock',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);
   const r=await Promise.allSettled([h.actions.edit(h.request('edit',1,{edit:'new'})),h.authorize(s.jobId)]);
   const sent=r[1].status==='fulfilled'&&r[1].value.maySend;
   const post=(await h.q(`SELECT * FROM "SyntheticPost"`)).rows[0];assert.equal(post.content,sent?'original':'new');assert.equal(post.status,'SCHEDULED');
   if(sent)assert.equal(r[0].value.outcome,'PENDING_RECONCILIATION');
  }));
  await t.test('cancellation versus external attempt authorization preserves authorized work',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);
   const r=await Promise.allSettled([h.actions.cancel(h.request('cancel')),h.authorize(s.jobId)]);
   const attempt=(await h.q(`SELECT * FROM "PublishingExternalAttempt"`)).rows[0];
   if(attempt){assert.equal(r[0].value.outcome,'PENDING_RECONCILIATION');assert.equal((await h.q(`SELECT phase FROM "PublishingJob"`)).rows[0].phase,'EXTERNAL_PENDING');}
   else {assert.equal(r[0].value.outcome,'APPLIED');assert.equal(r[1].status,'rejected');}
  }));
  await t.test('rescheduling versus admission fences stale revision at SQL boundary',()=>fixture(async h=>{
   const s=await h.schedule();
   const r=await Promise.allSettled([h.actions.reschedule(h.request('reschedule',1,{dueAt:new Date(0)})),h.prepare(s.jobId)]);
   assert.equal(r[0].value.outcome,'APPLIED');assert.equal((await h.q(`SELECT phase FROM "PublishingJob" WHERE id=$1`,[s.jobId])).rows[0].phase,'CANCELLED');
   await assert.rejects(h.prepare(s.jobId),/FENCED/);
   await assert.rejects(h.authorize(s.jobId));
  }));
  await t.test('two simultaneous retries allocate one durable successor',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.outcome('REJECTED');await h.proof('PROVIDER_REJECTED');
   const r=await Promise.all([h.actions.retry(h.request('retry-a',1,{evidenceId:'proof',dueAt:new Date(0)})),h.actions.retry(h.request('retry-b',1,{evidenceId:'proof',dueAt:new Date(0)}))]);
   assert.equal(r.filter(x=>x.outcome==='APPLIED').length,1);assert.equal(r.filter(x=>x.outcome==='CONFLICT').length,1);
   const g=(await h.q(`SELECT * FROM "PublishingRetryGeneration"`)).rows[0];assert.equal(g.generation,2);assert.equal(g.rootAttemptId,'attempt');assert.equal(g.evidenceId,'proof');
  }));
  await t.test('retry after verified no-send durably resolves old authorization',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.proof();
   const r=await h.actions.retry(h.request('retry',1,{evidenceId:'proof',dueAt:new Date(0)}));assert.equal(r.outcome,'APPLIED');
   assert.equal((await h.q(`SELECT outcome FROM "PublishingExternalAttempt"`)).rows[0].outcome,'REJECTED');assert.equal((await h.q(`SELECT kind FROM "PublishingRetryEvidence"`)).rows[0].kind,'NOT_SENT');
  }));
  await t.test('retry after definitive provider rejection requires approved trusted evidence',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.outcome('REJECTED');
   assert.equal((await h.actions.retry(h.request('without-proof',1,{evidenceId:'missing',dueAt:new Date(0)}))).outcome,'PENDING_RECONCILIATION');
   await h.proof('PROVIDER_REJECTED');await assert.rejects(h.actions.retry(h.request('bad-proof',1,{evidenceId:'missing',dueAt:new Date(0)})),/EVIDENCE_MISSING/);assert.equal((await h.actions.retry(h.request('retry',1,{evidenceId:'proof',dueAt:new Date(0)}))).outcome,'APPLIED');
  }));
  await t.test('uncertain outcome remains pending even with claimed evidence',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.outcome('UNKNOWN');
   assert.equal((await h.actions.retry(h.request('retry',1,{evidenceId:'fake',dueAt:new Date(0)}))).outcome,'PENDING_RECONCILIATION');
   await assert.rejects(h.actions.recordRetryEvidence({id:'fake',actor:'operator',intentId:'intent',predecessorId:'attempt',evidenceReference:'client-boolean'}));
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingRetryGeneration"`)).rows[0].n,0);
  }));
  await t.test('confirmed publication requires separately authorized new intent',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.outcome('CONFIRMED','remote');
   for(const action of ['cancel','reschedule','retry','edit'])assert.equal((await h.actions[action](h.request(action,1,{dueAt:new Date(0),evidenceId:'fake',edit:'bad'}))).outcome,'NEW_AUTHORIZED_INTENT_REQUIRED');
   await assert.rejects(h.proof());assert.equal((await h.q(`SELECT "remoteReference" FROM "PublishingExternalAttempt"`)).rows[0].remoteReference,'remote');
  }));
  await t.test('real lost database acknowledgement replays exact action without duplicate jobs',()=>fixture(async h=>{
   h.lose();await assert.rejects(h.schedule(),/UNCONFIRMED/);
   const r=await Promise.all([h.schedule(),h.schedule(),h.schedule()]);assert.deepEqual(r[0],r[1]);assert.deepEqual(r[1],r[2]);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob"`)).rows[0].n,1);
   await assert.rejects(h.actions.schedule(h.request('schedule',0,{dueAt:new Date(1)})),/OPERATION_CONFLICT/);
  }));
  await t.test('lost retry acknowledgement recovers the same successor and approval',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.proof();
   const input=h.request('retry',1,{evidenceId:'proof',dueAt:new Date(0)});
   h.lose();await assert.rejects(h.actions.retry(input),/UNCONFIRMED/);
   const r=await Promise.all([h.actions.retry(input),h.actions.retry(input)]);assert.deepEqual(r[0],r[1]);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingRetryGeneration"`)).rows[0].n,1);
  }));
  for(const action of ['cancel','reschedule','edit'])await t.test(`held authorization commits before ${action}; explicit pending outcome`,()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);
   let ready,release;const started=new Promise(r=>ready=r),gate=new Promise(r=>release=r);
   const held=createPublishingOwnership({transaction:fn=>h.db.transaction(async tx=>{const v=await fn(tx);ready();await gate;return v;})});
   const sending=held.authorize({attemptId:'attempt',intentId:'intent',revision:1,jobId:s.jobId,owner:'NETLIFY',epoch:1n,actor:'worker'});
   await started;const actionResult=h.actions[action](h.request(action,1,{dueAt:new Date(0),edit:'bad'}));
   try {
    for(let n=0;;n++){
     const locks=(await h.q(`SELECT count(*)::int n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%PublishingIntent%'`)).rows[0].n;
     if(locks)break;if(n>100)throw Error('EXPECTED_INTENT_LOCK_WAIT');await delay(10);
    }
   }finally{release();}
   assert.equal((await sending).maySend,true);assert.equal((await actionResult).outcome,'PENDING_RECONCILIATION');
   assert.equal((await h.q(`SELECT phase FROM "PublishingJob"`)).rows[0].phase,'EXTERNAL_PENDING');
  }));
  await t.test('edit failure rolls back content, cancellation, invalidation and audit',()=>fixture(async h=>{
   await h.schedule();h.failEdit();await assert.rejects(h.actions.edit(h.request('edit',1,{edit:'changed'})));
   assert.equal((await h.q(`SELECT state FROM "PublishingIntent"`)).rows[0].state,'ACTIVE');assert.equal((await h.q(`SELECT content FROM "SyntheticPost"`)).rows[0].content,'original');assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingRevisionInvalidation"`)).rows[0].n,0);
  }));
  await t.test('edits invalidate every platform revision atomically',()=>fixture(async h=>{
   await h.schedule();await h.actions.schedule(h.request('schedule-fb',0,{intentId:'facebook-intent',platform:'FACEBOOK',dueAt:new Date(0)}));
   await h.actions.edit(h.request('edit',1,{edit:'changed'}));assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob" WHERE phase='CANCELLED'`)).rows[0].n,2);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingRevisionInvalidation"`)).rows[0].n,2);
  }));
  await t.test('historical evidence, revisions and jobs cannot be rewritten/deleted',()=>fixture(async h=>{
   const s=await h.schedule();await h.actions.reschedule(h.request('new-time',1,{dueAt:new Date(0)}));await h.actions.cancel(h.request('cancel',2));
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingIntentRevision"`)).rows[0].n,2);
   for(const table of ['PublishingAction','PublishingIntentRevision','PublishingRevisionInvalidation','PublishingJob'])await assert.rejects(h.q(`DELETE FROM "${table}"`),/IMMUTABLE/);
   assert.equal((await h.q(`SELECT phase FROM "PublishingJob" WHERE id=$1`,[s.jobId])).rows[0].phase,'CANCELLED');
  }));
  await t.test('third generation has durable immediate predecessor and preserves the root',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.proof();
   const r=await h.actions.retry(h.request('retry2',1,{evidenceId:'proof',dueAt:new Date(0)}));
   await h.db.transaction(async c=>{
    await c.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`);await c.query(`SELECT id FROM "PublishingIntent" WHERE id='intent' FOR UPDATE`);
    await c.query(`UPDATE "PublishingJob" SET phase='PREPARED',"ownershipEpoch"=1 WHERE id=$1`,[r.jobId]);
    await c.query(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner='NETLIFY',epoch=1,"authorizationId"='auth2' WHERE id=$1`,[r.generationId]);
    await c.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES('auth2-event',$1,'AUTHORIZED','worker')`,[r.generationId]);
    await c.query(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING' WHERE id=$1`,[r.jobId]);
   });
   await h.proof('NOT_SENT',r.generationId,'proof2');
   const next=await h.actions.retry(h.request('retry3',2,{evidenceId:'proof2',dueAt:new Date(0)}));
   const g=(await h.q(`SELECT * FROM "PublishingRetryGeneration" WHERE id=$1`,[next.generationId])).rows[0];
   assert.equal(g.generation,3);assert.equal(g.predecessorGenerationId,r.generationId);assert.equal(g.rootAttemptId,null);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,1);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingIntentRevision"`)).rows[0].n,3);
  }));
  await t.test('retry generation cancellation preserves approval and blocks unsanctioned reschedule',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.proof();
   const r=await h.actions.retry(h.request('retry',1,{evidenceId:'proof',dueAt:new Date(0)}));
   assert.equal((await h.actions.cancel(h.request('cancel',2))).outcome,'APPLIED');
   assert.equal((await h.q(`SELECT outcome FROM "PublishingRetryGeneration"`)).rows[0].outcome,'CANCELLED');
   assert.equal((await h.q(`SELECT phase FROM "PublishingJob" WHERE id=$1`,[r.jobId])).rows[0].phase,'CANCELLED');
   assert.equal((await h.actions.schedule(h.request('bypass',2,{dueAt:new Date(0)}))).code,'EXPLICIT_RETRY_REQUIRED');
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingRetryEvidence"`)).rows[0].n,1);
  }));
  await t.test('job-only uncertain evidence prevents cancellation without attempt row',()=>fixture(async h=>{
   const s=await h.schedule();await h.q(`UPDATE "PublishingJob" SET phase='OUTCOME_UNKNOWN',"remoteId"='provider-evidence' WHERE id=$1`,[s.jobId]);
   assert.equal((await h.actions.cancel(h.request('cancel'))).outcome,'PENDING_RECONCILIATION');
   await assert.rejects(h.q(`UPDATE "PublishingJob" SET "remoteId"=NULL`),/EVIDENCE_IMMUTABLE/);
  }));
  await t.test('repeatable-read adapters and raw SQL are rejected before stale-snapshot decisions',()=>fixture(async h=>{
   await h.schedule();
   const repeatable={transaction:fn=>h.db.transaction(async c=>{await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');return fn(c);})};
   const service=createPublishingIntentActions({...h.deps,database:repeatable});
   await assert.rejects(service.cancel(h.request('rr')),/REQUIRES_READ_COMMITTED/);
   await assert.rejects(repeatable.transaction(c=>c.query(`UPDATE "PublishingIntent" SET state='CANCELLED'`)),/REQUIRES_READ_COMMITTED/);
   assert.equal((await h.q(`SELECT state FROM "PublishingIntent"`)).rows[0].state,'ACTIVE');
  }));
  await t.test('raw state changes cannot omit invalidation and durable-job cancellation',()=>fixture(async h=>{
   await h.schedule();await assert.rejects(h.q(`UPDATE "PublishingIntent" SET state='CANCELLED'`),/INVALIDATION_REQUIRED/);
   assert.equal((await h.q(`SELECT state FROM "PublishingIntent"`)).rows[0].state,'ACTIVE');
  }));
  await t.test('raw retry rows cannot bypass proof, monotonic predecessor, audit or authorization boundary',()=>fixture(async h=>{
   const s=await h.schedule();await h.prepare(s.jobId);await h.authorize(s.jobId);await h.outcome('REJECTED');await h.proof('PROVIDER_REJECTED');
   const r=await h.actions.retry(h.request('retry',1,{evidenceId:'proof',dueAt:new Date(0)}));
   await assert.rejects(h.q(`INSERT INTO "PublishingRetryGeneration"(id,"intentId",revision,generation,"rootAttemptId","evidenceId","jobId","operationId","approvedBy")
    SELECT 'bad','intent',revision,4,'attempt','proof',"jobId",'bad-operation','operator' FROM "PublishingRetryGeneration"`),/PREDECESSOR_INVALID/);
   await assert.rejects(h.q(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner='NETLIFY',epoch=1,"authorizationId"='send'`),/JOB_FENCED/);
   await h.db.transaction(async c=>{await c.query(`SELECT id FROM "PublishingIntent" WHERE id='intent' FOR UPDATE`);await c.query(`UPDATE "PublishingJob" SET phase='PREPARED',"ownershipEpoch"=1 WHERE id=$1`,[r.jobId]);});
   await assert.rejects(h.q(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner='NETLIFY',epoch=1,"authorizationId"='send'`),/AUDIT_REQUIRED/);
   await h.db.transaction(async c=>{
    await c.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`);await c.query(`SELECT id FROM "PublishingIntent" WHERE id='intent' FOR UPDATE`);
    await c.query(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner='NETLIFY',epoch=1,"authorizationId"='send'`);
    await c.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES('send-event',$1,'AUTHORIZED','worker')`,[r.generationId]);
    await c.query(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING' WHERE id=$1`,[r.jobId]);
   });
   assert.equal((await h.actions.cancel(h.request('cancel',2))).outcome,'PENDING_RECONCILIATION');
   await assert.rejects(h.q(`DELETE FROM "PublishingRetryEvidence"`),/IMMUTABLE/);
   await assert.rejects(h.q(`UPDATE "PublishingRetryGeneration" SET "rootAttemptId"='wrong'`),/IDENTITY_IMMUTABLE/);
  }));
 }finally{await cluster.close();}
});
