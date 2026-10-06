const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function adapter(){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/reporting/adapters/facebook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>({}),mod,mod.exports);return mod.exports.facebookReportingAdapter;}
const connection={id:'connection',platform:'FACEBOOK',platformAccountId:'page',accountName:'Selected Page',accessToken:'private-page-token',tokenScopes:'pages_show_list,pages_read_engagement',status:'CONNECTED'};
const period={start:new Date('2026-10-01'),end:new Date('2026-10-06T23:59:59Z')};
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const post={id:'page_post',message:'Real Page content',created_time:'2026-10-04T12:00:00Z',permalink_url:'https://www.facebook.com/page/posts/post',full_picture:'https://example.com/post.jpg'};
test('optional engagement denial does not discard authorized Page content or request ungranted comments',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async raw=>{const u=new URL(raw),fields=u.searchParams.get('fields');calls.push(u);
  if(u.pathname.endsWith('/page')&&fields==='id,name')return response({id:'page',name:'Selected Page'});
  if(fields==='followers_count')return response({followers_count:42});
  if(fields.includes('likes'))return response({error:{code:10,message:'pages_read_engagement access denied for this field',fbtrace_id:'trace'}},400);
  if(fields.includes('shares'))return response({data:[{id:post.id,shares:{count:3}}]});
  return response({data:[post]});};
 try{const result=await adapter().fetchPageActivity(connection,period);assert.equal(result.pageId,'page');assert.equal(result.posts[0].message,post.message);assert.equal(result.posts[0].imageUrl,post.full_picture);assert.equal(result.followers,42);assert.equal(result.posts[0].likes,null);assert.equal(result.posts[0].comments,null);assert.equal(result.posts[0].shares,3);assert.ok(result.notices.some(n=>n.includes('Like counts unavailable')));assert.ok(result.notices.some(n=>n.includes('pages_read_user_content')));assert.ok(calls.every(u=>!u.searchParams.get('fields')?.includes('comments')));assert.equal(calls.length,5);}finally{global.fetch=original;}
});
test('engagement values join to core posts by ID and preserve zero without substituting missing counts',async()=>{
 const original=global.fetch;
 global.fetch=async raw=>{const u=new URL(raw),fields=u.searchParams.get('fields');if(fields==='id,name')return response({id:'page',name:'Selected Page'});if(fields==='followers_count')return response({followers_count:1});if(fields.includes('likes'))return response({data:[{id:'another-post',likes:{summary:{total_count:999}}},{id:post.id,likes:{summary:{total_count:0}}}]});if(fields.includes('comments'))return response({data:[{id:post.id,comments:{summary:{total_count:4}}}]});if(fields.includes('shares'))return response({data:[{id:post.id}]});return response({data:[post]});};
 try{const result=await adapter().fetchPageActivity({...connection,tokenScopes:connection.tokenScopes+',pages_read_user_content'},period);assert.equal(result.posts[0].likes,0);assert.equal(result.posts[0].comments,4);assert.equal(result.posts[0].shares,null);}finally{global.fetch=original;}
});
test('missing mandatory Page engagement permission still prevents every Graph request',async()=>{
 const original=global.fetch;global.fetch=()=>{throw Error('Must not request data without the grant');};
 try{await assert.rejects(()=>adapter().fetchPageActivity({...connection,tokenScopes:'pages_show_list'},period),/granting pages_read_engagement/);}finally{global.fetch=original;}
});
test('a required Page-content access denial remains a real failure and includes safe provider diagnostics',async()=>{
 const original=global.fetch;
 global.fetch=async raw=>{const u=new URL(raw);if(u.searchParams.get('fields')==='id,name')return response({id:'page',name:'Selected Page'});if(u.searchParams.get('fields')==='followers_count')return response({followers_count:1});return response({error:{code:200,error_subcode:99,fbtrace_id:'trace-id',message:'Access denied private-page-token'}},400);};
 try{await assert.rejects(()=>adapter().fetchPageActivity(connection,period),e=>e.message.includes('GET /page/posts')&&e.message.includes('200/99')&&e.message.includes('trace-id')&&!e.message.includes('private-page-token'));}finally{global.fetch=original;}
});
test('expired Page tokens are not converted into successful empty reporting',async()=>{
 const original=global.fetch;global.fetch=async()=>response({error:{code:190,message:'Token expired'}},400);
 try{await assert.rejects(()=>adapter().fetchPageActivity(connection,period),/needs renewal/);}finally{global.fetch=original;}
});
test('account sync imports native Page posts when optional counts are denied',async()=>{
 const original=global.fetch;
 global.fetch=async raw=>{const u=new URL(raw),fields=u.searchParams.get('fields');if(fields==='id,name')return response({id:'page',name:'Selected Page'});if(fields==='followers_count,fan_count')return response({followers_count:42,fan_count:120});if(fields.includes('likes'))return response({error:{code:10,message:'Field restricted'}},400);if(fields.includes('shares'))return response({data:[{id:post.id,shares:{count:0}}]});return response({data:[post]});};
 try{const result=await adapter().fetchAccountMetrics(connection);assert.equal(result.accountPosts.length,1);assert.equal(result.accountPosts[0].caption,post.message);assert.equal(result.accountPosts[0].likes,null);assert.equal(result.accountPosts[0].comments,null);assert.equal(result.accountPosts[0].shares,0);assert.equal(result.accountPosts[0].engagement,null);assert.ok(result.reportingWarnings.some(n=>n.includes('Like counts unavailable')));}finally{global.fetch=original;}
});
test('empty authorized feed remains empty without optional field probes or fabricated posts',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async raw=>{const u=new URL(raw),fields=u.searchParams.get('fields');calls.push(fields);if(fields==='id,name')return response({id:'page',name:'Selected Page'});if(fields==='followers_count')return response({});return response({data:[]});};
 try{const result=await adapter().fetchPageActivity(connection,period);assert.deepEqual(result.posts,[]);assert.equal(result.followers,null);assert.equal(calls.length,3);}finally{global.fetch=original;}
});
test('granted Insights can provide the genuine Like count without querying a denied public likes edge',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async raw=>{const u=new URL(raw),fields=u.searchParams.get('fields');calls.push(u);if(fields==='id,name')return response({id:'page',name:'Selected Page'});if(fields==='followers_count')return response({followers_count:15});if(u.searchParams.get('metric')==='post_reactions_like_total')return response({data:[{name:'post_reactions_like_total',values:[{value:4}]}]});if(u.pathname.endsWith('/insights'))return response({data:[]});if(fields.includes('shares'))return response({data:[{id:post.id}]});return response({data:[post]});};
 try{const result=await adapter().fetchPageActivity({...connection,tokenScopes:connection.tokenScopes+',read_insights'},period);assert.equal(result.posts[0].likes,4);assert.equal(result.posts[0].comments,null);assert.ok(calls.every(u=>!u.searchParams.get('fields')?.includes('likes')));assert.ok(result.notices.every(n=>!n.includes('Like counts unavailable')));}finally{global.fetch=original;}
});
test('Page Insights are authorized by Meta rather than rejected by an assumed 100-like threshold',async()=>{
 const original=global.fetch;
 global.fetch=async raw=>{const u=new URL(raw),fields=u.searchParams.get('fields');if(fields==='id,name')return response({id:'page',name:'Selected Page'});if(fields==='followers_count,fan_count')return response({followers_count:15,fan_count:15});if(u.pathname.endsWith('/insights'))return response({data:u.searchParams.get('metric').split(',').map(name=>({name,values:[{value:0}]}))});return response({data:[]});};
 try{const result=await adapter().fetchAccountMetrics({...connection,tokenScopes:connection.tokenScopes+',read_insights'});assert.equal(result.followers,15);assert.equal(result.reach,0);assert.equal(result.views,0);assert.ok(result.reportingWarnings.every(n=>!n.includes('100 likes')));}finally{global.fetch=original;}
});
