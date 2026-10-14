'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{fork}=require('node:child_process');
const {startOwnershipCluster}=require('./helpers/ownership-cluster.cjs'),{workerFixture}=require('./helpers/canonical-worker-fixture.cjs'),{load}=require('./helpers/load-typescript.cjs');
const {canonicalPublicationTarget}=load('lib/publishing/canonicalWorkerStore.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('Stage 4C.5 inactive canonical durable worker',async t=>{
 const cluster=await startOwnershipCluster();let n=0;const fixture=fn=>workerFixture(cluster,++n,fn);
 try{
  await t.test('factory creates no timers database calls or provider IO',()=>fixture(async h=>{const w=h.build();assert.equal(w.status().pendingOperations,0);assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT phase FROM "PublishingJob"')).rows[0].phase,'READY');assert.equal((await w.close()).quiescent,true);}));
  await t.test('READY admission to confirmation preserves exact identity and UI',()=>fixture(async h=>{
   const before=(await h.q('SELECT * FROM "CalendarPost"')).rows[0];const w=h.build();assert.equal((await w.pollOnce()).results[0].state,'confirmed');assert.equal(h.io.calls.length,1);assert.deepEqual(h.io.calls[0].t,h.target);assert.equal(h.io.calls[0].authorization.epoch,'1');
   const after=(await h.q('SELECT * FROM "CalendarPost"')).rows[0];assert.deepEqual(after,before);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingCanonicalExecution"')).rows[0].n,1);
  }));
  await t.test('three competing polling workers commit one claim and one send',()=>fixture(async h=>{
   const workers=[h.build(),h.build(),h.build()];const rounds=await Promise.all(workers.map(w=>w.pollOnce()));const outcomes=rounds.flatMap(r=>r.results);assert.equal(outcomes.filter(o=>o.state==='confirmed').length>=1,true);assert.equal(h.io.calls.length,1);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingSendCapability"')).rows[0].n,1);
  }));
  await t.test('local duplicate and capacity hints do not queue orphan work',()=>fixture(async h=>{
   let release;h.io.media=()=>new Promise(r=>{release=r;});const w=h.build({concurrency:1});const first=w.run(h.target);for(let i=0;!release&&i<100;i++)await delay(10);
   assert.equal((await w.run(h.target)).state,'deferred');release([]);await first;assert.equal(h.io.calls.length,1);
  }));
  await t.test('expired unsent claim cannot resume authority after another worker claims',()=>fixture(async h=>{
   let release;h.io.media=()=>new Promise(r=>{release=r;});const old=h.build(),first=old.run(h.target);for(let i=0;!release&&i<100;i++)await delay(10);
   const token=(await h.q('SELECT "workerToken" FROM "PublishingJob"')).rows[0].workerToken;await delay(600);h.io.media=async()=>[];assert.equal((await h.build().run(h.target)).state,'confirmed');release([]);assert.equal((await first).state,'outcome-unknown');assert.equal(h.io.calls.length,1);assert.notEqual((await h.q('SELECT "workerToken" FROM "PublishingJob"')).rows[0].workerToken,token);
  }));
  await t.test('future revision due time cannot be accelerated by UI timestamps',()=>fixture(async h=>{
   const r=await h.actions.reschedule(h.request('future',1,{dueAt:new Date(Date.now()+3600000)})),hint=canonicalPublicationTarget(await h.store.findJob(r.jobId));await h.q(`UPDATE "CalendarPost" SET "updatedAt"=now()-interval '1 day',"publishStatus"='PUBLISHING'`);const w=h.build();assert.equal((await w.pollOnce()).results.length,0);assert.equal((await w.run(hint)).state,'deferred');assert.equal(h.io.calls.length,0);
  }));
  await t.test('stale identity fields fail closed',()=>fixture(async h=>{
   const w=h.build();for(const change of [{revision:2},{generation:2},{accountVersion:2},{providerAccountId:'replacement'},{contentHash:'b'.repeat(64)},{platform:'FACEBOOK'}])assert.equal((await w.run({...h.target,...change})).state,'blocked');assert.equal(h.io.calls.length,0);
  }));
  await t.test('stale ownership and legacy PUBLISHING cannot authorize',()=>fixture(async h=>{
   await h.q(`UPDATE "CalendarPost" SET "publishStatus"='PUBLISHING',"updatedAt"=now()+interval '1 day'`);const w=h.build({epoch:2n});assert.equal((await w.run(h.target)).state,'fenced');assert.equal((await w.pollOnce()).state,'fenced');assert.equal(h.io.calls.length,0);
  }));
  await t.test('unbound legacy jobs are not imported or admitted',()=>fixture(async h=>{
   await h.q(`INSERT INTO "PublishingAdmission"(id,platform) VALUES('legacy-admission','X');INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase) VALUES('legacy','legacy-admission','legacy-post','X',now(),'READY')`);
   await h.build().pollOnce();assert.equal((await h.q(`SELECT phase FROM "PublishingJob" WHERE id='legacy'`)).rows[0].phase,'READY');assert.equal(h.io.calls.length,1);
  }));
  await t.test('lost preparation acknowledgement cannot recover a claim token',()=>fixture(async h=>{
   h.lose('prepare');assert.equal((await h.build().run(h.target)).state,'deferred');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT phase FROM "PublishingJob"')).rows[0].phase,'PREPARED');await delay(600);assert.equal((await h.build().run(h.target)).state,'confirmed');assert.equal(h.io.calls.length,1);
  }));
  await t.test('lost authorization acknowledgement never mints replacement capability',()=>fixture(async h=>{
   h.lose('authorize');const w=h.build();assert.equal((await w.run(h.target)).state,'outcome-unknown');assert.equal((await h.build().run(h.target)).state,'outcome-unknown');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingAuthorizationOperation"')).rows[0].n,1);
  }));
  await t.test('lost capability consumption acknowledgement never invokes provider',()=>fixture(async h=>{
   h.lose('consume');const w=h.build();assert.equal((await w.run(h.target)).state,'outcome-unknown');await delay(600);assert.equal((await h.build().recover(h.target)).state,'outcome-unknown');assert.equal(h.io.calls.length,0);
  }));
  await t.test('database rollback before authorization permits only a fresh unsent claim',()=>fixture(async h=>{
   h.io.media=async()=>{h.fail();return [];};assert.equal((await h.build().run(h.target)).state,'deferred');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingSendCapability"')).rows[0].n,0);
  }));
  await t.test('accepted is provider-pending until authoritative read confirmation',()=>fixture(async h=>{
   h.io.submit=async(...args)=>{h.io.calls.push(args);return {status:201,body:{id:'accepted-id'}};};
   // Facebook video path is covered by C4; for X timeout/unknown is below.
   const service=h.service(),s=h.s;await h.store.admit(h.operation(s.jobId,'admit'));await h.store.prepare(h.operation(s.jobId,'prepare'));
   const grant=await service.authorize(await h.input(s.jobId));await service.transport(async()=>({outcome:'ACCEPTED',reference:'accepted-id'})).publish({target:h.target,capability:grant.capability});
   const {policyHash}=load('lib/publishing/eligibilityPolicy.ts');const base={authorizationId:grant.authorizationId,jobId:s.jobId,platform:'X',operation:'callback',kind:'RESPONSE',outcome:'ACCEPTED',reference:'accepted-id',responseHash:policyHash({accepted:true})};await h.spool.append({...base,id:policyHash(base)});
   h.io.lookup=async()=>({status:200,body:{verified:false}});assert.equal((await h.build().recover(h.target)).state,'provider-pending');h.io.lookup=async()=>({status:200,body:{verified:true}});assert.equal((await h.build().recover(h.target)).state,'confirmed');assert.equal(h.io.calls.length,0);
  }));
  await t.test('approved retry generation uses its own capability and preserves predecessor',()=>fixture(async h=>{
   await h.store.admit(h.operation(h.s.jobId,'initial-admit'));await h.store.prepare(h.operation(h.s.jobId,'initial-prepare'));const service=h.service(),grant=await service.authorize(await h.input(h.s.jobId));
   await service.revoke({operationId:'stop-initial',authorizationId:grant.authorizationId,actor:'worker',reason:'synthetic stopped actor'});h.allowProof();const root=(await h.q('SELECT id FROM "PublishingExternalAttempt"')).rows[0].id;
   await h.actions.recordRetryEvidence({id:'proof',actor:'owner',intentId:'intent',predecessorId:root,evidenceReference:'synthetic-verified-stopped'});
   const retry=await h.actions.retry(h.request('retry',1,{evidenceId:'proof'})),hint=canonicalPublicationTarget(await h.store.findJob(retry.jobId));
   assert.equal((await h.build().run(hint)).state,'confirmed');assert.equal(h.io.calls[0].t.generation,2);assert.ok(h.io.calls[0].authorization.retryGenerationId);assert.equal((await h.q('SELECT "rootAttemptId" FROM "PublishingRetryGeneration"')).rows[0].rootAttemptId,root);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingSendCapability"')).rows[0].n,2);
  }));
  await t.test('TikTok worker preserves accepted versus confirmed and performs only read recovery',()=>fixture(async h=>{
   const {emptyTikTokSettings,TIKTOK_CONSENT_VERSION}=load('lib/tiktokSettings.ts'),{tikTokConsentHash}=load('lib/tiktokConsent.ts'),{accountAuthorizationHash}=load('lib/publishing/eligibilityPolicy.ts');
   const settings={...emptyTikTokSettings,privacyLevel:'SELF_ONLY',photoTitle:'Synthetic'};
   await h.q(`INSERT INTO "CalendarPost"(id,"calendarId",platform,caption,"postType","tikTokSettings") VALUES('tik-post','calendar','TIKTOK','Synthetic TikTok','PHOTO',$1)`,[settings]);
   await h.q(`INSERT INTO "CalendarPostAsset" VALUES('tik-asset','tik-post','synthetic-photo','PHOTO',0);INSERT INTO "SocialConnection"(id,"calendarId",platform,"platformAccountId","tokenScopes") VALUES('tik-connection','calendar','TIKTOK','tik-account','video.publish')`);
   const post=(await h.q(`SELECT * FROM "CalendarPost" WHERE id='tik-post'`)).rows[0];post.assets=(await h.q(`SELECT * FROM "CalendarPostAsset" WHERE "postId"='tik-post'`)).rows;
   await h.q(`UPDATE "CalendarPost" SET "tikTokConsentAccountId"='tik-account',"tikTokConsentAt"=now(),"tikTokConsentBy"='owner',"tikTokConsentVersion"=$1,"tikTokConsentHash"=$2 WHERE id='tik-post'`,[TIKTOK_CONSENT_VERSION,tikTokConsentHash(post,settings,'tik-account')]);
   const connection=(await h.q(`SELECT * FROM "SocialConnection" WHERE id='tik-connection'`)).rows[0];await h.accountStore.changeAccount({...h.accountInput,operationId:'tik-account-create',bindingId:'tik-binding',platform:'TIKTOK',providerAccountId:'tik-account',connectionId:'tik-connection',authorizationHash:accountAuthorizationHash(connection)});
   const s=await h.actions.schedule(h.request('tik-schedule',0,{postId:'tik-post',intentId:'tik-intent',platform:'TIKTOK',destination:{accountBindingId:'tik-binding',accountVersion:1}})),hint=canonicalPublicationTarget(await h.store.findJob(s.jobId)),w=h.build({preparedLeaseMs:3000});
   assert.equal((await w.run(hint)).state,'provider-pending');assert.equal((await h.q('SELECT phase FROM "PublishingJob" WHERE id=$1',[s.jobId])).rows[0].phase,'PROVIDER_PENDING');h.io.lookup=async()=>({status:200,body:{status:'PROCESSING'}});assert.equal((await w.recover(hint)).state,'provider-pending');h.io.lookup=async()=>({status:200,body:{status:'PUBLISH_COMPLETE'}});assert.equal((await w.recover(hint)).state,'confirmed');assert.equal(h.io.calls.length,1);
  }));
  await t.test('provider response loss remains unknown through restart without resend',()=>fixture(async h=>{
   h.io.submit=async()=>{h.io.calls.push('effect');throw Error('response lost');};assert.equal((await h.build().run(h.target)).state,'outcome-unknown');assert.equal((await h.build().run(h.target)).state,'outcome-unknown');assert.equal(h.io.calls.length,1);
  }));
  await t.test('journal database failure recovers durable response without provider create',()=>fixture(async h=>{
   h.failJournal(true);assert.equal((await h.build().run(h.target)).state,'outcome-unknown');assert.equal(h.io.calls.length,1);h.failJournal(false);await delay(600);assert.equal((await h.build().recover(h.target)).state,'confirmed');assert.equal(h.io.calls.length,1);
  }));
  await t.test('ownership draining during preparation denies authorization and preserves claim',()=>fixture(async h=>{
   h.io.media=async()=>{await h.owner.transition({operationId:'drain',actor:'operator',expectedEpoch:1n,to:'DRAINING'});return [];};assert.equal((await h.build().run(h.target)).state,'outcome-unknown');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingExternalAttempt"')).rows[0].n,0);
  }));
  await t.test('new VPS epoch reclaims only expired unsent preparation',()=>fixture(async h=>{
   let release;h.io.media=()=>new Promise(r=>{release=r;});const old=h.build();const task=old.run(h.target);for(let i=0;!release&&i<100;i++)await delay(10);
   await h.owner.transition({operationId:'drain',actor:'operator',expectedEpoch:1n,to:'DRAINING'});await h.owner.transition({operationId:'vps',actor:'operator',expectedEpoch:2n,to:'VPS'});release([]);await task;await delay(600);h.io.media=async()=>[];
   assert.equal((await h.build({owner:'VPS',epoch:3n}).run(h.target)).state,'confirmed');assert.equal(h.io.calls[0].authorization.owner,'VPS');assert.equal(h.io.calls[0].authorization.epoch,'3');assert.equal(h.io.calls.length,1);
  }));
  for(const [name,sql] of [['disconnect',`UPDATE "SocialConnection" SET status='DISCONNECTED'`],['scopes',`UPDATE "SocialConnection" SET "tokenScopes"=''`],['approval',`UPDATE "CalendarPost" SET "approvalStatus"='REVISION_REQUESTED'`],['content',`UPDATE "CalendarPost" SET caption='edited'`],['entitlement',`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='INACTIVE' WHERE id='owner'`]])await t.test(name+' revocation during preparation blocks send',()=>fixture(async h=>{h.io.media=async()=>{await h.q(sql);return [];};const out=await h.build().run(h.target);assert.ok(['blocked','deferred'].includes(out.state));assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingExternalAttempt"')).rows[0].n,0);}));
  await t.test('cancellation and rescheduling invalidate claimed work',()=>fixture(async h=>{
   h.io.media=async()=>{assert.equal((await h.actions.reschedule(h.request('reschedule',1))).outcome,'APPLIED');return [];};assert.notEqual((await h.build().run(h.target)).state,'confirmed');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT phase FROM "PublishingJob" WHERE id=$1',[h.s.jobId])).rows[0].phase,'CANCELLED');
  }));
  await t.test('cancellation during preparation cancels unsent work atomically',()=>fixture(async h=>{
   h.io.media=async()=>{assert.equal((await h.actions.cancel(h.request('cancel',1))).outcome,'APPLIED');return [];};assert.notEqual((await h.build().run(h.target)).state,'confirmed');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT phase FROM "PublishingJob"')).rows[0].phase,'CANCELLED');
  }));
  await t.test('edit after approval withdrawal invalidates unsent work',()=>fixture(async h=>{
   h.io.media=async()=>{await h.q(`UPDATE "CalendarPost" SET "approvalStatus"='REVISION_REQUESTED'`);assert.equal((await h.actions.edit(h.request('edit',1))).outcome,'APPLIED');return [];};assert.notEqual((await h.build().run(h.target)).state,'confirmed');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT phase FROM "PublishingJob"')).rows[0].phase,'CANCELLED');
  }));
  for(const [name,change] of [['disconnect',async h=>h.q(`UPDATE "SocialConnection" SET status='DISCONNECTED'`)],['approval',async h=>h.q(`UPDATE "CalendarPost" SET "approvalStatus"='REVISION_REQUESTED'`)],['draining',async h=>h.owner.transition({operationId:'after-auth-drain',actor:'operator',expectedEpoch:1n,to:'DRAINING'})]])await t.test(name+' after authorization COMMIT fences consumption',()=>fixture(async h=>{
   h.afterAuthorization(()=>change(h));assert.equal((await h.build().run(h.target)).state,'outcome-unknown');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT state FROM "PublishingSendCapability"')).rows[0].state,'ISSUED');assert.equal((await h.build().run(h.target)).state,'outcome-unknown');
  }));
  await t.test('graceful shutdown waits for settled publication evidence',()=>fixture(async h=>{
   let release;h.io.submit=(...args)=>new Promise(r=>{h.io.calls.push(args);release=()=>r({status:200,body:{data:{id:'graceful-id'}}});});const w=h.build({shutdownGraceMs:1000}),task=w.run(h.target);for(let i=0;!release&&i<100;i++)await delay(10);const close=w.close();release();assert.equal((await task).state,'confirmed');assert.equal((await close).quiescent,true);assert.equal((await w.run(h.target)).state,'stopping');
  }));
  await t.test('bounded shutdown before authorization fences late preparation continuation',()=>fixture(async h=>{
   let release;h.io.media=()=>new Promise(r=>{release=r;});const w=h.build(),task=w.run(h.target);for(let i=0;!release&&i<100;i++)await delay(10);const closing=await w.close();assert.equal(closing.quiescent,false);assert.equal((await task).state,'deferred');assert.equal((await w.run(h.target)).state,'stopping');release([]);await delay(50);assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingExternalAttempt"')).rows[0].n,0);
  }));
  await t.test('timeout after external submission retains local slot and late response evidence',()=>fixture(async h=>{
   let release;h.io.submit=()=>new Promise(r=>{h.io.calls.push('effect');release=()=>r({status:200,body:{data:{id:'late-id'}}});});const w=h.build({jobTimeoutMs:1000,preparedLeaseMs:3000});const task=w.run(h.target);for(let i=0;!release&&i<100;i++)await delay(10);assert.equal((await task).state,'outcome-unknown');assert.equal(w.status().pendingOperations,1);assert.equal((await w.run(h.target)).state,'deferred');release();await delay(100);assert.equal((await h.q('SELECT phase FROM "PublishingJob"')).rows[0].phase,'CONFIRMED');assert.equal(h.io.calls.length,1);
  }));
  for(const mode of ['after-claim','during-preparation','after-authorization','after-consumption','after-submission','after-journal'])await t.test('SIGKILL worker '+mode+' preserves safe restart',()=>fixture(async h=>{
   const config=path.join(cluster.socketDirectory,'worker-crash-'+n+'.json'),trace=path.join(cluster.socketDirectory,'worker-effect-'+n);
   fs.writeFileSync(config,JSON.stringify({socket:cluster.socketDirectory,schema:'worker_'+n,spool:h.spoolDirectory,target:h.target,trace,mode}),{mode:0o600});
   const child=fork(path.resolve('tests/helpers/canonical-worker-process.cjs'),[config],{env:{PATH:'/usr/bin:/bin',TMPDIR:require('node:os').tmpdir()},stdio:['ignore','ignore','pipe','ipc']});
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('checkpoint timeout'));},8000);let errors='';child.stderr.on('data',d=>{errors+=d;});child.once('message',()=>{clearTimeout(timer);resolve();});child.once('exit',code=>{clearTimeout(timer);reject(Error('child exited '+code+' '+errors));});});
   const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exited;await delay(600);
   const out=await h.build().run(h.target);
   assert.equal(out.state,['after-claim','during-preparation','after-journal'].includes(mode)?'confirmed':'outcome-unknown');
   assert.equal(h.io.calls.length,['after-claim','during-preparation'].includes(mode)?1:0);
   assert.equal(fs.existsSync(trace),['after-submission','after-journal'].includes(mode));
   assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingSendCapability"')).rows[0].n,1);
  }));
  await t.test('finite drain and close never schedule future work',()=>fixture(async h=>{const w=h.build();const rounds=await w.drain({durationMs:3000,maxRounds:2});assert.equal(rounds.length,2);assert.equal(rounds[0].results[0].state,'confirmed');assert.equal(rounds[1].results.length,0);await w.close();assert.equal((await w.pollOnce()).state,'stopping');assert.equal(h.io.calls.length,1);}));
 }finally{await cluster.close();}
});
