const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(root, file); if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.ts', mocks, cache) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts', mocks, cache) : require(name), mod, mod.exports);
  cache.set(file, mod.exports); return mod.exports;
}
const policy = load('lib/calendarTeamPolicy.ts');
const plans = load('lib/contentWorkspaceEntitlements.ts');
const ownerActor = { id: 'owner', name: 'Owner', email: 'owner@example.test' };
function accessFixture(role, permissions = [], custom = false, active = true) {
  const db = { socialCalendar: { findUnique: async () => ({ id: 'workspace', managerId: 'owner', manager: { id: 'owner' } }), findMany: async () => [{ id: 'workspace' }] }, calendarCollaborator: { findUnique: async () => ({ id: 'member', role, permissions, customPermissions: custom }) } };
  const mocks = { '@/lib/db': { db }, '@/lib/contentWorkspaceUsage': { canAccessContentWorkspace: () => active, getContentWorkspacePlan: () => 'UNLIMITED', canUseContentWorkspaceFeature: () => true }, '@/lib/contentWorkspaceEntitlements': plans };
  return { db, mocks, api: load('lib/calendarPermissions.ts', mocks) };
}

test('Inbox Agent has exactly message access and cannot add forbidden features', async () => {
  const f = accessFixture('INBOX_AGENT');
  const access = await f.api.getCalendarAccess('member', 'workspace');
  assert.deepEqual(access.permissions.sort(), ['inbox.reply', 'inbox.view']);
  for (const capability of Object.keys(policy.TEAM_PERMISSIONS)) assert.equal(await f.api.hasCalendarPermission('member', 'workspace', capability), capability.startsWith('inbox.'));
  assert.ok('error' in policy.validateTeamAssignment({ role: 'INBOX_AGENT', customPermissions: true, permissions: ['inbox.view', 'knowledge.manage'] }));
});
test('only Owner and Manager can upload business documents', async () => {
  for (const role of ['MANAGER', 'SOCIAL_MEDIA_MANAGER', 'CREATIVE_CONTRIBUTOR', 'INBOX_AGENT', 'VIEWER', 'EDIT_CALENDAR']) {
    const f = accessFixture(role);
    assert.equal(await f.api.hasCalendarPermission('member', 'workspace', 'knowledge.manage'), role === 'MANAGER');
    assert.equal(await f.api.hasCalendarPermission('owner', 'workspace', 'knowledge.manage'), true);
  }
});
test('creative contributors can upload assets but cannot edit, publish, reply, or manage teammates', async () => {
  const api = accessFixture('CREATIVE_CONTRIBUTOR').api;
  assert.equal(await api.hasCalendarPermission('member', 'workspace', 'ADD_CONTENT'), true);
  for (const permission of ['EDIT_CALENDAR','publishing.manage','inbox.reply','people.manage','analytics.view']) assert.equal(await api.hasCalendarPermission('member', 'workspace', permission), false);
});
test('custom permissions can restrict a manager and cannot exceed role ceilings', async () => {
  const f = accessFixture('MANAGER', ['calendar.view', 'people.view'], true);
  assert.equal(await f.api.hasCalendarPermission('member', 'workspace', 'knowledge.manage'), false);
  assert.equal(await f.api.hasCalendarPermission('member', 'workspace', 'people.view'), true);
  assert.equal(await f.api.hasCalendarPermission('member', 'workspace', 'people.manage'), false);
  assert.deepEqual(policy.effectiveTeamPermissions('INBOX_AGENT', ['knowledge.manage','inbox.reply'], true), []);
});
test('feature actions require their view permission and role defaults remain valid', () => {
  for (const role of policy.INVITABLE_TEAM_ROLES) assert.ok(!('error' in policy.validateTeamAssignment({ role })));
  assert.ok('error' in policy.validateTeamAssignment({ role: 'OWNER' }));
  assert.ok('error' in policy.validateTeamAssignment({ role: 'INBOX_AGENT', customPermissions: true, permissions: ['inbox.reply'] }));
  const selected = policy.toggleTeamPermission([], 'ai.generate', true);
  assert.ok(selected.includes('calendar.edit')); assert.ok(selected.includes('calendar.view'));
  assert.ok(!('error' in policy.validateTeamAssignment({ role: 'SOCIAL_MEDIA_MANAGER', customPermissions: true, permissions: selected })));
  assert.equal(policy.canManageTeamRole('MANAGER','MANAGER'), false);
});
test('billing expiry never prevents an owner from revoking team access', async () => {
  const api = accessFixture('MANAGER', [], false, false).api;
  assert.equal(await api.hasCalendarPermission('owner','workspace','people.manage'), true);
  assert.equal(await api.hasCalendarPermission('owner','workspace','calendar.edit'), false);
  assert.equal(await api.hasCalendarPermission('member','workspace','people.manage'), true);
});
test('direct document upload requests deny non-managers before storage or processing', async () => {
  for (const role of ['INBOX_AGENT','CREATIVE_CONTRIBUTOR','SOCIAL_MEDIA_MANAGER']) {
    const f = accessFixture(role); let writes = 0;
    const route = load('app/api/calendars/[id]/business-documents/upload-complete/route.ts', { ...f.mocks, '@/lib/calendarPermissions': f.api, '@/lib/auth': { getCurrentCreator: async () => ({ id: 'member' }) }, '@/lib/r2': { getObjectSize: async () => { writes++; }, publicUrlFor: () => '' }, '@/lib/documentExtraction': {}, '@/lib/openai': {}, '@/lib/contentWorkspaceUsage': {} });
    const response = await route.POST({ json: async () => ({}) }, { params: Promise.resolve({ id: 'workspace' }) });
    assert.equal(response.status,403); assert.equal(writes,0);
  }
});
test('Inbox Agent can read and send replies without receiving AI setup facts', async () => {
  const f = accessFixture('INBOX_AGENT'); let sends = 0; let saved;
  const db = { ...f.db, socialLeadConversation: { findFirst: async () => ({ connection: {}, platform: 'INSTAGRAM', participantPlatformId: 'contact', providerConversationId: 'external', calendar: {}, leadStatus: 'NEW' }), update: async () => {} }, socialLeadMessage: { createMany: async ({ data }) => { saved = { ...data[0], id: 'message' }; }, findFirstOrThrow: async () => saved } };
  const mocks = { ...f.mocks, '@/lib/db': { db }, '@/lib/calendarPermissions': f.api, '@/lib/auth': { getCurrentCreator: async () => ({ id: 'member' }) }, '@/lib/socialMessaging/registry': { supportsMessaging: () => true, sendSocialInboxMessage: async () => { sends++; return 'provider-id'; } } };
  const reply = load('app/api/calendars/[id]/inbox/[conversationId]/reply/route.ts', mocks);
  assert.equal((await reply.POST({ json: async () => ({ text: 'Hello' }) }, { params: Promise.resolve({ id: 'workspace', conversationId: 'thread' }) })).status,200);
  assert.equal(sends,1); assert.equal(saved.sentByCreatorId,'member');
  const inbox = load('app/api/calendars/[id]/inbox/route.ts', { ...mocks, '@/lib/socialInbox': { getSocialInbox: async () => ({ settings: { aiAutoReplyInstructions: 'private', aiReplyProfile: { tone: 'warm', pricingAndPolicies: 'Private policy' } } }) } });
  const response = await inbox.GET({ nextUrl: new URL('https://site.test') }, { params: Promise.resolve({ id: 'workspace' }) });
  const result = await response.json(); assert.equal(result.settings.aiAutoReplyInstructions,null); assert.equal(result.settings.aiReplyProfile.pricingAndPolicies,''); assert.equal(result.settings.aiReplyProfile.tone,'warm');
});

