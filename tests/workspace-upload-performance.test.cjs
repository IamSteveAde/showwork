const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');

const basePost = { id:'p', calendarId:'w', calendar:{managerId:'owner'}, approvalStatus:'PENDING', platform:'INSTAGRAM', instagramPublishStatus:'NOT_SCHEDULED', tikTokPublishStatus:'NOT_SCHEDULED', publishStatus:'NOT_SCHEDULED', tikTokPublishId:null, platformPostId:null };
function presignFixture({ allowed=true, post=basePost }={}) {
  let reads=0,reservations=0;
  const {POST} = load('app/api/calendars/[id]/posts/[postId]/upload-presign/route.ts', {
    '@/lib/auth':{getCurrentCreator:async()=>({id:'member'})},
    '@/lib/calendarPermissions':{hasCalendarPermission:async(actor,workspace,permission)=>{assert.deepEqual([actor,workspace,permission],['member','w','ADD_CONTENT']);return allowed;}},
    '@/lib/db':{db:{calendarPost:{findUnique:async()=>{reads++;return post;}}}},
    '@/lib/contentWorkspaceUsage':{reserveContentWorkspaceStorage:async(owner,workspace,key,size)=>{reservations++;assert.equal(owner,'owner');assert.equal(workspace,'w');assert.ok(key.startsWith('calendars/w/p/'));assert.equal(size,10);return {allowed:true,reservationId:'r'};}},
    '@/lib/r2':{isAllowedContentType:()=>true,getPresignedUploadUrl:async()=> 'https://private.invalid/signed?secret=never-log'},
  });
  return { run:()=>POST(new Request('http://localhost/upload',{method:'POST',body:JSON.stringify({filename:'image.jpg',contentType:'image/jpeg',fileSize:10})}),{params:Promise.resolve({id:'w',postId:'p'})}),reads:()=>reads,reservations:()=>reservations };
}
test('preparation checks post state from a single read, reserves owner quota, and exposes safe stage timings',async()=>{
  const f=presignFixture();const response=await f.run();assert.equal(response.status,200);assert.equal(f.reads(),1);assert.equal(f.reservations(),1);
  const timing=response.headers.get('server-timing');for(const stage of ['auth','permission','lookup','reservation','signing','total'])assert.match(timing,new RegExp(stage+';dur='));
  assert.ok(!timing.includes('secret'));assert.ok(!timing.includes('image.jpg'));
});
test('unauthorized, foreign, approved and publishing posts cannot reserve upload space',async()=>{
  for(const [input,status] of [
    [{allowed:false},403], [{post:{...basePost,calendarId:'foreign'}},404],
    [{post:{...basePost,approvalStatus:'APPROVED'}},409],
    [{post:{...basePost,instagramPublishStatus:'SCHEDULED'}},409],
    [{post:{...basePost,platform:'TIKTOK',tikTokPublishStatus:'PUBLISHING'}},409],
    [{post:{...basePost,platform:'FACEBOOK',publishStatus:'PUBLISHED'}},409],
    [{post:{...basePost,platformPostId:'provider-id'}},409],
  ]){const f=presignFixture(input);assert.equal((await f.run()).status,status);assert.equal(f.reservations(),0);}
});
test('concurrent upload timings remain request-local and failed stages retain their duration',async()=>{
  const {timeWorkspaceUpload,measureUploadStage}=load('lib/workspaceUploadTiming.ts');
  let release;const gate=new Promise(resolve=>release=resolve);
  const a=timeWorkspaceUpload(async()=>{await measureUploadStage('first',()=>gate);return Response.json({});});
  const b=await timeWorkspaceUpload(async()=>{try{await measureUploadStage('second',async()=>{throw Error('private diagnostic');});}catch{}return Response.json({},{status:422});});
  release();const response=await a;
  assert.match(response.headers.get('server-timing'),/first;dur=/);assert.doesNotMatch(response.headers.get('server-timing'),/second/);
  assert.match(b.headers.get('server-timing'),/second;dur=/);assert.doesNotMatch(b.headers.get('server-timing'),/first|private/);
});
