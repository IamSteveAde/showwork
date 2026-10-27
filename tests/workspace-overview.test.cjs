const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const {overviewStage,buildWorkspaceOverview}=load('lib/workspaceOverview.ts');
const base={id:'a',postDate:'2026-10-28T12:00:00.000Z',platform:'INSTAGRAM',internalReviewStatus:'PENDING',approvalStatus:'PENDING',instagramPublishStatus:'NOT_SCHEDULED'};
test('overview respects internal review before client review and uses platform publishing status',()=>{
 assert.equal(overviewStage({...base,approvalStatus:'APPROVED'}),'internal');
 assert.equal(overviewStage({...base,internalReviewStatus:'NEEDS_CHANGES'}),'revision');
 assert.equal(overviewStage({...base,internalReviewStatus:'APPROVED'}),'client');
 assert.equal(overviewStage({...base,internalReviewStatus:'APPROVED',approvalStatus:'NEEDS_REVISION'}),'revision');
 assert.equal(overviewStage({...base,internalReviewStatus:'APPROVED',approvalStatus:'APPROVED'}),'ready');
 assert.equal(overviewStage({...base,publishStatus:'PUBLISHED'}),'internal');
 assert.equal(overviewStage({...base,instagramPublishStatus:'PUBLISHED'}),'published');
 assert.equal(overviewStage({...base,isAiDraft:true}),'draft');
});
test('overview partitions every post once and excludes AI drafts from upcoming planning',()=>{
 const posts=[base,{...base,id:'draft',isAiDraft:true},{...base,id:'live',instagramPublishStatus:'PUBLISHED'},{...base,id:'past',postDate:'2026-10-01T00:00:00.000Z'}];
 const result=buildWorkspaceOverview(posts,new Date('2026-10-27T12:00:00.000Z'));
 assert.equal(result.stages.reduce((n,s)=>n+s.count,0),posts.length);
 assert.deepEqual(result.upcoming.map(p=>p.id),['a']);assert.equal(result.days.length,14);
 assert.equal(result.days.find(d=>d.date==='2026-10-28').count,2);
 assert.equal(result.platforms[0].count,4);
});
test('empty workspace has honest zero values and a bounded fourteen-day chart',()=>{
 const result=buildWorkspaceOverview([],new Date('2026-12-31T00:00:00Z'));
 assert.equal(result.days[13].date,'2027-01-13');assert.equal(result.stages.every(s=>s.count===0),true);assert.deepEqual(result.upcoming,[]);
});
test('overview renders empty states without fabricated metrics or inaccessible navigation',()=>{
 const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
 const Overview=load('components/calendars/WorkspaceOverview.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Overview,{clientName:'Test business',posts:[],totalMembers:1,aiActive:false,clientUrl:'',availableSections:['content'],now:'2026-10-27T00:00:00Z'}));
 assert.match(html,/No upcoming posts yet/);assert.match(html,/Test business/);assert.doesNotMatch(html,/NaN|Infinity/);
 assert.doesNotMatch(html,/Open AI Studio|Explore research|Manage channels|View your calendar.*published/);
 assert.match(html,/UTC/);assert.match(html,/Internal review: 0/);
});
