'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {load}=require('./helpers/load-typescript.cjs'),{startOwnershipCluster}=require('./helpers/ownership-cluster.cjs'),{authorizationFixture}=require('./helpers/authorization-fixture.cjs');
const {createCapabilityProviderIntegration}=load('lib/publishing/capabilityProviders.ts');
const {createSyntheticProviderSpool}=load('lib/publishing/providerSpool.ts');
const {accountAuthorizationHash}=load('lib/publishing/eligibilityPolicy.ts');
const {emptyTikTokSettings,TIKTOK_CONSENT_VERSION}=load('lib/tiktokSettings.ts');
const {tikTokConsentHash}=load('lib/tiktokConsent.ts');
function target(i){const {operationId,actor,owner,epoch,workerToken,...t}=i;return t;}
const {mock}=require('./helpers/provider-mocks.cjs');
test('Stage 4C.4 isolated provider integration',async t=>{
 const cluster=await startOwnershipCluster();let n=0;
 const fixture=(run,platform='X',postType='TEXT')=>authorizationFixture(cluster.pool,'provider_'+ ++n,async h=>{
  await h.q(fs.readFileSync('scripts/publishing-reliability/provider-schema.sql','utf8'));
  if(platform!=='X'||postType!=='TEXT'){
   const scopes={INSTAGRAM:'instagram_content_publish',TIKTOK:'video.publish',FACEBOOK:'pages_manage_posts pages_read_engagement',LINKEDIN:'w_member_social',X:'tweet.write media.write'}[platform];
   await h.q('UPDATE "CalendarPost" SET platform=$1,"postType"=$2',[platform,postType]);
   await h.q('UPDATE "SocialConnection" SET platform=$1,"tokenScopes"=$2',[platform,scopes]);
   if(postType!=='TEXT')await h.q(`INSERT INTO "CalendarPostAsset" VALUES('asset','post','synthetic-file',$1,0)`,[postType==='PHOTO'?'PHOTO':'VIDEO']);
   const c=(await h.q('SELECT * FROM "SocialConnection"')).rows[0];
   await h.accountStore.changeAccount({...h.accountInput,operationId:'account-two',bindingId:'destination',platform,authorizationHash:accountAuthorizationHash(c)});
   if(platform==='TIKTOK'){
    const settings={...emptyTikTokSettings,privacyLevel:'SELF_ONLY',photoTitle:'Synthetic'};
    const p=(await h.q('SELECT * FROM "CalendarPost"')).rows[0];p.tikTokSettings=settings;p.assets=(await h.q('SELECT * FROM "CalendarPostAsset"')).rows;
    await h.q('UPDATE "CalendarPost" SET "tikTokSettings"=$1,"tikTokConsentAccountId"=$2,"tikTokConsentAt"=now(),"tikTokConsentBy"=$3,"tikTokConsentVersion"=$4,"tikTokConsentHash"=$5',[settings,'provider-one','owner',TIKTOK_CONSENT_VERSION,tikTokConsentHash(p,settings,'provider-one')]);
   }
  }
  const s=await h.actions.schedule(h.request('schedule',0,{platform,destination:{accountBindingId:platform==='X'&&postType==='TEXT'?'account':'destination',accountVersion:1}}));
  await h.store.admit(h.operation(s.jobId,'admit'));await h.store.prepare(h.operation(s.jobId,'prepare'));
  const input=await h.input(s.jobId),a=h.service(),io=mock(),spool=await createSyntheticProviderSpool(path.join(cluster.socketDirectory,'spool-'+n));
  let failPersistence=false;
  const database={transaction:fn=>h.db.transaction(tx=>fn({query:(sql,args)=>{if(failPersistence&&(/PublishingProviderJournal/.test(sql)||/PublishingAuthorizationOutcome/.test(sql)))throw Error('synthetic DB unavailable');return tx.query(sql,args);}}))};
  const layer=createCapabilityProviderIntegration({environment:'isolated-mock',database,authorization:{...a,recordOutcome:async(...args)=>{if(failPersistence)throw Error('synthetic projection unavailable');return a.recordOutcome(...args);}},validation:h.validation,spool,io});
  await layer.prepare(target(input));
  await run({...h,inputFor:h.input,s,input,a,io,spool,layer,failPersistence:v=>{failPersistence=v;},authorize:()=>a.authorize(input),publish:r=>layer.publish({target:target(input),capability:r.capability})});
 });
 try{
  for(const mode of ['before-submit','after-submit','after-journal'])await t.test('process crash '+mode,()=>fixture(async h=>{
   const {fork}=require('node:child_process');
   const config=path.join(cluster.socketDirectory,'crash-'+n+'.json'),trace=path.join(cluster.socketDirectory,'trace-'+n);
   fs.writeFileSync(config,JSON.stringify({schema:'provider_'+n,socket:cluster.socketDirectory,input:{...h.input,epoch:String(h.input.epoch)},spool:path.join(cluster.socketDirectory,'spool-'+n),trace,mode}),{mode:0o600});
   const child=fork(path.resolve('tests/helpers/provider-process.cjs'),[config],{env:{PATH:'/usr/bin:/bin',TMPDIR:require('node:os').tmpdir()},stdio:['ignore','ignore','pipe','ipc']});
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('crash checkpoint timeout'));},10000);child.once('message',()=>{clearTimeout(timer);resolve();});child.stderr.on('data',d=>console.error(String(d)));child.once('exit',code=>{clearTimeout(timer);reject(Error('child exited '+code));});});
   const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exited;
   assert.equal(fs.existsSync(trace),mode!=='before-submit');
   const cap=(await h.q('SELECT id,state FROM "PublishingSendCapability"')).rows[0];assert.equal(cap.state,'CONSUMED');assert.equal((await h.authorize()).maySend,false);
   const out=await h.layer.reconcile(cap.id);assert.equal(out.outcome,mode==='after-journal'?'CONFIRMED':'UNKNOWN');assert.equal(h.io.calls.length,0);
  },'INSTAGRAM','PHOTO'));
  for(const [platform,type] of [['INSTAGRAM','PHOTO'],['TIKTOK','PHOTO'],['TIKTOK','VIDEO'],['FACEBOOK','TEXT'],['FACEBOOK','VIDEO'],['FACEBOOK','REEL'],['LINKEDIN','TEXT'],['X','TEXT']])await t.test(platform+' '+type+' authorized boundary and confirmation',()=>fixture(async h=>{
   const r=await h.authorize(),out=await h.publish(r);assert.equal(out.outcome,['TIKTOK'].includes(platform)||platform==='FACEBOOK'&&['VIDEO','REEL'].includes(type)?'ACCEPTED':'CONFIRMED');assert.equal(h.io.calls.length,1);assert.equal(h.io.calls[0].authorization.id,r.authorizationId);
   if(out.outcome==='ACCEPTED'){const confirmed=await h.layer.reconcile(r.authorizationId);assert.equal(confirmed.outcome,'CONFIRMED');assert.equal(h.io.calls.length,1);}
   assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingProviderJournal"')).rows[0].n>=2,true);
  },platform,type));
  await t.test('missing invalid wrong provider and consumed capabilities',()=>fixture(async h=>{
   await assert.rejects(h.layer.publish(),/CONTEXT_REQUIRED/);
   for(const capability of [undefined,{}])await assert.rejects(h.layer.publish({target:target(h.input),capability}),/CAPABILITY_REQUIRED/);
   const r=await h.authorize();await assert.rejects(h.layer.publish({target:{...target(h.input),platform:'FACEBOOK'},capability:r.capability}),/MISMATCH/);
   await h.publish(r);await assert.rejects(h.publish(r),/CAPABILITY_REQUIRED/);assert.equal(h.io.calls.length,1);
  }));
  await t.test('concurrent sends consume once',()=>fixture(async h=>{const r=await h.authorize();const out=await Promise.allSettled([h.publish(r),h.publish(r)]);assert.equal(out.filter(x=>x.status==='fulfilled').length,1);assert.equal(h.io.calls.length,1);}));
  await t.test('lost authorization acknowledgement grants no capability',()=>fixture(async h=>{h.lose('authorize');await assert.rejects(h.authorize(),/UNCONFIRMED/);assert.equal((await h.authorize()).maySend,false);assert.equal(h.io.calls.length,0);}));
  await t.test('provider timeout remains uncertain without automatic resend',()=>fixture(async h=>{h.io.submit=async()=>{h.io.calls.push('submitted');throw Error('timeout');};const r=await h.authorize();assert.equal((await h.publish(r)).outcome,'UNKNOWN');assert.equal((await h.layer.reconcile(r.authorizationId)).outcome,'UNKNOWN');assert.equal(h.io.calls.length,1);}));
  for(const platform of ['LINKEDIN','X'])await t.test(platform+' missing identifiers remain uncertain',()=>fixture(async h=>{h.io.submit=async()=>({status:200,body:{}});assert.equal((await h.publish(await h.authorize())).outcome,'UNKNOWN');},platform));
  await t.test('permalink failure follows durable Instagram confirmation',()=>fixture(async h=>{h.io.lookup=async()=>{assert.equal((await h.q('SELECT outcome FROM "PublishingExternalAttempt"')).rows[0].outcome,'CONFIRMED');throw Error('permalink failure');};assert.equal((await h.publish(await h.authorize())).outcome,'CONFIRMED');},'INSTAGRAM','PHOTO'));
  await t.test('DB journal failure preserves spool and reconciliation imports without resend',()=>fixture(async h=>{const r=await h.authorize();h.failPersistence(true);assert.equal((await h.publish(r)).outcome,'UNKNOWN');assert.ok((await h.spool.records(r.authorizationId)).some(e=>e.reference==='remote-one'));h.failPersistence(false);assert.equal((await h.layer.reconcile(r.authorizationId)).outcome,'CONFIRMED');assert.equal(h.io.calls.length,1);}));
  await t.test('duplicate responses preserve immutable evidence',()=>fixture(async h=>{const r=await h.authorize();await h.publish(r);const e=(await h.spool.records(r.authorizationId)).find(e=>e.kind==='RESPONSE');await h.layer.observe(e);await h.layer.observe(e);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingProviderJournal"')).rows[0].n,2);await assert.rejects(h.q('DELETE FROM "PublishingProviderJournal"'),/immutable/i);}));
  await t.test('approved retry generation publishes once with durable predecessor',()=>fixture(async h=>{
   const first=await h.authorize();h.allowProof();await h.a.revoke({operationId:'stop-first',authorizationId:first.authorizationId,actor:'worker',reason:'synthetic stopped actor'});
   const root=(await h.q('SELECT id FROM "PublishingExternalAttempt"')).rows[0].id;
   await h.actions.recordRetryEvidence({id:'proof',actor:'owner',intentId:'intent',predecessorId:root,evidenceReference:'synthetic-verified-stopped'});
   const r=await h.actions.retry(h.request('retry',1,{evidenceId:'proof'}));await h.store.admit(h.operation(r.jobId,'admit2'));await h.store.prepare(h.operation(r.jobId,'prepare2'));
   const input=await h.inputFor(r.jobId,'authorize2');await h.layer.prepare(target(input));const grant=await h.a.authorize(input);
   assert.equal((await h.layer.publish({target:target(input),capability:grant.capability})).outcome,'CONFIRMED');assert.equal(h.io.calls[0].t.generation,2);assert.ok(h.io.calls[0].authorization.retryGenerationId);assert.equal((await h.a.authorize(input)).maySend,false);
   assert.equal((await h.q('SELECT "rootAttemptId" FROM "PublishingRetryGeneration"')).rows[0].rootAttemptId,root);
  }));
  await t.test('uncertain work cannot generate an unverified retry',()=>fixture(async h=>{
   h.io.submit=async()=>{throw Error('timeout');};await h.publish(await h.authorize());assert.equal((await h.actions.retry(h.request('retry',1,{evidenceId:'untrusted'}))).outcome,'PENDING_RECONCILIATION');assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingRetryGeneration"')).rows[0].n,0);
  }));
  await t.test('rollback leaves no send authority',()=>fixture(async h=>{h.fail();await assert.rejects(h.authorize(),/UNCONFIRMED/);assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingSendCapability"')).rows[0].n,0);}));
  await t.test('journal unavailable before submission fails closed',()=>fixture(async h=>{
   const r=await h.authorize();h.spool.append=async()=>{throw Error('synthetic disk failure');};assert.equal((await h.publish(r)).outcome,'UNKNOWN');assert.equal(h.io.calls.length,0);assert.equal((await h.q('SELECT state FROM "PublishingSendCapability"')).rows[0].state,'CONSUMED');
  }));
  await t.test('trusted definitive provider rejection is separate from uncertain HTTP errors',()=>fixture(async h=>{
   h.io.submit=async()=>({status:400,body:{error:'invalid content'},definitiveNoSend:{verified:true,evidenceReference:'mock-proof'}});assert.equal((await h.publish(await h.authorize())).outcome,'REJECTED');assert.equal((await h.store.findJob(h.s.jobId)).phase,'REJECTED');
  }));
  await t.test('LinkedIn creation acknowledgement alone awaits confirmation',()=>fixture(async h=>{
   h.io.submit=async()=>({status:201,body:{},headers:{'x-restli-id':'linked-operation'}});const r=await h.authorize();assert.equal((await h.publish(r)).outcome,'ACCEPTED');assert.equal((await h.layer.reconcile(r.authorizationId)).outcome,'CONFIRMED');
  },'LINKEDIN'));
  await t.test('database guards reject invalid bindings and preserve evidence',()=>fixture(async h=>{
   const r=await h.authorize();await h.publish(r);
   await assert.rejects(h.q(`INSERT INTO "PublishingProviderPreparation"("jobId","targetHash","contentHash",artifact) VALUES($1,$2,$3,'{}')`,[h.s.jobId,'a'.repeat(64),'b'.repeat(64)]),/CONTENT_CONFLICT/);
   await assert.rejects(h.q(`INSERT INTO "PublishingProviderJournal"(id,"authorizationId","jobId",platform,kind,outcome,"responseHash",operation) VALUES('forged',$1,'other','X','RESPONSE','UNKNOWN',$2,'forged')`,[r.authorizationId,'a'.repeat(64)]),/CAPABILITY_REQUIRED/);
   await assert.rejects(h.q(`UPDATE "PublishingProviderPreparation" SET artifact='{}'`),/immutable/i);
   await assert.rejects(h.q(`UPDATE "PublishingProviderJournal" SET outcome='UNKNOWN'`),/immutable/i);
  }));
  await t.test('cached preparation refreshes expired credentials without retargeting',()=>fixture(async h=>{
   await h.q(`UPDATE "SocialConnection" SET "accessTokenExpiresAt"=now()-interval '1 hour'`);
   let refreshed=0;h.io.refresh=async t=>{assert.equal(t.connectionId,'connection');refreshed++;await h.q(`UPDATE "SocialConnection" SET "accessTokenExpiresAt"=now()+interval '1 hour'`);};
   assert.equal((await h.layer.prepare(target(h.input))).maySend,false);assert.equal(refreshed,1);assert.equal((await h.publish(await h.authorize())).outcome,'CONFIRMED');
  }));
  await t.test('disconnect after authorization prevents submit',()=>fixture(async h=>{const r=await h.authorize();await h.q(`UPDATE "SocialConnection" SET status='DISCONNECTED'`);await assert.rejects(h.publish(r));assert.equal(h.io.calls.length,0);}));
  await t.test('scope revocation after authorization prevents submit',()=>fixture(async h=>{const r=await h.authorize();await h.q(`UPDATE "SocialConnection" SET "tokenScopes"=''`);await assert.rejects(h.publish(r));assert.equal(h.io.calls.length,0);}));
 }finally{await cluster.close();}
});
