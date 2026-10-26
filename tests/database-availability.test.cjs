const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
const {retryDatabaseRead}=load('lib/databaseAvailability.ts');
test('a transient database read retries once and then returns its real result',async()=>{
 let calls=0;assert.equal(await retryDatabaseRead(async()=>{if(++calls===1)throw {code:'P1001'};return 7;}),7);assert.equal(calls,2);
});
test('persistent outages are not retried without bound',async()=>{
 let calls=0;await assert.rejects(retryDatabaseRead(async()=>{calls++;throw {code:'P1001'};}));assert.equal(calls,2);
});
test('permission errors are not retried',async()=>{
 let calls=0;await assert.rejects(retryDatabaseRead(async()=>{calls++;throw Error('Forbidden');}));assert.equal(calls,1);
});
for(const file of ['app/api/calendars/[id]/inbox/handoffs/route.ts','app/api/calendars/[id]/ai-generate/[jobId]/route.ts']){
 test(file+' reports a temporary outage without leaking database details',async()=>{
 const api=load(file,{'@/lib/auth':{getCurrentCreator:async()=>{throw {code:'P1001',message:'private database endpoint and credentials'};}},'@/lib/db':{db:{}},'@/lib/calendarPermissions':{}});
 const response=await api.GET(new Request('http://localhost'),{params:Promise.resolve({id:'calendar',jobId:'job'})});
 assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'15');
 const body=await response.json();assert.equal(body.code,'DATABASE_TEMPORARILY_UNAVAILABLE');assert.doesNotMatch(body.error,/credentials|endpoint/);assert.equal(body.count,undefined);
 });
}
