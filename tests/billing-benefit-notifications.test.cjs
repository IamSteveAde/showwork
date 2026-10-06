const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks={}, cache=new Map()) {
  if(cache.has(file)) return cache.get(file);
  const mod={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','module','exports','setTimeout','clearTimeout',code)(name=>{
    if(name in mocks) return mocks[name];
    if(name.startsWith('@/')) { const base=name.slice(2); return load(base+(fs.existsSync(base+'.ts')?'.ts':'.tsx'),mocks,cache); }
    return require(name);
  },mod,mod.exports,(fn,ms)=>ms===600?(fn(),0):setTimeout(fn,ms),clearTimeout);
  cache.set(file,mod.exports); return mod.exports;
}
const reply={json:(body,options)=>({body,status:options?.status??200})};
const offer={id:'offer',title:'Partner gift',product:'CONTENT_WORKSPACE',workspacePlan:'STUDIO',deliveryTier:null,percent:100,durationMonths:2,billingCycle:null,audience:'SELECTED',createdAt:new Date('2026-10-06T12:00:00Z'),availableUntil:null,revokedAt:null};
function workerFixture({fail=false,loseAck=false,claim=true,revoked=false}={}) {
  const job={id:'offer:owner:GRANTED',offerId:'offer',creatorId:'owner',event:'GRANTED',attempts:0,status:'PENDING',payload:{to:'owner@example.com',name:'Owner',title:'Gift',event:'GRANTED',product:'DELIVERY',deliveryTier:'GROWTH',workspacePlan:null,percent:100,durationMonths:2,billingCycle:null,availableUntil:null,endsAt:new Date(Date.now()+86400000).toISOString()}};
  const keys=[],delivered=new Set();let acknowledgeLost=loseAck;
  const db={
    billingBenefitNotification:{findMany:async()=>job.status==='SENT'||job.status==='CANCELLED'?[]:[{...job}],
      updateMany:async({data})=>{if(!claim)return{count:0};job.status=data.status;job.attempts+=data.attempts.increment;return{count:1};},
      update:async({data})=>{if(data.status==='SENT'&&acknowledgeLost){acknowledgeLost=false;throw new Error('DB acknowledgement lost');}Object.assign(job,data);return job;},
    },
    billingOffer:{findUnique:async()=>({audience:'SELECTED',revokedAt:revoked?new Date():null})},
    billingOfferRecipient:{findUnique:async()=>({revokedAt:null})},
  };
  const service=load('lib/billingBenefitNotifications.ts',{'@/lib/db':{db},'next/server':{after:()=>{}},'@/lib/resend':{sendBillingBenefitEmail:async(payload,key)=>{keys.push(key);if(fail)throw new Error('private provider details');delivered.add(key);return'mail-id';}}});
  return{service,job,keys,delivered};
}
test('selected grant emails are saved with unique event keys and exact product, tier and expiry',async()=>{
  const rows=[];
  const service=load('lib/billingBenefitNotifications.ts',{'@/lib/db':{db:{}},'next/server':{after:()=>{}},'@/lib/resend':{}});
  const tx={creator:{findMany:async args=>{assert.deepEqual(args.where.id.in,['owner']);return[{id:'owner',email:'owner@example.com',name:'Owner'}];}},billingBenefitNotification:{createMany:async({data})=>{rows.push(...data);return{count:data.length};}}};
  await service.queueOfferEmails(tx,offer,'GRANTED',['owner']);
  assert.equal(rows[0].id,'offer:owner:GRANTED');assert.equal(rows[0].payload.percent,100);assert.equal(rows[0].payload.workspacePlan,'STUDIO');assert.equal(rows[0].payload.endsAt,'2026-12-06T12:00:00.000Z');
});
test('global offer notifications include current active users rather than only selected recipients',async()=>{
  const batches=[];
  const service=load('lib/billingBenefitNotifications.ts',{'@/lib/db':{db:{}},'next/server':{after:()=>{}},'@/lib/resend':{}});
  const tx={creator:{findMany:async args=>{assert.equal(args.where.isDeactivated,false);assert.equal(args.where.id,undefined);return[{id:'one',email:'one@example.com',name:null},{id:'two',email:'two@example.com',name:null}];}},billingBenefitNotification:{createMany:async({data})=>{batches.push(data);return{count:data.length};}}};
  assert.equal(await service.queueOfferEmails(tx,{...offer,audience:'ALL',percent:20},'GRANTED'),2);assert.equal(batches[0].length,2);
});
test('provider failures retain the grant email for a later retry',async()=>{
  const f=workerFixture({fail:true});const result=await f.service.deliverBenefitEmails();
  assert.equal(result.failed,1);assert.equal(f.job.status,'PENDING');assert.equal(f.job.attempts,1);assert.ok(f.job.nextAttemptAt>new Date());assert.doesNotMatch(f.job.lastError,/private provider/);
});
test('lost acknowledgements retry with the same provider key instead of delivering duplicate emails',async()=>{
  const f=workerFixture({loseAck:true});await f.service.deliverBenefitEmails();await f.service.deliverBenefitEmails();
  assert.equal(f.job.status,'SENT');assert.equal(f.keys.length,2);assert.equal(f.delivered.size,1);assert.equal(f.keys[0],f.keys[1]);
  await f.service.deliverBenefitEmails();assert.equal(f.keys.length,2);
});
test('concurrent workers cannot send a notification when another worker owns its lease',async()=>{
  const f=workerFixture({claim:false});await f.service.deliverBenefitEmails();assert.equal(f.keys.length,0);
});
test('a grant stopped before delivery cancels its obsolete grant announcement',async()=>{
  const f=workerFixture({revoked:true});await f.service.deliverBenefitEmails();assert.equal(f.keys.length,0);assert.equal(f.job.status,'CANCELLED');
});
test('benefit email copy escapes user values and describes the actual plan rather than full platform access',async()=>{
  const calls=[];
  class Resend{constructor(){this.emails={send:async(payload,options)=>{calls.push({payload,options});return{data:{id:'sent'},error:null};}};}}
  const mail=load('lib/resend.ts',{resend:{Resend}});
  await mail.sendBillingBenefitEmail({to:'user@example.com',name:'<script>',title:'A & B',event:'GRANTED',product:'CONTENT_WORKSPACE',deliveryTier:null,workspacePlan:'CREATOR',percent:100,durationMonths:2,billingCycle:null,availableUntil:null,endsAt:'2026-12-06T12:00:00Z'},'key');
  assert.equal(calls[0].options.idempotencyKey,'key');assert.match(calls[0].payload.html,/Content Workspace · Creator/);assert.match(calls[0].payload.html,/6 December 2026/);assert.match(calls[0].payload.html,/A &amp; B/);assert.doesNotMatch(calls[0].payload.html,/<script>|A &amp;amp; B|Everything is unlocked/);
});
test('accepted-partner search filters by approval status and retains paused accepted partners',async()=>{
  let lookup;
  const route=load('app/api/admin/billing-offers/route.ts',{'next/server':{NextResponse:reply},'@/lib/auth':{getCurrentCreator:async()=>({email:'admin@example.com'})},'@/lib/admin':{isAdminEmail:()=>true},
    '@/lib/billingBenefitNotifications':{queueOfferEmails:async()=>0,scheduleBenefitEmailDelivery:()=>{}},
    '@/lib/db':{db:{billingOffer:{findMany:async()=>[]},creator:{findMany:async args=>{lookup=args;return[{id:'partner',name:'Partner',email:'partner@example.com',partnerProfile:{status:'ACTIVE',isActive:false}}];}},billingOfferSubscription:{findMany:async()=>[]},billingBenefitNotification:{groupBy:async()=>[]}}}});
  const response=await route.GET({nextUrl:{searchParams:new URLSearchParams({q:'partner',recipients:'PARTNERS'})}});
  assert.equal(response.status,200);assert.deepEqual(lookup.where.partnerProfile,{is:{status:'ACTIVE'}});assert.equal(lookup.where.partnerProfile.is.isActive,undefined);assert.equal(response.body.creators[0].partnerProfile.isActive,false);
});
test('partner-only grants revalidate the selected accounts on the server',async()=>{
  let validation;
  const route=load('app/api/admin/billing-offers/route.ts',{'next/server':{NextResponse:reply},'@/lib/auth':{getCurrentCreator:async()=>({email:'admin@example.com'})},'@/lib/admin':{isAdminEmail:()=>true},'@/lib/billingBenefitNotifications':{},
    '@/lib/db':{db:{billingOffer:{findUnique:async()=>null},creator:{count:async args=>{validation=args;return 0;}}}}});
  const response=await route.POST({json:async()=>({requestId:'b0d2c052-19ba-49e4-b570-374947e581b0',title:'Partner gift',product:'DELIVERY',deliveryTier:'STARTER',workspacePlan:'',billingCycle:'MONTHLY',percent:100,durationMonths:1,audience:'SELECTED',creatorIds:['unapproved'],recipientFilter:'PARTNERS',acknowledgeExistingBilling:true})});
  assert.equal(response.status,400);assert.deepEqual(validation.where.partnerProfile,{is:{status:'ACTIVE'}});
});
test('per-recipient stopping affects only that user and queues a stopped notification',async()=>{
  const writes=[],emails=[];
  const tx={billingOfferRecipient:{updateMany:async args=>{writes.push(args);return{count:1};}},billingOfferSubscription:{updateMany:async args=>writes.push(args)}};
  const route=load('app/api/admin/billing-offers/route.ts',{'next/server':{NextResponse:reply},'@/lib/auth':{getCurrentCreator:async()=>({email:'admin@example.com'})},'@/lib/admin':{isAdminEmail:()=>true},
    '@/lib/billingBenefitNotifications':{queueOfferEmails:async(tx,offer,event,ids)=>emails.push({event,ids}),scheduleBenefitEmailDelivery:()=>{}},
    '@/lib/complimentaryGrants':{refreshComplimentaryGrantsForAccounts:async(tx,ids)=>writes.push({refresh:ids})},
    '@/lib/db':{db:{billingOffer:{findUnique:async()=>({...offer,recipients:[{creatorId:'one'},{creatorId:'two'}]})},$transaction:async(fn)=>fn(tx)}}});
  assert.equal((await route.PATCH({json:async()=>({id:'offer',creatorId:'one'})})).status,200);
  assert.equal(writes[0].where.creatorId,'one');assert.equal(writes[1].where.creatorId,'one');assert.equal(writes[1].data.status,'REVOKED');assert.deepEqual(emails,[{event:'STOPPED',ids:['one']}]);assert.deepEqual(writes[2],{refresh:['one']});
});
test('partner tags distinguish accepted, paused and pending applications',()=>{
  const Tag=load('components/admin/PartnerTag.tsx').default;
  assert.match(renderToStaticMarkup(React.createElement(Tag,{profile:{status:'ACTIVE',isActive:false}})),/Accepted partner · referrals paused/);
  assert.match(renderToStaticMarkup(React.createElement(Tag,{profile:{status:'PENDING',isActive:false}})),/Partner applicant/);
  assert.equal(renderToStaticMarkup(React.createElement(Tag,{profile:null})), '');
});

