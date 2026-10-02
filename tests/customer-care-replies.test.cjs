const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
afterEach(() => { global.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
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
const profileApi = () => load('lib/socialMessaging/replyProfile.ts');
const profile = (extra = {}) => ({ tone: 'warm', industry: 'Photography', businessContext: 'Studio shoots in Lagos.', pricingAndPolicies: 'Portrait package: NGN 50,000; 10 edited photos.', qualificationQuestions: 'Ask date, then location if not already provided.', handoffRules: 'Custom quotes go to the owner.', ...extra });
function fakeModel(value, capture = () => {}) {
  process.env.OPENAI_API_KEY = 'test-only-key';
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); capture(JSON.parse(init.body));
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }));
  };
  return load('lib/openai.ts').generateSocialInboxAutoReply;
}
const generationInput = extra => ({ clientName: 'Studio', businessSummary: 'General business facts', instructions: null, profile: profile(), conversation: [{ direction: 'INBOUND', text: 'I need portraits in Lagos on Friday.', createdAt: '2026-10-02T10:00:00Z' }], latestInbound: 'How much is the portrait package?', ...extra });
test('profiles default legacy settings and reject invalid or oversized input', () => {
  const api = profileApi();
  assert.equal(api.normalizeReplyProfile(null).tone, 'professional');
  assert.equal(api.normalizeReplyProfile({ tone: 'unsupported', industry: 12 }).industry, '');
  assert.equal(api.validateReplyProfile(profile()), null);
  assert.match(api.validateReplyProfile(profile({ tone: 'fake' })), /tone/);
  assert.match(api.validateReplyProfile(profile({ pricingAndPolicies: 'x'.repeat(2001) })), /2,000/);
  assert.match(api.validateReplyProfile(profile({ industry: [] })), /text/);
});
test('generation carries saved facts, chronological history, tone and clarification rules in a strict response schema', async () => {
  let body;
  const generate = fakeModel({ shouldReply: true, replyText: 'Our portrait package is NGN 50,000 and includes 10 edited photos.', handoffReason: null }, value => body = value);
  const result = await generate(generationInput());
  assert.equal(result.shouldReply, true);
  const input = JSON.parse(body.input);
  assert.equal(input.customerCarePlaybook.tone, 'warm');
  assert.equal(input.customerCarePlaybook.pricingAndPolicies, profile().pricingAndPolicies);
  assert.equal(input.recentConversation[0].text, generationInput().conversation[0].text);
  assert.match(body.instructions, /Warm & friendly/);
  assert.match(body.instructions, /Never ask again/);
  assert.match(body.instructions, /do not guess/);
  assert.match(body.instructions, /Never claim to be human/);
  assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.schema.additionalProperties, false);
});
test('each tone changes the writing instructions while retaining business safeguards', async () => {
  for (const tone of profileApi().REPLY_TONES) {
    let body;
    const generate = fakeModel({ shouldReply: true, replyText: 'Which date would you prefer?', handoffReason: null }, value => body = value);
    await generate(generationInput({ profile: profile({ tone: tone.value }) }));
    assert.ok(body.instructions.includes(tone.instruction));
    assert.match(body.instructions, /Do not invent prices/);
  }
});
test('automatic handoff suppresses customer-facing text even when the model returns conflicting send flags', async () => {
  const generate = fakeModel({ shouldReply: true, replyText: 'I have processed your refund.', handoffReason: 'Refund needs owner approval.' });
  const result = await generate(generationInput());
  assert.equal(result.shouldReply, false); assert.equal(result.replyText, ''); assert.match(result.handoffReason, /owner approval/);
});
test('staff drafts can offer safe acknowledgement with a separate human review reason', async () => {
  let body;
  const generate = fakeModel({ shouldReply: false, replyText: 'Sorry the delivery arrived damaged. Please share your order reference so our team can help.', handoffReason: 'Order details and refund eligibility need checking.' }, value => body = value);
  const result = await generate(generationInput({ mode: 'draft', operatorContext: 'Delivery was damaged.', currentDraft: 'Can you send an order reference?' }));
  assert.equal(result.shouldReply, false); assert.ok(result.replyText); assert.ok(result.handoffReason);
  assert.equal(JSON.parse(body.input).operatorContext, 'Delivery was damaged.');
  assert.match(body.instructions, /never an automatic send/);
});
test('empty or overlong replies fail instead of sending blank or cut-off text', async () => {
  await assert.rejects(fakeModel({ shouldReply: true, replyText: '  ', handoffReason: null })(generationInput()), /empty/);
  await assert.rejects(fakeModel({ shouldReply: true, replyText: 'x'.repeat(1501), handoffReason: null })(generationInput()), /too long/);
});
function draftRoute({ signedIn = true, authorized = true, active = true, conversation: override } = {}) {
  const calls = [];
  const conversation = override === undefined ? { id: 'thread', providerConversationId: 'normal', platform: 'INSTAGRAM', participantName: 'Ada', calendar: { clientName: 'Studio', aiBusinessSummary: 'Summary' }, messages: [
    { id: 'latest', direction: 'INBOUND', text: 'How much?', platformCreatedAt: new Date('2026-10-02T11:00:00Z') },
    { id: 'earlier', direction: 'INBOUND', text: 'Friday in Lagos', platformCreatedAt: new Date('2026-10-02T10:00:00Z') },
  ] } : override;
  const db = { socialLeadConversation: { findFirst: async args => { calls.push({ db: args }); return conversation; } }, socialInboxSettings: { findUnique: async () => ({ aiReplyProfile: profile(), aiAutoReplyInstructions: 'No emojis.' }) } };
  const mod = load('app/api/calendars/[id]/inbox/[conversationId]/draft/route.ts', {
    '@/lib/auth': { getCurrentCreator: async () => signedIn ? ({ id: 'creator' }) : null }, '@/lib/db': { db },
    '@/lib/calendarPermissions': { hasCalendarPermission: async (...args) => { assert.equal(args[2], 'EDIT_CALENDAR'); return authorized; }, canAccessCalendarById: async () => active },
    '@/lib/openai': { generateSocialInboxAutoReply: async args => { calls.push({ ai: args }); return { shouldReply: true, replyText: 'NGN 50,000.', handoffReason: null }; } },
  });
  return { ...mod, calls };
}
const request = (body = { tone: 'premium', context: 'Portrait package.', currentDraft: '' }) => new (require('next/server').NextRequest)('https://test/api', { method: 'POST', body: JSON.stringify(body) });
const params = () => ({ params: Promise.resolve({ id: 'workspace', conversationId: 'thread' }) });
test('draft route scopes lookup to workspace, preserves history, and never sends or persists a message', async () => {
  const route = draftRoute(); const res = await route.POST(request(), params());
  assert.equal(res.status, 200); const body = await res.json(); assert.equal(body.sourceMessageId, 'latest');
  assert.deepEqual(route.calls[0].db.where, { id: 'thread', calendarId: 'workspace' });
  const input = route.calls[1].ai; assert.equal(input.mode, 'draft'); assert.equal(input.profile.tone, 'premium');
  assert.equal(input.profile.pricingAndPolicies, profile().pricingAndPolicies);
  assert.equal(input.conversation[0].text, 'Friday in Lagos');
  assert.equal(route.calls.length, 2);
});
test('draft route rejects unauthorized, inactive, missing and encrypted conversations before model calls', async () => {
  for (const [options, status] of [[{ signedIn: false }, 401], [{ authorized: false }, 403], [{ active: false }, 403], [{ conversation: null }, 404], [{ conversation: { providerConversationId: 'xchat:secret' } }, 400]]) {
    const route = draftRoute(options); assert.equal((await route.POST(request(), params())).status, status); assert.ok(!route.calls.some(call => call.ai));
  }
});
test('draft route rejects unknown tones and excessive context without model calls', async () => {
  for (const body of [{ tone: 'fake', context: '', currentDraft: '' }, { tone: 'warm', context: 'x'.repeat(2001), currentDraft: '' }, null]) {
    const route = draftRoute(); assert.equal((await route.POST(request(body), params())).status, 400); assert.equal(route.calls.length, 0);
  }
});
test('settings validates profile, saves facts, and preserves profiles for legacy requests', async () => {
  let write;
  const db = { socialCalendar: { findUnique: async () => ({ managerId: 'owner' }) }, $transaction: async fn => fn({ socialInboxSettings: { upsert: async args => { write = args; return { ...args.create, aiAutoReplyEnabled: true }; } } }) };
  const mod = load('app/api/calendars/[id]/inbox/settings/route.ts', { '@/lib/auth': { getCurrentCreator: async () => ({ id: 'owner' }) }, '@/lib/db': { db } });
  const body = { clientAccessEnabled: true, aiAutoReplyEnabled: true, aiAutoReplyInstructions: '', aiReplyProfile: profile() };
  let res = await mod.POST(request(body), params()); assert.equal(res.status, 200); assert.deepEqual(write.update.aiReplyProfile, profile());
  res = await mod.POST(request({ ...body, aiReplyProfile: profile({ tone: 'invalid' }) }), params()); assert.equal(res.status, 400);
  delete body.aiReplyProfile; res = await mod.POST(request(body), params()); assert.equal(res.status, 200); assert.equal(Object.hasOwn(write.update, 'aiReplyProfile'), false);
});
function workerFixture({ superseded = false, answered = false } = {}) {
  let generated, sent = 0; const updates = []; const time = new Date('2026-10-02T11:00:00Z');
  const inbound = { id: 'inbound', conversationId: 'thread', platformCreatedAt: time, autoReplyAttemptCount: 0, text: 'How much?', conversation: {
    platform: 'INSTAGRAM', providerConversationId: 'external-thread', participantPlatformId: 'person', participantName: 'Ada', connection: {},
    calendar: { clientName: 'Studio', aiBusinessSummary: 'Facts', instagramPageId: null }, messages: [
      ...(superseded || answered ? [{ id: 'newer', direction: answered ? 'OUTBOUND' : 'INBOUND', status: answered ? 'SENT' : 'RECEIVED', text: 'More context', platformCreatedAt: new Date(time.getTime()+1000) }] : []),
      { id: 'inbound', direction: 'INBOUND', status: 'RECEIVED', text: 'How much?', platformCreatedAt: time },
    ],
  } };
  const db = { socialInboxSettings: { findMany: async () => [{ calendarId: 'workspace' }], findUnique: async () => ({ aiAutoReplyEnabled: true, aiReplyProfile: profile(), aiAutoReplyInstructions: 'No emojis' }) },
    socialLeadMessage: { findMany: async () => [inbound], updateMany: async () => ({ count: 1 }), update: async args => updates.push(args.data) },
    $transaction: async fn => fn({ socialLeadMessage: { createMany: async () => ({count:1}), update: async args => updates.push(args.data) }, socialLeadConversation: { update: async () => {} } }),
  };
  const api = load('lib/socialMessaging/autoReply.ts', { '@/lib/db': { db }, '@/lib/openai': { generateSocialInboxAutoReply: async input => { generated=input; return { shouldReply: true, replyText: 'NGN 50,000.', handoffReason: null }; } }, '@/lib/socialMessaging/whatsapp': { whatsappAutoReplyHandoff: async () => null }, '@/lib/socialMessaging/registry': { supportsMessaging: () => true, sendSocialInboxMessage: async () => { sent++; return 'sent-id'; } } });
  return { ...api, updates, getGenerated: () => generated, getSent: () => sent };
}
test('automatic replies use saved tone and business facts with the customer identity', async () => {
  const f=workerFixture(); assert.equal((await f.processSocialInboxAutoReplies()).sent,1);
  assert.deepEqual(f.getGenerated().profile,profile()); assert.equal(f.getGenerated().participantName,'Ada'); assert.equal(f.getGenerated().platform,'INSTAGRAM');
});
test('older enquiries and already answered conversations are not sent another automatic reply', async () => {
  for (const options of [{superseded:true},{answered:true}]) {
    const f=workerFixture(options); assert.equal((await f.processSocialInboxAutoReplies()).handedOff,1); assert.equal(f.getSent(),0); assert.equal(f.getGenerated(),undefined); assert.ok(f.updates[0].autoReplyHandoffReason);
  }
});
