const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function evaluate(file, deps, globals) {
  const mod={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('require','module','exports','globalThis','process',code)(name=>deps[name],mod,mod.exports,globals,{env:{NODE_ENV:'development'}});
  return mod.exports;
}
test('hot reload replaces a cached client when the generated schema changes and preserves revenue middleware',async()=>{
  const instances=[];let disconnected=0;
  class Client { constructor(){this.billingOfferSubscription={};this.billingOfferRedemption={};this.billingOffer={};this.billingBenefitNotification={};this.calendarTeamActivity={};instances.push(this);} $use(fn){this.middleware=fn;} async $disconnect(){disconnected++;} }
  const schema={datamodel:{enums:[],models:[{name:'Creator',fields:[{name:'id',type:'String',kind:'scalar',isRequired:true,isList:false}]}]}};
  const deps={'@prisma/client':{PrismaClient:Client,Prisma:{dmmf:schema}},'@/lib/paystack':{verifyTransaction:async()=>({status:true})},'@/lib/paymentRevenue':{classifyPaymentRevenue:()=>({revenueStatus:'LIVE'})}};
  const globals={revenuePrisma:{$disconnect:async()=>{disconnected++;}}};
  const first=evaluate('lib/db.ts',deps,globals).db;
  assert.equal(instances.length,1);assert.equal(disconnected,1);
  assert.equal(evaluate('lib/db.ts',deps,globals).db,first);assert.equal(instances.length,1);
  schema.datamodel.models.push({name:'BillingOfferSubscription',fields:[]});
  const second=evaluate('lib/db.ts',deps,globals).db;
  assert.notEqual(second,first);assert.equal(instances.length,2);assert.equal(disconnected,2);
  const args={model:'PaymentRecord',action:'create',args:{data:{paystackReference:'ref'}}};
  await second.middleware(args,async params=>params);
  assert.equal(args.args.data.revenueStatus,'LIVE');
});
test('login returns a retryable response without exposing database details or issuing a session',async()=>{
  let cookies=0;
  const route=evaluate('app/api/auth/login/route.ts',{
    'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200,headers:options?.headers})}},
    '@/lib/db':{db:{creator:{findUnique:async()=>{throw Object.assign(new Error('private credentials'),{code:'P1001'});}}}},
    '@/lib/auth':{setSessionCookie:()=>{cookies++;}},
  },{});
  const response=await route.POST({json:async()=>({email:'owner@example.com',password:'password'})});
  assert.equal(response.status,503);assert.equal(response.headers['Retry-After'],'10');assert.equal(cookies,0);
  assert.doesNotMatch(JSON.stringify(response.body),/private credentials/);
});
test('malformed login input fails before querying the database',async()=>{
  const route=evaluate('app/api/auth/login/route.ts',{'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},'@/lib/db':{db:{}},'@/lib/auth':{}},{});
  for(const body of [null,{}, {email:[],password:'password'}]) assert.equal((await route.POST({json:async()=>body})).status,400);
});


test('hot reload rejects a cached client missing the new team model even when signatures match', async () => {
  const schema = { datamodel: { enums: [], models: [{ name: 'CalendarTeamActivity', fields: [] }] } };
  let disconnected = 0;
  class Client {
    constructor() { this.billingOfferSubscription={};this.billingOfferRedemption={};this.billingOffer={};this.billingBenefitNotification={};this.calendarTeamActivity={}; }
    $use() {} async $disconnect() { disconnected++; }
  }
  const dependencies = { '@prisma/client': { PrismaClient: Client, Prisma: { dmmf: schema } }, '@/lib/paystack': {}, '@/lib/paymentRevenue': {} };
  const globals = {};
  const first = evaluate('lib/db.ts', dependencies, globals).db;
  delete first.calendarTeamActivity;
  const second = evaluate('lib/db.ts', dependencies, globals).db;
  assert.notEqual(second, first);
  assert.ok(second.calendarTeamActivity);
  assert.equal(disconnected, 1);
});
