const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('./helpers/load-typescript.cjs');
const normalize = row => Object.fromEntries(Object.entries(row).map(([key,value])=>[key, value!==null && ['bytes','sizeBytes','storageBytes','storageReservedBytes'].includes(key)?BigInt(value):value]));
const { PGlite } = require('/private/tmp/showwork-workflow-qa/node_modules/@electric-sql/pglite');

async function fixture() {
  const pg = new PGlite();
  await pg.exec(`
    CREATE TABLE "SocialCalendar"(id TEXT PRIMARY KEY,"managerId" TEXT,"headerBannerDesktopUrl" TEXT,"headerBannerMobileUrl" TEXT,"aiBusinessSummary" TEXT,"aiBusinessSummarySourceHash" TEXT,"aiBusinessSummaryUpdatedAt" TIMESTAMP,"planStatus" TEXT,"planSubmittedAt" TIMESTAMP,"planApprovedAt" TIMESTAMP,"planApprovalNote" TEXT);
    CREATE TABLE "CalendarPost"(id TEXT PRIMARY KEY,"calendarId" TEXT REFERENCES "SocialCalendar"(id) ON DELETE CASCADE,platform TEXT DEFAULT 'INSTAGRAM',"approvalStatus" TEXT DEFAULT 'PENDING',"publishStatus" TEXT DEFAULT 'NOT_SCHEDULED',"instagramPublishStatus" TEXT DEFAULT 'NOT_SCHEDULED',"tikTokPublishStatus" TEXT DEFAULT 'NOT_SCHEDULED',"publishWorkerStartedAt" TIMESTAMP,"tikTokInitStartedAt" TIMESTAMP,"tikTokPublishId" TEXT,"platformPostId" TEXT,"instagramMediaId" TEXT);
    CREATE TABLE "CalendarPostAsset"(id TEXT PRIMARY KEY,"postId" TEXT REFERENCES "CalendarPost"(id) ON DELETE CASCADE,"fileKey" TEXT,"sizeBytes" BIGINT,"mediaType" TEXT DEFAULT 'PHOTO',"displayOrder" INTEGER DEFAULT 0);
    CREATE TABLE "CalendarBusinessDocument"(id TEXT PRIMARY KEY,"calendarId" TEXT REFERENCES "SocialCalendar"(id) ON DELETE CASCADE,"fileKey" TEXT,"sizeBytes" BIGINT);
    CREATE TABLE "ContentWorkspaceUsage"("creatorId" TEXT PRIMARY KEY,"storageBytes" BIGINT,"storageReservedBytes" BIGINT);
    CREATE TABLE "ContentWorkspaceStorageReservation"(id TEXT PRIMARY KEY,"creatorId" TEXT,"calendarId" TEXT REFERENCES "SocialCalendar"(id) ON DELETE CASCADE,"fileKey" TEXT,bytes BIGINT,status TEXT,"expiresAt" TIMESTAMP,"releasedAt" TIMESTAMP);
    CREATE TABLE "CalendarImport"(id TEXT PRIMARY KEY,"calendarId" TEXT REFERENCES "SocialCalendar"(id) ON DELETE CASCADE);
    INSERT INTO "SocialCalendar"(id,"managerId") VALUES('w','owner'),('other','other-owner');
    INSERT INTO "ContentWorkspaceUsage" VALUES('owner',100,30),('other-owner',200,0);
    INSERT INTO "CalendarPost"(id,"calendarId") VALUES('p','w'),('shared','w'),('foreign','other');
    INSERT INTO "CalendarPostAsset"(id,"postId","fileKey","sizeBytes") VALUES('a','p','calendars/w/p/a.jpg',10),('b','shared','calendars/w/p/a.jpg',10);
    INSERT INTO "ContentWorkspaceStorageReservation" VALUES('r','owner','w','calendars/w/p/a.jpg',10,'COMPLETED',now()+interval '8 hours',NULL);
  `);
  await pg.exec(fs.readFileSync('prisma/migrations/20261028120000_workspace_storage_cleanup/migration.sql','utf8'));
  let queryCount = 0; let failDelete = false, retention = false; const deleted = []; const deletedPosters = [];
  function adapter(connection) {
    const q = async(sql, args=[]) => { queryCount++; return (await connection.query(sql,args.map(v=>typeof v==='bigint'?v.toString():v))).rows.map(normalize); };
    function where(input, args, table) {
      if (!input) return 'TRUE'; const clauses=[];
      for (const [key,value] of Object.entries(input)) {
        if (key==='post') { clauses.push(`"postId" IN(SELECT id FROM "CalendarPost" WHERE ${where(value,args,'CalendarPost')})`); continue; }
        if (key==='NOT' || key==='OR' || key==='AND') { const list=Array.isArray(value)?value:[value]; const nested=list.map(v=>(key==='NOT'?'NOT ':'')+'('+where(v,args,table)+')').join(key==='OR'?' OR ':' AND ');clauses.push(`(${nested})`);continue; }
        const column=`"${key}"`;
        if (value && typeof value==='object' && !(value instanceof Date)) {
          if ('startsWith' in value) { args.push(value.startsWith+'%');clauses.push(`${column} LIKE $${args.length}`); }
          else if ('gte' in value) { args.push(value.gte);clauses.push(`${column}>=$${args.length}`); }
          else if ('in' in value) { const names=value.in.map(v=>{args.push(v);return '$'+args.length;});clauses.push(`${column} IN(${names.join(',')})`); }
          else throw Error('Unhandled filter '+key);
        } else {args.push(value);clauses.push(`${column}=$${args.length}`);}
      }
      return clauses.join(' AND ') || 'TRUE';
    }
    const api={
      $queryRaw:async(parts,...args)=>q(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),args),
      $executeRaw:async(parts,...args)=>{await q(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),args);return 1;},
    };
    for(const table of ['SocialCalendar','CalendarPost','CalendarPostAsset','CalendarBusinessDocument','ContentWorkspaceStorageReservation','ContentWorkspaceUsage','CalendarImport']) {
      const name=table[0].toLowerCase()+table.slice(1);
      const many=async(input={})=>{const args=[];const condition=where(input.where,args,table);return q(`SELECT * FROM "${table}" WHERE ${condition}`,args);};
      const update=async({where:filter,data})=>{const args=[],sets=[];for(const [key,value]of Object.entries(data)){if(value===undefined)continue;if(value&&typeof value==='object'&&'decrement'in value){args.push(value.decrement);sets.push(`"${key}"="${key}"-$${args.length}`);}else {args.push(value);sets.push(`"${key}"=$${args.length}`);}}const condition=where(filter,args,table);return q(`UPDATE "${table}" SET ${sets.join(',')} WHERE ${condition} RETURNING *`,args);};
      const remove=async({where:filter})=>{const args=[];const condition=where(filter,args,table);return q(`DELETE FROM "${table}" WHERE ${condition} RETURNING *`,args);};
      api[name]={findMany:many,findFirst:async input=>(await many(input))[0]||null,findUnique:async input=>(await many(input))[0]||null,count:async input=>(await many(input)).length,updateMany:async input=>({count:(await update(input)).length}),update:async input=>(await update(input))[0],deleteMany:async input=>({count:(await remove(input)).length}),delete:async input=>(await remove(input))[0]};
    }
    return api;
  }
  const db=adapter(pg);db.$transaction=fn=>pg.transaction(tx=>fn(adapter(tx)));
  const mocks={'@/lib/db':{db},'@/lib/r2':{deleteObject:async key=>{if(failDelete){failDelete=false;throw Error('storage unavailable');}if(key.includes("/video-posters/"))deletedPosters.push(key);else deleted.push(key);}},'@/lib/publishing/applicationBoundary':{publishingRetentionRequired:()=>retention}};
  const cache=new Map();const cleanup=load('lib/workspaceStorageCleanup.ts',mocks,cache);const rawRemoval=load('lib/workspaceDeletion.ts',mocks,cache);const removal={removeWorkspaceContent:input=>rawRemoval.removeWorkspaceContent({actorId:input.calendarId==='other'?'other-owner':'owner',...input})};
  const sql=async(s,args=[]) => (await pg.query(s,args)).rows.map(normalize);
  return {pg,db,sql,cleanup,removal,deleted,deletedPosters,queries:()=>queryCount,failNextDelete:()=>failDelete=true,retain:()=>retention=true,close:()=>pg.close(),usage:async()=> (await sql(`SELECT * FROM "ContentWorkspaceUsage" WHERE "creatorId"='owner'`))[0],job:async()=> (await sql('SELECT * FROM "WorkspaceStorageCleanup"'))[0]};
}

