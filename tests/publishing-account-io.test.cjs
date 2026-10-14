'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{load}=require('./helpers/load-typescript.cjs');
test('native account IO rejects creation endpoints and HTTP method overrides before fetch',async()=>{
 const e=load('lib/publishing/executionContext.ts');let calls=0;
 await e.withPublishingAccountIO({signal:new AbortController().signal,fetch:async()=>{calls++;return Response.json({});}},async()=>{
  await e.publishingFetch('https://api.x.com/2/users/me');assert.equal(calls,1);
  for(const [url,method]of [['https://api.x.com/2/tweets','POST'],['https://graph.facebook.com/v26.0/page/feed','POST'],['https://open.tiktokapis.com/v2/post/publish/video/init/','POST'],['https://graph.facebook.com/v26.0/123?method=POST','GET']])await assert.rejects(e.publishingFetch(url,{method}),/ENDPOINT_DENIED/);
  assert.equal(calls,1);
 });
});
