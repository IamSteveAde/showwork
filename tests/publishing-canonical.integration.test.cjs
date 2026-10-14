'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const {load}=require('./helpers/load-typescript.cjs'),{startOwnershipCluster}=require('./helpers/ownership-cluster.cjs');
const {createPublishingTransactionDatabase}=load('lib/publishing/transactionDatabase.ts');
const {createCanonicalPublishingStore,createCanonicalIntentActions}=load('lib/publishing/canonicalStore.ts');
const {createPublishingOwnership}=load('lib/publishing/ownership.ts');
const {publicationKey,legacyProjection,lifecycleAllows}=load('lib/publishing/canonicalContract.ts');
const digest=s=>createHash('sha256').update(s).digest('hex'),delay=ms=>new Promise(r=>setTimeout(r,ms));
test('Stage 4C.1 disposable PostgreSQL canonical contract',async t=>{
 const cluster=await startOwnershipCluster(),{pool}=cluster;let n=0;
 async function fixture(run){
  const schema='canonical_'+ ++n;await pool.query(`CREATE SCHEMA ${schema}`);
  async function q(sql,values){const c=await pool.connect();try{await c.query(`SET search_path TO ${schema}`);return await c.query(sql,values);}finally{c.release();}}
  await q(`CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X');
    CREATE TABLE "SyntheticPost"(id text PRIMARY KEY,"calendarId" text NOT NULL,platform text NOT NULL,content text NOT NULL,approved boolean NOT NULL,entitled boolean NOT NULL,status text NOT NULL,"updatedAt" timestamptz NOT NULL);
    INSERT INTO "SyntheticPost" VALUES('post','calendar','X','original',true,true,'SCHEDULED',now())`);
  for(const file of ['schema','ownership-schema','intent-actions-schema','canonical-schema'])await q(fs.readFileSync(`scripts/publishing-reliability/${file}.sql`,'utf8'));
  let lost,failValidation=false,failCapture=false;
  const port={connect:async()=>{
   const c=await pool.connect();return {release:broken=>c.release(broken),query:async(sql,values)=>{
    if(sql==='COMMIT'&&lost){const expected=lost;lost=null;c.on('error',()=>{});c.connection.stream.pause();const pending=c.query('COMMIT').catch(()=>{});
     try {for(let i=0;;i++){if((await q(`SELECT 1 FROM "${expected.table}" WHERE "${expected.table==='PublishingExternalAttempt'?'id':'operationId'}"=$1`,[expected.id])).rows.length)break;if(i>150)throw Error('COMMIT_NOT_VISIBLE');await delay(10);}}
     finally{c.connection.stream.destroy();await pending;}
     throw Error('lost socket acknowledgement');
    }return c.query(sql,values);
   }};
  }};
  const db=createPublishingTransactionDatabase(port,{schema}),owner=createPublishingOwnership(db);
  await owner.transition({operationId:'activate',actor:'operator',expectedEpoch:0n,to:'NETLIFY',activate:true});
  async function post(tx,id){const p=(await tx.query(`SELECT * FROM "SyntheticPost" WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!p?.approved||!p.entitled||failValidation)throw Error('POST_VALIDATION_DENIED');return p;}
  const store=createCanonicalPublishingStore({database:db,lockAndValidate:async(tx,j)=>{const p=await post(tx,j.postId);assert.equal(p.calendarId,j.calendarId);assert.equal(p.platform,j.platform);if(digest(p.content)!==j.contentHash)throw Error('CONTENT_CHANGED');}});
  const account=(operationId='account1',expectedVersion=0,providerAccountId='provider-one',state='CONNECTED')=>store.changeAccount({operationId,actor:'operator',bindingId:'account',calendarId:'calendar',platform:'X',expectedVersion,providerAccountId,connectionId:'connection-'+(expectedVersion+1),authorizationHash:digest('grants-'+(expectedVersion+1)),state});
  await account();
  const actions=createCanonicalIntentActions({database:db,
   lockAndValidatePost:async(tx,i)=>{assert.equal(i.actor,'operator');const p=await post(tx,i.postId);assert.equal(p.platform,i.platform);},
   validateDueTime:async()=>{},applyEdit:async(tx,i)=>{await tx.query(`UPDATE "SyntheticPost" SET content=$2 WHERE id=$1`,[i.postId,i.edit]);},
   verifyRetryEvidence:async()=>({kind:'NOT_SENT',actorStopped:true,verified:true,retryable:true}),
   captureRevision:async(tx,i)=>{const p=await post(tx,i.postId);if(failCapture)throw Error('capture failure');return {calendarId:p.calendarId,accountBindingId:i.destination.accountBindingId,accountVersion:i.destination.accountVersion,contentHash:digest(p.content)};},
  });
  const req=(operationId='schedule',expectedRevision=0,extra={})=>({operationId,actor:'operator',intentId:'intent',postId:'post',platform:'X',expectedRevision,dueAt:new Date(0),destination:{accountBindingId:'account',accountVersion:1},...extra});
  const op=(jobId,operationId='admit',extra={})=>({operationId,actor:'operator',jobId,owner:'NETLIFY',epoch:1n,...extra});
  const schedule=()=>actions.schedule(req());
  async function prepared(){const s=await schedule();await store.admit(op(s.jobId));const p=await store.prepare(op(s.jobId,'prepare'));return {...s,...p};}
  const authorize=s=>owner.authorize({attemptId:'attempt',intentId:'intent',revision:1,jobId:s.jobId,owner:'NETLIFY',epoch:1n,actor:'worker'});
  const outcome=(s,value,ref)=>db.transaction(async tx=>{
   await tx.query(`SELECT id FROM "PublishingOwnership" WHERE id=1 FOR SHARE`);
   await tx.query(`SELECT id FROM "PublishingIntent" WHERE id='intent' FOR UPDATE`);
   const scoped=createPublishingOwnership({transaction:fn=>fn(tx)});
   await scoped.recordOutcome({operationId:'outcome-'+value,attemptId:'attempt',actor:'worker',outcome:value,remoteReference:ref});
   const phase={ACCEPTED:'PROVIDER_PENDING',UNKNOWN:'OUTCOME_UNKNOWN',CONFIRMED:'CONFIRMED',REJECTED:'REJECTED'}[value];
   await tx.query(`UPDATE "PublishingJob" SET phase=$2,"remoteId"=COALESCE("remoteId",$3) WHERE id=$1`,[s.jobId,phase,ref??null]);
  });
  await run({q,db,owner,actions,store,req,op,account,schedule,prepared,authorize,outcome,
   lose:(table,id)=>{lost={table,id};},deny:()=>{failValidation=true;},failCapture:()=>{failCapture=true;}});
 }
 try{
  await t.test('Stage 4A READY job is admitted/prepared with SCHEDULED CalendarPost',()=>fixture(async h=>{
   const s=await h.prepared(),j=await h.store.findJob(s.jobId);assert.equal(j.phase,'PREPARED');assert.equal(j.generation,1);assert.equal(publicationKey(j),'intent:1:1');assert.equal(s.maySend,false);
   assert.equal((await h.q(`SELECT status FROM "SyntheticPost"`)).rows[0].status,'SCHEDULED');assert.equal(await h.store.projection(s.jobId),'SCHEDULED');
  }));
  await t.test('concurrent admission creates one execution and no duplicate job',()=>fixture(async h=>{
   const s=await h.schedule();const r=await Promise.all([h.store.admit(h.op(s.jobId,'a')),h.store.admit(h.op(s.jobId,'b'))]);assert.ok(r.every(v=>v.outcome==='ADMITTED'&&!v.maySend));
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingCanonicalExecution"`)).rows[0].n,1);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob"`)).rows[0].n,1);
  }));
  await t.test('concurrent preparation grants one claim; receipts never grant sends',()=>fixture(async h=>{
   const s=await h.schedule();await h.store.admit(h.op(s.jobId));const r=await Promise.allSettled([h.store.prepare(h.op(s.jobId,'p1')),h.store.prepare(h.op(s.jobId,'p2'))]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='fulfilled').value.maySend,false);
  }));
  await t.test('post timestamps/status neither create authority nor invalidate immutable identity',()=>fixture(async h=>{
   const s=await h.schedule();await h.q(`UPDATE "SyntheticPost" SET "updatedAt"='2000-01-01',status='PUBLISHING'`);
   await assert.rejects(h.store.prepare(h.op(s.jobId,'before-admission')),/NOT_ADMITTED/);
   await h.store.admit(h.op(s.jobId));await h.store.prepare(h.op(s.jobId,'prepared'));
   await assert.rejects(h.q(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING'`),/ATTEMPT_JOB_MISMATCH/);
   assert.equal((await h.store.findJob(s.jobId)).phase,'PREPARED');
   assert.equal((await h.authorize(s)).maySend,true);
  }));
  await t.test('content snapshot mismatch blocks admission despite matching timestamp/status',()=>fixture(async h=>{
   const s=await h.schedule();await h.q(`UPDATE "SyntheticPost" SET content='changed',status='PUBLISHING'`);await assert.rejects(h.store.admit(h.op(s.jobId)),/CONTENT_CHANGED/);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingCanonicalExecution"`)).rows[0].n,0);
  }));
  await t.test('account replacement preserves old destination and fences both preparation and raw authorization',()=>fixture(async h=>{
   const s=await h.prepared();await h.account('replacement',1,'provider-two');const j=await h.store.findJob(s.jobId);assert.equal(j.providerAccountId,'provider-one');assert.equal(j.accountVersion,1);
   await assert.rejects(h.store.prepare(h.op(s.jobId,'again')),/ACCOUNT_BINDING_CHANGED/);await assert.rejects(h.authorize(s));
   await assert.rejects(h.q(`UPDATE "PublishingCanonicalRevision" SET "accountVersion"=2`),/IMMUTABLE/);
   const r=await h.actions.reschedule(h.req('new-revision',1,{destination:{accountBindingId:'account',accountVersion:2}}));assert.equal((await h.store.findJob(r.jobId)).providerAccountId,'provider-two');
  }));
  await t.test('explicit destination required; stale request rolls back all schedule work',()=>fixture(async h=>{
   await h.account('replace',1,'provider-two');await assert.rejects(h.schedule());
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob"`)).rows[0].n,0);
   await assert.rejects(h.actions.schedule(h.req('missing-destination',0,{destination:undefined})));
  }));
  await t.test('cancellation versus preparation commits a cancelled job with no attempt',()=>fixture(async h=>{
   const s=await h.schedule();await h.store.admit(h.op(s.jobId));const r=await Promise.allSettled([h.actions.cancel(h.req('cancel',1)),h.store.prepare(h.op(s.jobId,'prepare'))]);
   assert.equal(r[0].value.outcome,'APPLIED');assert.equal((await h.store.findJob(s.jobId)).phase,'CANCELLED');await assert.rejects(h.authorize(s));
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,0);
  }));
  await t.test('operation replay returns the same durable receipt and token',()=>fixture(async h=>{
   const s=await h.schedule(),a=await h.store.admit(h.op(s.jobId));assert.deepEqual(await h.store.admit({epoch:1n,owner:'NETLIFY',jobId:s.jobId,actor:'operator',operationId:'admit'}),a);
   const p=await h.store.prepare(h.op(s.jobId,'prepare'));assert.deepEqual(await h.store.prepare(h.op(s.jobId,'prepare')),p);
   await h.actions.cancel(h.req('cancel',1));assert.deepEqual(await h.store.prepare(h.op(s.jobId,'prepare')),p);assert.equal(p.maySend,false);
   await assert.rejects(h.store.prepare(h.op(s.jobId,'prepare',{actor:'other'})),/OPERATION_CONFLICT/);
  }));
  await t.test('binding failure rolls back Stage 4A intent/revision/job/audit',()=>fixture(async h=>{
   h.failCapture();await assert.rejects(h.schedule());for(const table of ['PublishingIntent','PublishingIntentRevision','PublishingJob','PublishingAction'])assert.equal((await h.q(`SELECT count(*)::int n FROM "${table}"`)).rows[0].n,0);
  }));
  await t.test('failed preparation rolls back claim, execution operation and post mutation',()=>fixture(async h=>{
   const s=await h.schedule();await h.store.admit(h.op(s.jobId));h.deny();await assert.rejects(h.store.prepare(h.op(s.jobId,'prepare')));
   assert.equal((await h.store.findJob(s.jobId)).phase,'READY');assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingCanonicalOperation" WHERE action='prepare'`)).rows[0].n,0);
  }));
  await t.test('real lost admission COMMIT acknowledgement safely replays',()=>fixture(async h=>{
   const s=await h.schedule();h.lose('PublishingCanonicalOperation','admit');await assert.rejects(h.store.admit(h.op(s.jobId)),/COMMIT_UNCONFIRMED/);
   const r=await h.store.admit(h.op(s.jobId));assert.equal(r.outcome,'ADMITTED');assert.equal(r.maySend,false);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingCanonicalExecution"`)).rows[0].n,1);
  }));
  await t.test('real lost preparation COMMIT acknowledgement does not renew or authorize send',()=>fixture(async h=>{
   const s=await h.schedule();await h.store.admit(h.op(s.jobId));h.lose('PublishingCanonicalOperation','prepare');await assert.rejects(h.store.prepare(h.op(s.jobId,'prepare')),/COMMIT_UNCONFIRMED/);
   const before=(await h.q(`SELECT * FROM "PublishingJob"`)).rows[0],r=await h.store.prepare(h.op(s.jobId,'prepare'));assert.equal(r.workerToken,before.workerToken);assert.equal(r.maySend,false);
   assert.equal((await h.q(`SELECT "workerUntil" FROM "PublishingJob"`)).rows[0].workerUntil.getTime(),before.workerUntil.getTime());
  }));
  await t.test('top-level adapter forbids nested transactions, savepoints and escaped transaction scopes',()=>fixture(async h=>{
   await assert.rejects(h.db.transaction(()=>h.db.transaction(async()=>{})),/NESTED/);
   await assert.rejects(h.db.transaction(tx=>tx.query('SAVEPOINT nested')),/CONTROL_FORBIDDEN/);
   await assert.rejects(h.db.transaction(tx=>tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')),/CONTROL_FORBIDDEN/);
   let escaped;await h.db.transaction(async tx=>{escaped=tx;assert.equal((await tx.query('SHOW transaction_isolation')).rows[0].transaction_isolation,'read committed');});
   await assert.rejects(escaped.query('SELECT 1'),/SCOPE_CLOSED/);
  }));
  await t.test('canonical lifecycle requires attempt+job+outcome audit in one transaction',()=>fixture(async h=>{
   const s=await h.prepared();await h.authorize(s);assert.equal(await h.store.projection(s.jobId),'PUBLISHING');
   await assert.rejects(h.owner.recordOutcome({operationId:'bad',attemptId:'attempt',actor:'worker',outcome:'ACCEPTED',remoteReference:'remote'}));
   await h.outcome(s,'ACCEPTED','remote');await assert.rejects(h.q(`UPDATE "PublishingJob" SET "remoteId"='contradiction'`),/EVIDENCE_IMMUTABLE|REFERENCE_MISMATCH/);assert.equal((await h.store.findJob(s.jobId)).phase,'PROVIDER_PENDING');
   await h.outcome(s,'UNKNOWN','remote');await h.outcome(s,'CONFIRMED','remote');assert.equal(await h.store.projection(s.jobId),'PUBLISHED');
   await assert.rejects(h.q(`UPDATE "PublishingJob" SET phase='READY'`),/EXTERNAL_CONFLICT|TRANSITION_INVALID/);
   for(const table of ['PublishingCanonicalRevision','PublishingCanonicalExecution','PublishingCanonicalOperation','PublishingAccountVersion','PublishingAttemptEvent','PublishingExternalAttempt'])await assert.rejects(h.q(`DELETE FROM "${table}"`),/IMMUTABLE/);
   assert.equal((await h.q(`SELECT "remoteReference" FROM "PublishingExternalAttempt"`)).rows[0].remoteReference,'remote');
   assert.equal((await h.actions.retry(h.req('retry',1,{evidenceId:'fake'}))).outcome,'NEW_AUTHORIZED_INTENT_REQUIRED');
  }));
  await t.test('safe retry generation has a new job and immediate durable predecessor',()=>fixture(async h=>{
   const s=await h.prepared();await h.authorize(s);await h.actions.recordRetryEvidence({id:'proof',actor:'operator',intentId:'intent',predecessorId:'attempt',evidenceReference:'synthetic-proof'});
   const r=await h.actions.retry(h.req('retry',1,{evidenceId:'proof'}));await h.store.admit(h.op(r.jobId,'admit2'));await h.store.prepare(h.op(r.jobId,'prepare2'));
   const j=await h.store.findJob(r.jobId);assert.equal(publicationKey(j),'intent:2:2');assert.notEqual(j.id,s.jobId);
   assert.equal((await h.q(`SELECT "rootAttemptId" FROM "PublishingRetryGeneration"`)).rows[0].rootAttemptId,'attempt');
   await assert.rejects(h.q(`UPDATE "PublishingJob" SET lease=lease+interval '1 second' WHERE id=$1`,[j.id]),/IDENTITY_IMMUTABLE/);
   await assert.rejects(h.q(`UPDATE "PublishingJob" SET phase='READY' WHERE id=$1`,[s.jobId]),/TRANSITION_INVALID/);
  }));
  await t.test('raw generation tampering and unaudited account changes fail at database boundary',()=>fixture(async h=>{
   const s=await h.schedule();await assert.rejects(h.q(`INSERT INTO "PublishingCanonicalExecution"("jobId","intentId",revision,generation) VALUES($1,'intent',1,2)`,[s.jobId]),/EXECUTION_INVALID/);
   await assert.rejects(h.q(`UPDATE "PublishingAccountBinding" SET "currentVersion"=2`));assert.equal((await h.q(`SELECT "currentVersion" FROM "PublishingAccountBinding"`)).rows[0].currentVersion,1);
  }));
  await t.test('raw admission and preparation cannot omit transaction audits',()=>fixture(async h=>{
   const s=await h.schedule();await assert.rejects(h.q(`INSERT INTO "PublishingCanonicalExecution"("jobId","intentId",revision,generation) VALUES($1,'intent',1,1)`,[s.jobId]),/ADMISSION_AUDIT_REQUIRED/);
   await h.store.admit(h.op(s.jobId));await assert.rejects(h.q(`UPDATE "PublishingJob" SET phase='PREPARED',"workerToken"='raw',"ownershipEpoch"=1,"accountId"='provider-one',"workerUntil"=now()+interval '1 minute'`),/PREPARATION_AUDIT_REQUIRED/);
   assert.equal((await h.store.findJob(s.jobId)).phase,'READY');
  }));
  await t.test('initial send authorization acknowledgement loss cannot grant resend',()=>fixture(async h=>{
   const s=await h.prepared();
   // The socket loss hook observes the attempt itself, not a previous action.
   h.lose('PublishingExternalAttempt','attempt');
   await assert.rejects(h.authorize(s),/UNCONFIRMED/);assert.equal((await h.authorize(s)).maySend,false);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,1);
  }));
  await t.test('future jobs and stale ownership epochs cannot be admitted',()=>fixture(async h=>{
   const s=await h.actions.schedule(h.req('future',0,{dueAt:new Date(Date.now()+60000)}));
   await assert.rejects(h.store.admit(h.op(s.jobId)),/NOT_DUE/);
   await assert.rejects(h.store.admit(h.op(s.jobId,'stale',{epoch:2n})),/OWNERSHIP_FENCED/);
  }));
  await t.test('deferred state checks inspect final job state when preparation and authorization compose',()=>fixture(async h=>{
   const s=await h.schedule();await h.store.admit(h.op(s.jobId));
   const r=await h.db.transaction(async tx=>{
    await tx.query(`SELECT id FROM "PublishingOwnership" WHERE id=1 FOR SHARE`);
    await tx.query(`SELECT id FROM "PublishingAccountBinding" WHERE id='account' FOR SHARE`);
    await tx.query(`SELECT id FROM "PublishingIntent" WHERE id='intent' FOR UPDATE`);
    await tx.query(`UPDATE "PublishingJob" SET phase='PREPARED',"workerToken"='composed-token',"workerUntil"=now()+interval '3 minutes',"ownershipEpoch"=1,"accountId"='provider-one' WHERE id=$1`,[s.jobId]);
    await tx.query(`INSERT INTO "PublishingCanonicalOperation"("operationId","jobId",action,actor,"requestHash",result) VALUES('composed',$1,'prepare','operator','synthetic',$2)`,[s.jobId,{workerToken:'composed-token',maySend:false}]);
    const scoped=createPublishingOwnership({transaction:fn=>fn(tx)});
    return scoped.authorize({attemptId:'attempt',intentId:'intent',revision:1,jobId:s.jobId,owner:'NETLIFY',epoch:1n,actor:'worker'});
   });
   assert.equal(r.maySend,true);assert.equal((await h.store.findJob(s.jobId)).phase,'EXTERNAL_PENDING');
  }));
  await t.test('unbound legacy jobs fail closed and explicit lifecycle projections remain compatible',()=>fixture(async h=>{
   for(const phase of ['EXTERNAL_PENDING','PROVIDER_PENDING','OUTCOME_UNKNOWN'])assert.equal(legacyProjection(phase),'PUBLISHING');assert.equal(lifecycleAllows('REJECTED','READY'),false);assert.equal(lifecycleAllows('PREPARED','EXTERNAL_PENDING'),true);
   await assert.rejects(h.store.admit(h.op('unbound')),/UNBOUND/);
  }));
 }finally{await cluster.close();}
});