test('new verified users receive currently available global offer announcements',async()=>{
  const queued=[];let filter;
  const service=load('lib/billingBenefitNotifications.ts',{'@/lib/db':{db:{}},'next/server':{after:()=>{}},'@/lib/resend':{}});
  const tx={billingOffer:{findMany:async args=>{filter=args;return[{...offer,audience:'ALL',percent:20,durationMonths:3}];}},billingBenefitNotification:{createMany:async args=>queued.push(...args.data)}};
  await service.queueGlobalBenefitsForNewUser(tx,{id:'new-user',email:'new@example.com',name:'New'});
  assert.equal(filter.where.audience,'ALL');assert.equal(filter.where.revokedAt,null);assert.equal(queued[0].creatorId,'new-user');assert.equal(queued[0].payload.billingCycle,'MONTHLY');
});
test('partner welcome complimentary access gets a durable grant notification with its actual expiry',async()=>{
  const queued=[];
  const service=load('lib/billingBenefitNotifications.ts',{'@/lib/db':{db:{}},'next/server':{after:()=>{}},'@/lib/resend':{}});
  await service.queuePartnerWelcomeBenefit({billingBenefitNotification:{createMany:async args=>queued.push(...args.data)}},{id:'partner',email:'partner@example.com',name:'Partner'},new Date('2026-11-06T12:00:00Z'));
  assert.equal(queued[0].id,'partner-welcome:partner');assert.equal(queued[0].payload.workspacePlan,'STUDIO');assert.equal(queued[0].payload.endsAt,'2026-11-06T12:00:00.000Z');
});
test('stopping a partner removes their legacy and structured gifts while preserving paid billing and other recipients',async()=>{
  const updates=[],notifications=[];
  const tx={creator:{findUnique:async()=>({id:'one',email:'one@example.com',name:'One',isComped:true,compedUntil:new Date(Date.now()+86400000),subscriptionActive:true}),update:async args=>updates.push(args)},
    billingOfferSubscription:{findMany:async()=>[{offerId:'offer',offer}],updateMany:async args=>updates.push(args)},billingOfferRecipient:{updateMany:async args=>updates.push(args)},billingBenefitNotification:{createMany:async args=>notifications.push(...args.data)}};
  const route=load('app/api/admin/creators/[id]/complimentary/route.ts',{'next/server':{NextResponse:reply},'@/lib/auth':{getCurrentCreator:async()=>({email:'admin@example.com'})},'@/lib/admin':{isAdminEmail:()=>true},
    '@/lib/complimentaryGrants':{refreshComplimentaryGrantsForAccounts:async(tx,ids)=>updates.push({refresh:ids})},'@/lib/billingBenefitNotifications':{queueOfferEmails:async(tx,offer,event,ids)=>updates.push({event,ids}),scheduleBenefitEmailDelivery:()=>{}},'@/lib/db':{db:{$transaction:async fn=>fn(tx)}}});
  const result=await route.POST({json:async()=>({requestId:'b0d2c052-19ba-49e4-b570-374947e581b0'})},{params:Promise.resolve({id:'one'})});
  assert.equal(result.status,200);assert.equal(result.body.legacyStopped,true);
  assert.deepEqual(updates.find(u=>u.data?.isComped===false).data,{isComped:false,compedUntil:null});
  assert.ok(updates.every(u=>u.data?.subscriptionActive===undefined));
  assert.equal(updates.find(u=>u.data?.status==='REVOKED').where.creatorId,'one');assert.equal(notifications[0].creatorId,'one');
});
