'use strict';
const fs=require('node:fs'),path=require('node:path'),{load}=require('./load-typescript.cjs'),{authorizationFixture}=require('./authorization-fixture.cjs'),{mock}=require('./provider-mocks.cjs');
const {createSyntheticProviderSpool}=load('lib/publishing/providerSpool.ts');
const {createInactiveCanonicalWorker}=load('lib/publishing/canonicalWorker.ts');
const {canonicalPublicationTarget}=load('lib/publishing/canonicalWorkerStore.ts');
exports.workerFixture=async(cluster,n,run)=>authorizationFixture(cluster.pool,'worker_'+n,async h=>{
 await h.q(fs.readFileSync('scripts/publishing-reliability/provider-schema.sql','utf8'));
 const s=await h.actions.schedule(h.request()),target=canonicalPublicationTarget(await h.store.findJob(s.jobId));
 const io=mock(),spoolDirectory=path.join(cluster.socketDirectory,'worker-spool-'+n),spool=await createSyntheticProviderSpool(spoolDirectory);
 let failJournal=false,afterAuthorization=null;
 const database={transaction:async fn=>{const result=await h.db.transaction(tx=>fn({query:(sql,args)=>{if(failJournal&&(/INSERT INTO "PublishingProviderJournal"/.test(sql)||/PublishingAuthorizationOutcome/.test(sql)))throw Error('synthetic journal persistence failure');return tx.query(sql,args);}}));if(result?.authorizationId&&result?.secret&&afterAuthorization)await afterAuthorization(result);return result;}};
 const validation=load('lib/publishing/validationAdapters.ts').createPublishingValidationAdapters({database,verifyViewer:async()=>{throw Error('unused');},verifyRetryEvidence:async()=>{throw Error('unused');}});
 const workers=[];
 const build=(extra={})=>{const w=createInactiveCanonicalWorker({environment:'isolated-mock',database,validation,io,spool,actor:'worker',owner:'NETLIFY',epoch:1n,jobTimeoutMs:3000,shutdownGraceMs:0,preparedLeaseMs:500,...extra});workers.push(w);return w;};
 try{await run({...h,s,target,io,spool,spoolDirectory,database,validation,build,failJournal:v=>{failJournal=v;},afterAuthorization:fn=>{afterAuthorization=fn;}});}
 finally{await Promise.all(workers.map(w=>w.close()));}
});
