const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {load}=require('./helpers/load-typescript.cjs');
// An isolated disposable PostgreSQL engine: never reads .env or connects to production.
const location=process.env.SHOWWORK_REVIEW_PGLITE_PATH||'/private/tmp/showwork-workflow-qa/node_modules/@electric-sql/pglite';
test('migration, isolation, concurrency, resumable indexing, updates/deletes and model upgrades',async()=>{
 const {PGlite}=require(location);const pg=new PGlite();
 await pg.exec(`CREATE TABLE "CalendarBusinessDocument" (id TEXT PRIMARY KEY,"calendarId" TEXT NOT NULL,"originalName" TEXT NOT NULL,"websiteUrl" TEXT,"extractedText" TEXT);
 INSERT INTO "CalendarBusinessDocument" VALUES ('a','workspace-a','Price',null,'Nimbus Pro costs GBP 450.'),('b','workspace-b','Private',null,'PRIVATE OTHER WORKSPACE');`);
 await pg.exec(fs.readFileSync('prisma/migrations/20261025160000_hybrid_knowledge_index/migration.sql','utf8'));
 const sql={query:(q,p)=>pg.query(q,p)};
 const api=load('lib/knowledge/hybrid/store.ts',{'@/lib/db':{db:{}}});
 const old={...process.env};process.env.KNOWLEDGE_EMBEDDING_MODEL='test';process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS='64';
 let calls=0;const embedder=async texts=>{calls++;return {vectors:texts.map(()=>Array(64).fill(0.1)),usage:{inputTokens:10,outputTokens:0,requests:1}};};
 try{
  assert.equal((await api.indexStatus(sql,'workspace-a')).length,1);
  const result=await api.processIndexBatch(sql,async texts=>{const concurrent=await api.processIndexBatch(sql,embedder,'workspace-a');assert.equal(concurrent.worked,false,'active lease prevents a second embedding call');return embedder(texts);},'workspace-a');assert.equal(result.ready,true);assert.equal(result.committed,true);
  assert.equal((await api.loadVectors(sql,'workspace-a','structure-v1:test:1:64',100)).length,1);
  assert.equal((await api.loadVectors(sql,'workspace-b','structure-v1:test:1:64',100)).length,0);
  await api.processIndexBatch(sql,embedder,'workspace-a');assert.equal(calls,1,'unchanged ready source must not embed twice');
  await pg.query('UPDATE "CalendarBusinessDocument" SET "extractedText"=$1 WHERE id=$2',['New price GBP 500','a']);
  assert.equal((await api.loadVectors(sql,'workspace-a','structure-v1:test:1:64',100)).length,0);
  assert.equal((await api.indexStatus(sql,'workspace-a'))[0].status,'PENDING');
  // Change source during provider call: old lease cannot publish stale evidence.
  const interrupted=await api.processIndexBatch(sql,async texts=>{await pg.query('UPDATE "CalendarBusinessDocument" SET "extractedText"=$1 WHERE id=$2',['Newest price GBP 600','a']);return embedder(texts);},'workspace-a');
  assert.equal(interrupted.committed,false);
  await api.processIndexBatch(sql,embedder,'workspace-a');assert.equal((await api.indexStatus(sql,'workspace-a'))[0].status,'READY');
  process.env.KNOWLEDGE_EMBEDDING_VERSION='2';await api.processIndexBatch(sql,embedder,'workspace-a');
  assert.equal((await api.loadVectors(sql,'workspace-a','structure-v1:test:1:64',100)).length,0);
  assert.equal((await api.loadVectors(sql,'workspace-a','structure-v1:test:2:64',100)).length,1);
  await assert.rejects(pg.query(`INSERT INTO "KnowledgeSourceIndex" ("sourceId","calendarId") VALUES ('b','workspace-a')`));
  await assert.rejects(pg.query(`INSERT INTO "KnowledgePassage" (id,"sourceId","calendarId",revision,ordinal,title,heading,start,"end",text) VALUES ('forged','a','workspace-b',1,0,'x','x',0,1,'x')`));
  await pg.query('DELETE FROM "CalendarBusinessDocument" WHERE id=$1',['a']);
  assert.equal((await api.indexStatus(sql,'workspace-a')).length,0);assert.equal((await api.loadVectors(sql,'workspace-a','structure-v1:test:2:64',100)).length,0);
  await api.processIndexBatch(sql,async()=>{throw Error('private error');},'workspace-b');
  const failed=(await api.indexStatus(sql,'workspace-b'))[0];assert.equal(failed.status,'PENDING');assert.equal(failed.errorCode,'INDEXING_UNAVAILABLE');
  for(let i=0;i<4;i++) {await pg.exec(`UPDATE "KnowledgeSourceIndex" SET "nextAttemptAt"=CURRENT_TIMESTAMP WHERE "sourceId"='b'`);await api.processIndexBatch(sql,async()=>{throw Error('outage');},'workspace-b');}
  assert.equal((await api.indexStatus(sql,'workspace-b'))[0].status,'FAILED');
  await pg.query('INSERT INTO "CalendarBusinessDocument" VALUES ($1,$2,$3,null,$4)',['large','workspace-c','Long guide',Array.from({length:40},(_,i)=>`# Section ${i}\nUnique product ${i} with special terms.\n`).join('')]);
  let batchCalls=0;const batchEmbed=async texts=>{batchCalls++;assert.ok(texts.length<=32);return embedder(texts);};
  assert.equal((await api.processIndexBatch(sql,batchEmbed,'workspace-c')).ready,false);
  assert.equal((await api.loadVectors(sql,'workspace-c','structure-v1:test:2:64',100)).length,0,'partial indexing must be explicit');
  assert.equal((await api.processIndexBatch(sql,batchEmbed,'workspace-c')).ready,true);assert.equal(batchCalls,2);
  assert.equal((await api.loadVectors(sql,'workspace-c','structure-v1:test:2:64',100)).length,40);
  assert.equal((await api.loadVectors(sql,'workspace-b','structure-v1:test:2:64',100)).length,0);
 }finally{for(const key of Object.keys(process.env))if(!(key in old))delete process.env[key];Object.assign(process.env,old);await pg.close();}
});
