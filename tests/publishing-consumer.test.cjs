const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const platforms=['INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X'];
test('consumer rotates platforms under a continuous hot backlog and isolates worker failures',async()=>{
 const counts=Object.fromEntries(platforms.map(p=>[p,0])),orders=[];let round=0;
 const store={recoverExpired:async()=>{},ready:async p=>round<4?[{id:p+'-'+round,platform:p}]:[]};
 const worker={run:async job=>{counts[job.platform]++;if(job.platform==='X')round++;if(job.platform==='INSTAGRAM')throw new Error('Mock platform unavailable');return{state:'confirmed'};}};
 const {drainReliablePublishing}=load('lib/publishing/reliableConsumer.ts');
 // Use fixed rounds keyed to complete five-job waves, not platform position.
 let seen=0;worker.run=async job=>{orders.push(job.platform);counts[job.platform]++;if(++seen%5===0)round++;if(job.platform==='INSTAGRAM')throw new Error('Mock platform unavailable');return{state:'confirmed'};};
 const result=await drainReliablePublishing(store,worker,{durationMs:1000});assert.equal(result.rounds,4);assert.equal(result.errors,4);assert.deepEqual(Object.values(counts),[4,4,4,4,4]);assert.deepEqual(orders.slice(0,5),platforms);assert.deepEqual(orders.slice(5,10),platforms.slice(1).concat(platforms[0]));
});
test('consumer storage outage remains visible and later rounds recover durable work',async()=>{
 let reads=0,calls=0;const store={recoverExpired:async()=>{},readyFair:async()=>{if(++reads===1)throw new Error('DB unavailable');return reads===2?[{id:'durable',platform:'TIKTOK'}]:[];}};
 const {drainReliablePublishing}=load('lib/publishing/reliableConsumer.ts');const result=await drainReliablePublishing(store,{run:async()=>{calls++;return{state:'confirmed'};}},{durationMs:1000,idleMs:1});assert.equal(result.errors,1);assert.equal(calls,1);
});
test('staging adapter refuses other environments, unauthenticated requests, non-POST and payloads',async()=>{
 const {createStagingConsumerAdapter}=load('lib/publishing/stagingConsumerAdapter.ts');let closes=0;
 const input={environment:'isolated-staging',authenticate:async r=>r.headers.get('authorization')==='synthetic-test',store:{recoverExpired:async()=>{},readyFair:async()=>[]},worker:{close:async()=>{closes++;}}};
 assert.throws(()=>createStagingConsumerAdapter({...input,environment:'production'}));const handler=createStagingConsumerAdapter(input);
 assert.equal((await handler(new Request('https://staging.invalid',{method:'GET'}))).status,405);
 assert.equal((await handler(new Request('https://staging.invalid',{method:'POST'}))).status,401);
 const headers={authorization:'synthetic-test'};for(const body of ['SELECT * FROM customer','{"database":"production","jobId":"arbitrary"}'])assert.equal((await handler(new Request('https://staging.invalid',{method:'POST',headers,body}))).status,400);
 const response=await handler(new Request('https://staging.invalid',{method:'POST',headers}));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(closes,1);
});
test('accepted provider operation is distinct from confirmed publication and cannot be reinitialized',async()=>{
 let phase='READY',token,reference,calls=0;const job={id:'pending',platform:'TIKTOK',postId:'synthetic',lease:new Date()};
 const store={findJob:async()=>({...job,phase,workerToken:token,remoteId:reference}),prepare:async(_j,t)=>{if(phase!=='READY')return[];token=t;phase='PREPARED';return[job];},beginExternal:async()=>{phase='EXTERNAL_PENDING';return[job];},accept:async(_j,_t,r)=>{phase='PROVIDER_PENDING';reference=r;},finish:()=>assert.fail('Acceptance is not publication'),unknown:()=>assert.fail('Known accepted operation retained')};
 const {createReliableWorker}=load('lib/publishing/reliableWorker.ts');const worker=createReliableWorker(store,async()=>{calls++;return{state:'accepted',reference:'existing-operation'};});assert.equal((await worker.run(job)).state,'provider-pending');assert.equal((await worker.run(job)).state,'deferred');assert.equal(calls,1);assert.equal(phase,'PROVIDER_PENDING');await worker.close();
});
test('busy storage boundary retries the same prepared token before calling provider once',async()=>{
 let phase='READY',token,begins=0,calls=0;const job={id:'busy',platform:'X',postId:'synthetic',lease:new Date()};
 const store={findJob:async()=>({...job,phase,workerToken:token}),prepare:async(_j,t)=>{token=t;phase='PREPARED';return[job];},beginExternal:async(_j,t)=>{assert.equal(t,token);if(++begins===1)throw Object.assign(new Error('Budget busy'),{code:'PUBLISHING_DEFERRED'});phase='EXTERNAL_PENDING';return[job];},finish:async()=>{phase='CONFIRMED';return[job];},unknown:()=>assert.fail('Should recover busy storage')};
 const {createReliableWorker}=load('lib/publishing/reliableWorker.ts');const worker=createReliableWorker(store,async()=>{calls++;return'confirmed';},{concurrency:4});assert.equal((await worker.run(job)).state,'confirmed');assert.equal(begins,2);assert.equal(calls,1);await worker.close();
});
