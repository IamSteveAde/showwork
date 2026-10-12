'use strict';
const {load}=require('./load-typescript.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
exports.compose=function(store,apis,options={}){
 const rawDenied=new Proxy({}, {get(){throw Error('Unbudgeted default database access');}}),mocks={'@/lib/db':{db:rawDenied},'@/lib/r2':apis.storage},cache=new Map();
 const {createBudgetedPublishingDatabase}=load('lib/publishing/budgetedDatabase.ts',mocks,cache),{createPlatformIntegration}=load('lib/publishing/platformIntegration.ts',mocks,cache),{createReliableWorker}=load('lib/publishing/reliableWorker.ts',mocks,cache),{withPublishingExecution}=load('lib/publishing/executionContext.ts',mocks,cache);
 const port=createBudgetedPublishingDatabase(store),native=createPlatformIntegration(port,{performance:!!options.performance,readAuthorization:options.performance?store.readLiveAuthorization:undefined,reserveRate:options.performance?async(account,kind)=>{const wait=await store.reserveTikTokRate(account,kind);options.onPacing?.({account,kind,waitMs:wait});if(wait)await sleep(wait);}:undefined,journal:async(job,reference,proof)=>{
   try { const rows=proof?await store.unknown(job,job.workerToken,reference,proof):await store.accept(job,job.workerToken,reference); if(rows?.length===1){await options.onJournal?.(job,reference,proof);return;} }catch{}
   const saved=await store.findJob(job.id);if(saved?.workerToken===job.workerToken&&saved.remoteId===reference&&(proof?saved.confirmation?.reference===reference:saved.phase==='PROVIDER_PENDING')){await options.onJournal?.(job,reference,proof);return;}throw Object.assign(Error('Publication journal not acknowledged'),{code:'P1017'});
  },verifyPublication:options.verify??((job,account)=>store.assertPublication(job,account,undefined,!!options.performance)),beginPublication:async(job,account,init)=>{
  for(let retry=0;retry<20;retry++){try{return (await store.beginExternal(job,job.workerToken,undefined,account,init)).length===1;}catch(e){if(e.code==='PUBLISHING_DEFERRED'){await sleep(1000);continue;}const saved=await store.findJob(job.id).catch(()=>null);if(saved?.phase==='EXTERNAL_PENDING'&&saved.workerToken===job.workerToken)return true;throw e;}}throw Object.assign(Error('Database capacity unavailable before publishing'),{code:'PUBLISHING_DEFERRED'});
 }});
 const worker=createReliableWorker(store,(job,signal)=>apis.run(job.postId,()=>native.publish(job,signal)),{concurrency:options.performance?8:4,accountAware:!!options.performance,preflightMany:options.performance?native.preflightMany:undefined,lateBoundary:true,preflight:(job,signal)=>apis.run(job.postId,()=>withPublishingExecution({signal,postId:job.postId},()=>native.preflight(job))),afterJob:native.forget,knownProof:native.knownProof,knownReference:native.knownReference,abortOutcome:native.abortOutcome,...options.worker});
 const reconcile=job=>apis.run(job.postId,()=>withPublishingExecution({signal:AbortSignal.timeout(60000),postId:job.postId},()=>native.reconcile(job)));
 const repairReporting=job=>apis.run(job.postId,()=>native.repairReporting(job));
 return {port,native,worker,reconcile,prepareReconciliation:options.performance?native.prepareReconciliation:undefined,repairReporting,mocks,cache,close(){native.close();}};
};
