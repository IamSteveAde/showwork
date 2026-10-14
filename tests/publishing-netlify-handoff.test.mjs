import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,mkdir,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {prepareNetlifyHandoff,retiredPublishingFunctions} from '../scripts/vps/prepare-netlify-handoff.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{load}=require('./helpers/load-typescript.cjs');
test('intended function directory removes both publishing hosts and preserves every unrelated function byte-for-byte',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'sw-handoff-'));try{
 await mkdir(path.join(temp,'netlify'));await cp('netlify/functions',path.join(temp,'netlify/functions'),{recursive:true});
 const manifest=await prepareNetlifyHandoff(temp);const files=await readdir(path.join(temp,manifest.functionsDirectory));
 assert.equal(files.length,(await readdir('netlify/functions')).length-2);
 for(const f of retiredPublishingFunctions)assert.equal(files.includes(f),false);
 for(const f of files)assert.deepEqual(await readFile(path.join(temp,manifest.functionsDirectory,f)),await readFile(path.join('netlify/functions',f)));
 assert.equal(manifest.publishingScheduleInvocationsPerDayRemoved,1440);assert.equal(manifest.productionMeasured,false);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('legacy native transport rejects all five platforms before fetch, including publication disguised as preparation',async()=>{
 const {publishingFetch}=load('lib/publishing/executionContext.ts');const prior=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};
 try{
  for(const [url,body] of [['https://graph.facebook.com/v26.0/1/media_publish',{}],['https://graph.facebook.com/v26.0/1/feed',{}],['https://graph.facebook.com/v26.0/1/photos',{}],['https://graph.facebook.com/v26.0/1/video_reels',{upload_phase:'finish'}],['https://graph-video.facebook.com/v26.0/1/videos',{}],['https://open.tiktokapis.com/v2/post/publish/video/init/',{}],['https://open.tiktokapis.com/v2/post/publish/content/init/',{}],['https://api.linkedin.com/rest/posts',{}],['https://api.x.com/2/tweets',{}]])await assert.rejects(publishingFetch(url,{method:'POST',body:JSON.stringify(body)}),/TRANSPORT_RETIRED/);
  await assert.rejects(publishingFetch('https://api.x.com/2/tweets?method=POST'),/TRANSPORT_RETIRED/);
  assert.equal(calls,0);
  await publishingFetch('https://graph.facebook.com/v26.0/1/photos',{method:'POST',body:JSON.stringify({published:false})});
  await publishingFetch('https://graph.facebook.com/v26.0/1/video_reels',{method:'POST',body:JSON.stringify({upload_phase:'start'})});
  await publishingFetch('https://api.x.com/2/users/me');assert.equal(calls,3);
 }finally{globalThis.fetch=prior;}
});
test('runtime grant proposal permits the complete canonical status projection without content mutation grants',async()=>{
 const grant=await readFile('scripts/publishing-reliability/production-grants.proposal.sql','utf8');const match=grant.match(/GRANT UPDATE \("publishStatus"[\s\S]*?ON public\."CalendarPost" TO publishing_runtime;/)[0];
 for(const column of ['platformPostId','instagramMediaId','tikTokPublishId','publishedAt','instagramPublishedAt','tikTokPublishedAt','publishPermalink','instagramPermalink'])assert.ok(match.includes('"'+column+'"'),column);
 for(const column of ['caption','postDate','approvalStatus','calendarId'])assert.equal(match.includes('"'+column+'"'),false,column);
});
