'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {startOwnershipCluster}=require('./helpers/ownership-cluster.cjs'),{load}=require('./helpers/load-typescript.cjs');
test('canonical proposal against the actual Prisma application schema',async()=>{
 const cluster=await startOwnershipCluster(),root=path.resolve(__dirname,'..');
 try {
  // Offline datamodel diff, outside the project dotenv directory. No DB URL is used.
  const generated=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel',path.join(root,'prisma/schema.prisma'),'--script'],{cwd:os.tmpdir(),encoding:'utf8',env:{PATH:process.env.PATH,DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:1/unused',DIRECT_URL:'postgresql://synthetic:synthetic@127.0.0.1:1/unused',CHECKPOINT_DISABLE:'1'}});
  assert.equal(generated.status,0,generated.stderr);
  await cluster.pool.query('CREATE SCHEMA accelerated_9001');await cluster.pool.query('SET search_path TO accelerated_9001');
  await cluster.pool.query(generated.stdout);
  for(const file of ['schema.sql','ownership-schema.sql','intent-actions-schema.sql','canonical-schema.sql','eligibility-schema.sql','authorization-schema.sql','provider-schema.sql','integration-schema.sql'])await cluster.pool.query(fs.readFileSync(path.join(root,'scripts/publishing-reliability',file),'utf8'));
  const database=load('lib/publishing/transactionDatabase.ts').createPublishingTransactionDatabase(cluster.pool,{schema:'accelerated_9001'}),cache=new Map(),shared=file=>load(file,{},cache);
  await cluster.pool.query(`INSERT INTO "Creator"(id,email,"passwordHash","contentWorkspacePlan","contentWorkspaceBillingStatus") VALUES('owner','synthetic@example.invalid','not-a-real-password','CREATOR','ACTIVE')`);
  await cluster.pool.query(`INSERT INTO "SocialCalendar"(id,slug,"clientName","passwordHash","managerId","updatedAt") VALUES('calendar','synthetic','Synthetic','not-a-real-password','owner',now())`);
  const policy={verifyViewer:async()=>({principalId:'viewer',calendarId:'calendar',expiresAt:new Date(Date.now()+60000)}),verifyRetryEvidence:async()=>{throw Error('NO_RETRY_PROOF');}};
  const v=shared('lib/publishing/validationAdapters.ts').createPublishingValidationAdapters({database,...policy});
  const owner=shared('lib/publishing/ownership.ts').createPublishingOwnership;
  assert.equal(typeof owner,'function');
  const ownership=owner(database);
  await ownership.transition({operationId:'real-netlify',actor:'operator',expectedEpoch:0n,to:'NETLIFY',activate:true});
  await ownership.transition({operationId:'real-drain',actor:'operator',expectedEpoch:1n,to:'DRAINING'});
  const control=shared('lib/publishing/integrationControl.ts').createPublishingIntegrationControl({database,validation:{database,...policy},verifyStopped:async()=>({scope:'ALL_SENDERS',evidenceHash:'a'.repeat(64)})});
  await control.activate({operationId:'real-mode',actor:'operator',epoch:2n,evidenceReference:'synthetic-stopped-proof'});
  await ownership.transition({operationId:'real-canonical',actor:'operator',expectedEpoch:2n,to:'NETLIFY'});
  // Verify real defaults/required timestamps and transaction-aware eligibility directly.
  await database.transaction(tx=>v.validateWorkspacePermission(tx,{actor:'owner',calendarId:'calendar',permission:'publishing.manage'}));
  const actions=shared('lib/publishing/applicationActions.ts').createCanonicalApplicationActions({database,policy,creatorInfo:async()=>{throw Error('NOT_TIKTOK');},verifyAccount:async()=>({connectionId:'connection',platform:'X',providerAccountId:'account',tokenScopes:'tweet.write',accessToken:'synthetic',expiresAt:new Date(Date.now()+3600000)}),authorizeBilling:async()=>{},validateUsage:async()=>{},retention:async()=>{throw Error('NO_RETENTION_APPROVAL');}});
  const created=await actions.createPost({operationId:'create-real',actor:'owner',calendarId:'calendar',id:'post',platform:'X',caption:'Synthetic actual schema'});assert.equal(created.postId,'post');
  assert.equal((await cluster.pool.query(`SELECT "approvalStatus" FROM "CalendarPost" WHERE id='post'`)).rows[0].approvalStatus,'PENDING');
  await actions.account({operationId:'connect-real',actor:'owner',calendarId:'calendar',bindingId:'binding',expectedVersion:0,proof:'synthetic-proof'});
  const binding=(await cluster.pool.query(`SELECT "currentVersion" FROM "PublishingAccountBinding" WHERE id='binding'`)).rows[0];assert.equal(binding.currentVersion,1);
  await actions.review({operationId:'approve-real',calendarId:'calendar',postId:'post',credential:'synthetic-viewer',approved:true});
  const scheduled=await actions.publishing({operationId:'schedule-real',actor:'owner',postId:'post',platform:'X',intentId:'intent',expectedRevision:0,dueAt:new Date(),destination:{accountBindingId:'binding',accountVersion:1}},'schedule');
  const spool=await shared('lib/publishing/providerSpool.ts').createSyntheticProviderSpool(path.join(cluster.socketDirectory,'actual-schema-spool'));
  const worker=shared('lib/publishing/acceleratedComposition.ts').createAcceleratedPublishingWorker({environment:'isolated-mock',database,validation:v,spool,io:require('./helpers/provider-mocks.cjs').mock(),actor:'worker',owner:'NETLIFY',epoch:3n,materialize:async()=>{throw Error('NO_ASSETS_EXPECTED');},rates:{creator:10,init:10,status:10}});
  try {const target=shared('lib/publishing/canonicalWorkerStore.ts').canonicalPublicationTarget(await v.canonicalStore().findJob(scheduled.jobId));assert.equal((await worker.run(target)).state,'confirmed');assert.equal((await worker.run(target)).state,'confirmed');}finally{await worker.close();}
  assert.equal((await cluster.pool.query('SELECT count(*) FROM "PublishingExternalAttempt"')).rows[0].count,'1');
  assert.equal((await cluster.pool.query('SELECT "publishStatus" FROM "CalendarPost" WHERE id=\'post\'')).rows[0].publishStatus,'PUBLISHED');
  const monitoring=await shared('lib/publishing/publishingMonitoring.ts').createPublishingMonitoring(database)();assert.equal(monitoring.owner.epoch,'3');assert.equal(monitoring.maySend,false);assert.equal(monitoring.unresolved.count,0);assert.deepEqual(monitoring.phases,[{phase:'CONFIRMED',count:1}]);
  await cluster.pool.query(fs.readFileSync(path.join(root,'scripts/publishing-reliability/production-grants.proposal.sql'),'utf8').replaceAll('public.','accelerated_9001.').replaceAll("schemaname='public'","schemaname='accelerated_9001'").replaceAll("n.nspname='public'","n.nspname='accelerated_9001'").replace('SCHEMA public','SCHEMA accelerated_9001'));
  const restricted=await cluster.pool.connect();try {
   await restricted.query('SET ROLE publishing_runtime');
   assert.equal((await restricted.query('SELECT count(*) FROM accelerated_9001."PublishingAccountVersion"')).rows[0].count,'1');
   await assert.rejects(restricted.query('DELETE FROM accelerated_9001."PublishingAccountVersion"'),/permission denied/);
   await assert.rejects(restricted.query('SELECT * FROM accelerated_9001."PublishingApplicationOperation"'),/permission denied/);
   await assert.rejects(restricted.query(`INSERT INTO accelerated_9001."PublishingBillingRevocationResolution"("ownerId","holdOperationId","operationId",reason) VALUES('owner','hold','forged','TRUSTED_PAYMENT_VERIFIED')`),/permission denied/);
   await assert.rejects(restricted.query('ALTER TABLE accelerated_9001."PublishingExternalAttempt" DISABLE TRIGGER ALL'),/must be owner/);
  }finally{await restricted.query('RESET ROLE');restricted.release();}
 } finally {await cluster.close();}
});