function teamFixture({ active = true, mailFails = false, memberRole = 'CREATIVE_CONTRIBUTOR', actorRole = 'OWNER', actorPermissions = null } = {}) {
  const invites = []; const members = []; const events = []; const deliveries = [];
  const actor = actorRole === 'OWNER' ? ownerActor : { id: 'manager', name: 'Manager', email: 'manager@example.test' };
  const owner = { ...ownerActor, contentWorkspacePlan: 'CREATOR' };
  function findInvite(where) { return invites.find(i => (!where.id || i.id === where.id) && (!where.tokenHash || i.tokenHash === where.tokenHash) && (!where.email || i.email === where.email) && (!where.status || i.status === where.status)); }
  const inviteModel = { findUnique: async ({ where }) => findInvite(where), findFirst: async ({ where }) => findInvite(where), count: async ({ where }) => invites.filter(i => i.status === 'PENDING' && i.expiresAt > new Date() && (!where.id?.not || i.id !== where.id.not)).length,
    create: async ({ data }) => { const i = { ...data, id: `invite-${invites.length}`, status: 'PENDING' }; invites.push(i); return i; }, update: async ({ where, data }) => { const i = findInvite(where); if (!i) throw new Error('missing'); Object.assign(i,data); return i; }, updateMany: async ({ where,data }) => { const i=findInvite(where); if(i) Object.assign(i,data); return { count:i?1:0 }; } };
  const memberModel = { findFirst: async ({ where }) => members.find(m => (!where.id || where.id === m.id) && (!where.creator?.email?.equals || where.creator.email.equals === m.creator.email)), findUnique: async ({ where }) => where.calendarId_creatorId.creatorId === 'manager' ? { role:'MANAGER', permissions:actorPermissions || [], customPermissions:!!actorPermissions } : members.find(m=>m.creatorId===where.calendarId_creatorId.creatorId), count: async()=>members.length,
    create: async({data})=>{const m={...data,id:`member-${members.length}`,creator:{email:'invitee@example.test'}};members.push(m);return m;},update:async({where,data})=>Object.assign(members.find(m=>m.id===where.id),data),delete:async({where})=>members.splice(members.findIndex(m=>m.id===where.id),1) };
  const tx = { $queryRaw:async()=>[],creator:{findUniqueOrThrow:async()=>owner},calendarInvite:inviteModel,calendarCollaborator:memberModel,calendarTeamActivity:{create:async({data})=>events.push(data)} };
  let tail=Promise.resolve();
  const db={ ...tx, socialCalendar:{findUniqueOrThrow:async()=>({managerId:'owner',clientName:'Client'})}, $transaction:callback=>{const next=tail.then(()=>callback(tx));tail=next.catch(()=>{});return next;} };
  const access={role:actorRole,isOwner:actorRole==='OWNER',permissions:policy.effectiveTeamPermissions(actorRole, actorPermissions || [], !!actorPermissions)};
  const api=load('lib/calendarTeamService.ts',{'@/lib/db':{db},'@/lib/calendarPermissions':{getCalendarAccess:async()=>access,canAccessCalendarById:async()=>active},'@/lib/contentWorkspaceUsage':{getContentWorkspacePlan:()=> 'CREATOR',canAccessContentWorkspace:()=>active,canUseContentWorkspaceFeature:()=>true},'@/lib/contentWorkspaceEntitlements':plans,'@/lib/resend':{sendCalendarInviteEmail:async input=>{deliveries.push(input);if(mailFails)throw new Error('offline');}}});
  db.calendarInvite.findUnique=async({where})=>{const i=findInvite(where);return i ? {...i,calendar:{managerId:'owner'}}:null;};
  const assignment={role:memberRole,email:'invitee@example.test'};
  return {api,actor,invites,members,events,deliveries,assignment,owner};
}
test('invalid emails, self invitations and ownership assignment create no invites', async()=>{
  for(const body of [{email:42,role:'VIEWER'},{email:ownerActor.email,role:'VIEWER'},{email:'bad',role:'VIEWER'},{email:'invitee@example.test',role:'OWNER'}]) {
    const f=teamFixture();await assert.rejects(f.api.inviteTeammate('workspace',f.actor,body));assert.equal(f.invites.length,0);assert.equal(f.deliveries.length,0);
  }
});
test('failed email delivery is visible and does not report success',async()=>{
  const f=teamFixture({mailFails:true});await assert.rejects(f.api.inviteTeammate('workspace',f.actor,f.assignment),e=>e.status===502);
  assert.equal(f.invites[0].deliveryStatus,'FAILED');assert.equal(f.events[0].action,'INVITATION_CREATED');
});
test('an expired invitation can be resent at the seat limit without creating another reservation',async()=>{
  const f=teamFixture();await f.api.inviteTeammate('workspace',f.actor,f.assignment);
  const oldHash=f.invites[0].tokenHash;f.invites[0].expiresAt=new Date(0);
  f.members.push({id:'a',creatorId:'a',creator:{email:'a@test.com'}},{id:'b',creatorId:'b',creator:{email:'b@test.com'}});
  await f.api.inviteTeammate('workspace',f.actor,null,f.invites[0].id);
  assert.equal(f.invites.length,1);assert.notEqual(f.invites[0].tokenHash,oldHash);assert.ok(f.invites[0].expiresAt>new Date());assert.equal(f.events.at(-1).action,'INVITATION_RESENT');
});
test('concurrent invitations respect the account allowance and cannot duplicate a pending email',async()=>{
  const f=teamFixture();
  await Promise.all(Array.from({length:4},()=>f.api.inviteTeammate('workspace',f.actor,f.assignment)));
  assert.equal(f.invites.length,1);
  const results=await Promise.allSettled(Array.from({length:5},(_,i)=>f.api.inviteTeammate('workspace',f.actor,{...f.assignment,email:`other${i}@example.test`} )));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,2);assert.equal(f.invites.length,3);
});
test('existing teammates are edited, not re-invited or charged another slot',async()=>{
  const f=teamFixture();f.members.push({id:'existing',creatorId:'invitee',role:'VIEWER',creator:{email:f.assignment.email}});
  await assert.rejects(f.api.inviteTeammate('workspace',f.actor,f.assignment),e=>e.status===409);assert.equal(f.invites.length,0);
});
test('only the owner can appoint another manager',async()=>{
  const f=teamFixture({actorRole:'MANAGER'});
  await assert.rejects(f.api.inviteTeammate('workspace',f.actor,{email:'new@example.test',role:'MANAGER'}),e=>e.status===403);assert.equal(f.invites.length,0);
});
test('an expired subscription still allows removing a teammate with an audit entry',async()=>{
  const f=teamFixture({active:false});f.members.push({id:'existing',creatorId:'invitee',role:'INBOX_AGENT',creator:{email:'invitee@example.test'}});
  await f.api.removeTeammate('workspace','existing',f.actor);assert.equal(f.members.length,0);assert.equal(f.events.at(-1).action,'MEMBER_REMOVED');
});
test('revoked invite links cannot be accepted and concurrent acceptance is idempotent',async()=>{
  const f=teamFixture();await f.api.inviteTeammate('workspace',f.actor,f.assignment);
  const token=f.deliveries[0].token;const invitee={id:'invitee',name:'Invitee',email:f.assignment.email};
  const results=await Promise.all([f.api.acceptTeamInvite(token,invitee),f.api.acceptTeamInvite(token,invitee)]);
  assert.equal(f.members.length,1);assert.ok(results.some(r=>r.alreadyMember));
  await assert.rejects(f.api.cancelTeamInvite('workspace',f.invites[0].id,f.actor),e=>e.status===409);
  const g=teamFixture();await g.api.inviteTeammate('workspace',g.actor,g.assignment);await g.api.cancelTeamInvite('workspace',g.invites[0].id,g.actor);
  await assert.rejects(g.api.acceptTeamInvite(g.deliveries[0].token,invitee),e=>e.status===410);assert.equal(g.members.length,0);
});
test('acceptance is bound to the invited email and copies its exact feature restrictions',async()=>{
  const f=teamFixture({memberRole:'INBOX_AGENT'});const config={...f.assignment,customPermissions:true,permissions:['inbox.view']};
  await f.api.inviteTeammate('workspace',f.actor,config);
  await assert.rejects(f.api.acceptTeamInvite(f.deliveries[0].token,{id:'wrong',name:null,email:'wrong@example.test'}),e=>e.status===403);
  await f.api.acceptTeamInvite(f.deliveries[0].token,{id:'invitee',name:null,email:f.assignment.email});
  assert.equal(f.members[0].role,'INBOX_AGENT');assert.deepEqual(f.members[0].permissions,['inbox.view']);assert.equal(f.members[0].customPermissions,true);
});


