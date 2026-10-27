const {test,afterEach}=require('node:test');const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const json=body=>new Request('http://localhost/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const body={projectId:'p',fileKey:'projects/p/original.mp4',type:'VIDEO'};
function harness({multipart=false,failRegister=false,foreign=false,expired=false}={}) {
 let objectExists=!multipart,completions=0,creates=0,record=null;
 const session={id:'session',projectId:'p',creatorId:'owner',fileKey:body.fileKey,uploadId:multipart?'upload':null,expectedBytes:10n,contentType:'video/mp4',expiresAt:new Date(expired?0:Date.now()+60000),state:'OPEN'};
 const db={project:{findUnique:async()=>({id:'p',creatorId:'owner'})},deliveryUploadSession:{findUnique:async()=>foreign?{...session,projectId:'another'}:session,update:async({data})=>Object.assign(session,data)},media:{findUnique:async()=>record,upsert:async({create})=>{if(failRegister){failRegister=false;throw Error('SIMULATED_DATABASE_FAILURE');}if(!record){creates++;record={id:'media',...create};}return record;}}};
 db.$transaction=async fn=>fn(db);
 const mocks={'@/lib/db':{db},'@/lib/auth':{getCurrentCreator:async()=>({id:'owner'})},'@/lib/r2':{getObjectSize:async()=>{if(!objectExists)throw Error('NOT_FOUND');return 10;},completeMultipartUpload:async()=>{assert.equal(objectExists,false);completions++;objectExists=true;}}};
 const handler=load(multipart?'app/api/upload/multipart/complete/route.ts':'app/api/upload/complete/route.ts',mocks);
 return {handler,db,session,get creates(){return creates;},get completions(){return completions;}};
}
test('completion rejects foreign namespaces, foreign sessions and expired sessions',async()=>{
 for(const [settings,key] of [[{},'projects/another/file.mp4'],[{foreign:true},body.fileKey],[{expired:true},body.fileKey]]){
  const h=harness(settings);assert.equal((await h.handler.POST(json({...body,fileKey:key}))).status,409);assert.equal(h.creates,0);
 }
});
test('single PUT registration is idempotent and records verified storage size',async()=>{
 const h=harness();for(let i=0;i<2;i++){const r=await h.handler.POST(json(body));assert.equal(r.status,200);assert.equal((await r.json()).media.sizeBytes,10);}
 assert.equal(h.creates,1);assert.equal(h.session.state,'COMPLETE');
});
test('multipart recovers completed storage after DB registration failure without repeating storage completion',async()=>{
 const h=harness({multipart:true,failRegister:true});const input={...body,uploadId:'upload',parts:[{partNumber:1,etag:'x'}]};
 await assert.rejects(h.handler.POST(json(input)),/DATABASE_FAILURE/);
 const response=await h.handler.POST(json(input));assert.equal(response.status,200);assert.equal(h.completions,1);assert.equal(h.creates,1);
});
test('key and size validators reject traversal, mismatched tasks and invalid declared sizes',()=>{
 const f=load('lib/deliveryUploads.ts',{'@/lib/db':{db:{}},'@/lib/r2':{}});
 assert.equal(f.validDeliveryKey('projects/p/../q/file','p'),false);assert.equal(f.validDeliveryKey('projects/pp/file','p'),false);
 assert.equal(f.validTaskKey('managed-projects/a/tasks/t/file','a','other'),false);
 for(const value of [undefined,-1,0,Infinity,NaN,20001])assert.throws(()=>f.expectedUploadBytes(value,20000));
 assert.equal(f.expectedUploadBytes(10/1024/1024,20000),10n);
});
test('locked delivery contains no original URLs, reviewer data, or private metadata image',async()=>{
 const row={id:'m',type:'PHOTO',fileKey:'projects/p/private.jpg',caption:'Private',approvalStatus:'PENDING',approvalNote:null,reviews:[{reviewerEmail:'private@example.invalid',createdAt:new Date()}]};
 const page=load('app/[slug]/page.tsx',{
  '@/lib/db':{db:{project:{findUnique:async()=>({id:'p',clientName:'Client',creator:{name:'Owner'},media:[row],sections:[{id:'s',media:[row],folders:[]}],managedProject:null}),update:async()=>{}}}},
  '@/lib/r2':{publicUrlFor:key=>'https://media.invalid/'+key},'@/lib/auth':{getCurrentCreator:async()=>null,verifyViewerToken:()=>null},'@/lib/admin':{isAdminEmail:()=>false},'@/lib/complimentaryAccess':{complimentaryAccessSelect:{},hasDeliveryPaidAccess:()=>false},'next/headers':{cookies:async()=>({get:()=>undefined})},'./DeliveryPage':{__esModule:true,default:()=>null},
 });
 const element=await page.default({params:Promise.resolve({slug:'client'})});
 assert.equal(element.props.initiallyUnlocked,false);assert.deepEqual(element.props.media,[]);assert.deepEqual(element.props.sections,[]);
 assert.equal(element.props.managedProject,null);assert.equal(JSON.stringify(element.props).includes('private.jpg'),false);
 const metadata=await page.generateMetadata({params:Promise.resolve({slug:'client'})});assert.equal(metadata.openGraph.images[0].url,'/images/shwk.jpg');
});
test('download authorization and payment checks precede signed-link issuance',async()=>{
 for(const [access,status,payment] of [[null,403,'PAID'],[{email:'viewer'},402,'DELIVERED'],[{email:'viewer'},200,'PAID']]){
  let signed=0;const route=load('app/api/download/route.ts',{
   '@/lib/db':{db:{media:{findUnique:async()=>({fileKey:'projects/p/f.mp4',project:{id:'p',deliveryStatus:payment}})}}},
   '@/lib/deliveryAccess':{deliveryAccess:async()=>access},'@/lib/r2':{getDeliveryDownloadUrl:async()=>{signed++;return 'https://signed.invalid/object';}},
  });
  const response=await route.GET({nextUrl:new URL('http://localhost/api/download?mediaId=m&ticket=1')});assert.equal(response.status,status);assert.equal(signed,status===200?1:0);
 }
});
test('signed viewer must belong to the project; deleted and unpublished deliveries remain inaccessible',async()=>{
 const access=load('lib/deliveryAccess.ts',{'@/lib/db':{db:{managedProject:{findUnique:async()=>null}}},'@/lib/auth':{getCurrentCreator:async()=>null,verifyViewerToken:(_token,id)=>id==='p'?{email:'v@example.invalid',name:'V'}:null},'@/lib/admin':{isAdminEmail:()=>false},'next/headers':{cookies:async()=>({get:()=>({value:'token'})})}});
 assert.equal(await access.deliveryAccess({id:'wrong',creatorId:'owner'}),null);assert.equal(await access.deliveryAccess({id:'p',creatorId:'owner',deletedAt:new Date()}),null);
 assert.equal((await access.deliveryAccess({id:'p',creatorId:'owner'})).email,'v@example.invalid');
});
test('global transfer budget and file queue stay bounded while processing every item',async()=>{
 let active=0,peak=0;const client=load('lib/deliveryUploadClient.ts',{'@/lib/uploadClient':{putFileWithProgress:async()=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return {etag:'x'};}},'@/lib/portfolioVideoPoster':{},'@/lib/detectLocalFileAspectRatio':{}});
 await Promise.all(Array.from({length:12},()=>client.putDeliveryPart('https://storage.invalid',new Blob(['x']),()=>{})));assert.equal(peak,3);
 const seen=[];let queued=0,max=0;await client.uploadQueue([1,2,3,4],async value=>{queued++;max=Math.max(max,queued);await new Promise(resolve=>setTimeout(resolve,5));seen.push(value);queued--;});assert.equal(max,2);assert.equal(seen.length,4);
});
test('streamed archive is a valid ZIP without loading originals into client JS',async()=>{
 const previous=global.fetch;try{
  global.fetch=async()=>new Response('tiny synthetic file');
  const route=load('app/api/download/archive/route.ts',{'@/lib/db':{db:{media:{findMany:async()=>[{id:'m',fileKey:'projects/p/test.txt',project:{id:'p',deliveryStatus:'PAID'}}]}}},'@/lib/deliveryAccess':{deliveryAccess:async()=>({email:'v'})},'@/lib/r2':{getObjectSize:async()=>19,getDeliveryDownloadUrl:async()=> 'https://signed.invalid/object'}});
  const response=await route.POST(json({items:[{mediaId:'m'}],zipFilename:'test.zip'}));assert.equal(response.status,200);
  const zip=await require('jszip').loadAsync(Buffer.from(await response.arrayBuffer()));assert.equal(await zip.file('1-test.txt').async('string'),'tiny synthetic file');
 }finally{global.fetch=previous;}
});
let PGlite;
try { ({PGlite}=require('@electric-sql/pglite')); } catch { try { ({PGlite}=require(process.env.PGLITE_MODULE || '/private/tmp/showwork-workflow-qa/node_modules/@electric-sql/pglite')); } catch {} }
test('additive migration preserves legacy rows and enforces one record per upload session',{skip:!PGlite && 'Install PGlite or set PGLITE_MODULE for disposable SQL validation'},async()=>{ 
 const database=new PGlite();
 try{
  await database.exec('CREATE TABLE "TaskAsset" ("id" TEXT PRIMARY KEY); CREATE TABLE "Media" ("id" TEXT PRIMARY KEY,"fileKey" TEXT); INSERT INTO "Media" VALUES (\'old-1\',\'same-legacy-key\'),(\'old-2\',\'same-legacy-key\');');
  await database.exec(require('node:fs').readFileSync('prisma/migrations/20261027150000_delivery_upload_reliability/migration.sql','utf8'));
  assert.equal((await database.query('SELECT count(*) AS count FROM "Media"')).rows[0].count,2);
  await database.exec('INSERT INTO "Media"("id","uploadSessionId") VALUES (\'new\',\'session\')');
  await assert.rejects(database.exec('INSERT INTO "Media"("id","uploadSessionId") VALUES (\'duplicate\',\'session\')'),/unique/i);
 }finally{await database.close();}
});
test('part signing batches a small window once for concurrent workers',async()=>{
 const previous=global.fetch;let calls=0;
 try{
  global.fetch=async(_url,options)=>{calls++;const data=JSON.parse(options.body);assert.deepEqual(data.partNumbers,[1,2,3]);return Response.json({uploadUrls:{1:'part-1',2:'part-2',3:'part-3'}});};
  const client=load('lib/deliveryUploadClient.ts',{'@/lib/uploadClient':{},'@/lib/portfolioVideoPoster':{},'@/lib/detectLocalFileAspectRatio':{}});
  const urls=await Promise.all([1,2,3].map(number=>client.deliveryPartUrl('p','projects/p/f','upload',number,10)));
  assert.deepEqual(urls,['part-1','part-2','part-3']);assert.equal(calls,1);
 }finally{global.fetch=previous;}
});
test('paused transfers abort in-flight requests and queued work drains before retry',async()=>{
 const client=load('lib/deliveryUploadClient.ts',{'@/lib/uploadClient':{putFileWithProgress:(_url,_body,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Paused','AbortError')),{once:true}))},'@/lib/portfolioVideoPoster':{},'@/lib/detectLocalFileAspectRatio':{}});
 const pending=Array.from({length:5},()=>client.putDeliveryPart('https://storage.invalid',new Blob(['x']),()=>{}));
 client.pauseDeliveryUploads();
 const results=await Promise.allSettled(pending);assert.ok(results.every(result=>result.status==='rejected'));
 assert.equal(client.deliveryRetryable(new DOMException('Paused','AbortError')),false);
 client.resumeDeliveryUploads();assert.equal(client.deliveryRetryable({status:503}),true);assert.equal(client.deliveryRetryable({status:403}),false);
});
test('single-file retry registers the same transferred object rather than uploading another original',async()=>{
 const previousFetch=global.fetch,previousStorage=global.localStorage;const stored=new Map();let puts=0,presigns=0,completions=0;
 global.localStorage={getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)};
 const client=load('lib/deliveryUploadClient.ts',{'@/lib/uploadClient':{putFileWithProgress:async()=>{puts++;return {}; }},'@/lib/portfolioVideoPoster':{},'@/lib/detectLocalFileAspectRatio':{detectLocalFileAspectRatio:async()=>null}});
 global.fetch=async(url)=>{if(url.endsWith('presign')){presigns++;return Response.json({uploadUrl:'https://storage.invalid',fileKey:'projects/p/once.jpg'});}completions++;return completions<=3?Response.json({error:'DB offline'},{status:503}):Response.json({media:{id:'m'}});};
 try{
  const input={file:new File(['x'],'image.jpg',{type:'image/jpeg',lastModified:1}),projectId:'p',type:'PHOTO',onProgress:()=>{}};
  await assert.rejects(client.uploadDeliverySingle(input),/transfer finished/);
  assert.equal((await client.uploadDeliverySingle(input)).id,'m');assert.equal(puts,1);assert.equal(presigns,1);assert.equal(completions,4);
 }finally{global.fetch=previousFetch;global.localStorage=previousStorage;}
});
test('managed-task completion stays internally pending, recovers once and does not duplicate assets or alerts',async()=>{
 let record=null,exists=false,storageCompletions=0,emails=0,fail=true;
 const session={id:'s',projectId:'managed',creatorId:'assignee',fileKey:'managed-projects/managed/tasks/task/file.mp4',purpose:'TASK',targetId:'task',uploadId:'upload',expectedBytes:10n,contentType:'video/mp4',state:'OPEN',expiresAt:new Date(Date.now()+60000)};
 const db={task:{findUnique:async()=>({id:'task',managedProjectId:'managed',assignedToCreatorId:'assignee',title:'Film',managedProject:{creatorId:'owner',name:'Project',creator:{email:'owner@example.invalid'}}})},deliveryUploadSession:{findUnique:async()=>session,update:async()=>{}},taskAsset:{findUnique:async()=>record,upsert:async({create})=>{if(fail){fail=false;throw Error('SIMULATED_DB_FAILURE');}return record ||= {...create,internalReviewStatus:'PENDING'};}}};db.$transaction=fn=>fn(db);
 const route=load('app/api/managed-projects/tasks/[taskId]/upload-multipart-complete/route.ts',{'@/lib/db':{db},'@/lib/auth':{getCurrentCreator:async()=>({id:'assignee',name:'A'})},'@/lib/r2':{getObjectSize:async()=>{if(!exists)throw Error('NOT_FOUND');return 10;},completeMultipartUpload:async()=>{storageCompletions++;exists=true;}},'@/lib/resend':{sendNewUploadReadyForReviewEmail:async()=>emails++},'@/lib/url':{appUrl:()=> 'https://app.invalid'}});
 const input={fileKey:session.fileKey,uploadId:'upload',type:'VIDEO',parts:[{partNumber:1,etag:'x'}]},params={params:Promise.resolve({taskId:'task'})};
 await assert.rejects(route.POST(json(input),params),/SIMULATED_DB_FAILURE/);
 for(let i=0;i<2;i++){const response=await route.POST(json(input),params);assert.equal(response.status,200);assert.equal((await response.json()).asset.internalReviewStatus,'PENDING');}
 assert.equal(storageCompletions,1);assert.equal(emails,1);
});
test('replacement registration is repeat-safe and charges its allowance exactly once',async()=>{
 let count=0,emails=0,deletes=0;
 const project={id:'p',creatorId:'owner',replaceCount:0,creator:{},clientName:'Client',slug:'client'};
 const media={id:'m',projectId:'p',fileKey:'projects/p/old.mp4',approvalStatus:'NEEDS_REVISION',reviewerEmail:'viewer@example.invalid',type:'VIDEO',project};
 const session={id:'s',projectId:'p',creatorId:'owner',fileKey:'projects/p/new.mp4',purpose:'REPLACE',targetId:'m',expectedBytes:10n,contentType:'video/mp4',state:'OPEN',expiresAt:new Date(Date.now()+60000)};
 const db={media:{findUnique:async()=>media,findUniqueOrThrow:async()=>media,updateMany:async({where,data})=>{assert.equal(where.fileKey,'projects/p/old.mp4');Object.assign(media,data);return {count:1};}},project:{updateMany:async()=>{count++;return {count:1};}},deliveryUploadSession:{findUnique:async()=>session,update:async()=>{}}};db.$transaction=fn=>fn(db);
 const route=load('app/api/media/[mediaId]/replace/complete/route.ts',{'@/lib/db':{db},'@/lib/auth':{getCurrentCreator:async()=>({id:'owner'})},'@/lib/publishing/applicationBoundary':{publishingIntegrationInstalled:()=>false},'@/lib/r2':{getObjectSize:async()=>10,deleteObject:async()=>deletes++},'@/lib/complimentaryAccess':{complimentaryAccessSelect:{},hasDeliveryPaidAccess:()=>false},'@/lib/resend':{sendRevisionReadyEmail:async()=>emails++},'@/lib/url':{appUrl:()=> 'https://app.invalid'}});
 const params={params:Promise.resolve({mediaId:'m'})};
 for(let i=0;i<2;i++)assert.equal((await route.POST(json({fileKey:session.fileKey}),params)).status,200);
 assert.equal(count,1);assert.equal(emails,1);assert.equal(deletes,1);assert.equal(media.approvalStatus,'PENDING');
});
test('session purpose prevents using a task or replacement transfer as a new delivery file',async()=>{
 const session={projectId:'p',creatorId:'owner',purpose:'REPLACE',targetId:'m',state:'OPEN',expiresAt:new Date(Date.now()+60000)};
 const helper=load('lib/deliveryUploads.ts',{'@/lib/db':{db:{deliveryUploadSession:{findUnique:async()=>session}}},'@/lib/r2':{}});
 assert.equal(await helper.deliverySession('p','owner','projects/p/f'),null);
 assert.ok(await helper.deliverySession('p','owner','projects/p/f',undefined,{purpose:'REPLACE',targetId:'m'}));
 assert.equal(await helper.deliverySession('p','owner','projects/p/f',undefined,{purpose:'REPLACE',targetId:'other'}),null);
});
test('late preview generation cannot overwrite a replacement and poster URLs are versioned',async()=>{
 const sharp=require('sharp');let writes=0,key;
 const media={id:'m',projectId:'p',fileKey:'projects/p/current.mp4',type:'VIDEO',project:{creatorId:'owner'}};
 const route=load('app/api/media/[mediaId]/preview/route.ts',{'@/lib/auth':{getCurrentCreator:async()=>({id:'owner'})},'@/lib/db':{db:{media:{findUnique:async()=>media,updateMany:async()=>{writes++;return {count:1};}}}},'@/lib/r2':{putDeliveryPoster:async k=>key=k,publicUrlFor:k=>'https://media.invalid/'+k}});
 const params={params:Promise.resolve({mediaId:'m'})};
 const wrong=new Request('http://localhost/preview',{method:'POST',headers:{'x-upload-file-key':'projects/p/old.mp4'},body:'unused'});
 assert.equal((await route.POST(wrong,params)).status,409);assert.equal(writes,0);
 const bytes=await sharp({create:{width:64,height:32,channels:3,background:'blue'}}).jpeg().toBuffer();
 assert.equal((await route.POST(new Request('http://localhost/preview',{method:'POST',body:bytes,headers:{'x-upload-file-key':media.fileKey}}),params)).status,200);
 assert.match(key,/^projects\/p\/posters\/m-[a-f0-9]{12}\.jpg$/);assert.equal(writes,1);
});
test('multipart manifests reject duplicate, fractional, sparse and oversized part numbers',()=>{
 const {parseDeliveryParts}=load('lib/deliveryUploads.ts',{'@/lib/db':{db:{}},'@/lib/r2':{}});
 for(const value of [null,[],[{partNumber:1,etag:'a'},{partNumber:1,etag:'b'}],[{partNumber:1.5,etag:'a'}],[{partNumber:2,etag:'a'}],[{partNumber:10001,etag:'a'}],[null]])assert.equal(parseDeliveryParts(value),null);
 assert.deepEqual(parseDeliveryParts([{partNumber:2,etag:''},{partNumber:1,etag:''}]),[{partNumber:1,etag:''},{partNumber:2,etag:''}]);
});
test('stalled direct PUTs reject and release their timeout without hanging indefinitely',async()=>{
 const previous=global.XMLHttpRequest;let aborted=0;
 global.XMLHttpRequest=class{constructor(){this.upload={};}open(){}setRequestHeader(){}send(){}abort(){aborted++;this.onabort?.();}};
 try {const client=load('lib/uploadClient.ts');await assert.rejects(client.putFileWithProgress('https://storage.invalid',new Blob(['x']),{retries:0,stallTimeoutMs:5}),/stalled/);assert.equal(aborted,1);}
 finally {global.XMLHttpRequest=previous;}
});
test('publication rechecks internal approval under a row lock and copies fresh preview metadata',async()=>{
 for(const approved of [true,false]){
  let locks=0,marked=0;const created=[];
  const asset={id:'asset',task:{id:'task',title:'Film'},fileKey:'managed-projects/p/tasks/task/original.mp4',type:'VIDEO',uploadedByCreatorId:'assignee',posterFileKey:'old.jpg'};
  const db={managedProject:{findUnique:async()=>({creatorId:'owner',deliveryProjectId:'delivery'}),update:async()=>marked++},mediaSection:{findFirst:async()=>({id:'section'})},taskAsset:{findMany:async()=>[asset],findUniqueOrThrow:async()=>({...asset,internalReviewStatus:approved?'APPROVED':'NEEDS_REVISION',posterFileKey:'fresh.jpg',aspectRatio:2,sizeBytes:10}),update:async()=>{}},media:{upsert:async({create})=>{created.push(create);return {id:'media'};}},$queryRaw:async()=>locks++};db.$transaction=fn=>fn(db);
  const route=load('app/api/managed-projects/[id]/publish/route.ts',{'@/lib/db':{db},'@/lib/auth':{getCurrentCreator:async()=>({id:'owner'})}});
  const response=await route.POST(json({}),{params:Promise.resolve({id:'p'})});
  assert.equal(locks,1);assert.equal(response.status,approved?200:409);assert.equal(marked,approved?1:0);
  if(approved){assert.equal(created[0].posterFileKey,'fresh.jpg');assert.equal(created[0].uploadSessionId,'task-promotion:asset');}else assert.equal(created.length,0);
 }
});
test('portfolio upload/signing cannot be used as a side door for project storage keys',async()=>{
 const helper=load('lib/deliveryUploads.ts',{'@/lib/db':{db:{}},'@/lib/r2':{}});
 assert.equal(helper.validPortfolioKey('projects/p/original.mp4','portfolio'),false);
 assert.equal(helper.validPortfolioKey('portfolios/portfolio/'+String.fromCharCode(92)+'file','portfolio'),false);
 let signed=0;
 const route=load('app/api/portfolio/upload/multipart-sign-part/route.ts',{'@/lib/db':{db:{portfolio:{findFirst:async()=>({id:'portfolio'})}}},'@/lib/auth':{getCurrentCreator:async()=>({id:'owner'})},'@/lib/r2':{getPresignedPartUploadUrl:async()=>{signed++;return 'unused';}}});
 assert.equal((await route.POST(json({fileKey:'projects/p/original.mp4',uploadId:'foreign',partNumber:1}))).status,400);assert.equal(signed,0);
});
