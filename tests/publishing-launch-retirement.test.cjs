'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load}=require('./helpers/load-typescript.cjs');
test('canonical profile retires old runtime construction before database or provider calls',()=>{
 const cache=new Map(),boundary=load('lib/publishing/applicationBoundary.ts',{},cache),remove=boundary.installDisabledPublishingApplication({host:'NEXT',publishingEnabled:false,invoke:async()=>{throw Error('no request');}});
 try{
  for(const [file,name,args] of [['lib/publishing/reliableStore.ts','createReliablePublishingStore',[{}]],['lib/publishing/reliableWorker.ts','createReliableWorker',[{},async()=>{throw Error('must not send');}]],['lib/publishing/portableRuntime.ts','createPortablePublishingRuntime',[{}]],['lib/publishing/runtime.ts','createPublishingRuntime',[{}]]])assert.throws(()=>load(file,{},cache)[name](...args),/LEGACY_FACTORY_RETIRED/,file);
 }finally{remove();}
});
test('reviewed source callers do not construct obsolete factories or call reporting publication properties',()=>{
 const report=JSON.parse(fs.readFileSync('docs/publishing-launch-critical-coverage.json'));
 assert.equal(report.reviewedIncomplete.length,99);assert.equal(new Set(report.reviewedIncomplete.map(r=>r.entrypoint)).size,99);
 assert.deepEqual(report.legacyFactories,[]);assert.deepEqual(report.publicationPropertyCalls,[]);
 assert.equal(report.reviewedIncomplete.filter(r=>r.category==='obsolete legacy publishing implementation').length,50);
});
test('reporting adapters expose no publication function in canonical composition',()=>{
 const cache=new Map(),boundary=load('lib/publishing/applicationBoundary.ts',{},cache);let calls=0;
 const mocks={'@/lib/instagramPublishing':{publishPostToInstagram:async()=>{calls++;}},'@/lib/tiktokPublishing':{publishPostToTikTok:async()=>{calls++;}}};
 for(const platform of ['instagram','tiktok','facebook','x','linkedin'])mocks['@/lib/reporting/adapters/'+platform]={[platform+'ReportingAdapter']:{platform}};
 const registry=load('lib/reporting/adapters/index.ts',mocks,cache),remove=boundary.installDisabledPublishingApplication({host:'NEXT',publishingEnabled:false,invoke:async()=>{throw Error('no request');}});
 try{for(const platform of ['INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X'])assert.equal('publishPost' in registry.getSocialPlatformAdapter(platform),false);assert.equal(calls,0);}finally{remove();}
});
test('VPS artifact contains canonical execution and no obsolete publishing implementation',()=>{
 const graph=JSON.parse(fs.readFileSync('dist-worker/metafile.json'));
 const old=new Set(JSON.parse(fs.readFileSync('docs/publishing-launch-critical-coverage.json')).reviewedIncomplete.filter(r=>r.category==='obsolete legacy publishing implementation').map(r=>r.file));
 const inputs=Object.keys(graph.inputs);assert.ok(inputs.some(file=>file.endsWith('lib/publishing/canonicalWorker.ts')));for(const file of inputs)assert.equal(old.has(file),false,file);
});
test('intended Netlify release omits publishing functions and HTTP cron exports are retired',async()=>{
 const config=fs.readFileSync('netlify.toml','utf8');assert.equal(config.includes('directory = "netlify/functions'), false);assert.equal(config.includes('[functions."social-publish-cron"]'),false);assert.equal(config.includes('[functions."publish-post-background"]'),false);
 for(const platform of ['social','instagram','tiktok']){
  const handler=load('app/api/cron/'+platform+'-publish/route.ts',{'next/server':{NextResponse:Response}});const response=await handler.POST();assert.equal(response.status,410);assert.equal((await response.json()).code,'PUBLISHING_HOST_RETIRED');
 }
 const boundary=load('lib/publishing/applicationBoundary.ts'),old=process.env.SHOWWORK_PUBLISHING_PROTOCOL;try{process.env.SHOWWORK_PUBLISHING_PROTOCOL='canonical';assert.throws(()=>boundary.publishingIntegrationInstalled(),/BOOTSTRAP_REQUIRED/);}finally{if(old===undefined)delete process.env.SHOWWORK_PUBLISHING_PROTOCOL;else process.env.SHOWWORK_PUBLISHING_PROTOCOL=old;}
});
test('reachable storage cron retires the old age sweep without listing or deleting recovery media',async()=>{
 const cache=new Map(),boundary=load('lib/publishing/applicationBoundary.ts',{},cache);let requests=0;
 const sdk=new Proxy({S3Client:class {async send(){requests++;throw Error('must not access storage');}}},{get:(target,key)=>target[key]??class {}});
 const r2=load('lib/r2.ts',{'@aws-sdk/client-s3':sdk,'@aws-sdk/s3-request-presigner':{}},cache),remove=boundary.installDisabledPublishingApplication({host:'NEXT',publishingEnabled:false,invoke:async()=>{throw Error('no invocation');}});
 try{assert.ok(fs.readFileSync('app/api/cron/content-workspace-storage/route.ts','utf8').includes('await cleanupTikTokPreparedFiles()'));assert.deepEqual(await r2.cleanupTikTokPreparedFiles(),{deleted:0,retired:true});assert.equal(requests,0);}finally{remove();}
});

test('native billing page scope permits reads and rejects unjournaled mutation',async()=>{
 const {readOnlyApplicationDatabase:create}=load('lib/publishing/nativeApplicationContext.ts');let writes=0;const database=create({creator:{findUnique:async()=>({id:'owner'}),update:async()=>{writes++;}},$transaction:async()=>{writes++;}});assert.equal((await database.creator.findUnique()).id,'owner');await assert.rejects(database.creator.update(),/READ_ONLY_APPLICATION/);await assert.rejects(database.$transaction(),/READ_ONLY_APPLICATION/);assert.equal(writes,0);
});

test('standalone Netlify storage cleanup cannot delete retained TikTok media without an application profile',async()=>{
 let requests=0;const sdk=new Proxy({S3Client:class {async send(){requests++;throw Error('must not access storage');}}},{get:(target,key)=>target[key]??class {}});const r2=load('lib/r2.ts',{'@aws-sdk/client-s3':sdk,'@aws-sdk/s3-request-presigner':{}},new Map());assert.deepEqual(await r2.cleanupTikTokPreparedFiles(),{deleted:0,retired:true});assert.equal(requests,0);
});
