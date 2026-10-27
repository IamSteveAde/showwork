const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
const {matchesCalendarStage}=load('lib/calendarWorkflow.ts');
test('content stage filters keep internal work private and separate from client review',()=>{
 const post={internalReviewStatus:'PENDING',approvalStatus:'PENDING'};
 assert.equal(matchesCalendarStage(post,'internal'),true);assert.equal(matchesCalendarStage(post,'client'),false);
 assert.equal(matchesCalendarStage({...post,internalReviewStatus:'NEEDS_CHANGES'},'internal'),true);
 assert.equal(matchesCalendarStage({...post,internalReviewStatus:'APPROVED'},'client'),true);
 assert.equal(matchesCalendarStage({...post,internalReviewStatus:'APPROVED',approvalStatus:'APPROVED'},'publishing'),true);
 assert.equal(matchesCalendarStage({...post,isAiDraft:true},'internal'),false);assert.equal(matchesCalendarStage({...post,isAiDraft:true},'all'),true);
});
test('publishing filter covers scheduled and published content, without dropping it from all content',()=>{
 for(const status of ['SCHEDULED','PUBLISHING','PUBLISHED']){
 const post={internalReviewStatus:'APPROVED',approvalStatus:'APPROVED',publishStatus:status};assert.equal(matchesCalendarStage(post,'publishing'),true);assert.equal(matchesCalendarStage(post,'all'),true);assert.equal(matchesCalendarStage(post,'internal'),false);
 }
});