test('a restricted Manager cannot delegate features they do not hold', async () => {
  const f = teamFixture({ actorRole: 'MANAGER', actorPermissions: ['people.view', 'people.manage'] });
  await assert.rejects(f.api.inviteTeammate('workspace', f.actor, f.assignment), error => error.status === 403 && /only grant features/.test(error.message));
  assert.equal(f.invites.length, 0);
});
test('role and feature changes are saved and audited together', async () => {
  const f = teamFixture();
  f.members.push({ id: 'existing', creatorId: 'invitee', role: 'CREATIVE_CONTRIBUTOR', creator: { email: 'invitee@example.test' } });
  await f.api.editTeammate('workspace', 'existing', f.actor, { role: 'INBOX_AGENT', permissions: ['inbox.view'], customPermissions: true });
  assert.equal(f.members[0].role, 'INBOX_AGENT'); assert.equal(f.members[0].customPermissions, true); assert.deepEqual(f.members[0].permissions, ['inbox.view']);
  assert.equal(f.events.at(-1).action, 'ACCESS_CHANGED');
});
test('Inbox Agents cannot manually qualify leads through the conversation endpoint', async () => {
  const f = accessFixture('INBOX_AGENT'); let writes = 0;
  const route = load('app/api/calendars/[id]/inbox/[conversationId]/route.ts', { ...f.mocks, '@/lib/calendarPermissions': f.api, '@/lib/auth': { getCurrentCreator: async () => ({ id: 'member' }) }, '@/lib/db': { db: { ...f.db, socialLeadConversation: { updateMany: async () => { writes++; return { count: 1 }; } } } }, '@/lib/socialInbox': { SOCIAL_LEAD_STATUSES: ['QUALIFIED'] } });
  const response = await route.PATCH({ json: async () => ({ leadStatus: 'QUALIFIED' }) }, { params: Promise.resolve({ id: 'workspace', conversationId: 'thread' }) });
  assert.equal(response.status, 403); assert.equal(writes, 0);
});
test('analytics feature access does not grant access to private lead identities', async () => {
  const f = accessFixture('VIEWER', ['analytics.view'], true); let includeLeads;
  const route = load('app/api/calendars/[id]/reporting/route.ts', { ...f.mocks, '@/lib/calendarPermissions': f.api, '@/lib/auth': { getCurrentCreator: async () => ({ id: 'member' }) }, '@/lib/reporting/data': { getCalendarReportingData: async (_id, _params, _errors, leads) => { includeLeads = leads; return { leads: null }; } } });
  assert.equal((await route.GET({ nextUrl: new URL('https://site.test') }, { params: Promise.resolve({ id: 'workspace' }) })).status, 200);
  assert.equal(includeLeads, false);
});


test('creative upload permission does not permit deleting another team member’s assets', async () => {
  const f = accessFixture('CREATIVE_CONTRIBUTOR');
  const route = load('app/api/calendars/[id]/posts/[postId]/assets/[assetId]/route.ts', { ...f.mocks, '@/lib/calendarPermissions': f.api, '@/lib/auth': { getCurrentCreator: async () => ({ id: 'member' }) }, '@/lib/calendarPostEditing': {}, '@/lib/r2': {} });
  const response = await route.DELETE({}, { params: Promise.resolve({ id: 'workspace', postId: 'post', assetId: 'asset' }) });
  assert.equal(response.status, 403);
});


test('a stale Prisma client returns a controlled unavailable error before any team authorization or writes', async () => {
  let lookups = 0;
  const service = load('lib/calendarTeamService.ts', {
    '@/lib/db': { db: {} },
    '@/lib/calendarPermissions': { getCalendarAccess: async () => { lookups++; } },
    '@/lib/contentWorkspaceUsage': {}, '@/lib/resend': {},
  });
  await assert.rejects(service.teamAccess('owner', 'workspace'), error => error.status === 503 && /temporarily unavailable|outdated Prisma client/.test(error.message));
  assert.equal(lookups, 0);
});
