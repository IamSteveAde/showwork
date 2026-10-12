const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
function make(run){let now=120000,closed=0,released=0;const {createPublishingRuntime,runPublishingMinuteLoop}=load('lib/publishing/runtime.ts',{'./batchScheduler':{runPublishingBatchScheduler:run}});const runtime=createPublishingRuntime({database:{},transport:{dispatch:async()=>{},close:async()=>{closed++;}},leadership:{acquire:async()=>async()=>{released++;}},clock:()=>now});return {runtime,runPublishingMinuteLoop,advance:ms=>now+=ms,clock:()=>now,get closed(){return closed;},get released(){return released;}};}
test('portable runtime prevents overlap, repeated minute and backward-clock duplication',async()=>{
  let resolve,calls=0;const h=make(()=>{calls++;return new Promise(r=>resolve=r);});const first=h.runtime.tick();await new Promise(r=>setImmediate(r));assert.equal((await h.runtime.tick()).skipped,'busy');resolve({});await first;assert.equal(h.released,1);assert.equal((await h.runtime.tick()).skipped,'already-run');h.advance(-60000);assert.equal((await h.runtime.tick()).skipped,'already-run');h.advance(120000);const second=h.runtime.tick();await new Promise(r=>setImmediate(r));resolve({});await second;assert.equal(calls,2);await h.runtime.close();
});
test('shutdown drains active committed dispatch before closing the transport',async()=>{
  let resolve;const h=make(()=>new Promise(r=>resolve=r));const first=h.runtime.tick();await new Promise(r=>setImmediate(r));const closing=h.runtime.close();assert.equal(h.closed,0);assert.equal((await h.runtime.tick()).skipped,'stopping');resolve({});await first;await closing;await h.runtime.close();assert.equal(h.closed,1);assert.equal(h.released,1);
});
test('failed cycle releases leadership and later minute can recover',async()=>{
  let calls=0;const h=make(async()=>{if(!calls++)throw new Error('database unavailable');return {};});await assert.rejects(h.runtime.tick());assert.equal(h.released,1);h.advance(60000);await h.runtime.tick();assert.equal(h.released,2);await h.runtime.close();
});
test('minute loop uses UTC boundaries, skips missed ticks and stops without launching more work',async()=>{
  let calls=0;const h=make(async()=>{calls++;h.advance(5000);return {};});const controller=new AbortController(),waits=[];await h.runPublishingMinuteLoop(h.runtime,{signal:controller.signal,clock:h.clock,onError:()=>assert.fail(),sleep:async ms=>{waits.push(ms);if(calls===2){controller.abort();return;}h.advance(ms+120000);}});assert.equal(calls,2);assert.deepEqual(waits,[55000,55000]);assert.equal(h.closed,1);
});
test('durable dispatch rejects unconfirmed persistence and uses exact lease in idempotency key',async()=>{
  const {createDurablePublishingTransport}=load('lib/publishing/transports.ts');const keys=[],jobs=[];let durable=true;const transport=createDurablePublishingTransport({enqueue:async(job,key)=>{keys.push(key);jobs.push(job);return {durable,idempotencyKey:key};},close:async()=>{}});
  const claim={id:'fixture',platform:'TIKTOK',dispatchedAt:new Date('2026-10-11T12:00:00.123Z')};await transport.dispatch(claim);await transport.dispatch(claim);assert.equal(keys[0],keys[1]);assert.equal(jobs[0].dispatchedAt,claim.dispatchedAt.toISOString());await transport.dispatch({...claim,dispatchedAt:new Date('2026-10-11T12:00:00.124Z')});assert.notEqual(keys[0],keys[2]);durable=false;await assert.rejects(transport.dispatch(claim),/not confirmed/);
});
test('queue consumer validates envelopes and passes the exact lease to existing worker',async()=>{
  const {executePublishingEnvelope}=load('lib/publishing/transports.ts');const valid={version:1,postId:'fixture',platform:'X',dispatchedAt:'2026-10-11T12:00:00.123Z'};const calls=[];await executePublishingEnvelope(valid,async(...a)=>calls.push(a));assert.equal(calls[0][2].toISOString(),valid.dispatchedAt);
  for(const bad of [{...valid,platform:'WHATSAPP'},{...valid,sql:'UPDATE'},{...valid,dispatchedAt:'invalid'},{...valid,version:2}])await assert.rejects(executePublishingEnvelope(bad,()=>assert.fail()));
});
