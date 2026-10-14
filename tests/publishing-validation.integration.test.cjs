'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load}=require('./helpers/load-typescript.cjs'),{startOwnershipCluster}=require('./helpers/ownership-cluster.cjs');
const {createPublishingValidationAdapters}=load('lib/publishing/validationAdapters.ts');
const {accountAuthorizationHash}=load('lib/publishing/eligibilityPolicy.ts');
const {createCanonicalPublishingStore}=load('lib/publishing/canonicalStore.ts');
const {createPublishingTransactionDatabase}=load('lib/publishing/transactionDatabase.ts');
const {createPublishingOwnership}=load('lib/publishing/ownership.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('Stage 4C.2 policy adapters on disposable PostgreSQL',async t=>{
 const cluster=await startOwnershipCluster(),{pool}=cluster;let n=0;
 async function fixture(run){
  const schema='validation_'+ ++n;await pool.query(`CREATE SCHEMA ${schema}`);
  async function q(sql,args){const c=await pool.connect();try{await c.query(`SET search_path TO ${schema}`);return await c.query(sql,args);}finally{c.release();}}
  await q(`CREATE TYPE "SocialPlatform" AS ENUM('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X');
   CREATE TABLE "Creator"(id text PRIMARY KEY,"isDeactivated" boolean NOT NULL DEFAULT false,"contentWorkspacePlan" text DEFAULT 'CREATOR',"contentWorkspaceBillingStatus" text DEFAULT 'ACTIVE',"contentWorkspaceTrialEndsAt" timestamptz,"isComped" boolean DEFAULT false,"compedUntil" timestamptz,"workspaceCompedPlan" text,"workspaceCompedUntil" timestamptz,"billingComplimentaryGrants" jsonb);
   CREATE TABLE "SocialCalendar"(id text PRIMARY KEY,"managerId" text NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now());
   CREATE TABLE "CalendarCollaborator"(id text PRIMARY KEY,"calendarId" text NOT NULL,"creatorId" text NOT NULL,role text NOT NULL,permissions text[] NOT NULL DEFAULT '{}',"customPermissions" boolean NOT NULL DEFAULT false,UNIQUE("calendarId","creatorId"));
   CREATE TABLE "CalendarPost"(id text PRIMARY KEY,"calendarId" text NOT NULL,platform "SocialPlatform" NOT NULL,caption text,cta text,hashtags text,"taggedAccounts" text,"linkUrl" text,"postType" text,"approvalStatus" text DEFAULT 'APPROVED',"isAiDraft" boolean DEFAULT false,"instagramPublishStatus" text DEFAULT 'NOT_SCHEDULED',"tikTokPublishStatus" text DEFAULT 'NOT_SCHEDULED',"publishStatus" text DEFAULT 'SCHEDULED',"tikTokSettings" jsonb,"tikTokConsentAccountId" text,"tikTokConsentAt" timestamptz,"tikTokConsentBy" text,"tikTokConsentVersion" text,"tikTokConsentHash" text,"updatedAt" timestamptz DEFAULT now());
   CREATE TABLE "CalendarPostAsset"(id text PRIMARY KEY,"postId" text NOT NULL,"fileKey" text NOT NULL,"mediaType" text NOT NULL,"displayOrder" integer NOT NULL);
   CREATE TABLE "SocialConnection"(id text PRIMARY KEY,"calendarId" text NOT NULL,platform "SocialPlatform" NOT NULL,"platformAccountId" text NOT NULL,status text DEFAULT 'CONNECTED',"accessToken" text DEFAULT 'synthetic-token',"accessTokenExpiresAt" timestamptz DEFAULT now()+interval '1 hour',"tokenScopes" text NOT NULL);
   INSERT INTO "Creator"(id) VALUES('owner'),('collab'),('outsider'),('newowner');
   INSERT INTO "SocialCalendar"(id,"managerId") VALUES('calendar','owner');
   INSERT INTO "CalendarCollaborator"(id,"calendarId","creatorId",role) VALUES('member','calendar','collab','SOCIAL_MEDIA_MANAGER');
   INSERT INTO "CalendarPost"(id,"calendarId",platform,caption) VALUES('post','calendar','X','approved synthetic caption');
   INSERT INTO "SocialConnection"(id,"calendarId",platform,"platformAccountId","tokenScopes") VALUES('connection','calendar','X','provider-one','tweet.write')`);
  for(const file of ['schema','ownership-schema','intent-actions-schema','canonical-schema','eligibility-schema'])await q(fs.readFileSync(`scripts/publishing-reliability/${file}.sql`,'utf8'));
  let lose=false,allowProof=false;
  const db=createPublishingTransactionDatabase({connect:async()=>{
   const c=await pool.connect();return {release:b=>c.release(b),query:async(sql,args)=>{
    if(sql==='COMMIT'&&lose&&(await c.query(`SELECT 1 FROM "PublishingExternalAttempt" WHERE id='attempt' AND xmin=pg_current_xact_id()::xid`)).rows.length){lose=false;c.on('error',()=>{});c.connection.stream.pause();const pending=c.query('COMMIT').catch(()=>{});
     try{for(let i=0;;i++){if((await q(`SELECT 1 FROM "PublishingExternalAttempt" WHERE id='attempt'`)).rows.length)break;if(i>100)throw Error('COMMIT_NOT_VISIBLE');await delay(10);}}finally{c.connection.stream.destroy();await pending;}throw Error('lost socket acknowledgement');
    }return c.query(sql,args);
   }};
  }},{schema});
  const owner=createPublishingOwnership(db);await owner.transition({operationId:'activate',actor:'operator',expectedEpoch:0n,to:'NETLIFY',activate:true});
  const adapters=createPublishingValidationAdapters({database:db,verifyViewer:async(_tx,{calendarId,credential})=>{
   if(!['verified-viewer','expired-viewer'].includes(credential))throw Error('INVALID_VIEWER_TOKEN');return {principalId:'viewer',calendarId,expiresAt:credential==='expired-viewer'?new Date(0):new Date(Date.now()+60000)};
  },verifyRetryEvidence:async(_tx,input)=>{if(!allowProof||input.actor!=='owner'||input.evidenceReference!=='synthetic-verified-stopped')throw Error('NO_TRUSTED_EVIDENCE');return {kind:'NOT_SENT',actorStopped:true,verified:true,retryable:true};}});
  const actions=adapters.intentActions(async(tx,input)=>{await tx.query(`UPDATE "CalendarPost" SET caption=$2 WHERE id=$1`,[input.postId,input.edit]);});
  const store=adapters.canonicalStore(),rawStore=createCanonicalPublishingStore({database:db,lockAndValidate:async()=>{}});
  const conn=(await q(`SELECT * FROM "SocialConnection" WHERE id='connection'`)).rows[0];
  const accountInput={operationId:'account',actor:'operator',bindingId:'account',calendarId:'calendar',platform:'X',expectedVersion:0,providerAccountId:'provider-one',connectionId:'connection',authorizationHash:accountAuthorizationHash(conn),state:'CONNECTED'};
  await rawStore.changeAccount(accountInput);
  const req=(operationId='schedule',actor='owner',extra={})=>({operationId,actor,intentId:'intent',postId:'post',platform:'X',expectedRevision:0,dueAt:new Date(0),destination:{accountBindingId:'account',accountVersion:1},...extra});
  const op=(jobId,operationId)=>({jobId,operationId,actor:'worker',owner:'NETLIFY',epoch:1n});
  async function prepare(actor='owner'){const s=await actions.schedule(req('schedule',actor));await store.admit(op(s.jobId,'admit'));await store.prepare(op(s.jobId,'prepare'));return s;}
  async function authorize(s,before){const job=await store.findJob(s.jobId);return db.transaction(async tx=>{
   await adapters.validateBeforeExternal(tx,{job,owner:'NETLIFY',epoch:1n});if(before)await before(tx);
   return createPublishingOwnership({transaction:fn=>fn(tx)}).authorize({attemptId:'attempt',intentId:'intent',revision:1,jobId:s.jobId,owner:'NETLIFY',epoch:1n,actor:'worker'});
  });}
  await run({q,db,owner,adapters,actions,store,rawStore,accountInput,req,op,prepare,authorize,allowProof:()=>{allowProof=true;},lose:()=>{lose=true;}});
 }
 try{
  await t.test('owner and collaborator schedule with current role policy',()=>fixture(async h=>{const s=await h.prepare('collab');assert.equal((await h.authorize(s)).maySend,true);assert.equal((await h.q(`SELECT "principalId" FROM "PublishingRevisionPolicy"`)).rows[0].principalId,'collab');}));
  await t.test('outsider, creative-only and custom permissions without view dependency fail',()=>fixture(async h=>{
   await assert.rejects(h.actions.schedule(h.req('outsider','outsider')));
   for(const change of [`role='CREATIVE_CONTRIBUTOR'`,`role='SOCIAL_MEDIA_MANAGER',"customPermissions"=true,permissions=ARRAY['publishing.manage']`]){await h.q(`UPDATE "CalendarCollaborator" SET ${change}`);await assert.rejects(h.actions.schedule(h.req('denied-'+Math.random().toString(16).slice(2),'collab')));}
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingJob"`)).rows[0].n,0);
  }));
  await t.test('permission revocation after preparation blocks authorization and replay cannot grant',()=>fixture(async h=>{
   const s=await h.prepare('collab');await h.q(`DELETE FROM "CalendarCollaborator"`);await assert.rejects(h.authorize(s),/PERMISSION_DENIED/);
   assert.equal((await h.actions.schedule(h.req('schedule','collab')).catch(()=>null)),null);
   assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,0);
  }));
  await t.test('owner subscription controls collaborator access, not collaborator subscription',()=>fixture(async h=>{
   await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='OFFLINE' WHERE id='collab'`);const s=await h.prepare('collab');
   await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='OFFLINE' WHERE id='owner'`);await assert.rejects(h.authorize(s),/ENTITLEMENT_DENIED/);
  }));
  await t.test('workspace transfer does not adopt new owner authority',()=>fixture(async h=>{const s=await h.prepare();await h.q(`UPDATE "SocialCalendar" SET "managerId"='newowner'`);await assert.rejects(h.authorize(s),/REVISION_AUTHORITY_CHANGED/);}));
  await t.test('trial expiry and workspace rank are revalidated',()=>fixture(async h=>{
   await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='TRIAL',"contentWorkspaceTrialEndsAt"=now()+interval '1 hour' WHERE id='owner'`);const s=await h.prepare();
   await h.q(`UPDATE "Creator" SET "contentWorkspaceTrialEndsAt"=now()-interval '1 second' WHERE id='owner'`);await assert.rejects(h.authorize(s),/ENTITLEMENT_DENIED/);
   await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='ACTIVE' WHERE id='owner'`);
   await h.q(`INSERT INTO "SocialCalendar"(id,"managerId","createdAt") SELECT 'earlier-'||n,'owner','2000-01-01'::timestamptz FROM generate_series(1,5)n`);await assert.rejects(h.authorize(s),/ENTITLEMENT_DENIED/);
  }));
  await t.test('complimentary grant revocation and expiry remove eligibility',()=>fixture(async h=>{
   await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='OFFLINE',"billingComplimentaryGrants"=$1 WHERE id='owner'`,[JSON.stringify([{product:'CONTENT_WORKSPACE',plan:'STUDIO',endsAt:new Date(Date.now()+60000).toISOString()}])]);const s=await h.prepare();
   await h.q(`UPDATE "Creator" SET "billingComplimentaryGrants"='[]' WHERE id='owner'`);await assert.rejects(h.authorize(s),/ENTITLEMENT_DENIED/);
   await h.q(`UPDATE "Creator" SET "isComped"=true,"compedUntil"=now()-interval '1 second' WHERE id='owner'`);await assert.rejects(h.authorize(s),/ENTITLEMENT_DENIED/);
  }));
  await t.test('deactivation is conservatively blocked in the inactive layer',()=>fixture(async h=>{const s=await h.prepare('collab');await h.q(`UPDATE "Creator" SET "isDeactivated"=true WHERE id='collab'`);await assert.rejects(h.authorize(s),/ACTOR_DEACTIVATED/);await h.q(`UPDATE "Creator" SET "isDeactivated"=true WHERE id='owner'`);await assert.rejects(h.authorize(s),/OWNER_DEACTIVATED/);}));
  await t.test('viewer may approve but cannot schedule as a creator',()=>fixture(async h=>{
   const v=await h.db.transaction(tx=>h.adapters.validateViewerApproval(tx,{postId:'post',calendarId:'calendar',credential:'verified-viewer'}));assert.equal(v.authority,'VIEWER_APPROVAL');assert.equal(v.maySend,false);
   await assert.rejects(h.actions.schedule(h.req('viewer','viewer')));
   await assert.rejects(h.db.transaction(tx=>h.adapters.validateViewerApproval(tx,{postId:'post',calendarId:'other',credential:'verified-viewer'})),/MISMATCH/);
   await assert.rejects(h.db.transaction(tx=>h.adapters.validateViewerApproval(tx,{postId:'post',calendarId:'calendar',credential:'client-claimed-true'})));
  }));
  await t.test('approval revocation, revision request and AI draft each block later authorization',()=>fixture(async h=>{
   const s=await h.prepare();for(const update of [`"approvalStatus"='PENDING'`,`"approvalStatus"='NEEDS_REVISION'`,`"approvalStatus"='APPROVED',"isAiDraft"=true`]){await h.q(`UPDATE "CalendarPost" SET ${update}`);await assert.rejects(h.authorize(s),/APPROVAL_REQUIRED|DRAFT_INELIGIBLE/);}
  }));
  await t.test('approval restored cannot revive an old revision without explicit rescheduling',()=>fixture(async h=>{
   const s=await h.prepare();await h.q(`UPDATE "CalendarPost" SET "approvalStatus"='NEEDS_REVISION'`);await h.q(`UPDATE "CalendarPost" SET "approvalStatus"='APPROVED'`);
   await assert.rejects(h.authorize(s),/REVISION_INVALIDATED/);
   const r=await h.actions.reschedule(h.req('new-approved-revision','owner',{expectedRevision:1}));await h.store.admit(h.op(r.jobId,'admit2'));await h.store.prepare(h.op(r.jobId,'prepare2'));
   assert.equal((await h.store.findJob(r.jobId)).revision,2);await assert.rejects(h.q(`DELETE FROM "PublishingPostEligibilityInvalidation"`),/IMMUTABLE/);
  }));
  await t.test('account replacement/disconnection/stale version never redirect',()=>fixture(async h=>{
   const s=await h.prepare();await h.rawStore.changeAccount({...h.accountInput,operationId:'replace',expectedVersion:1,providerAccountId:'provider-two'});assert.equal((await h.store.findJob(s.jobId)).providerAccountId,'provider-one');await assert.rejects(h.authorize(s),/BINDING_CHANGED/);
  }));
  await t.test('connection disconnection, scope changes and token expiry block sends',()=>fixture(async h=>{
   const s=await h.prepare();await h.q(`UPDATE "SocialConnection" SET status='DISCONNECTED'`);await assert.rejects(h.authorize(s),/CONNECTION_CHANGED|VERSION_INVALIDATED/);
   await h.q(`UPDATE "SocialConnection" SET status='CONNECTED',"tokenScopes"='tweet.read'`);await assert.rejects(h.authorize(s),/AUTHORIZATION_CHANGED|VERSION_INVALIDATED/);
   await h.q(`UPDATE "SocialConnection" SET "tokenScopes"='tweet.write',"accessTokenExpiresAt"=now()-interval '1 second'`);await assert.rejects(h.authorize(s),/TOKEN_EXPIRED|VERSION_INVALIDATED/);
  }));
  await t.test('reconnection cannot revive a bound old version; explicit new revision can proceed',()=>fixture(async h=>{
   const s=await h.prepare();await h.q(`UPDATE "SocialConnection" SET status='DISCONNECTED'`);await h.q(`UPDATE "SocialConnection" SET status='CONNECTED'`);
   await assert.rejects(h.authorize(s),/VERSION_INVALIDATED/);
   await h.rawStore.changeAccount({...h.accountInput,operationId:'new-version',expectedVersion:1});
   const r=await h.actions.reschedule(h.req('reschedule','owner',{expectedRevision:1,destination:{accountBindingId:'account',accountVersion:2}}));
   await h.store.admit(h.op(r.jobId,'admit2'));await h.store.prepare(h.op(r.jobId,'prepare2'));assert.equal((await h.store.findJob(r.jobId)).accountVersion,2);
  }));
  await t.test('time expiry between validation and COMMIT rolls back send authorization',()=>fixture(async h=>{
   const s=await h.prepare();await h.q(`UPDATE "SocialConnection" SET "accessTokenExpiresAt"=clock_timestamp()+interval '1 second'`);
   await assert.rejects(h.authorize(s,()=>delay(1100)),/UNCONFIRMED/);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,0);
  }));
  await t.test('content/media changes invalidate exact approved snapshot without timestamp reliance',()=>fixture(async h=>{const s=await h.prepare();await h.q(`UPDATE "CalendarPost" SET caption='changed'`);await assert.rejects(h.authorize(s),/CONTENT_CHANGED/);}));
  await t.test('required provider scopes are checked even when account hash matches',()=>fixture(async h=>{
   await h.q(`UPDATE "SocialConnection" SET "tokenScopes"='tweet.read'`);
   const c=(await h.q(`SELECT * FROM "SocialConnection"`)).rows[0];await h.rawStore.changeAccount({...h.accountInput,operationId:'rescope',expectedVersion:1,authorizationHash:accountAuthorizationHash(c)});
   await assert.rejects(h.actions.schedule(h.req('missing-scope','owner',{destination:{accountBindingId:'account',accountVersion:2}})),/SOCIAL_PERMISSION_MISSING/);
  }));
  await t.test('view and people-management exceptions survive billing expiry; publishing does not',()=>fixture(async h=>{
   await h.q(`UPDATE "Creator" SET "contentWorkspaceBillingStatus"='OFFLINE' WHERE id='owner'`);
   for(const permission of ['VIEW_ONLY','people.manage'])assert.equal((await h.db.transaction(tx=>h.adapters.validateWorkspacePermission(tx,{calendarId:'calendar',actor:'owner',permission}))).maySend,false);
   await assert.rejects(h.db.transaction(tx=>h.adapters.validateWorkspacePermission(tx,{calendarId:'calendar',actor:'owner',permission:'publishing.manage'})),/ENTITLEMENT_DENIED/);
  }));
  await t.test('expired viewer proof and post drafting cannot authorize approval',()=>fixture(async h=>{
   await assert.rejects(h.db.transaction(tx=>h.adapters.validateViewerApproval(tx,{postId:'post',calendarId:'calendar',credential:'expired-viewer'})),/VIEWER_AUTHORITY_DENIED/);
   await h.q(`UPDATE "CalendarPost" SET "isAiDraft"=true`);await assert.rejects(h.db.transaction(tx=>h.adapters.validateViewerApproval(tx,{postId:'post',calendarId:'calendar',credential:'verified-viewer'})),/DRAFT_INELIGIBLE/);
  }));
  await t.test('viewer revision request after canonical authorization fails even with stale UI status',()=>fixture(async h=>{
   const s=await h.prepare();await h.authorize(s);await assert.rejects(h.db.transaction(tx=>h.adapters.validateViewerApproval(tx,{postId:'post',calendarId:'calendar',credential:'verified-viewer'})),/EXTERNAL_CONFLICT/);
  }));
  await t.test('canonical identity cannot be forged in a validation snapshot',()=>fixture(async h=>{
   const s=await h.prepare(),job=await h.store.findJob(s.jobId);await assert.rejects(h.db.transaction(tx=>h.adapters.validateExecution(tx,{...job,generation:2})),/IDENTITY_CHANGED/);
  }));
  await t.test('raw authorization cannot reuse preparation or a prior transaction witness',()=>fixture(async h=>{
   const s=await h.prepare();await assert.rejects(h.owner.authorize({attemptId:'attempt',intentId:'intent',revision:1,jobId:s.jobId,owner:'NETLIFY',epoch:1n,actor:'worker'}));
   const job=await h.store.findJob(s.jobId);await h.db.transaction(tx=>h.adapters.validateBeforeExternal(tx,{job,owner:'NETLIFY',epoch:1n}));await assert.rejects(h.owner.authorize({attemptId:'attempt',intentId:'intent',revision:1,jobId:s.jobId,owner:'NETLIFY',epoch:1n,actor:'worker'}));
   assert.equal((await h.authorize(s)).maySend,true);
  }));
  await t.test('eligibility change committed first is observed after the shared-fence wait',()=>fixture(async h=>{
   const s=await h.prepare('collab');let release,ready;const gate=new Promise(r=>release=r),started=new Promise(r=>ready=r);
   const writer=h.db.transaction(async tx=>{await h.adapters.lockForPolicyChange(tx);await tx.query(`UPDATE "CalendarCollaborator" SET role='VIEWER'`);ready();await gate;});
   await started;const result=h.authorize(s);try{for(let i=0;;i++){if((await h.q(`SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%PublishingEligibilityFence%'`)).rows.length)break;if(i>100)throw Error('NO_FENCE_WAIT');await delay(10);}}finally{release();}
   await writer;await assert.rejects(result,/PERMISSION_DENIED/);
  }));
  await t.test('authorization wins fence; concurrent policy change waits then applies without deadlock',()=>fixture(async h=>{
   const s=await h.prepare();let release,ready;const gate=new Promise(r=>release=r),started=new Promise(r=>ready=r);
   const sending=h.authorize(s,async()=>{ready();await gate;});await started;
   const writer=h.q(`UPDATE "SocialConnection" SET status='DISCONNECTED'`);
   try{for(let i=0;;i++){if((await h.q(`SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%UPDATE "SocialConnection"%'`)).rows.length)break;if(i>100)throw Error('NO_POLICY_WAIT');await delay(10);}}finally{release();}
   assert.equal((await sending).maySend,true);await writer;assert.equal((await h.q(`SELECT status FROM "SocialConnection"`)).rows[0].status,'DISCONNECTED');assert.equal((await h.q(`SELECT outcome FROM "PublishingExternalAttempt"`)).rows[0].outcome,'AUTHORIZED');
  }));
  for(const config of [
   {platform:'FACEBOOK',scopes:'pages_manage_posts,pages_read_engagement',provider:'page'},
   {platform:'LINKEDIN',scopes:'w_member_social',provider:'member'},
   {platform:'LINKEDIN',scopes:'w_organization_social',provider:'urn:li:organization:synthetic'},
   {platform:'INSTAGRAM',scopes:'instagram_content_publish',provider:'instagram-account'},
   {platform:'TIKTOK',scopes:'video.publish',provider:'tiktok-account'},
  ])await t.test(`provider-specific validation: ${config.platform} ${config.provider}`,()=>fixture(async h=>{
   await h.q(`UPDATE "CalendarPost" SET platform=$1`,[config.platform]);
   await h.q(`UPDATE "SocialConnection" SET platform=$1,"platformAccountId"=$2,"tokenScopes"=$3`,[config.platform,config.provider,config.scopes]);
   if(['INSTAGRAM','TIKTOK'].includes(config.platform))await h.q(`INSERT INTO "CalendarPostAsset" VALUES('asset','post','calendars/synthetic.jpg','PHOTO',0)`);
   if(config.platform==='TIKTOK'){
    const {tikTokConsentHash}=load('lib/tiktokConsent.ts'),{TIKTOK_CONSENT_VERSION}=load('lib/tiktokSettings.ts');
    const settings={privacyLevel:'SELF_ONLY',allowComment:false,allowDuet:false,allowStitch:false,disclosureEnabled:false,yourBrand:false,brandedContent:false,photoTitle:'',isAigc:false};
    const p=(await h.q(`SELECT * FROM "CalendarPost"`)).rows[0],assets=(await h.q(`SELECT * FROM "CalendarPostAsset"`)).rows;
    await h.q(`UPDATE "CalendarPost" SET "tikTokSettings"=$1,"tikTokConsentAccountId"=$2,"tikTokConsentAt"=now(),"tikTokConsentBy"='owner',"tikTokConsentVersion"=$3,"tikTokConsentHash"=$4`,[settings,config.provider,TIKTOK_CONSENT_VERSION,tikTokConsentHash({...p,assets},settings,config.provider)]);
   }
   const c=(await h.q(`SELECT * FROM "SocialConnection"`)).rows[0];await h.rawStore.changeAccount({...h.accountInput,operationId:'platform-account',bindingId:'platform-account',platform:config.platform,providerAccountId:config.provider,authorizationHash:accountAuthorizationHash(c)});
   const s=await h.actions.schedule(h.req('platform-schedule','owner',{platform:config.platform,destination:{accountBindingId:'platform-account',accountVersion:1}}));
   await h.store.admit(h.op(s.jobId,'platform-admit'));await h.store.prepare(h.op(s.jobId,'platform-prepare'));assert.equal((await h.authorize(s)).maySend,true);
  }));
  await t.test('retry generation authorization requires a fresh same-transaction policy witness',()=>fixture(async h=>{
   const s=await h.prepare();await h.authorize(s);h.allowProof();
   await h.actions.recordRetryEvidence({id:'proof',actor:'owner',intentId:'intent',predecessorId:'attempt',evidenceReference:'synthetic-verified-stopped'});
   const r=await h.actions.retry(h.req('retry','owner',{expectedRevision:1,evidenceId:'proof'}));await h.store.admit(h.op(r.jobId,'admit2'));await h.store.prepare(h.op(r.jobId,'prepare2'));
   await assert.rejects(h.q(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner='NETLIFY',epoch=1,"authorizationId"='retry-auth' WHERE id=$1`,[r.generationId]),/WITNESS_REQUIRED/);
   const job=await h.store.findJob(r.jobId);await h.db.transaction(async tx=>{
    await h.adapters.validateBeforeExternal(tx,{job,owner:'NETLIFY',epoch:1n});
    await tx.query(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner='NETLIFY',epoch=1,"authorizationId"='retry-auth' WHERE id=$1`,[r.generationId]);
    await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES('retry-auth-event',$1,'AUTHORIZED','worker')`,[r.generationId]);
    await tx.query(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING' WHERE id=$1`,[r.jobId]);
   });
   assert.equal((await h.store.findJob(r.jobId)).generation,2);assert.equal((await h.q(`SELECT "rootAttemptId" FROM "PublishingRetryGeneration"`)).rows[0].rootAttemptId,'attempt');
   await assert.rejects(h.q(`DELETE FROM "PublishingEligibilityWitness"`),/IMMUTABLE/);
   await assert.rejects(h.q(`DELETE FROM "PublishingRevisionPolicy"`),/IMMUTABLE/);
  }));
  await t.test('rolled-back permission change preserves eligibility; same-tx change invalidates witness',()=>fixture(async h=>{
   const s=await h.prepare('collab');await assert.rejects(h.db.transaction(async tx=>{await h.adapters.lockForPolicyChange(tx);await tx.query(`UPDATE "CalendarCollaborator" SET role='VIEWER'`);throw Error('rollback');}));
   await assert.rejects(h.authorize(s,tx=>tx.query(`UPDATE "CalendarCollaborator" SET role='VIEWER'`)),/UNCONFIRMED/);
   assert.equal((await h.q(`SELECT role FROM "CalendarCollaborator"`)).rows[0].role,'SOCIAL_MEDIA_MANAGER');assert.equal((await h.authorize(s)).maySend,true);
  }));
  await t.test('rollback removes witness and attempt; lost acknowledgement cannot grant resend',()=>fixture(async h=>{
   const s=await h.prepare();await assert.rejects(h.authorize(s,async()=>{throw Error('rollback');}));assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingEligibilityWitness"`)).rows[0].n,0);
   h.lose();await assert.rejects(h.authorize(s),/COMMIT_UNCONFIRMED/);const recovered=await h.owner.recoverAttempt('attempt');assert.equal(recovered.maySend,false);assert.equal(recovered.record.id,'attempt');
   await assert.rejects(h.authorize(s),/PREPARED_JOB_FENCED/);assert.equal((await h.q(`SELECT count(*)::int n FROM "PublishingExternalAttempt"`)).rows[0].n,1);
  }));
 }finally{await cluster.close();}
});
