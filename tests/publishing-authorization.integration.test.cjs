'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{fork}=require('node:child_process');
const {load}=require('./helpers/load-typescript.cjs'),{startOwnershipCluster}=require('./helpers/ownership-cluster.cjs');
const {authorizationFixture}=require('./helpers/authorization-fixture.cjs');
const {createExternalPublicationAuthorization}=load('lib/publishing/externalAuthorization.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function publicationTarget(input){const {operationId,actor,owner,epoch,workerToken,...target}=input;return target;}
test('Stage 4C.3 durable external authorization and capability transport',async t=>{
 const cluster=await startOwnershipCluster();let n=0;
 const fixture=run=>authorizationFixture(cluster.pool,'authorization_'+ ++n,run);
 try{
  await t.test('new initial authorization commits exact tuple and opaque capability',()=>fixture(async h=>{
   const s=await h.prepare(),a=h.service(),input=await h.input(s.jobId),r=await a.authorize(input);assert.equal(r.maySend,true);assert.ok(r.capability);assert.deepEqual(JSON.stringify(r.capability),'{}');
   const c=(await h.q(`SELECT * FROM "PublishingSendCapability"`)).rows[0];assert.equal(c.intentId,input.intentId);assert.equal(c.revision,1);assert.equal(c.generation,1);assert.equal(c.state,'ISSUED');assert.equal(c.contentHash,input.contentHash);
   assert.equal((await h.q(`SELECT phase FROM "PublishingJob"`)).rows[0].phase,'EXTERNAL_PENDING');assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingEligibilityWitness"`)).rows[0].n,1);
  }));
  await t.test('two concurrent contenders commit one authorization/capability',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service();const results=await Promise.allSettled([a.authorize(input),a.authorize({...input,operationId:'other'})]);
   assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value.maySend).length,1);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,1);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingSendCapability"`)).rows[0].n,1);
  }));
  await t.test('duplicate requests/recovery never mint another capability',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service();await a.authorize(input);
   for(const r of [await a.authorize(input),await a.recover(input.operationId),await h.service().authorize(input)]){assert.equal(r.maySend,false);assert.equal(r.capability,undefined);}
   await assert.rejects(a.authorize({...input,actor:'other'}),/OPERATION_CONFLICT/);
  }));
  await t.test('rollback before COMMIT returns no capability and leaves preparation intact',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service();h.fail();await assert.rejects(a.authorize(input),/UNCONFIRMED/);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,0);assert.equal((await h.store.findJob(s.jobId)).phase,'PREPARED');assert.equal((await a.authorize(input)).maySend,true);
  }));
  await t.test('real lost authorization COMMIT acknowledgement never grants resend',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service();h.lose('authorize');await assert.rejects(a.authorize(input),/UNCONFIRMED/);
   assert.equal((await a.recover(input.operationId)).record.state,'ISSUED');assert.equal((await a.authorize(input)).maySend,false);
   let calls=0;await assert.rejects(a.transport(async()=>{calls++;return {outcome:'CONFIRMED',reference:'remote'};}).publish({target:publicationTarget(input)}),/CAPABILITY_REQUIRED/);assert.equal(calls,0);
  }));
  await t.test('mandatory transport has no no-context or lookup/preparation fallback',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service();let calls=0;const transport=a.transport(async()=>{calls++;return {outcome:'UNKNOWN'};});
   for(const capability of [undefined,{},s.claim,await h.store.findJob(s.jobId)])await assert.rejects(transport.publish({target:publicationTarget(input),capability}),/CAPABILITY_REQUIRED/);
   await assert.rejects(transport.publish(undefined),/CONTEXT_REQUIRED/);assert.equal(calls,0);
  }));
  await t.test('wrong provider/job/account/content cannot spend a capability',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);let calls=0;const transport=a.transport(async()=>{calls++;return {outcome:'CONFIRMED',reference:'remote'};});
   for(const change of [{platform:'FACEBOOK'},{jobId:'other-job'},{accountVersion:2},{contentHash:'a'.repeat(64)}])await assert.rejects(transport.publish({target:{...publicationTarget(input),...change},capability:r.capability}),/MISMATCH/);
   assert.equal(calls,0);assert.equal((await h.q(`SELECT state FROM "PublishingSendCapability"`)).rows[0].state,'ISSUED');
   await transport.publish({target:publicationTarget(input),capability:r.capability});assert.equal(calls,1);await assert.rejects(transport.publish({target:publicationTarget(input),capability:r.capability}),/CAPABILITY_REQUIRED/);
  }));
  await t.test('concurrent use spends durable capability once',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);let calls=0;const transport=a.transport(async()=>{calls++;await delay(20);return {outcome:'ACCEPTED',reference:'provider-operation'};});
   const results=await Promise.allSettled([transport.publish({target:publicationTarget(input),capability:r.capability}),transport.publish({target:publicationTarget(input),capability:r.capability})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(calls,1);
   assert.equal((await h.q(`SELECT outcome FROM "PublishingExternalAttempt"`)).rows[0].outcome,'ACCEPTED');assert.equal((await h.store.findJob(s.jobId)).phase,'PROVIDER_PENDING');
  }));
  await t.test('expired and explicitly revoked capabilities reject before driver',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=createExternalPublicationAuthorization({database:h.db,validation:h.validation,capabilityTtlMs:200}),r=await a.authorize(input);await delay(250);
   let calls=0;await assert.rejects(a.transport(async()=>{calls++;return {outcome:'UNKNOWN'};}).publish({target:publicationTarget(input),capability:r.capability}),/EXPIRED/);assert.equal(calls,0);
  }));
  await t.test('revocation is durable/idempotent and cannot undo a consumed reservation',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);const revoke={operationId:'revoke',authorizationId:r.authorizationId,actor:'worker',reason:'synthetic stop'};
   assert.equal((await a.revoke(revoke)).outcome,'REVOKED');assert.equal((await a.revoke(revoke)).outcome,'REVOKED');let calls=0;
   await assert.rejects(a.transport(async()=>{calls++;return {outcome:'UNKNOWN'};}).publish({target:publicationTarget(input),capability:r.capability}),/REVOKED/);assert.equal(calls,0);
  }));
  await t.test('policy revoked after authorization is revalidated at consumption',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);await h.q(`UPDATE "CalendarPost" SET "approvalStatus"='NEEDS_REVISION'`);
   let calls=0;await assert.rejects(a.transport(async()=>{calls++;return {outcome:'UNKNOWN'};}).publish({target:publicationTarget(input),capability:r.capability}),/APPROVAL_REQUIRED|INVALIDATED/);assert.equal(calls,0);assert.equal((await h.q(`SELECT outcome FROM "PublishingExternalAttempt"`)).rows[0].outcome,'AUTHORIZED');
  }));
  await t.test('lost consumption acknowledgement makes no call and cannot retry',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);let calls=0;const transport=a.transport(async()=>{calls++;return {outcome:'CONFIRMED',reference:'remote'};});
   h.lose('consume');await assert.rejects(transport.publish({target:publicationTarget(input),capability:r.capability}),/UNCONFIRMED/);assert.equal(calls,0);assert.equal((await a.recover(input.operationId)).record.state,'CONSUMED');
   await assert.rejects(transport.publish({target:publicationTarget(input),capability:r.capability}),/CAPABILITY_REQUIRED/);assert.equal((await a.authorize(input)).maySend,false);
  }));
  for(const change of ['cancel','reschedule','content','account','approval','entitlement','epoch'])await t.test(`changed ${change} denies stale authorization`,()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service();
   if(change==='cancel')await h.actions.cancel(h.request('cancel',1));
   if(change==='reschedule')await h.actions.reschedule(h.request('reschedule',1));
   if(change==='content')await h.q(`UPDATE "CalendarPost" SET caption='changed'`);
   if(change==='account')await h.accountStore.changeAccount({...h.accountInput,operationId:'replace',expectedVersion:1,providerAccountId:'replacement'});
   if(change==='approval')await h.q(`UPDATE "CalendarPost" SET "approvalStatus"='PENDING'`);
   if(change==='entitlement')await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='OFFLINE' WHERE id='owner'`);
   if(change==='epoch')await h.owner.transition({operationId:'drain',actor:'operator',expectedEpoch:1n,to:'DRAINING'});
   await assert.rejects(a.authorize(input));assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingSendCapability"`)).rows[0].n,0);
  }));
  await t.test('a stale worker claim cannot authorize even with the correct publication tuple',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId);await assert.rejects(h.service().authorize({...input,workerToken:'retired-worker-token'}),/WORKER_CLAIM_FENCED/);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,0);
  }));
  await t.test('exact generation is mandatory; unapproved retry cannot authorize',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId);await assert.rejects(h.service().authorize({...input,generation:2}),/IDENTITY_CONFLICT/);
   await assert.rejects(h.actions.retry(h.request('retry',1,{evidenceId:'client-claim'})));assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingRetryGeneration"`)).rows[0].n,0);
  }));
  await t.test('approved retry generation gets its own one-time capability and preserves predecessor',()=>fixture(async h=>{
   const s=await h.prepare(),a=h.service(),first=await a.authorize(await h.input(s.jobId));h.allowProof();await a.revoke({operationId:'stop-first',authorizationId:first.authorizationId,actor:'worker',reason:'synthetic actor stopped'});
   const root=(await h.q(`SELECT id FROM "PublishingExternalAttempt"`)).rows[0].id;
   await h.actions.recordRetryEvidence({id:'proof',actor:'owner',intentId:'intent',predecessorId:root,evidenceReference:'synthetic-verified-stopped'});
   const r=await h.actions.retry(h.request('retry',1,{evidenceId:'proof'}));await h.store.admit(h.operation(r.jobId,'admit2'));await h.store.prepare(h.operation(r.jobId,'prepare2'));
   const input=await h.input(r.jobId,'authorize2'),grant=await a.authorize(input);assert.equal(grant.maySend,true);assert.equal(input.generation,2);
   assert.equal((await a.authorize(input)).maySend,false);const sent=await a.transport(async()=>({outcome:'ACCEPTED',reference:'retry-operation'})).publish({target:publicationTarget(input),capability:grant.capability});assert.equal(sent.outcome,'ACCEPTED');
   assert.equal((await h.q(`SELECT "rootAttemptId" FROM "PublishingRetryGeneration"`)).rows[0].rootAttemptId,root);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingSendCapability"`)).rows[0].n,2);
  }));
  await t.test('provider exception quarantines uncertainty; no new send after outcome',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);let calls=0;
   const result=await a.transport(async()=>{calls++;throw Error('synthetic network uncertainty');}).publish({target:publicationTarget(input),capability:r.capability});assert.equal(result.outcome,'UNKNOWN');assert.equal(calls,1);
   assert.equal((await h.store.findJob(s.jobId)).phase,'OUTCOME_UNKNOWN');assert.equal((await a.authorize(input)).maySend,false);
  }));
  await t.test('acceptance, confirmation and audit history remain distinct and immutable',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);await a.transport(async()=>({outcome:'ACCEPTED',reference:'known-operation'})).publish({target:publicationTarget(input),capability:r.capability});
   assert.equal((await h.store.findJob(s.jobId)).phase,'PROVIDER_PENDING');const outcome={operationId:'confirm',authorizationId:r.authorizationId,actor:'worker',outcome:'CONFIRMED',reference:'known-operation'};await a.recordOutcome(outcome);assert.equal((await a.recordOutcome(outcome)).replay,true);
   assert.equal((await h.store.findJob(s.jobId)).phase,'CONFIRMED');assert.equal((await a.revoke({operationId:'late',authorizationId:r.authorizationId,actor:'worker',reason:'too late'})).outcome,'PENDING_RECONCILIATION');
   for(const table of ['PublishingSendCapability','PublishingAuthorizationOperation','PublishingCapabilityEvent','PublishingAuthorizationOutcome','PublishingExternalAttempt','PublishingAttemptEvent'])await assert.rejects(h.q(`DELETE FROM "${table}"`),/IMMUTABLE/);
   await assert.rejects(h.q(`UPDATE "PublishingSendCapability" SET state='ISSUED'`),/SPENT/);assert.equal((await h.q(`SELECT "remoteReference" FROM "PublishingExternalAttempt"`)).rows[0].remoteReference,'known-operation');
  }));
  await t.test('definitive provider rejection stays terminal and requires trusted retry evidence',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);
   assert.equal((await a.transport(async()=>({outcome:'REJECTED'})).publish({target:publicationTarget(input),capability:r.capability})).outcome,'REJECTED');
   assert.equal((await h.store.findJob(s.jobId)).phase,'REJECTED');await assert.rejects(h.actions.retry(h.request('retry',1,{evidenceId:'checkbox'})),/EVIDENCE_MISSING/);
   assert.equal((await a.authorize({...input,operationId:'another'})).maySend,false);
  }));
  for(const change of ['epoch','account','content','entitlement'])await t.test(`capability consumption revalidates changed ${change}`,()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input);
   if(change==='epoch')await h.owner.transition({operationId:'drain',actor:'operator',expectedEpoch:1n,to:'DRAINING'});
   if(change==='account')await h.accountStore.changeAccount({...h.accountInput,operationId:'replace',expectedVersion:1,providerAccountId:'replacement'});
   if(change==='content')await h.q(`UPDATE "CalendarPost" SET caption='changed'`);
   if(change==='entitlement')await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='OFFLINE' WHERE id='owner'`);
   let calls=0;await assert.rejects(a.transport(async()=>{calls++;return {outcome:'UNKNOWN'};}).publish({target:publicationTarget(input),capability:r.capability}));assert.equal(calls,0);
   assert.equal((await h.q(`SELECT outcome FROM "PublishingExternalAttempt"`)).rows[0].outcome,'AUTHORIZED');
  }));
  await t.test('caller mutation cannot retarget an in-flight capability request',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),a=h.service(),r=await a.authorize(input),target=publicationTarget(input);
   const pending=a.transport(async submission=>{assert.equal(submission.target.providerAccountId,'provider-one');assert.ok(Object.isFrozen(submission.target));assert.ok(Object.isFrozen(submission.post));return {outcome:'CONFIRMED',reference:'remote'};}).publish({target,capability:r.capability});
   target.providerAccountId='malicious-retarget';assert.equal((await pending).outcome,'CONFIRMED');
  }));
  await t.test('raw consumption cannot omit its commit audit',()=>fixture(async h=>{
   const s=await h.prepare(),a=h.service(),r=await a.authorize(await h.input(s.jobId));await assert.rejects(h.q(`UPDATE "PublishingSendCapability" SET state='CONSUMED',"consumedAt"=clock_timestamp(),"consumedFenceVersion"=(SELECT version FROM "PublishingEligibilityFence"),"consumedValidUntil"="expiresAt" WHERE id=$1`,[r.authorizationId]),/EVENT_REQUIRED/);
   assert.equal((await h.q(`SELECT state FROM "PublishingSendCapability"`)).rows[0].state,'ISSUED');
  }));
  await t.test('raw capability issuance cannot commit without its authorization operation',()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId),job=await h.store.findJob(s.jobId);
   await assert.rejects(h.db.transaction(async tx=>{
    await h.validation.validateBeforeExternal(tx,{job,owner:'NETLIFY',epoch:1n});
    const {createPublishingOwnership}=load('lib/publishing/ownership.ts');await createPublishingOwnership({transaction:fn=>fn(tx)}).authorize({attemptId:'raw-attempt',intentId:'intent',revision:1,jobId:s.jobId,owner:'NETLIFY',epoch:1n,actor:'worker'});
    await tx.query(`INSERT INTO "PublishingSendCapability"(id,"jobId","intentId",revision,generation,platform,"accountBindingId","accountVersion","providerAccountId","connectionId","contentHash",owner,epoch,actor,"workerToken","rootAttemptId","tokenHash","expiresAt")
      VALUES('raw-cap',$1,'intent',1,1,'X','account',1,'provider-one','connection',$2,'NETLIFY',1,'worker',$3,'raw-attempt',$4,clock_timestamp()+interval '5 seconds')`,[s.jobId,input.contentHash,input.workerToken,'a'.repeat(64)]);
   }),/COMMIT_UNCONFIRMED/);assert.match(h.lastDatabaseError().message,/CAPABILITY_AUTH_AUDIT_REQUIRED/);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,0);assert.equal((await h.store.findJob(s.jobId)).phase,'PREPARED');
  }));
  for(const mode of ['before-commit','after-authorization'])await t.test(`real SIGKILL ${mode} has no recovered send grant`,()=>fixture(async h=>{
   const s=await h.prepare(),input=await h.input(s.jobId);const cfg=path.join(cluster.socketDirectory,`child-${n}.json`);fs.writeFileSync(cfg,JSON.stringify({host:cluster.socketDirectory,schema:'authorization_'+n,mode,input:{...input,epoch:String(input.epoch)}}),{mode:0o600});
   const child=fork(path.resolve('tests/helpers/authorization-process.cjs'),[cfg],{env:{PATH:'/usr/bin:/bin',LC_ALL:'C'},stdio:['ignore','ignore','pipe','ipc']});
   const exited=new Promise(resolve=>child.once('exit',resolve));let timer;
   try{await Promise.race([new Promise((resolve,reject)=>{child.on('message',m=>m.phase===mode?resolve():m.error?reject(Error(m.error)):undefined);child.once('exit',()=>reject(Error('EARLY_EXIT')));}),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('CHILD_TIMEOUT')),5000))]);}
   finally{clearTimeout(timer);child.kill('SIGKILL');await exited;fs.rmSync(cfg,{force:true});}
   const r=await h.service().recover(input.operationId);assert.equal(r.maySend,false);assert.equal(r.capability,undefined);
   if(mode==='before-commit'){assert.equal(r.record,null);assert.equal((await h.service().authorize(input)).maySend,true);}else{assert.equal(r.record.state,'ISSUED');assert.equal((await h.service().authorize(input)).maySend,false);}
  }));
 }finally{await cluster.close();}
});