test('shared asset removal preserves the object and charge; last removal releases once with durable cleanup',async()=>{
 const f=await fixture();try{
 await f.removal.removeWorkspaceContent({mode:'asset',calendarId:'w',postId:'p',assetId:'a'});assert.equal((await f.usage()).storageBytes,100n);assert.equal((await f.job()).usageReleasedAt,null);assert.equal(f.deleted.length,0);
 await f.removal.removeWorkspaceContent({mode:'asset',calendarId:'w',postId:'shared',assetId:'b'});assert.equal((await f.usage()).storageBytes,90n);assert.ok((await f.job()).usageReleasedAt);
 await f.removal.removeWorkspaceContent({mode:'asset',calendarId:'w',postId:'shared',assetId:'b'});assert.equal((await f.usage()).storageBytes,90n);
 assert.equal((await f.cleanup.processWorkspaceStorageCleanup()).processed,0,'signed upload URL must expire before physical purge');
 await f.sql(`UPDATE "WorkspaceStorageCleanup" SET "notBefore"=now()-interval '1 minute'`);await f.cleanup.processWorkspaceStorageCleanup();assert.equal(f.deleted.length,1);assert.equal(f.deletedPosters.length,1);await f.cleanup.processWorkspaceStorageCleanup();assert.equal(f.deleted.length,1);assert.equal((await f.usage()).storageBytes,90n);
 }finally{await f.close();}
});
test('failed storage deletion is durable and retry does not release storage twice',async()=>{
 const f=await fixture();try{
 await f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'});assert.equal((await f.usage()).storageBytes,90n);
 await f.sql(`UPDATE "WorkspaceStorageCleanup" SET "notBefore"=now()-interval '1 minute'`);f.failNextDelete();assert.equal((await f.cleanup.processWorkspaceStorageCleanup()).failed,1);assert.equal((await f.job()).state,'PENDING');
 await f.sql(`UPDATE "WorkspaceStorageCleanup" SET "notBefore"=now()-interval '1 minute'`);assert.equal((await f.cleanup.processWorkspaceStorageCleanup()).deleted,1);assert.equal((await f.usage()).storageBytes,90n);
 }finally{await f.close();}
});
test('reset keeps documents and banners; workspace deletion includes them and pending reservations',async()=>{
 const f=await fixture();try{
 await f.pg.exec(`INSERT INTO "CalendarBusinessDocument" VALUES('d','w','calendars/w/business-documents/d.pdf',20);UPDATE "SocialCalendar" SET "headerBannerDesktopUrl"='calendars/w/banner-desktop/b.jpg' WHERE id='w'; INSERT INTO "ContentWorkspaceStorageReservation" VALUES('banner','owner','w','calendars/w/banner-desktop/b.jpg',30,'COMPLETED',now(),NULL),('pending','owner','w','calendars/w/p/pending.jpg',5,'PENDING',now()+interval '8 hours',NULL)`);
 await f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'});assert.equal((await f.usage()).storageBytes,90n);assert.equal((await f.usage()).storageReservedBytes,25n);assert.equal((await f.sql('SELECT count(*)::int AS n FROM "CalendarBusinessDocument"'))[0].n,1);
 await f.removal.removeWorkspaceContent({mode:'workspace',calendarId:'w'});assert.equal((await f.usage()).storageBytes,40n);assert.equal((await f.usage()).storageReservedBytes,25n);assert.equal((await f.sql(`SELECT count(*)::int AS n FROM "SocialCalendar" WHERE id='other'`))[0].n,1);assert.equal((await f.sql('SELECT count(*)::int AS n FROM "WorkspaceStorageCleanup"'))[0].n,4);
 await f.removal.removeWorkspaceContent({mode:'workspace',calendarId:'w'});assert.equal((await f.usage()).storageBytes,40n);
 }finally{await f.close();}
});
test('counter inconsistency rolls back logical removal and cleanup job creation',async()=>{
 const f=await fixture();try{await f.sql(`UPDATE "ContentWorkspaceUsage" SET "storageBytes"=1 WHERE "creatorId"='owner'`);await assert.rejects(f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'}),/accounting/);assert.equal((await f.sql(`SELECT count(*)::int AS n FROM "CalendarPost" WHERE "calendarId"='w'`))[0].n,2);assert.equal((await f.sql('SELECT count(*)::int AS n FROM "WorkspaceStorageCleanup"'))[0].n,0);assert.equal(f.deleted.length,0);}finally{await f.close();}
});
test('scheduled publishing blocks deletion; retention blocks purge and quota release',async()=>{
 const f=await fixture();try{await f.sql(`UPDATE "CalendarPost" SET "instagramPublishStatus"='SCHEDULED' WHERE id='p'`);await assert.rejects(f.removal.removeWorkspaceContent({mode:'workspace',calendarId:'w'}),/publishing/);assert.equal(f.deleted.length,0);await f.sql(`UPDATE "CalendarPost" SET "instagramPublishStatus"='NOT_SCHEDULED' WHERE id='p'`);f.retain();await f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'});assert.equal((await f.usage()).storageBytes,100n);await f.sql(`UPDATE "WorkspaceStorageCleanup" SET "notBefore"=now()-interval '1 minute'`);assert.equal((await f.cleanup.processWorkspaceStorageCleanup()).deleted,0);assert.equal(f.deleted.length,0);}finally{await f.close();}
});
test('deleted object keys cannot be reattached while physical cleanup is pending',async()=>{
 const f=await fixture();try{await f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'});await assert.rejects(f.db.$transaction(tx=>f.cleanup.assertWorkspaceFileAttachable(tx,'calendars/w/p/a.jpg')),/removed/);}finally{await f.close();}
});
test('deleting a business document invalidates summary and releases only its own file',async()=>{
 const f=await fixture();try{await f.pg.exec(`INSERT INTO "CalendarBusinessDocument" VALUES('d','w','calendars/w/business-documents/d.pdf',20);UPDATE "SocialCalendar" SET "aiBusinessSummary"='old knowledge' WHERE id='w';`);await f.removal.removeWorkspaceContent({mode:'document',calendarId:'w',documentId:'d'});assert.equal((await f.usage()).storageBytes,80n);assert.equal((await f.sql(`SELECT "aiBusinessSummary" FROM "SocialCalendar" WHERE id='w'`))[0].aiBusinessSummary,null);assert.equal((await f.sql('SELECT count(*)::int AS n FROM "CalendarPostAsset"'))[0].n,2);await f.removal.removeWorkspaceContent({mode:'document',calendarId:'w',documentId:'d'});assert.equal((await f.usage()).storageBytes,80n);}finally{await f.close();}
});
test('overlapping cleanup workers can claim an object only once',async()=>{
 const f=await fixture();try{await f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'});await f.sql(`UPDATE "WorkspaceStorageCleanup" SET "notBefore"=now()-interval '1 minute'`);await Promise.all([f.cleanup.processWorkspaceStorageCleanup(),f.cleanup.processWorkspaceStorageCleanup()]);assert.equal((await f.usage()).storageBytes,90n);assert.equal(f.deleted.length,1);assert.equal((await f.job()).state,'COMPLETE');}finally{await f.close();}
});
test('expired released uploads are discovered for orphan cleanup, without another storage debit',async()=>{
 const f=await fixture();try{await f.sql(`INSERT INTO "ContentWorkspaceStorageReservation" VALUES('orphan','owner','w','calendars/w/p/orphan.jpg',5,'RELEASED',now()-interval '1 hour',now())`);assert.equal((await f.cleanup.discoverReleasedWorkspaceUploads()).discovered,1);assert.equal((await f.usage()).storageBytes,100n);assert.equal((await f.usage()).storageReservedBytes,30n);assert.equal((await f.job()).bytes,0n);}finally{await f.close();}
});
test('a foreign workspace cannot remove another workspace file or alter its usage',async()=>{
 const f=await fixture();try{const result=await f.removal.removeWorkspaceContent({mode:'asset',calendarId:'other',postId:'foreign',assetId:'a'});assert.equal(result.deletedCount,0);assert.equal((await f.usage()).storageBytes,100n);assert.equal((await f.sql(`SELECT count(*)::int AS n FROM "CalendarPostAsset" WHERE id='a'`))[0].n,1);}finally{await f.close();}
});
test('cleanup cron refuses missing credentials before invoking any cleanup service',async()=>{
 const old=process.env.CRON_SECRET;delete process.env.CRON_SECRET;try{
 const service=new Proxy({},{get:()=>()=>assert.fail('Unauthorized cleanup')});
 const route=load('app/api/cron/content-workspace-storage/route.ts',{'@/lib/workspaceStorageCleanup':service,'@/lib/contentWorkspaceUsage':service,'@/lib/r2':service});
 for(const method of ['GET','POST'])assert.equal((await route[method](new Request('http://localhost/cron',{method}))).status,401);
 }finally{if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old;}
});
test('workspace owner is rechecked under the deletion lock',async()=>{
 const f=await fixture();try{await assert.rejects(f.removal.removeWorkspaceContent({mode:'workspace',calendarId:'w',actorId:'outsider'}),/current workspace owner/);assert.equal((await f.sql(`SELECT count(*)::int AS n FROM "SocialCalendar" WHERE id='w'`))[0].n,1);assert.equal(f.deleted.length,0);}finally{await f.close();}
});
test('large calendar reset batches cleanup bookkeeping instead of making a query per file',async()=>{
 const f=await fixture();try{await f.pg.exec(`INSERT INTO "CalendarPostAsset"(id,"postId","fileKey","sizeBytes") SELECT 'bulk-'||n,'p','calendars/w/p/bulk-'||n||'.jpg',1 FROM generate_series(1,50) n`);const start=f.queries();await f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'});assert.ok(f.queries()-start<35,`Reset used ${f.queries()-start} queries`);assert.equal((await f.usage()).storageBytes,40n);assert.equal((await f.sql('SELECT count(*)::int AS n FROM "WorkspaceStorageCleanup"'))[0].n,51);}finally{await f.close();}
});
test('publishing snapshot pins preserve objects even when the installed protocol is legacy',async()=>{
 const f=await fixture();try{await f.pg.exec(`CREATE TABLE "PublishingMediaSnapshot"("sourceKey" TEXT,"blobKey" TEXT);INSERT INTO "PublishingMediaSnapshot" VALUES('calendars/w/p/a.jpg','calendars/w/p/snapshot.jpg')`);await f.removal.removeWorkspaceContent({mode:'reset',calendarId:'w'});assert.equal((await f.usage()).storageBytes,100n);await f.sql(`UPDATE "WorkspaceStorageCleanup" SET "notBefore"=now()-interval '1 minute'`);assert.equal((await f.cleanup.processWorkspaceStorageCleanup()).deleted,0);assert.equal(f.deleted.length,0);}finally{await f.close();}
});
