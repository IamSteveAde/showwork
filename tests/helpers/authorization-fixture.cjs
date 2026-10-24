'use strict';
const fs=require('node:fs');
const {load}=require('./load-typescript.cjs');
const {createPublishingValidationAdapters}=load('lib/publishing/validationAdapters.ts');
const {accountAuthorizationHash}=load('lib/publishing/eligibilityPolicy.ts');
const {createCanonicalPublishingStore}=load('lib/publishing/canonicalStore.ts');
const {createPublishingTransactionDatabase}=load('lib/publishing/transactionDatabase.ts');
const {createPublishingOwnership}=load('lib/publishing/ownership.ts');
const {createExternalPublicationAuthorization}=load('lib/publishing/externalAuthorization.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
exports.authorizationFixture=async function(pool,schema,run){
 await pool.query(`CREATE SCHEMA ${schema}`);
 async function q(sql,args){const c=await pool.connect();try{await c.query(`SET search_path TO ${schema}`);return await c.query(sql,args);}finally{c.release();}}
  await q(`CREATE TYPE "SocialPlatform" AS ENUM('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X');
   CREATE TABLE "Creator"(id text PRIMARY KEY,"isDeactivated" boolean NOT NULL DEFAULT false,"contentWorkspacePlan" text DEFAULT 'CREATOR',"contentWorkspaceBillingStatus" text DEFAULT 'ACTIVE',"contentWorkspaceTrialEndsAt" timestamptz,"isComped" boolean DEFAULT false,"compedUntil" timestamptz,"workspaceCompedPlan" text,"workspaceCompedUntil" timestamptz,"billingComplimentaryGrants" jsonb);
   CREATE TABLE "SocialCalendar"(id text PRIMARY KEY,"autoPublishEnabled" boolean NOT NULL DEFAULT true,"managerId" text NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now());
   CREATE TABLE "CalendarCollaborator"(id text PRIMARY KEY,"calendarId" text NOT NULL,"creatorId" text NOT NULL,role text NOT NULL,permissions text[] NOT NULL DEFAULT '{}',"customPermissions" boolean NOT NULL DEFAULT false,UNIQUE("calendarId","creatorId"));
   CREATE TABLE "CalendarPost"(id text PRIMARY KEY,"calendarId" text NOT NULL,platform "SocialPlatform" NOT NULL,caption text,cta text,hashtags text,"taggedAccounts" text,"linkUrl" text,"postType" text,"approvalStatus" text DEFAULT 'APPROVED',"isAiDraft" boolean DEFAULT false,"instagramPublishStatus" text DEFAULT 'NOT_SCHEDULED',"tikTokPublishStatus" text DEFAULT 'NOT_SCHEDULED',"publishStatus" text DEFAULT 'SCHEDULED',"tikTokSettings" jsonb,"tikTokConsentAccountId" text,"tikTokConsentAt" timestamptz,"tikTokConsentBy" text,"tikTokConsentVersion" text,"tikTokConsentHash" text,"updatedAt" timestamptz DEFAULT now());
   CREATE TABLE "CalendarPostAsset"(id text PRIMARY KEY,"postId" text NOT NULL,"fileKey" text NOT NULL,"mediaType" text NOT NULL,"displayOrder" integer NOT NULL);
   CREATE TABLE "SocialConnection"(id text PRIMARY KEY,"calendarId" text NOT NULL,platform "SocialPlatform" NOT NULL,"platformAccountId" text NOT NULL,status text DEFAULT 'CONNECTED',"accessToken" text DEFAULT 'synthetic-token',"accessTokenExpiresAt" timestamptz DEFAULT now()+interval '1 hour',"tokenScopes" text NOT NULL);
   INSERT INTO "Creator"(id) VALUES('owner'),('collab'),('outsider'),('newowner');
   INSERT INTO "SocialCalendar"(id,"managerId") VALUES('calendar','owner');
   INSERT INTO "CalendarCollaborator"(id,"calendarId","creatorId",role) VALUES('member','calendar','collab','SOCIAL_MEDIA_MANAGER');
   INSERT INTO "CalendarPost"(id,"calendarId",platform,caption) VALUES('post','calendar','X','approved synthetic caption');
   INSERT INTO "SocialConnection"(id,"calendarId",platform,"platformAccountId","tokenScopes") VALUES('connection','calendar','X','provider-one','tweet.write')`);
 for(const file of ['schema','ownership-schema','intent-actions-schema','canonical-schema','eligibility-schema','authorization-schema'])await q(fs.readFileSync(`scripts/publishing-reliability/${file}.sql`,'utf8'));
 let loss=null,failBeforeCommit=false,proofAllowed=false,lastDatabaseError=null;
 const port={connect:async()=>{
  const c=await pool.connect();return {release:b=>c.release(b),query:async(sql,args)=>{
   if(sql==='COMMIT'&&failBeforeCommit){failBeforeCommit=false;throw Error('synthetic commit refusal');}
   if(sql==='COMMIT'&&loss){
    const table=loss==='authorize'?'PublishingAuthorizationOperation':loss==='prepare'?'PublishingCanonicalOperation':loss==='action'?'PublishingAction':loss==='provider'?'PublishingProviderInvocation':'PublishingCapabilityEvent';
    const rows=(await c.query(`SELECT * FROM "${table}" WHERE xmin=pg_current_xact_id()::xid${loss==='prepare'?" AND action='prepare'":''}`)).rows;
    if(rows.length){const operationColumn=loss==='provider'?'authorizationId':'operationId';const op=rows[0][operationColumn];loss=null;c.on('error',()=>{});c.connection.stream.pause();const pending=c.query('COMMIT').catch(()=>{});
     try{for(let i=0;;i++){if((await q(`SELECT 1 FROM "${table}" WHERE "${operationColumn}"=$1`,[op])).rows.length)break;if(i>150)throw Error('COMMIT_NOT_VISIBLE');await delay(10);}}
     finally{c.connection.stream.destroy();await pending;}throw Error('real lost COMMIT acknowledgement');
    }
   }
   try{return await c.query(sql,args);}catch(e){lastDatabaseError={code:e.code,message:e.message};throw e;}
  }};
 }};
 const db=createPublishingTransactionDatabase(port,{schema});
 const owner=createPublishingOwnership(db);await owner.transition({operationId:'activate',actor:'operator',expectedEpoch:0n,to:'NETLIFY',activate:true});
 const validation=createPublishingValidationAdapters({database:db,verifyViewer:async()=>{throw Error('unused viewer');},verifyRetryEvidence:async(_tx,input)=>{
  if(!proofAllowed||input.actor!=='owner'||input.evidenceReference!=='synthetic-verified-stopped')throw Error('UNTRUSTED_RETRY_PROOF');return {kind:'NOT_SENT',actorStopped:true,verified:true,retryable:true};
 }});
 const actions=validation.intentActions(async()=>{}),store=validation.canonicalStore(),accountStore=createCanonicalPublishingStore({database:db,lockAndValidate:async()=>{}});
 const connection=(await q(`SELECT * FROM "SocialConnection"`)).rows[0];
 const accountInput={operationId:'account',actor:'operator',bindingId:'account',calendarId:'calendar',platform:'X',expectedVersion:0,providerAccountId:'provider-one',connectionId:'connection',authorizationHash:accountAuthorizationHash(connection),state:'CONNECTED'};
 await accountStore.changeAccount(accountInput);
 const request=(operationId='schedule',expectedRevision=0,extra={})=>({operationId,actor:'owner',intentId:'intent',postId:'post',platform:'X',expectedRevision,dueAt:new Date(0),destination:{accountBindingId:'account',accountVersion:1},...extra});
 const operation=(jobId,operationId)=>({jobId,operationId,actor:'worker',owner:'NETLIFY',epoch:1n});
 const service=()=>createExternalPublicationAuthorization({database:db,validation});
 async function prepare(){const s=await actions.schedule(request());await store.admit(operation(s.jobId,'admit'));const claim=await store.prepare(operation(s.jobId,'prepare'));return {...s,claim};}
 async function input(jobId,operationId='authorize'){const j=await store.findJob(jobId);return {operationId,actor:'worker',owner:'NETLIFY',epoch:1n,workerToken:j.workerToken,jobId:j.id,intentId:j.intentId,revision:j.revision,generation:j.generation,platform:j.platform,accountBindingId:j.accountBindingId,accountVersion:j.accountVersion,providerAccountId:j.providerAccountId,connectionId:j.connectionId,contentHash:j.contentHash};}
 await run({pool,q,db,validation,owner,actions,store,accountStore,accountInput,request,operation,prepare,input,service,
  lastDatabaseError:()=>lastDatabaseError,lose:kind=>{loss=kind;},fail:()=>{failBeforeCommit=true;},allowProof:()=>{proofAllowed=true;}});
};
