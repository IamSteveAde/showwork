const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const {transitionAllowed,outcomeAllowed,createPublishingOwnership}=load('lib/publishing/ownership.ts');
test('owner transitions require draining and reject invalid states',()=>{
 for(const from of ['NETLIFY','DRAINING','VPS'])for(const to of ['NETLIFY','DRAINING','VPS'])assert.equal(transitionAllowed(from,to),from!==to&&(from==='DRAINING'||to==='DRAINING'));
 assert.equal(transitionAllowed('OTHER','DRAINING'),false);
});
test('unknown can reconcile but terminal outcomes cannot reopen authorization',()=>{
 assert.equal(outcomeAllowed('UNKNOWN','CONFIRMED'),true);
 for(const phase of ['AUTHORIZED','UNKNOWN','ACCEPTED','CONFIRMED','REJECTED'])assert.equal(outcomeAllowed(phase,'AUTHORIZED'),false);
 assert.equal(outcomeAllowed('CONFIRMED','UNKNOWN'),false);
});
test('transaction failures are sanitized and never automatically retried',async()=>{
 let calls=0;const service=createPublishingOwnership({transaction:async()=>{calls++;throw Error('synthetic-private-value');}});
 await assert.rejects(service.recoverAttempt('attempt'),e=>e.message==='OWNERSHIP_TRANSACTION_UNCONFIRMED'&&!e.cause);
 assert.equal(calls,1);
});
test('invalid inputs fail before database access',async()=>{
 const service=createPublishingOwnership({transaction:()=>assert.fail('must not access database')});
 await assert.rejects(service.createIntent({id:'bad id',postId:'p',platform:'X',dueAt:new Date()}),/INVALID_IDENTIFIER/);
 await assert.rejects(service.reviseIntent('intent',0,new Date()),/INVALID_REVISION/);
});
