const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
test('simultaneous status reads share one request; later refreshes fetch again',async()=>{
 let calls=0,resolve;const api=load('lib/calendarReadRequests.ts',{'@/lib/publishing/clientRequests':{calendarMutationFetch:async()=>{calls++;return new Promise(r=>resolve=r);}}});
 const a=api.readCalendarJson('/a'),b=api.readCalendarJson('/a');assert.equal(calls,1);resolve(Response.json({value:1}));assert.deepEqual(await a,await b);
 const c=api.readCalendarJson('/a');assert.equal(calls,2);resolve(Response.json({value:2}));assert.equal((await c).data.value,2);
});
test('failed reads are evicted and workspace URLs are isolated',async()=>{
 let calls=0;const api=load('lib/calendarReadRequests.ts',{'@/lib/publishing/clientRequests':{calendarMutationFetch:async()=>{calls++;throw Error('offline');}}});
 await Promise.allSettled([api.readCalendarJson('/a'),api.readCalendarJson('/b')]);assert.equal(calls,2);await assert.rejects(()=>api.readCalendarJson('/a'));assert.equal(calls,3);
});
test('disconnected and expired LinkedIn accounts return useful status without refreshing tokens',()=>{
 const api=load('lib/linkedin/capabilities.ts',{'./messagingAccess':{linkedInMessagingAccess:()=>({available:true,reason:'Ready'})}});
 assert.equal(api.linkedInCapabilities(null).connected,false);
 const input={platformAccountId:'member',accessToken:'test',accessTokenExpiresAt:new Date(0),tokenScopes:'w_member_social r_member_postAnalytics'};
 const expired=api.linkedInCapabilities(input);assert.equal(expired.reconnectRequired,true);assert.equal(expired.publishing,false);assert.equal(expired.messaging,false);
 const valid=api.linkedInCapabilities({...input,accessTokenExpiresAt:null});assert.equal(valid.publishing,true);assert.equal(valid.analytics,true);
});
test('capability reads require view permission and do not call the token refresh path',async()=>{
 let allowed=true;
 const api=load('app/api/calendars/[id]/channels/linkedin/pages/route.ts',{
 '@/lib/publishing/applicationBoundary':{publishingIntegrationInstalled:()=>false},'@/lib/auth':{getCurrentCreator:async()=>({id:'viewer'})},
 '@/lib/calendarPermissions':{hasCalendarPermission:async(_user,_calendar,permission)=>{assert.equal(permission,'channels.view');return allowed;}},
 '@/lib/db':{db:{socialConnection:{findFirst:async()=>null}}},'@/lib/socialTokens':{freshConnection:()=>{throw Error('must not refresh');}},'@/lib/linkedin/pages':{},'@/lib/channelOAuth':{},'@/lib/socialReporting':{},
 });
 const {NextRequest}=require('next/server');const req=new NextRequest('http://localhost/api?capabilities=true'),ctx={params:Promise.resolve({id:'workspace'})};
 let response=await api.GET(req,ctx);assert.equal(response.status,200);assert.equal((await response.json()).connected,false);
 allowed=false;response=await api.GET(req,ctx);assert.equal(response.status,403);
});
test('a refresh after a mutation bypasses an older in-flight status read',async()=>{
 const resolvers=[];const api=load('lib/calendarReadRequests.ts',{'@/lib/publishing/clientRequests':{calendarMutationFetch:()=>new Promise(resolve=>resolvers.push(resolve))}});
 const old=api.readCalendarJson('/a');const fresh=api.readCalendarJson('/a',true);assert.equal(resolvers.length,2);
 resolvers[0](Response.json({connected:false}));await old;
 assert.equal(api.readCalendarJson('/a'),fresh);
 resolvers[1](Response.json({connected:true}));assert.equal((await fresh).data.connected,true);
});
