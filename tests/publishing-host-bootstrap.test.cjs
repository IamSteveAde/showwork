'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {load}=require('./helpers/load-typescript.cjs');
test('default configuration and executable cannot connect or publish',()=>{
 const {publishingHostConfiguration}=load('lib/publishing/hostConfiguration.ts');assert.deepEqual(publishingHostConfiguration({}),{enabled:false,application:false});assert.throws(()=>publishingHostConfiguration({SHOWWORK_PUBLISHING_ENABLED:'yes'}),/INVALID/);
 for(const argument of ['--check','--run']){const r=spawnSync(process.execPath,['dist-worker-native/run.cjs',argument],{env:{PATH:process.env.PATH},encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{state:'disabled',publishingEnabled:false,databaseConnected:false,maySend:false});}
});
test('enabling without complete dependencies fails before IO and does not echo secrets',()=>{
 const r=spawnSync(process.execPath,['dist-worker-native/run.cjs','--run'],{env:{PATH:process.env.PATH,SHOWWORK_PUBLISHING_ENABLED:'true',PUBLISHING_DATABASE_URL:'secret-that-must-not-appear'},encoding:'utf8'});assert.equal(r.status,78);assert.doesNotMatch(r.stderr,/secret-that/);
});
test('instrumentation installs only explicit canonical application configuration',async()=>{
 const saved={...process.env};let installed=0;try{
  process.env.NEXT_RUNTIME='nodejs';delete process.env.SHOWWORK_CANONICAL_APPLICATION_ENABLED;const hook=load('instrumentation.ts');await hook.register();assert.equal(installed,0);
 }finally{process.env=saved;}
});
test('independently compiled handler bundles share installation and native policy scope',async()=>{
 const first=load('lib/publishing/applicationBoundary.ts',{},new Map()),second=load('lib/publishing/applicationBoundary.ts',{},new Map());
 const remove=first.installDisabledPublishingApplication({host:'NEXT',publishingEnabled:false,invoke:async()=>({ok:true})});try{assert.equal(second.publishingIntegrationInstalled(),true);assert.deepEqual(await second.invokePublishingEntrypoint('synthetic-handler',[]),{ok:true});await first.runNativePublishingPolicy('app/api/calendars/subscribe/route.ts#POST@46',async()=>assert.equal(second.nativePolicyExecutionAllowed('app/api/calendars/subscribe/route.ts#POST@46'),true));}finally{remove();}
 const a=load('lib/publishing/nativeApplicationContext.ts',{},new Map()),b=load('lib/publishing/nativeApplicationContext.ts',{},new Map()),context={database:{},billingFetch:async()=>Response.json({})};await a.withNativeApplicationContext(context,async()=>assert.equal(b.nativeApplicationContext(),context));
});
