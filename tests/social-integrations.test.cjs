const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
// Transpile isolated modules with explicit DB/storage doubles. No .env load,
// real provider calls, database writes, or package installation is required.
function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} }; cache.set(file, mod.exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  function localRequire(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      return load(target.endsWith('.ts') ? target : target + '.ts', mocks, cache);
    }
    return require(name);
  }
  new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
  cache.set(file, mod.exports); return mod.exports;
}
const state = () => load('lib/publishing/state.ts');
const tokenMock = { requireScopes: (c, scopes) => { if (scopes.some(scope => !c.tokenScopes?.split(' ').includes(scope))) throw new Error('permission is missing'); } };
const providers = (extra = {}) => load('lib/publishing/providers.ts', { '@/lib/r2': { publicUrlFor: key => `https://storage.test/${key}` }, '@/lib/socialTokens': tokenMock, ...extra });
const response = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const post = (assets = []) => ({ caption: 'Hello', cta: null, hashtags: null, taggedAccounts: null, linkUrl: null, postType: null, assets });
const connection = (tokenScopes = '') => ({ platformAccountId: '123', accessToken: 'fake-test-token', tokenScopes });

test('shared status does not overwrite legacy Instagram/TikTok status', () => {
  const s = state();
  assert.deepEqual(s.statusUpdate('FACEBOOK', 'FAILED', 'bad'), { publishStatus: 'FAILED', publishError: 'bad' });
  assert.deepEqual(s.statusWhere('TIKTOK', 'SCHEDULED'), { platform: 'TIKTOK', tikTokPublishStatus: 'SCHEDULED' });
  assert.equal(s.statusField('INSTAGRAM'), 'instagramPublishStatus');
});
test('reject mixed TikTok media, documents and X photo overflow before a provider call', () => {
  const { validatePublishContent: validate } = state();
  assert.throws(() => validate('TIKTOK', [{ mediaType: 'VIDEO' }, { mediaType: 'PHOTO' }], 'Caption'), /Mixed media/);
  assert.throws(() => validate('FACEBOOK', [{ mediaType: 'PDF' }], 'Caption'), /photos and videos/);
  assert.throws(() => validate('X', Array(5).fill({ mediaType: 'PHOTO' }), 'Caption'), /at most 4/);
  assert.throws(() => validate('TIKTOK', Array(36).fill({ mediaType: 'PHOTO' }), 'Caption'), /at most 35/);
});
test('text-only posts allowed on Facebook, LinkedIn and X, but not TikTok/Instagram', () => {
  for (const platform of ['FACEBOOK','LINKEDIN','X']) assert.doesNotThrow(() => state().validatePublishContent(platform, [], 'Caption'));
  for (const platform of ['INSTAGRAM','TIKTOK']) assert.throws(() => state().validatePublishContent(platform, [], 'Caption'), /Add content/);
});
test('Facebook text/link post uses Page feed and returns provider ID', async () => {
  global.fetch = async (url, init) => { assert.match(url, /123\/feed$/); assert.equal(JSON.parse(init.body).message, 'Hello'); return response({ id: '123_456' }); };
  assert.equal((await providers().publishFacebook(post(), connection('pages_manage_posts pages_read_engagement'))).id, '123_456');
});
test('Facebook carousel uploads unpublished photos then publishes one feed post', async () => {
  const calls = [];
  global.fetch = async (url, init) => { const body = JSON.parse(init.body); calls.push({url, body}); return response({ id: url.endsWith('/photos') ? `photo${calls.length}` : 'feed123' }); };
  await providers().publishFacebook(post([{ mediaType:'PHOTO', fileKey:'a' }, { mediaType:'PHOTO', fileKey:'b' }]), connection('pages_manage_posts pages_read_engagement'));
  assert.equal(calls.length, 3); assert.equal(calls[0].body.published, false);
  assert.deepEqual(calls[2].body.attached_media, [{ media_fbid: 'photo1' }, { media_fbid: 'photo2' }]);
});
test('Facebook rejects publishing without granted scope', async () => {
  global.fetch = async () => assert.fail('must not call provider');
  await assert.rejects(providers().publishFacebook(post(), connection()), /permission/);
});
test('Facebook video retry checks existing ID instead of uploading twice', async () => {
  global.fetch = async (url, init) => { assert.equal(init.method, undefined); assert.match(url, /existing\?fields=status/); return response({ status: { video_status: 'ready' } }); };
  const result = await providers().publishFacebook({ ...post([{ mediaType:'VIDEO', fileKey:'video' }]), platformPostId:'existing' }, connection('pages_manage_posts pages_read_engagement'));
  assert.equal(result.id, 'existing');
});
test('Facebook Reel uses hosted upload, finish and confirmed status', async () => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push(url);
    if (url.includes('rupload.')) { assert.equal(init.headers.file_url, 'https://storage.test/v'); return response({success:true}); }
    if (url.includes('fields=status')) return response({status:{video_status:'ready', publishing_phase:{status:'complete'}}});
    const body = JSON.parse(init.body);
    return response(body.upload_phase === 'start' ? {video_id:'reel1',upload_url:'https://rupload.facebook.com/video-upload/v26.0/reel1'} : {success:true});
  };
  let saved;
  const result = await providers().publishFacebook({...post([{mediaType:'VIDEO',fileKey:'v'}]),postType:'Reel'}, connection('pages_manage_posts pages_read_engagement'), async id => { saved = id; });
  assert.equal(saved,'reel1'); assert.match(result.permalink,/\/reel\/reel1/); assert.equal(calls.length,4);
});
test('LinkedIn text posts use member author and returned URN', async () => {
  global.fetch = async (url, init) => { assert.equal(url,'https://api.linkedin.com/rest/posts'); const body=JSON.parse(init.body); assert.equal(body.author,'urn:li:person:123'); assert.equal(body.lifecycleState,'PUBLISHED'); return response({},201,{'x-restli-id':'urn:li:share:456'}); };
  assert.equal((await providers().publishLinkedIn(post(),connection('w_member_social'))).id,'urn:li:share:456');
});
test('LinkedIn image publishing does not require unauthorized image GET', async () => {
  const calls=[];
  global.fetch=async (url,init={}) => { calls.push(url);
    if(url.includes('initializeUpload')) return response({value:{image:'urn:li:image:1',uploadUrl:'https://www.linkedin.com/upload/1'}});
    if(url.startsWith('https://storage.test')) return new Response('image',{headers:{'content-type':'image/jpeg'}});
    if(url==='https://www.linkedin.com/upload/1') return new Response(null,{status:201});
    assert.equal(url,'https://api.linkedin.com/rest/posts'); assert.equal(JSON.parse(init.body).content.media.id,'urn:li:image:1'); return response({},201,{'x-restli-id':'urn:li:share:1'});
  };
  await providers().publishLinkedIn(post([{mediaType:'PHOTO',fileKey:'a'}]),connection('w_member_social')); assert.equal(calls.length,4);
});
test('X media upload uses chunk endpoints and attaches resulting ID', async () => {
  const calls=[];
  global.fetch = async(url,init={}) => { calls.push(url);
    if(init.method==='HEAD') return new Response(null,{headers:{'content-length':'4','content-type':'image/jpeg'}});
    if(url.startsWith('https://storage.test')) return new Response('test',{status:206,headers:{'content-type':'image/jpeg'}});
    if(url.endsWith('/initialize')) return response({data:{id:'media1'}});
    if(url.endsWith('/append')) {assert.equal(init.body.get('segment_index'),'0');return new Response(null,{status:204});}
    if(url.endsWith('/finalize')) return response({data:{id:'media1'}});
    assert.equal(url,'https://api.x.com/2/tweets'); assert.deepEqual(JSON.parse(init.body).media.media_ids,['media1']); return response({data:{id:'tweet1'}});
  };
  assert.equal((await providers().publishX(post([{mediaType:'PHOTO',fileKey:'a'}]),connection('tweet.write media.write'))).id,'tweet1');
  assert.equal(calls.length,6);
});
test('provider API errors never count as successful publishing', async () => {
  global.fetch=async()=>response({errors:[{detail:'Access denied'}]},403);
  await assert.rejects(providers().publishX(post(),connection('tweet.write')),/Access denied/);
});
test('TikTok photo description preserves full caption and obeys title length', async () => {
  global.fetch=async(url,init)=>{const body=JSON.parse(init.body); assert.equal(body.post_info.description,'a'.repeat(150));assert.equal(body.post_info.title.length,90);assert.equal(body.post_info.disable_comment,true);return response({error:{code:'ok'},data:{publish_id:'p1'}});};
  const tiktok=load('lib/tiktok.ts'); await tiktok.initTikTokPhotoPublish({accessToken:'fake',photoUrls:['https://storage.test/a'],caption:'a'.repeat(150),privacyLevel:'SELF_ONLY',disableComment:true});
});
test('X reporting keeps unavailable counters null, rather than inventing zeros',()=>{
  const {xMetrics}=load('lib/reporting/adapters/x.ts',{'@/lib/socialTokens':{},'@/lib/publishing/http':{}});
  assert.equal(xMetrics({id:'1',text:''}).engagement,null);
  const m=xMetrics({id:'1',text:'',public_metrics:{like_count:2,reply_count:3,retweet_count:4,quote_count:1,impression_count:100}});
  assert.equal(m.engagement,10);assert.equal(m.engagementRate,.1);
});
test('worker duplicate lease never makes a platform call',async()=>{
  const {runPublishJob}=load('lib/publishing/worker.ts',{'@/lib/db':{db:{calendarPost:{updateMany:async()=>({count:0})}}},'@/lib/calendarPermissions':{},'@/lib/instagramPublishing':{},'@/lib/tiktokPublishing':{},'@/lib/socialReporting':{},'@/lib/socialTokens':{},'./providers':{}});
  await runPublishJob('post','FACEBOOK',new Date());
});
test('dispatch timeout fails ambiguous job instead of automatically retrying',async()=>{
  const updates=[]; const env={URL:process.env.URL,CRON_SECRET:process.env.CRON_SECRET}; process.env.URL='https://site.test'; process.env.CRON_SECRET='fake';
  try {
    global.fetch=async()=>{throw new Error('timeout');};
    const {runScheduledPublishing}=load('lib/publishing/scheduler.ts',{'@/lib/db':{db:{calendarPost:{updateMany:async args=>{updates.push(args);return {count:1};},findMany:async()=>[{id:'p',platform:'FACEBOOK'}]}}}});
    await runScheduledPublishing(['FACEBOOK']);
    const last=updates.at(-1);assert.equal(last.data.publishStatus,'FAILED');assert.equal(last.where.publishWorkerStartedAt,null);
  } finally { for(const [key,value] of Object.entries(env)) {if(value===undefined)delete process.env[key];else process.env[key]=value;} }
});
test('duplicate inbox event does not increment unread counts or create a lead',async()=>{
  const tx={socialLeadConversation:{upsert:async()=>({id:'thread',leadStatus:'NEW'}),update:async()=>assert.fail('duplicate unread'),updateMany:async()=>assert.fail('duplicate preview')},socialLeadMessage:{createMany:async()=>({count:0})},calendarLead:{upsert:async()=>assert.fail('duplicate lead')}};
  const {ingestSocialMessage}=load('lib/socialMessaging/ingest.ts',{'@/lib/db':{db:{$transaction:fn=>fn(tx)}}});
  assert.equal(await ingestSocialMessage({id:'connection',calendarId:'workspace',platform:'X'},{conversationId:'external',messageId:'m1',participantId:'person',text:'hello',createdAt:new Date(),outbound:false}),false);
});
test('new inbox event scopes conversation and CRM lead to its connection workspace',async()=>{
  let conversationArgs,leadArgs,messageArgs,unread=0;
  const tx={socialLeadConversation:{upsert:async args=>{conversationArgs=args;return{id:'thread',leadStatus:'NEW'};},update:async()=>{unread++;},updateMany:async()=>({count:1})},socialLeadMessage:{createMany:async args=>{messageArgs=args;return{count:1};}},calendarLead:{upsert:async args=>{leadArgs=args;}}};
  const {ingestSocialMessage}=load('lib/socialMessaging/ingest.ts',{'@/lib/db':{db:{$transaction:fn=>fn(tx)}}});
  await ingestSocialMessage({id:'connectionA',calendarId:'workspaceA',platform:'X'},{conversationId:'external',messageId:'m1',participantId:'person',text:'hello',createdAt:new Date(),outbound:false});
  assert.equal(conversationArgs.create.calendarId,'workspaceA');assert.equal(conversationArgs.where.socialConnectionId_providerConversationId.socialConnectionId,'connectionA');assert.equal(leadArgs.create.calendarId,'workspaceA');assert.equal(unread,1);assert.equal(messageArgs.data[0].autoReplyEligible,false);
});
test('shared messaging dispatch keeps Meta and X separate',async()=>{
  const {sendSocialInboxMessage}=load('lib/socialMessaging/registry.ts',{'@/lib/socialTokens':{freshConnection:async c=>c,requireScopes:tokenMock.requireScopes},'./meta':{sendMetaInboxMessage:async()=> 'meta-message'},'@/lib/publishing/http':{providerJson:async(url,init)=>{assert.match(url,/with\/recipient\/messages$/);assert.equal(JSON.parse(init.body).text,'Hello');return{data:{dm_event_id:'x-message'}};}}});
  assert.equal(await sendSocialInboxMessage({connection:{status:'CONNECTED',platform:'FACEBOOK'},recipientId:'recipient',text:'Hello'}),'meta-message');
  assert.equal(await sendSocialInboxMessage({connection:{status:'CONNECTED',platform:'X',tokenScopes:'dm.write'},recipientId:'recipient',text:'Hello'}),'x-message');
  await assert.rejects(sendSocialInboxMessage({connection:{status:'CONNECTED',platform:'TIKTOK'},recipientId:'recipient',text:'Hello'}),/approval/);
});
test('initial X inbox history cannot trigger AI replies, and group DMs are excluded',async()=>{
  const ingested=[];
  const now=new Date();
  const {syncXInbox}=load('lib/socialMessaging/x.ts',{
    '@/lib/db':{db:{socialInboxSettings:{findUnique:async()=>({aiAutoReplyEnabled:true})},socialConnection:{updateMany:async()=>({count:1})}}},
    '@/lib/calendarPermissions':{canAccessCalendarById:async()=>true},
    '@/lib/socialTokens':{freshConnection:async c=>c,requireScopes:()=>{}},
    '@/lib/publishing/http':{providerJson:async()=>({data:[{id:'message1',sender_id:'other',participant_ids:['me','other'],dm_conversation_id:'me-other',created_at:now.toISOString(),text:'Hello'},{id:'group',sender_id:'other',participant_ids:['me','other','third'],dm_conversation_id:'group',created_at:now.toISOString(),text:'Hello'}]})},
    './ingest':{ingestSocialMessage:async(c,event)=>ingested.push(event)},
  });
  await syncXInbox({id:'conn',platformAccountId:'me',calendarId:'calendar',messagingLastSyncAt:null});
  assert.equal(ingested.length,1);assert.equal(ingested[0].autoReplyEligible,false);
});
test('publishing route denies an unapproved post without changing state',async()=>{
  const {POST}=load('app/api/calendars/[id]/posts/[postId]/publish/route.ts',{
    '@/lib/auth':{getCurrentCreator:async()=>({id:'creator'})},
    '@/lib/calendarPermissions':{hasCalendarPermission:async()=>true,canAccessCalendarById:async()=>true},
    '@/lib/db':{db:{calendarPost:{findFirst:async()=>({platform:'FACEBOOK',publishStatus:'NOT_SCHEDULED',approvalStatus:'PENDING'}),updateMany:async()=>assert.fail('must not schedule')}}},
  });
  const result=await POST(new Request('https://site.test',{method:'POST',body:JSON.stringify({action:'schedule'})}),{params:Promise.resolve({id:'workspace',postId:'post'})});
  assert.equal(result.status,409);
});
test('publishing route requires duplicate-risk acknowledgment before retry',async()=>{
  const {POST}=load('app/api/calendars/[id]/posts/[postId]/publish/route.ts',{
    '@/lib/auth':{getCurrentCreator:async()=>({id:'creator'})},
    '@/lib/calendarPermissions':{hasCalendarPermission:async()=>true,canAccessCalendarById:async()=>true},
    '@/lib/db':{db:{calendarPost:{findFirst:async()=>({platform:'FACEBOOK',publishStatus:'FAILED',approvalStatus:'APPROVED',isAiDraft:false}),updateMany:async()=>assert.fail('must not retry')}}},
  });
  const result=await POST(new Request('https://site.test',{method:'POST',body:JSON.stringify({action:'retry'})}),{params:Promise.resolve({id:'workspace',postId:'post'})});
  assert.equal(result.status,409);
});
test('publishing worker requires matching lease and approved non-draft content',async()=>{
  const stamp=new Date();let query;
  const {runPublishJob}=load('lib/publishing/worker.ts',{'@/lib/db':{db:{calendarPost:{updateMany:async args=>{query=args.where;return{count:0};}}}},'@/lib/calendarPermissions':{},'@/lib/instagramPublishing':{},'@/lib/tiktokPublishing':{},'@/lib/socialReporting':{},'@/lib/socialTokens':{},'./providers':{}});
  await runPublishJob('post','X',stamp);assert.equal(query.updatedAt,stamp);assert.equal(query.approvalStatus,'APPROVED');assert.equal(query.isAiDraft,false);assert.equal(query.publishWorkerStartedAt,null);
});
test('client revision cancels a scheduled post atomically',async()=>{
  let update;
  const stamp=new Date();
  const current={id:'post',calendarId:'calendar',platform:'FACEBOOK',approvalStatus:'APPROVED',publishStatus:'SCHEDULED',isAiDraft:false,updatedAt:stamp,assets:[{sizeBytes:1n,fileKey:'a'}]};
  const db={socialCalendar:{findUnique:async()=>({id:'calendar',collaborators:[],manager:{email:'test@example.invalid'},clientName:'Test'})},socialConnection:{findFirst:async()=>null},calendarPost:{findUnique:async()=>current,updateMany:async args=>{update=args;return{count:1};},findUniqueOrThrow:async()=>({...current,approvalNote:'Change caption'})}};
  const {POST}=load('app/api/social-calendar/[slug]/posts/[postId]/review/route.ts',{'@/lib/db':{db},'@/lib/auth':{verifyViewerToken:()=>({})},'@/lib/resend':{sendCalendarPostReviewedEmail:async()=>{}},'@/lib/r2':{publicUrlFor:()=> 'https://storage.test/a'}});
  const {NextRequest}=require('next/server');
  const req=new NextRequest('https://site.test',{method:'POST',headers:{cookie:'calendar_viewer_calendar=fake'},body:JSON.stringify({action:'request_revision',note:'Change caption'})});
  const result=await POST(req,{params:Promise.resolve({slug:'calendar',postId:'post'})});
  assert.equal(result.status,200);assert.equal(update.data.publishStatus,'NOT_SCHEDULED');assert.equal(update.data.approvalStatus,'NEEDS_REVISION');assert.equal(update.where.publishStatus,'SCHEDULED');assert.equal(update.where.updatedAt,stamp);
});

