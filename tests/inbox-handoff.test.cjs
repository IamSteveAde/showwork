const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const policy = load('lib/socialMessaging/handoff.ts', { '@/lib/db': { db: {} } });
const member = (id, role, permissions = [], customPermissions = false) => ({ creatorId:id, role, permissions, customPermissions });
test('handoff emails always include owner and every teammate with effective reply responsibility', () => {
  assert.deepEqual(policy.handoffRecipientIds('owner', [member('agent','INBOX_AGENT'),member('manager','MANAGER'),member('social','SOCIAL_MEDIA_MANAGER'),member('reader','VIEWER',['inbox.view'],true),member('custom','SOCIAL_MEDIA_MANAGER',['inbox.view','inbox.reply'],true)]), ['owner','agent','manager','custom']);
});
test('social media managers are fallback when no teammate has inbox responsibility; owner is deduplicated', () => {
  assert.deepEqual(policy.handoffRecipientIds('owner', [member('social','SOCIAL_MEDIA_MANAGER'),member('owner','SOCIAL_MEDIA_MANAGER')]), ['owner','social']);
});
test('human requests, payments, complaints, and sensitive details bypass generation', () => {
  for (const text of ['Can I speak to a person?', 'human please', 'I am ready to buy', 'How can I pay?', 'Please send your bank details', 'I want a refund', 'My order never arrived', 'My password is secret', 'Here is my card number 4242 4242 4242 4242']) assert.ok(policy.requiredHandoffReason(text), text);
  for (const text of ['Hello', 'What services do you offer?', 'What is the price?', 'What are your opening hours?']) assert.equal(policy.requiredHandoffReason(text),null,text);
});
function fixture({ text = 'What is the price?', paused = false, result, duringGeneration } = {}) {
  const state = { aiPausedAt: paused ? new Date() : null, aiHandoffAcknowledgedAt:null, aiControlVersion:0 };
  const notifications = []; const messages = []; let generated=0, sent=0, quota=0;
  const conversationModel = {
    findUniqueOrThrow: async () => ({...state, calendar:{managerId:'owner',collaborators:[member('agent','INBOX_AGENT')]}}),
    updateMany: async ({where,data}) => {
      if ((where.aiPausedAt===null && state.aiPausedAt) || (where.aiControlVersion!==undefined && where.aiControlVersion!==state.aiControlVersion)) return {count:0};
      Object.assign(state,{...data,aiControlVersion:state.aiControlVersion+1});return {count:1};
    }, update:async()=>{},
  };
  const time = new Date();
  const inbound = {id:'in',conversationId:'thread',text,createdAt:time,platformCreatedAt:time,autoReplyAttemptCount:0,conversation:{platform:'INSTAGRAM',providerConversationId:'external',participantPlatformId:'person',participantName:'Ada',connection:{},calendar:{clientName:'Business',aiBusinessSummary:'Facts'},messages:[{id:'in',text,direction:'INBOUND',status:'RECEIVED',createdAt:time,platformCreatedAt:time}]}};
  const tx = { socialLeadConversation:conversationModel, inboxHandoffNotification:{createMany:async({data})=>notifications.push(...data)},socialLeadMessage:{update:async({data})=>messages.push(data),createMany:async()=>({count:1})} };
  const db = { ...tx, socialInboxSettings:{findMany:async()=>[{calendarId:'workspace'}],findUnique:async()=>({aiAutoReplyEnabled:true})}, socialLeadMessage:{...tx.socialLeadMessage,findMany:async()=>[inbound],findFirst:async()=>null,updateMany:async()=>({count:1})},$transaction:async cb=>cb(tx) };
  const api = load('lib/socialMessaging/autoReply.ts', { '@/lib/knowledge/context': { getBusinessKnowledgeContext: async () => 'Facts from current documents' },
    '@/lib/db':{db}, '@/lib/calendarPermissions':{canUseCalendarFeature:async()=>true},
    '@/lib/socialMessaging/handoffNotifications':{deliverHandoffNotifications:async()=>{}},
    '@/lib/contentWorkspaceUsage':{consumeCalendarAiGeneration:async()=>{quota++;return {allowed:true}}},
    '@/lib/openai':{generateSocialInboxAutoReply:async()=>{generated++;if(duringGeneration)duringGeneration(state);return result || {shouldReply:true,replyText:'The package is NGN 50,000.',handoffReason:null}}},
    '@/lib/socialMessaging/registry':{supportsMessaging:()=>true,sendSocialInboxMessage:async()=>{sent++;return 'sent'}},
    '@/lib/socialMessaging/whatsapp':{whatsappAutoReplyHandoff:async()=>null},
  });
  return {api,state,notifications,messages,counts:()=>({generated,sent,quota})};
}
test('payment handoff persists pause, queues owner and agent alerts once, and uses no AI quota', async () => {
  const f=fixture({text:'I am ready to buy'});
  assert.equal((await f.api.processSocialInboxAutoReplies()).handedOff,1);
  assert.ok(f.state.aiPausedAt); assert.equal(f.notifications.length,2); assert.deepEqual(f.counts(),{generated:0,sent:0,quota:0});
  await f.api.processSocialInboxAutoReplies(); assert.equal(f.notifications.length,2); assert.equal(f.counts().sent,0);
});
test('uncertain model response creates durable human handoff without sending its draft', async () => {
  const f=fixture({result:{shouldReply:false,replyText:'An unsafe draft',handoffReason:'The requested price is not confirmed.'}});
  await f.api.processSocialInboxAutoReplies();assert.ok(f.state.aiPausedAt);assert.equal(f.notifications.length,2);assert.equal(f.counts().sent,0);
});
test('staff takeover during generation cancels automatic send', async () => {
  const f=fixture({duringGeneration:state=>{state.aiPausedAt=new Date();state.aiControlVersion++}});
  await f.api.processSocialInboxAutoReplies();assert.equal(f.counts().generated,1);assert.equal(f.counts().sent,0);
});
test('resume during generation invalidates old AI draft and prevents stale model handoff', async () => {
  for(const result of [undefined,{shouldReply:false,replyText:'',handoffReason:'Needs confirmation'}]) {
    const f=fixture({result,duringGeneration:state=>state.aiControlVersion++});
    await f.api.processSocialInboxAutoReplies();assert.equal(f.counts().sent,0);assert.equal(f.state.aiPausedAt,null);assert.equal(f.notifications.length,0);
  }
});
test('routine known question continues to receive an automatic reply', async () => {
  const f=fixture();assert.equal((await f.api.processSocialInboxAutoReplies()).sent,1);assert.equal(f.notifications.length,0);
});
function emailFixture({ fails=false, claim=1, eligible=true }={}) {
  const writes=[],emails=[];const notification={id:'alert',conversationId:'thread',recipientId:'owner',attempts:0};
  const db={inboxHandoffNotification:{findMany:async()=>[notification],updateMany:async()=>({count:claim}),update:async args=>writes.push(args.data)},socialLeadConversation:{findUniqueOrThrow:async()=>({calendarId:'workspace',calendar:{managerId:eligible?'owner':'new-owner',collaborators:[]}})},creator:{findUnique:async()=>({email:'owner@example.test'})}};
  const api=load('lib/socialMessaging/handoffNotifications.ts',{'@/lib/db':{db},'@/lib/resend':{sendInboxHandoffEmail:async args=>{emails.push(args);if(fails)throw Error('provider unavailable')}}});
  return {api,writes,emails};
}
test('email failure remains queued for retry and never marks delivery successful',async()=>{
  const f=emailFixture({fails:true});const original=console.error;console.error=()=>{};
  try{await f.api.deliverHandoffNotifications();}finally{console.error=original;}
  assert.equal(f.writes[0].sentAt,undefined);assert.equal(f.writes[0].claimedAt,null);assert.ok(f.writes[0].nextAttemptAt>Date.now());assert.equal(f.emails[0].notificationId,'alert');
});
test('email alerts contain only identifiers, successful sends are recorded, and concurrent claims cannot duplicate send',async()=>{
  const f=emailFixture();await f.api.deliverHandoffNotifications();assert.ok(f.writes[0].sentAt);assert.deepEqual(Object.keys(f.emails[0]).sort(),['calendarId','conversationId','notificationId','to']);
  const duplicate=emailFixture({claim:0});await duplicate.api.deliverHandoffNotifications();assert.equal(duplicate.emails.length,0);
});
test('teammates no longer responsible for the inbox receive no queued email',async()=>{
  const f=emailFixture({eligible:false});await f.api.deliverHandoffNotifications();assert.equal(f.emails.length,0);assert.ok(f.writes[0].sentAt);
});
function controlRoute({allowed=true,found=true}={}) {
  const writes=[],retired=[];
  const db={$transaction:async cb=>cb({socialLeadConversation:{updateMany:async args=>{writes.push(args);return {count:found?1:0}}},socialLeadMessage:{updateMany:async args=>retired.push(args)}})};
  const api=load('app/api/calendars/[id]/inbox/[conversationId]/route.ts',{'@/lib/db':{db},'@/lib/auth':{getCurrentCreator:async()=>({id:'staff'})},'@/lib/calendarPermissions':{hasCalendarPermission:async()=>allowed,calendarFeatureGate:async()=>null},'@/lib/socialInbox':{SOCIAL_LEAD_STATUSES:[]}});
  return {api,writes,retired};
}
const context=()=>({params:Promise.resolve({id:'workspace',conversationId:'thread'})});
const request=body=>new Request('https://test/api',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('resume is permission checked, workspace scoped, invalidates drafts, and retires earlier pending messages',async()=>{
  const f=controlRoute();assert.equal((await f.api.PATCH(request({aiAction:'resume'}),context())).status,200);
  assert.deepEqual(f.writes[0].where,{id:'thread',calendarId:'workspace'});assert.equal(f.writes[0].data.aiPausedAt,null);assert.deepEqual(f.writes[0].data.aiControlVersion,{increment:1});assert.ok(f.retired[0].data.autoReplyHandledAt);
  const forbidden=controlRoute({allowed:false});assert.equal((await forbidden.api.PATCH(request({aiAction:'resume'}),context())).status,404);assert.equal(forbidden.writes.length,0);
});
test('invalid handoff actions and conversations from another workspace cannot mutate messages',async()=>{
  const invalid=controlRoute();assert.equal((await invalid.api.PATCH(request({aiAction:'alwaysHuman'}),context())).status,400);assert.equal(invalid.writes.length,0);
  const missing=controlRoute({found:false});assert.equal((await missing.api.PATCH(request({aiAction:'takeover'}),context())).status,404);assert.equal(missing.retired.length,0);
});
test('a manual staff reply pauses AI before contacting the platform, even if sending fails',async()=>{
  for(const fails of [false,true]) {
    const calls=[];const message={id:'out',direction:'OUTBOUND',status:'SENT',text:'Our team will help.',platformCreatedAt:new Date()};
    const conversation={id:'thread',platform:'INSTAGRAM',leadStatus:'NEW',connection:{},calendar:{instagramPageId:null},providerConversationId:'external',participantPlatformId:'person'};
    const db={socialLeadConversation:{findFirst:async()=>conversation,update:async({data})=>calls.push({pause:data.aiPausedAt})},socialLeadMessage:{createMany:async()=>({count:1}),create:async()=>{},findFirstOrThrow:async()=>message}};
    const api=load('app/api/calendars/[id]/inbox/[conversationId]/reply/route.ts',{'@/lib/db':{db},'@/lib/auth':{getCurrentCreator:async()=>({id:'staff'})},'@/lib/calendarPermissions':{hasCalendarPermission:async()=>true,canAccessCalendarById:async()=>true,calendarFeatureGate:async()=>null},'@/lib/socialMessaging/registry':{supportsMessaging:()=>true,sendSocialInboxMessage:async()=>{assert.ok(calls[0].pause);calls.push('send');if(fails)throw Error('unavailable');return 'provider-id'}},'@/lib/socialMessaging/meta':{MetaMessagingWindowClosedError:class extends Error{}}});
    const response=await api.POST(new Request('https://test/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Our team will help.'})}),context());
    assert.equal(response.status,fails?502:200);assert.ok(calls[0].pause);
  }
});
test('paused inbox presents the reason, attention queue and explicit takeover/resume actions',()=>{
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');let index=0;
  const thread={id:'thread',platform:'INSTAGRAM',participantPlatformId:'person',participantName:'Ada',participantUsername:null,leadStatus:'NEW',unreadCount:1,lastMessageAt:new Date().toISOString(),lastMessagePreview:'Ready to buy',connection:{id:'channel',status:'CONNECTED'},aiPausedAt:new Date().toISOString(),aiHandoffReason:'Buying or payment request: the team needs to guide the next step.',aiHandoffAcknowledgedAt:null,messages:[]};
  const inbox={summary:{newMessages:1,leads:1,needsAttention:1,messagesThisMonth:1,allMessages:1},accounts:[{id:'channel',platform:'INSTAGRAM',status:'CONNECTED',messagingAvailable:true},{id:'x-channel',platform:'X',status:'CONNECTED',messagingAvailable:true}],settings:{aiAutoReplyEnabled:true,clientAccessEnabled:true},conversations:[thread]};
  const stub={__esModule:true,default:()=>null};
  const Component=load('components/calendars/SocialLeadInbox.tsx',{'react':{...React,useState:initial=>{const position=index++;return [position===3?inbox:position===4?'thread':typeof initial==='function'?initial():initial,()=>{}]}},'next/image':{__esModule:true,default:props=>React.createElement('img',props)},'@/lib/publishing/clientRequests':{},'@/components/calendars/WorkspaceFeatureNotice':stub,'./InboxSetupPanel':stub,'./ReplyDraftAssistant':stub,'./XChatInbox':{__esModule:true,default:()=>React.createElement('div',null,'X unlock controls')}}).default;
  const html=renderToStaticMarkup(React.createElement(Component,{calendarId:'workspace',canReplyFromWorkspace:true,isOwner:true}));
  for(const text of ['Needs attention','Human handoff','AI paused','Buying or payment request','Take over','Resume AI'])assert.ok(html.includes(text),text);
  assert.ok(html.includes('Encrypted X messages'));
  assert.ok(html.indexOf('X unlock controls') < html.indexOf('<aside'), 'X tools must sit outside the conversation list');
  assert.ok(html.includes('Expand conversation view'));
});
