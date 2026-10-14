'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {load}=require('./helpers/load-typescript.cjs');
test('native status normalization binds exact references',()=>{
 const {normalizeProviderLookup:n}=load('lib/publishing/providerNormalization.ts');
 assert.equal(n('TT_STATUS','operation',{status:200,body:{data:{status:'PUBLISH_COMPLETE'}}}).body.status,'PUBLISH_COMPLETE');
 assert.equal(n('FB_VIDEO_STATUS','video',{status:200,body:{status:{video_status:'ready',publishing_phase:{status:'complete'}}}}).body.publishing_status,'complete');
 assert.equal(n('X_TWEET_GET','expected',{status:200,body:{data:{id:'other'}}}).body.verified,false);
 assert.equal(n('LI_POST_GET','urn:li:share:1',{status:200,body:{id:'urn:li:share:1',lifecycleState:'PUBLISHED'}}).body.verified,true);
 assert.equal(n('IG_PERMALINK','1',{status:200,body:{id:'1',permalink:'https://instagram.com/p/synthetic'}}).body.verified,true);
});
test('filesystem journal has atomic concurrent append and durable reopen',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'showwork-final-journal-'));
 try {const {createFilesystemJournalStorage:create}=load('lib/publishing/filesystemJournal.ts');const key='publishing/auth/'+ 'a'.repeat(64),store=create(directory);
  await Promise.all(Array.from({length:8},()=>store.putIfAbsent(key,'evidence')));assert.equal(await create(directory).read(key),'evidence');assert.deepEqual(await store.list('publishing/auth/'),[key]);
  await assert.rejects(store.putIfAbsent(key,'different'),/CONFLICT/);await assert.rejects(store.read('publishing/../../etc/passwd'),/INVALID/);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('disabled deployment validation cannot authorize enablement',()=>{
 const {validateDisabledPublishingDeployment:validate,inspectPublishingDeployment:inspect}=load('lib/publishing/deploymentReadiness.ts');
 const config={version:1,publishingEnabled:false,owner:'VPS',protocol:'CANONICAL',schema:'publishing',databasePoolSize:3,workerConcurrency:2,journal:'shared-object-storage',media:'versioned-object-storage',metaVersion:'v26.0',linkedinVersion:'202609',reconciliationIntervalMs:5000};
 assert.equal(validate(config).publishingEnabled,false);assert.throws(()=>validate({...config,publishingEnabled:true}));assert.throws(()=>validate({...config,workerConcurrency:4}));
 assert.deepEqual(inspect(config,[{entrypoint:'unported',implemented:false}]).blockers,['unported']);
});
test('native media upload never calls post creation and rejects stale account credentials',async()=>{
 const {createNativeMediaPreparation:create}=load('lib/publishing/nativeMediaPreparation.ts'),target={platform:'X',providerAccountId:'account',connectionId:'connection',accountBindingId:'binding',accountVersion:1};let calls=[];
 const deps={credential:async()=>({token:'synthetic',connectionId:'connection',providerAccountId:'account',accountBindingId:'binding',accountVersion:1}),readMedia:async()=>({bytes:Buffer.from('image'),type:'image/png'}),sleep:async()=>{},metaVersion:'v26.0',linkedinVersion:'202609',fetch:async(url,init)=>{calls.push([url,init.method]);return Response.json(url.endsWith('initialize')?{data:{id:'123'}}:{});}};
 assert.equal((await create(deps)(target,'X_MEDIA',{media:'pinned',mediaType:'PHOTO'})).body.id,'123');assert.equal(calls.length,3);assert.ok(calls.every(([url])=>url.includes('/media/upload')));
 calls=[];await assert.rejects(create({...deps,credential:async()=>({...await deps.credential(),accountVersion:2})})(target,'X_MEDIA',{media:'pinned'}),/BINDING/);assert.equal(calls.length,0);
 await assert.rejects(create(deps)(target,'LI_MEDIA',{media:'pinned'}),/MISMATCH/);
});
test('LinkedIn preparation rejects foreign upload hosts and validates image uploads',async()=>{
 const {createNativeMediaPreparation:create}=load('lib/publishing/nativeMediaPreparation.ts');
 const target={platform:'LINKEDIN',providerAccountId:'account',connectionId:'connection',accountBindingId:'binding',accountVersion:1};let host='https://media-upload.linkedin.com/synthetic',calls=[];
 const deps={credential:async()=>({token:'synthetic',...target}),readMedia:async()=>({bytes:Buffer.from('image'),type:'image/png'}),sleep:async()=>{},metaVersion:'v26.0',linkedinVersion:'202609',fetch:async(url,init)=>{calls.push([url,init.method]);return Response.json(url.includes('initializeUpload')?{value:{image:'urn:li:image:1',uploadUrl:host}}:{});}};
 assert.equal((await create(deps)(target,'LI_MEDIA',{media:'pinned',mediaType:'PHOTO'})).body.id,'urn:li:image:1');assert.equal(calls[1][1],'PUT');assert.ok(calls.every(([url])=>!url.includes('/rest/posts')));
 host='https://attacker.invalid/upload';calls=[];await assert.rejects(create(deps)(target,'LI_MEDIA',{media:'pinned',mediaType:'PHOTO'}),/HOST_DENIED/);assert.equal(calls.length,1);
});
test('object journal and immutable media require conditional writes and verified bytes',async()=>{
 const {createPublishingObjectStorage:create}=load('lib/publishing/objectStorageAdapters.ts');const {createHash}=require('node:crypto');const objects=new Map(),calls=[];
 const bytes=Buffer.from('synthetic-photo'),digest=createHash('sha256').update(bytes).digest('hex');objects.set('uploads/source.png',{bytes,version:'version-one'});
 const client={send:async command=>{
  const input=command.input;calls.push([command.constructor.name,input]);
  if(command.constructor.name==='GetObjectCommand'){const row=objects.get(input.Key);if(!row)throw Error('MISSING_OBJECT');return {Body:(async function*(){yield row.bytes;})(),ContentLength:row.bytes.length,VersionId:row.version,ContentType:'image/png'};}
  if(command.constructor.name==='PutObjectCommand'){assert.equal(input.IfNoneMatch,'*');if(objects.has(input.Key))throw {$metadata:{httpStatusCode:412}};objects.set(input.Key,{bytes:Buffer.from(input.Body),version:'copy-version'});return {};}
  if(command.constructor.name==='ListObjectsV2Command')return {Contents:[...objects.keys()].filter(key=>key.startsWith(input.Prefix)).map(Key=>({Key}))};
  throw Error('UNEXPECTED_COMMAND');
 }};
 const storage=create({client,bucket:'synthetic',prefix:'publishing/test/'}),key='publishing/auth/'+ 'a'.repeat(64);
 await storage.journal.putIfAbsent(key,'evidence');await storage.journal.putIfAbsent(key,'evidence');assert.equal(await storage.journal.read(key),'evidence');await assert.rejects(storage.journal.putIfAbsent(key,'conflict'),/CONFLICT/);
 const input={jobId:'job',assetId:'asset',sourceKey:'uploads/source.png',objectVersion:'version-one',contentSha256:digest};assert.equal((await storage.materialize(input)).blobKey,'publishing/job/asset/'+digest);
 assert.ok(calls.some(([name,input])=>name==='GetObjectCommand'&&input.Key==='uploads/source.png'&&input.VersionId==='version-one'));
 await assert.rejects(storage.materialize({...input,contentSha256:'b'.repeat(64)}),/SOURCE_CHANGED/);await assert.rejects(storage.materialize({...input,objectVersion:'stale'}),/SOURCE_CHANGED/);
});
test('Meta raw callback authentication precedes parsing or database access',async()=>{
 const {createMetaPublishingCallbacks:create}=load('lib/publishing/authenticatedCallbacks.ts');let parsed=0,queries=0;
 const handler=create({secret:Buffer.alloc(32,1),database:{transaction:async()=>{queries++;throw Error('unexpected');}},providers:{observe:async()=>{}},normalize:()=>{parsed++;return [];}}),body=Buffer.from('{}');
 await assert.rejects(handler('FACEBOOK',body,'sha256='+'0'.repeat(64)),/AUTHENTICATION/);assert.equal(parsed,0);assert.equal(queries,0);
 const signature=require('node:crypto').createHmac('sha256',Buffer.alloc(32,1)).update(body).digest('hex');assert.equal((await handler('FACEBOOK',body,'sha256='+signature)).maySend,false);assert.equal(parsed,1);assert.equal(queries,0);
});
test('original cleanup is conditional and multipart completion uses server part evidence',async()=>{
 const {createPublishingObjectStorage:create}=load('lib/publishing/objectStorageAdapters.ts'),calls=[];
 const client={send:async(command,options)=>{assert.ok(options.abortSignal);calls.push(command);if(command.constructor.name==='HeadObjectCommand')return {ETag:'"synthetic-etag"'};if(command.constructor.name==='ListPartsCommand')return {Parts:[{PartNumber:1,ETag:'"server-part"'}]};return {};}};
 const storage=create({client,bucket:'synthetic',prefix:'publishing/test/'});assert.equal(await storage.originalVersion('uploads/original'),'etag:"synthetic-etag"');await storage.deleteOriginalVersion('uploads/original','etag:"synthetic-etag"');assert.equal(calls.at(-1).input.IfMatch,'"synthetic-etag"');
 await assert.rejects(storage.deleteOriginalVersion('publishing/job/evidence','etag:"synthetic-etag"'),/IMMUTABLE_STORAGE/);await assert.rejects(storage.deleteOriginalVersion('uploads/original','etag:weak'),/STRONG_OBJECT/);
 await storage.completeOriginalMultipart('uploads/original','upload',[{PartNumber:1,ETag:'browser-untrusted'}]);assert.deepEqual(calls.at(-1).input.MultipartUpload.Parts,[{PartNumber:1,ETag:'"server-part"'}]);await assert.rejects(storage.completeOriginalMultipart('uploads/original','upload',[{PartNumber:2,ETag:'bad'}]),/INVALID_MULTIPART/);
});
