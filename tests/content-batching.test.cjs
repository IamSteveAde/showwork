const {test}=require('node:test');const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const {writeContentBatches}=load('lib/content/batchWriting.ts');
const request={instructions:'The final response MUST contain exactly 7 canonical content objects.\nFor every contentUnit from 1 through 7, create exactly one object for every content stream.',input:'Shared campaign plan and verified business evidence',jsonSchema:{name:'content_calendar',schema:{}}};
const slots=Array.from({length:7},(_,i)=>({contentUnit:i+1,platform:'INSTAGRAM'}));
test('large calendars use small bounded calls and retain all original slot identities',async()=>{
 let active=0,maxActive=0;const sizes=[];
 const result=await writeContentBatches(async input=>{
  active++;maxActive=Math.max(maxActive,active);
  assert.match(input.input,/Shared campaign plan/);const batch=JSON.parse(input.input.split('ASSIGNED CONTENT ITEMS FOR THIS CALL:\n')[1]);sizes.push(batch.length);
  assert.match(input.instructions,new RegExp(`exactly ${batch.length} canonical`));
  await new Promise(resolve=>setTimeout(resolve,2));active--;
  return JSON.stringify({posts:batch.map(p=>({...p,caption:`Caption ${p.contentUnit}`}))});
 },request,slots);
 assert.deepEqual(sizes,[3,3,1]);assert.equal(maxActive,2);assert.deepEqual(JSON.parse(result).posts.map(p=>p.contentUnit),[1,2,3,4,5,6,7]);
});
test('failed batch is not automatically retried or returned as partial success',async()=>{
 let calls=0;await assert.rejects(writeContentBatches(async()=>{calls++;throw Object.assign(Error('timeout'),{name:'TimeoutError'});},request,slots),/timeout/);assert.equal(calls,2);
});
test('duplicated or foreign identities are rejected before drafts can be saved',async()=>{
 await assert.rejects(writeContentBatches(async()=>JSON.stringify({posts:[slots[0],slots[0],slots[2]]}),request,slots.slice(0,3)),/unexpected or duplicate/);
 await assert.rejects(writeContentBatches(async()=>JSON.stringify({posts:[]}),request,slots.slice(0,3)),/incomplete/);
});
test('a free worker starts the next batch without waiting for a slower sibling and retains slot order',async()=>{
 const all=Array.from({length:9},(_,i)=>({contentUnit:i+1,platform:'INSTAGRAM'}));
 const gates=new Map();const started=[];let active=0,max=0;
 const run=writeContentBatches(async input=>{
  const batch=JSON.parse(input.input.split('ASSIGNED CONTENT ITEMS FOR THIS CALL:\n')[1]);
  const first=batch[0].contentUnit;started.push(first);max=Math.max(max,++active);
  await new Promise(resolve=>gates.set(first,resolve));active--;
  return JSON.stringify({posts:batch});
 },request,all,{concurrency:2});
 assert.deepEqual(started,[1,4]);
 gates.get(4)();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(started,[1,4,7]);assert.equal(active,2);
 gates.get(7)();gates.get(1)();
 assert.deepEqual(JSON.parse(await run).posts.map(p=>p.contentUnit),all.map(p=>p.contentUnit));assert.equal(max,2);
});
test('configured brief concurrency starts three bounded batches together',async()=>{
 let active=0,max=0;
 await writeContentBatches(async input=>{
  const batch=JSON.parse(input.input.split('ASSIGNED CONTENT ITEMS FOR THIS CALL:\n')[1]);max=Math.max(max,++active);
  await new Promise(resolve=>setTimeout(resolve,2));active--;return JSON.stringify({posts:batch});
 },request,slots,{concurrency:3});assert.equal(max,3);
});
