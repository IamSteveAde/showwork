const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const config={appId:'test-app',appSecret:'test-secret',instagram:true};
const page=(id='101')=>({id,name:'Business',access_token:`page-token-${id}`,tasks:['MESSAGING']});
function harness({token={},pages=[page()],direct={},relationship={},fail}={}) {
 const calls=[];
 const api=load('lib/metaPageDiscovery.ts',{'@/lib/publishing/executionContext':{publishingFetch:async(url,init)=>{
  const u=new URL(url),path=u.pathname.replace(/^\/v[^/]+/,'');calls.push({path,params:u.searchParams,auth:init.headers.Authorization});
  assert.ok(!u.searchParams.has('access_token'));
  if(fail===path)return Response.json({error:{code:100,message:'secret-user-token'}},{status:400});
  if(path==='/debug_token')return Response.json({data:{is_valid:true,type:'USER',app_id:'test-app',user_id:'user',scopes:['pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish'],...token}});
  if(path==='/me/accounts')return Response.json(typeof pages==='function'?pages(u.searchParams):{data:pages});
  const id=path.slice(1);
  if(u.searchParams.get('fields').startsWith('instagram'))return Response.json(relationship[id]??{instagram_business_account:{id:'ig-'+id,username:'creator'}});
  return Response.json(direct[id]??page(id));
 }}});
 return {...api,calls,run:()=>api.discoverMetaPages('secret-user-token',config)};
}
test('one authorized Page and Creator/Business relationship connects without Insights',async()=>{
 const h=harness(),result=await h.run();assert.equal(result[0].instagram_business_account.id,'ig-101');
 assert.equal(h.calls.find(c=>c.path==='/me/accounts').auth,'Bearer secret-user-token');
 assert.equal(h.calls.find(c=>c.path==='/101').auth,'Bearer page-token-101');
});
test('paginates multiple Pages and never follows provider-supplied URLs',async()=>{
 const h=harness({pages:params=>params.has('after')?{data:[page('102')]}:{data:[page()],paging:{next:'https://evil.test',cursors:{after:'cursor'}}}});
 assert.equal((await h.run()).length,2);assert.equal(h.calls.filter(c=>c.path==='/me/accounts').length,2);
});
test('granted Page absent from /me/accounts is recovered by direct authorized token lookup',async()=>{
 const h=harness({pages:[],token:{granular_scopes:[{scope:'pages_show_list',target_ids:['108238759045067']}]}});
 const result=await h.run();assert.equal(result[0].id,'108238759045067');assert.ok(result[0].access_token);
});
test('explicitly excluded Pages and Instagram-target IDs are not fallback candidates',async()=>{
 const h=harness({pages:[],token:{granular_scopes:[{scope:'pages_show_list',target_ids:[]},{scope:'pages_manage_metadata',target_ids:['101']},{scope:'instagram_basic',target_ids:['17841405302915498']}]}});
 assert.deepEqual(await h.run(),[]);assert.equal(h.calls.length,2);
});
test('no grants and no accessible Pages remains empty, not a hardcoded account',async()=>{
 const h=harness({pages:[]});assert.deepEqual(await h.run(),[]);assert.equal(h.calls.length,2);
});
test('Page with no professional relationship is distinguishable from failed lookup',async()=>{
 const h=harness({relationship:{101:{}}});assert.equal((await h.run())[0].instagram_business_account,undefined);
 const bad=harness({fail:'/101'});await assert.rejects(bad.run(),e=>e.code==='META_PAGE_ACCESS_FAILED'&&!e.message.includes('secret-user-token'));
});
test('invalid, expired, foreign app, non-User and missing scopes are rejected before Page discovery',async()=>{
 for(const token of [{is_valid:false},{expires_at:1},{data_access_expires_at:1},{type:'PAGE'},{type:'APP'},{app_id:'other'},{scopes:['instagram_manage_insights']}]) {
  const h=harness({token});await assert.rejects(h.run());assert.equal(h.calls.length,1);
 }
});
test('a granular grant or public Page read without Page token cannot authorize connection',async()=>{
 const h=harness({pages:[],token:{granular_scopes:[{scope:'pages_show_list',target_ids:['101']}]},direct:{101:{id:'101',name:'Public'}}});
 await assert.rejects(h.run(),e=>e.code==='META_PAGE_TOKEN_MISSING');
});
test('malformed pagination is not silently truncated',async()=>{
 const h=harness({pages:()=>({data:[],paging:{next:'https://example.test'}})});await assert.rejects(h.run(),e=>e.code==='META_DISCOVERY_PAGINATION_FAILED');
});
test('Facebook discovery shares validation and fallback without requesting Instagram fields',async()=>{
 const h=harness();await h.discoverMetaPages('secret-user-token',{...config,instagram:false});assert.equal(h.calls.length,2);
});
