const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
const {calendarWorkflow}=load('lib/calendarWorkflow.ts');
test('workflow labels follow internal review before client review and distinguish scheduled from approval',()=>{
 const post={approvalStatus:'PENDING',internalReviewStatus:'PENDING'};
 assert.equal(calendarWorkflow(post).label,'Pending internal review');
 assert.equal(calendarWorkflow({...post,internalReviewStatus:'NEEDS_CHANGES'}).stage,1);
 assert.equal(calendarWorkflow({...post,internalReviewStatus:'APPROVED'}).label,'Awaiting client review');
 const approved={...post,internalReviewStatus:'APPROVED',approvalStatus:'APPROVED'};
 assert.equal(calendarWorkflow(approved).label,'Ready to publish');
 assert.equal(calendarWorkflow({...approved,publishStatus:'SCHEDULED'}).label,'Scheduled');
 assert.equal(calendarWorkflow({...approved,tikTokPublishStatus:'PUBLISHED'}).stage,4);
 assert.equal(calendarWorkflow({...approved,publishStatus:'FAILED'}).label,'Publishing needs attention');
 assert.equal(calendarWorkflow({...post,isAiDraft:true}).label,'Draft');
});
test('recipients include owner, managers and creative roles, deduplicate and respect restricted access',()=>{
 const {workflowRecipients}=load('lib/calendarReviewNotifications.ts');
 const row=(role,email,extra={})=>({role,email,owner:false,permissions:[],customPermissions:false,...extra});
 assert.deepEqual(workflowRecipients([
  row('OWNER','Owner@example.test',{owner:true}),row('MANAGER','manager@example.test'),row('SOCIAL_MEDIA_MANAGER','social@example.test'),row('CREATIVE_CONTRIBUTOR','designer@example.test'),row('ADD_CONTENT','designer@example.test'),row('EDIT_CALENDAR','legacy@example.test'),row('VIEWER','viewer@example.test'),row('INBOX_AGENT','inbox@example.test'),row('MANAGER','restricted@example.test',{customPermissions:true,permissions:['calendar.view']}),
 ]),['owner@example.test','manager@example.test','social@example.test','designer@example.test','legacy@example.test']);
});
test('notifications retry per recipient after commit and report failures without undoing the review',async()=>{
 const calls=[];let retry=0;
 const {notifyInternalReview}=load('lib/calendarReviewNotifications.ts',{'@/lib/resend':{sendInternalReviewEmail:async input=>{calls.push(input);if(input.to==='retry@example.test'&&retry++===0)throw Error('temporary');}}});
 const event={calendarId:'workspace',postId:'post',version:7,action:'feedback',note:'Private feedback'};
 const query=async(sql,args)=>{assert.deepEqual(args,['workspace']);assert.match(sql,/isDeactivated/);return {rows:['owner','retry'].map(name=>({owner:true,email:name+'@example.test'}))};};
 assert.deepEqual(await notifyInternalReview(event,query),{sent:2,failed:0});assert.equal(calls.length,3);assert(calls.every(call=>call.version===7&&call.note==='Private feedback'));
 assert.deepEqual(await notifyInternalReview(event,async()=>{throw Error('offline')}),{sent:0,failed:1});
});
test('email escapes private feedback, links to exact post and uses stable recipient-specific idempotency',async()=>{
 const old=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY='test-only';const calls=[];
 try {
  const {sendInternalReviewEmail}=load('lib/resend.ts',{'@/lib/publishing/nativeApplicationContext':{nativeApplicationContext:()=>undefined}});
  const transport=async(payload,key)=>{calls.push({payload,key});return {data:{id:'test'},error:null};};
  const input={to:'designer@example.test',calendarId:'workspace',postId:'post',version:2,action:'request_changes',note:'<script>private</script>'};
  await sendInternalReviewEmail(input,transport);await sendInternalReviewEmail(input,transport);await sendInternalReviewEmail({...input,to:'owner@example.test'},transport);
  assert.equal(calls[0].key,calls[1].key);assert.notEqual(calls[0].key,calls[2].key);assert(calls[0].key.length<256);assert.match(calls[0].payload.html,/&lt;script&gt;/);assert.match(calls[0].payload.html,/post=post/);assert.equal(calls[0].payload.to,'designer@example.test');
 } finally {if(old===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=old;}
});
test('feedback requires a note and preserves approval state rather than granting approval',()=>{
 const {internalReviewInput}=load('lib/calendarInternalReview.ts');assert.throws(()=>internalReviewInput({action:'feedback',version:0,note:''}));assert.equal(internalReviewInput({action:'feedback',version:0,note:'Please check the typography'}).status,undefined);
});
test('legacy API lets designers leave feedback but reserves approval for reviewers and sends only after commit',async()=>{
 for(const [role,action,expected] of [['designer','feedback',200],['designer','approve',403],['manager','approve',200]]) {
  let committed=false,notifications=0;const current={id:'post',calendarId:'workspace',approvalStatus:'PENDING',internalReviewStatus:'PENDING',internalReviewVersion:0,internalReviewedBy:'original-reviewer',internalReviewedAt:'2026-10-24T00:00:00Z',assets:[],videoComments:[],customFields:[]};
  const {POST}=load('app/api/calendars/[id]/posts/[postId]/internal-review/route.ts',{
   '@/lib/auth':{getCurrentCreator:async()=>({id:role})},'@/lib/calendarPermissions':{hasCalendarPermission:async(_actor,_calendar,permission)=>role==='manager'||permission==='creatives.upload'},
   '@/lib/publishing/applicationBoundary':{publishingIntegrationInstalled:()=>false},'@/lib/r2':{publicUrlFor:()=>''},
   '@/lib/calendarReviewNotifications':{notifyInternalReview:async event=>{assert(committed);notifications++;assert.equal(event.version,1);return {sent:3,failed:0};}},
   '@/lib/db':{db:{$transaction:async fn=>{const result=await fn({$queryRaw:async()=>[],calendarPost:{findFirst:async()=>current,update:async({data})=>({...current,...data,internalReviewVersion:1})}});committed=true;return result;}}},
  });
  const result=await POST(new Request('https://example.test/review',{method:'POST',body:JSON.stringify({action,version:0,note:'Feedback'})}),{params:Promise.resolve({id:'workspace',postId:'post'})});
  assert.equal(result.status,expected);assert.equal(notifications,expected===200?1:0);
  if(expected===200){const body=await result.json();assert.equal(body.post.internalReviewStatus,action==='approve'?'APPROVED':'PENDING');assert.equal(body.notifications.sent,3);if(action==='feedback'){assert.equal(body.post.internalReviewedBy,'original-reviewer');assert.equal(body.post.internalReviewedAt,'2026-10-24T00:00:00Z');}}
 }
});
