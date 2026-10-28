const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const { withBillingDependencies } = require('./helpers/billing-fixtures.cjs');

function fixture({ document = false, failCreate = false, onHead = async () => {}, barrier = false } = {}) {
  const key = document ? 'calendars/w/business-documents/file.pdf' : 'calendars/w/p/file.jpg';
  const receipt = { id: 'r', creatorId: 'owner', calendarId: 'w', fileKey: key, bytes: 10n, status: 'PENDING', expiresAt: new Date(Date.now() + 60000) };
  const usage = { storageReservedBytes: 30n, storageBytes: 0n };
  const assets = []; const documents = [];
  const post = { id: 'p', calendarId: 'w', platform: 'INSTAGRAM', approvalStatus: 'PENDING', instagramPublishStatus: 'NOT_SCHEDULED', calendar: { managerId: 'owner' } };
  const locks = new Map(); let createFailure = failCreate, headCount = 0, barrierRelease, rebuilds = 0;
  const gate = new Promise(resolve => barrierRelease = resolve);
  const copy = row => row ? { ...row } : null;
  const reservationApi = { findUnique: async () => copy(receipt), findMany: async () => [{ ...receipt }] };
  const postApi = { findUnique: async () => ({ ...post, assets: assets.map(copy) }), findFirst: async () => ({ ...post }), findUniqueOrThrow: async () => ({ ...post, assets: assets.map(copy) }) };
  const assetApi = { findMany: async ({where}) => assets.filter(a => a.postId === where.postId).map(copy), findFirst: async ({ where, orderBy }) => { const found = assets.filter(a => a.postId === where.postId && (!where.fileKey || a.fileKey === where.fileKey)); return copy(orderBy ? found.sort((a,b) => b.displayOrder-a.displayOrder)[0] : found[0]); } };
  const documentApi = { findFirst: async () => copy(documents[0]) };
  const db = { contentWorkspaceStorageReservation: reservationApi, calendarPost: postApi, calendarPostAsset: assetApi, calendarBusinessDocument: documentApi,
    socialCalendar: { findUnique: async () => ({ id: 'w', managerId: 'owner' }) },
    async $transaction(run) {
      const releases = [], held = new Set(), undo = [];
      async function lock(key) {
        if (held.has(key)) return; held.add(key);
        const prior = locks.get(key) ?? Promise.resolve(); let release;
        const next = new Promise(r => release = r); locks.set(key, next);
        await prior; releases.push(() => { release(); if (locks.get(key) === next) locks.delete(key); });
      }
      function change(object, data) { const old = { ...object }; undo.push(() => Object.assign(object, old)); for (const [key, value] of Object.entries(data)) { if (value && typeof value === 'object' && 'decrement' in value) object[key] -= value.decrement; else if (value && typeof value === 'object' && 'increment' in value) object[key] += value.increment; else object[key] = value; } }
      const tx = {
        async $queryRaw(parts, ...values) {
          const sql = parts.join('?');
          if (sql.includes('clock_timestamp')) return [{ now: new Date() }];
          if (sql.includes('"SocialCalendar"')) { await lock('calendar:' + values[0]); return [{ id: 'w' }]; }
          if (sql.includes('"CalendarPost"')) { await lock('post:' + values[0]); return [{ ...post }]; }
          if (sql.includes('"ContentWorkspaceStorageReservation"')) { await lock('receipt:' + values[0]); return [copy(receipt)]; }
          if (sql.includes('"ContentWorkspaceUsage"')) { await lock('usage:' + values[0]); return [{ creatorId: 'owner' }]; }
          throw Error('Unexpected SQL: ' + sql);
        },
        calendarPost: { ...postApi, update: async ({ data }) => { change(post, data); return { ...post, assets: assets.map(copy) }; } },
        calendarPostAsset: { ...assetApi, create: async ({ data }) => { if (createFailure) { createFailure = false; throw Error('simulated commit failure'); } const asset = { ...data, id: 'asset-' + assets.length }; assets.push(asset); undo.push(() => assets.splice(assets.indexOf(asset),1)); return asset; } },
        calendarBusinessDocument: { ...documentApi, create: async ({ data }) => { const doc = { ...data, id: 'document' }; documents.push(doc); undo.push(() => documents.splice(documents.indexOf(doc),1)); return doc; } },
        contentWorkspaceStorageReservation: { ...reservationApi, update: async ({ data }) => { change(receipt, data); return copy(receipt); } },
        contentWorkspaceUsage: {
          findUnique: async () => copy(usage),
          updateMany: async ({ where, data }) => { await lock('usage:owner'); if (usage.storageReservedBytes < where.storageReservedBytes.gte) return { count: 0 }; change(usage, data); return { count: 1 }; },
          update: async ({ data }) => { await lock('usage:owner'); change(usage, data); return copy(usage); },
        },
      };
      try { return await run(tx); } catch (error) { undo.reverse().forEach(run => run()); throw error; } finally { releases.reverse().forEach(run => run()); }
    },
  };
  const mocks = withBillingDependencies({ '@/lib/db': { db }, '@/lib/auth': { getCurrentCreator: async () => ({ id: 'member' }) }, '@/lib/calendarPermissions': { hasCalendarPermission: async () => true }, '@/lib/publishing/applicationBoundary': { publishingIntegrationInstalled: () => false },
    '@/lib/r2': { publicUrlFor: key => 'https://storage.invalid/' + key, getObjectSize: async () => { headCount++; if (barrier) { if (headCount === 2) barrierRelease(); await gate; } await onHead({ receipt, post }); return 10; } },
    '@/lib/documentExtraction': { extractTextFromDocument: async () => 'Business knowledge' },
    '@/lib/knowledge/context': { rebuildBusinessKnowledge: async () => { rebuilds++; return { summary: 'Knowledge', updatedAt: new Date() }; } },
  });
  const route = load(document ? 'app/api/calendars/[id]/business-documents/upload-complete/route.ts' : 'app/api/calendars/[id]/posts/[postId]/upload-complete/route.ts', mocks);
  const usageApi = load('lib/contentWorkspaceUsage.ts', mocks);
  const request = () => new Request('http://localhost/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileKey: key, reservationId: 'r', fileSize: 10, mediaType: 'PHOTO', originalName: 'file.pdf', contentType: 'application/pdf' }) });
  return { db, mocks, receipt, usage, assets, documents, post, key, usageApi, rebuilds: () => rebuilds,
    complete: () => route.POST(request(), { params: Promise.resolve({ id: 'w', postId: 'p' }) }),
    release: () => usageApi.releaseContentWorkspaceStorageReservation('r', 'owner', 'w', key),
  };
}

test('simultaneous post completion creates one asset and charges storage once despite spare reserved bytes', async () => {
  const f = fixture({ barrier: true }); const responses = await Promise.all([f.complete(), f.complete()]);
  assert.deepEqual(responses.map(r => r.status), [200,200]); assert.equal(f.assets.length,1); assert.equal(f.usage.storageBytes,10n); assert.equal(f.usage.storageReservedBytes,20n);
});
test('retry after commit returns the saved asset even after the post was approved', async () => {
  const f = fixture(); assert.equal((await f.complete()).status,200); f.post.approvalStatus = 'APPROVED';
  const replay = await f.complete(); assert.equal(replay.status,200); assert.equal((await replay.json()).post.assets.length,1); assert.equal(f.usage.storageBytes,10n);
});
test('expiry and approval are rechecked after storage verification', async () => {
  for (const change of [({ receipt }) => receipt.expiresAt = new Date(0), ({ post }) => post.approvalStatus = 'APPROVED']) {
    const f = fixture({ onHead: change }); assert.equal((await f.complete()).status,409); assert.equal(f.assets.length,0); assert.equal(f.usage.storageBytes,0n);
  }
});
test('interrupted transaction rolls back receipt, counters and asset; retry then saves once', async () => {
  const f = fixture({ failCreate: true }); const originalError = console.error; console.error = () => {};
  try { assert.equal((await f.complete()).status,500); } finally { console.error = originalError; }
  assert.equal(f.receipt.status,'PENDING'); assert.equal(f.usage.storageReservedBytes,30n); assert.equal(f.usage.storageBytes,0n);
  assert.equal((await f.complete()).status,200); assert.equal(f.assets.length,1); assert.equal(f.usage.storageBytes,10n);
});
test('simultaneous document completion creates one document, serializes bigint and rebuilds knowledge only once', async () => {
  const f = fixture({ document: true, barrier: true }); const responses = await Promise.all([f.complete(), f.complete()]);
  assert.deepEqual(responses.map(r => r.status),[200,200]); assert.equal(f.documents.length,1); assert.equal(f.usage.storageBytes,10n); assert.equal(f.rebuilds(),1);
  const replay = await f.complete(); assert.equal(replay.status,200); assert.equal((await replay.json()).document.sizeBytes,'10'); assert.equal(f.rebuilds(),1);
});
test('two releases decrement reserved bytes once and do not change consumed bytes', async () => {
  const f = fixture(); const result = await Promise.all([f.release(), f.release()]); assert.ok(result.every(r => r.success)); assert.equal(f.usage.storageReservedBytes,20n); assert.equal(f.usage.storageBytes,0n); assert.equal(f.receipt.status,'RELEASED');
});
test('completion and cancellation cannot both consume and release the same receipt', async () => {
  const f = fixture(); const [response, release] = await Promise.all([f.complete(), f.release()]);
  if (response.status === 200) { assert.equal(f.assets.length,1); assert.equal(f.usage.storageBytes,10n); assert.equal(release.success,false); }
  else { assert.equal(response.status,409); assert.equal(f.assets.length,0); assert.equal(f.usage.storageBytes,0n); assert.equal(release.success,true); }
  assert.equal(f.usage.storageReservedBytes,20n);
});
test('overlapping expiry cleanup jobs release each reservation once', async () => {
  const f = fixture(); f.receipt.expiresAt = new Date(0);
  const results = await Promise.all([f.usageApi.cleanupExpiredContentWorkspaceStorageReservations(),f.usageApi.cleanupExpiredContentWorkspaceStorageReservations()]);
  assert.equal(results.reduce((sum,r) => sum + r.released,0),1); assert.equal(f.usage.storageReservedBytes,20n); assert.equal(f.receipt.status,'RELEASED');
});
test('cancel API denies unauthorized users and foreign workspace keys before releasing quota', async () => {
  for (const [creator, allowed, key, status] of [[null,false,'calendars/w/p/a.jpg',401],[{id:'outsider'},false,'calendars/w/p/a.jpg',403],[{id:'member'},true,'calendars/other/p/a.jpg',400]]) {
    const route = load('app/api/calendars/[id]/uploads/cancel/route.ts', {
      '@/lib/auth': {getCurrentCreator: async () => creator}, '@/lib/calendarPermissions': { hasCalendarPermission: async () => allowed },
      '@/lib/db': { db: {} }, '@/lib/contentWorkspaceUsage': { releaseContentWorkspaceStorageReservation: () => assert.fail('Must not release') },
    });
    const response = await route.POST(new Request('http://localhost/cancel',{ method:'POST',body:JSON.stringify({reservationId:'r',fileKey:key}) }),{params:Promise.resolve({id:'w'})}); assert.equal(response.status,status);
  }
});
test('cancel API uses the storage owner and the feature permission belonging to the upload type', async () => {
  for (const [path, permission] of [['business-documents/a.pdf','knowledge.manage'],['banner-desktop/a.jpg','delivery.manage'],['p/a.jpg','ADD_CONTENT']]) {
    const route = load('app/api/calendars/[id]/uploads/cancel/route.ts', {
      '@/lib/auth': {getCurrentCreator: async () => ({id:'member'})}, '@/lib/calendarPermissions': {hasCalendarPermission: async (actor,calendar,access) => { assert.equal(access,permission); return true; }},
      '@/lib/db': {db:{socialCalendar:{findUnique:async()=>({managerId:'owner'})}}},
      '@/lib/contentWorkspaceUsage': {releaseContentWorkspaceStorageReservation:async(...args)=>{assert.deepEqual(args,['r','owner','w',`calendars/w/${path}`]);return {success:true};}},
    });
    const response = await route.POST(new Request('http://localhost/cancel',{method:'POST',body:JSON.stringify({reservationId:'r',fileKey:`calendars/w/${path}`})}),{params:Promise.resolve({id:'w'})});assert.equal(response.status,200);
  }
});
test('actual reservation and usage lock SQL executes in isolated PostgreSQL (PGlite)', async () => {
  const {PGlite} = require('/private/tmp/showwork-workflow-qa/node_modules/@electric-sql/pglite');
  const pg = new PGlite();
  try {
    await pg.exec(`CREATE TABLE "ContentWorkspaceStorageReservation"(id TEXT PRIMARY KEY,"expiresAt" TIMESTAMPTZ); CREATE TABLE "ContentWorkspaceUsage"("creatorId" TEXT PRIMARY KEY); INSERT INTO "ContentWorkspaceStorageReservation" VALUES ('future',now()+interval '1 hour'),('expired',now()-interval '1 hour'); INSERT INTO "ContentWorkspaceUsage" VALUES ('owner');`);
    const {lockWorkspaceUploadReservation,lockWorkspaceUploadUsage} = load('lib/workspaceUploadLocks.ts');
    await pg.transaction(async tx => {
      const adapter = {$queryRaw: async (parts,...values) => (await tx.query(parts.reduce((sql,part,index)=>sql+(index ? '$'+index : '')+part,''),values)).rows};
      assert.equal((await lockWorkspaceUploadReservation(adapter,'future')).live,true);
      assert.equal((await lockWorkspaceUploadReservation(adapter,'expired')).live,false);
      assert.equal(await lockWorkspaceUploadReservation(adapter,'missing'),null);
      await lockWorkspaceUploadUsage(adapter,'owner');
    });
  } finally { await pg.close(); }
});
test('header upload completion charges one receipt once and title-only edits keep existing banner files', async () => {
  const key = 'calendars/w/banner-desktop/new.jpg';
  const calendar = {id:'w',managerId:'owner',headerBannerDesktopUrl:null,headerBannerMobileUrl:null};
  const receipt = {id:'r',creatorId:'owner',calendarId:'w',fileKey:key,bytes:10n,status:'PENDING',expiresAt:new Date(Date.now()+60000)};
  const usage = {storageReservedBytes:30n,storageBytes:0n}; let chain = Promise.resolve(), charged = 0, deleted = 0, heads = 0, releaseHeads;
  const headGate = new Promise(r => releaseHeads = r);
  const db = {socialCalendar:{findUnique:async()=>({...calendar})},contentWorkspaceStorageReservation:{findUnique:async()=>({...receipt})},
    $transaction(run) { const next = chain.then(() => run({
      $queryRaw:async(parts)=>{ const sql=parts.join(''); if(sql.includes('clock_timestamp'))return [{now:new Date()}]; if(sql.includes('SocialCalendar'))return [{...calendar}]; if(sql.includes('ContentWorkspaceStorageReservation'))return [{...receipt}]; throw Error('Unexpected SQL'); },
      contentWorkspaceStorageReservation:{update:async({data})=>Object.assign(receipt,data)},
      contentWorkspaceUsage:{updateMany:async({data})=>{charged++;usage.storageReservedBytes-=data.storageReservedBytes.decrement;usage.storageBytes+=data.storageBytes.increment;return {count:1};}},
      socialCalendar:{update:async({data})=>{Object.assign(calendar,Object.fromEntries(Object.entries(data).filter(([,v])=>v!==undefined)));return {...calendar};}},
    }));chain=next.catch(()=>{});return next; }
  };
  const {PATCH} = load('app/api/calendars/[id]/route.ts',{'@/lib/db':{db},'@/lib/auth':{getCurrentCreator:async()=>({id:'member'})},'@/lib/calendarPermissions':{hasCalendarPermission:async()=>true},'@/lib/publishing/applicationBoundary':{publishingIntegrationInstalled:()=>false},'@/lib/r2':{getObjectSize:async()=>{if(++heads===2)releaseHeads();await headGate;return 10;},deleteObject:async()=>{deleted++;}},'@/lib/contentWorkspaceUsage':{releaseContentWorkspaceStorage:async()=>assert.fail('Unchanged banner must not release storage')}});
  const patch = body => PATCH(new Request('http://localhost/header',{method:'PATCH',body:JSON.stringify(body)}),{params:Promise.resolve({id:'w'})});
  const input = {action:'update_header',desktopReservationId:'r',headerBannerDesktopUrl:key};
  const responses = await Promise.all([patch(input),patch(input)]);assert.deepEqual(responses.map(r=>r.status),[200,200]);assert.equal(charged,1);assert.equal(usage.storageBytes,10n);
  assert.equal((await patch({action:'update_header',headerTitle:'New title'})).status,200);assert.equal(deleted,0);assert.equal(calendar.headerBannerDesktopUrl,key);
  calendar.headerBannerDesktopUrl = 'https://legacy.invalid/banner.jpg';
  assert.equal((await patch({action:'update_header',headerBannerDesktopUrl:calendar.headerBannerDesktopUrl,headerTitle:'Keep legacy banner'})).status,200);
  assert.equal(deleted,0);
});
test('canonical upload boundary remains authoritative when installed', async () => {
  let calls = 0;
  const {POST} = load('app/api/calendars/[id]/posts/[postId]/upload-complete/route.ts', {
    '@/lib/publishing/applicationBoundary':{publishingIntegrationInstalled:()=>true,invokePublishingEntrypoint:async()=>{calls++;return Response.json({canonical:true});}},
    '@/lib/auth':{getCurrentCreator:()=>assert.fail('Do not run the legacy handler')},'@/lib/db':{db:{}},'@/lib/r2':{},'@/lib/contentWorkspaceUsage':{},
  });
  assert.equal((await POST(new Request('http://localhost/upload',{method:'POST'}),{params:Promise.resolve({id:'w',postId:'p'})})).status,200);assert.equal(calls,1);
});