function xInboxFixture(pages = [], overrides = {}) {
  const writes = [], messages = [], requests = [];
  const stored = { id:'x-connection', calendarId:'workspace', platformAccountId:'me', status:'CONNECTED', tokenScopes:'dm.read tweet.read users.read', messagingLastSyncAt:new Date() };
  const mod = load('lib/socialMessaging/x.ts', {
    '@/lib/db':{db:{socialInboxSettings:{findUnique:async()=>({aiAutoReplyEnabled:true})},socialConnection:{findMany:async query=>{assert.equal(query.where.tokenScopes,undefined);return [stored];},updateMany:async update=>{writes.push(update);return {count:1};}}}},
    '@/lib/calendarPermissions':{canAccessCalendarById:async()=>true},
    '@/lib/socialTokens':{freshConnection:async c=>c,requireScopes:tokenMock.requireScopes},
    '@/lib/publishing/http':{providerJson:async url=>{requests.push(new URL(url));return pages.shift();}},
    './ingest':{ingestSocialMessage:async(c,event)=>{messages.push(event);return true;}},
    ...overrides,
  });
  return {...mod, stored, writes, messages, requests};
}
const xEvent = (extra={}) => ({id:'dm1',sender_id:'other',dm_conversation_id:'me-other',created_at:new Date().toISOString(),text:'Hello',...extra});
test('X participant parsing handles absent, empty and recipient-only lists without losing ID precision',()=>{
  const {xMessageParticipant:parse}=xInboxFixture();
  for(const participant_ids of [undefined,[],['me'],['other'],['me','other']]) assert.equal(parse(xEvent({participant_ids}),'me'),'other');
  assert.equal(parse(xEvent({sender_id:'90071992547409931',dm_conversation_id:'90071992547409930-90071992547409931'}),'90071992547409930'),'90071992547409931');
  assert.equal(parse(xEvent({participant_ids:['me','other','third']}),'me'),null);
  assert.equal(parse(xEvent({sender_id:'third'}),'me'),null);
  assert.equal(parse(xEvent(),'unrelated'),null);
});
test('X manual recovery imports skipped history, follows pagination and never enables AI replies',async()=>{
  const f=xInboxFixture([{data:[xEvent({participant_ids:[],created_at:'2026-01-01T00:00:00Z'})],meta:{next_token:'page2'}},{data:[xEvent({id:'dm2',sender_id:'me'})]}]);
  const result=await f.syncXInbox(f.stored,{fullHistory:true,maxPages:2,pageSize:25});
  assert.equal(result.imported,2);assert.equal(result.complete,true);
  assert.equal(f.requests[1].searchParams.get('pagination_token'),'page2');
  assert.match(f.requests[0].searchParams.get('dm_event.fields'),/sender_id/);
  assert.equal(f.messages[0].outbound,false);assert.equal(f.messages[1].outbound,true);
  assert.ok(f.messages.every(m=>m.autoReplyEligible===false));
  assert.ok(f.writes[0].data.messagingLastSyncAt instanceof Date);
});
test('X truncated or partial retrieval preserves the previous watermark',async()=>{
  for(const page of [{data:[xEvent()],meta:{next_token:'more'}},{data:[xEvent()],errors:[{detail:'Profile unavailable'}]}]) {
    const f=xInboxFixture([page]);
    const result=await f.syncXInbox(f.stored,{fullHistory:true,maxPages:1});
    assert.ok(result.warning);assert.equal(f.writes[0].data.messagingLastSyncAt,undefined);
  }
});
test('X missing read scope is surfaced instead of silently excluding the connected account',async()=>{
  const f=xInboxFixture();f.stored.tokenScopes='tweet.read users.read';
  const result=await f.syncSocialInboxes('workspace');
  assert.equal(result.checked,1);assert.equal(result.synced,0);assert.match(result.errors[0],/permission/);
  assert.equal(f.requests.length,0);assert.equal(f.writes[0].data.messagingLastSyncAt,undefined);
});
test('X provider failures retain HTTP status and produce actionable inbox errors',async()=>{
  const {providerJson}=load('lib/publishing/http.ts');
  const {xInboxErrorMessage}=xInboxFixture();
  for(const [status,pattern] of [[401,/reconnect/],[402,/billing/],[403,/DM access/],[429,/rate-limited/]]) {
    global.fetch=async()=>response({detail:'Provider failure'},status);
    await assert.rejects(providerJson('https://api.x.com/2/dm_events'),error=>{assert.equal(error.status,status);assert.match(xInboxErrorMessage(error),pattern);return true;});
  }
});
test('manual X sync route enforces workspace permission before provider access',async()=>{
  const {POST}=load('app/api/calendars/[id]/inbox/sync/route.ts',{
    '@/lib/auth':{getCurrentCreator:async()=>({id:'creator'})},
    '@/lib/calendarPermissions':{hasCalendarPermission:async()=>false,canAccessCalendarById:async()=>true},
    '@/lib/socialMessaging/x':{syncSocialInboxes:async()=>assert.fail('unauthorized sync')},
  });
  assert.equal((await POST(new Request('https://site.test'),{params:Promise.resolve({id:'workspace'})})).status,403);
});
test('manual X sync route scopes recovery and returns missing-account/provider failure statuses',async()=>{
  for(const [summary,status] of [[{checked:0,synced:0,errors:[]},409],[{checked:1,synced:0,errors:['Denied']},502],[{checked:1,synced:1,errors:[]},200]]) {
    const {POST}=load('app/api/calendars/[id]/inbox/sync/route.ts',{
      '@/lib/auth':{getCurrentCreator:async()=>({id:'creator'})},
      '@/lib/calendarPermissions':{hasCalendarPermission:async()=>true,canAccessCalendarById:async()=>true},
      '@/lib/socialMessaging/x':{syncSocialInboxes:async(id,options)=>{assert.equal(id,'workspace');assert.deepEqual(options,{fullHistory:true,maxPages:2,pageSize:25});return summary;}},
    });
    assert.equal((await POST(new Request('https://site.test'),{params:Promise.resolve({id:'workspace'})})).status,status);
  }
});
