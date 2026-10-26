const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
test('canonical calendar response preserves structured fields used to select the new editor',async()=>{
 const brief={version:2,objective:'A specific objective',targetAudience:'A specific audience'};
 const post={id:'p',creativeBrief:brief,creativeDevelopment:{},updatedAt:'2026-10-26T12:00:00Z',assets:[]};
 const {createCanonicalRouteDispatcher}=load('lib/publishing/applicationComposition.ts');
 const dispatch=createCanonicalRouteDispatcher({
  actions:{listPosts:async(actor,id)=>{assert.equal(actor,'owner');assert.equal(id,'calendar');return [post];}},
  authenticateCreator:async()=>({id:'owner'}),resolveCalendar:async()=> 'calendar',
 });
 const response=await dispatch('app/api/calendars/[id]/posts/route.ts#GET',[new Request('http://localhost/api/calendars/calendar/posts'),{params:Promise.resolve({id:'calendar'})}]);
 assert.equal(response.status,200);
 const body=await response.json();
 assert.deepEqual(body.posts[0].creativeBrief,brief);
 assert.deepEqual(body.posts[0].creativeDevelopment,{});
 assert.equal(body.posts[0].updatedAt,post.updatedAt);
});
