const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fork}=require('node:child_process');const {Pool}=require('pg');
const {load}=require('./helpers/load-typescript.cjs');
const {startOwnershipCluster}=require('./helpers/ownership-cluster.cjs');
const {createPublishingOwnership}=load('lib/publishing/ownership.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));

test('Stage 3B independent processes and real connection failures', {timeout:120000},async t=>{
 const cluster=await startOwnershipCluster();let sequence=0;const children=new Set();
 async function fixture(run){
  const schema='case_'+(++sequence);await cluster.pool.query(`CREATE SCHEMA ${schema}`);
  const pool=new Pool({host:cluster.socketDirectory,port:5432,user:'synthetic_owner',password:'',database:'postgres',ssl:false,max:2,options:`-c search_path=${schema}`,statement_timeout:8000});
  const db={transaction:async run=>{const c=await pool.connect();try{await c.query('BEGIN');const value=await run(c);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}};
  const api=createPublishingOwnership(db);
  const tx=(id,epoch,to)=>api.transition({operationId:id,actor:'operator',expectedEpoch:BigInt(epoch),to});
  try{
   await pool.query(`CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM','TIKTOK','FACEBOOK','LINKEDIN','X')`);
   await pool.query(fs.readFileSync('scripts/publishing-reliability/schema.sql','utf8'));
   await pool.query(fs.readFileSync('scripts/publishing-reliability/ownership-schema.sql','utf8'));
   await api.transition({operationId:'activate',actor:'operator',expectedEpoch:0n,to:'NETLIFY',activate:true});
   await api.createIntent({id:'intent',postId:'post',platform:'INSTAGRAM',dueAt:new Date(0)});
   await pool.query(`INSERT INTO "PublishingAdmission" VALUES('admission','INSTAGRAM',now());
    INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase,"intentId","intentRevision","ownershipEpoch")
    VALUES('job','admission','post','INSTAGRAM',now(),'PREPARED','intent',1,1)`);
   const args={attemptId:'attempt',intentId:'intent',revision:1,jobId:'job',owner:'NETLIFY',epoch:1n,actor:'synthetic-worker'};
   async function child(operation='authorize',input=args,mode='normal'){
    const p=fork(path.join(__dirname,'helpers/ownership-process.cjs'),[],{env:{PATH:'/usr/bin:/bin'},stdio:['ignore','ignore','ignore','ipc']});children.add(p);
    const messages=[];p.on('message',m=>messages.push(m));
    const exited=new Promise(resolve=>p.once('exit',()=>{children.delete(p);resolve();}));
    async function phase(name){for(let n=0;n<400;n++){const found=messages.find(m=>m.phase===name);if(found)return found;if(messages.some(m=>m.phase==='fatal')||p.exitCode!==null||p.signalCode)throw Error('CHILD_EXIT_BEFORE_'+name);await delay(10);}throw Error('CHILD_TIMEOUT_'+name);}
    p.send({socket:cluster.socketDirectory,schema,operation,mode,args:JSON.parse(JSON.stringify(input,(_k,v)=>typeof v==='bigint'?v.toString():v))});
    const ready=await phase('ready');
    return {p,ready,messages,phase,start:()=>p.send({go:true}),release:()=>p.send({go:true}),exited,kill:async()=>{p.kill('SIGKILL');await exited;}};
   }
   async function present(){return (await pool.query('SELECT * FROM "PublishingExternalAttempt"')).rows;}
   async function waitFor(predicate){for(let n=0;n<200;n++){if(await predicate())return;await delay(10);}throw Error('OBSERVATION_TIMEOUT');}
   await run({pool,db,api,tx,args,child,present,waitFor});
  }finally{
   await Promise.all([...children].map(p=>new Promise(resolve=>{p.once('exit',resolve);p.kill('SIGKILL');})));
   await pool.end();
  }
 }
 try{
  await t.test('1 two independent authorizers grant exactly one send',()=>fixture(async h=>{
   const a=await h.child(),b=await h.child();a.start();b.start();
   const r=await Promise.all([a.phase('result'),b.phase('result')]);assert.equal(r.filter(x=>x.ok&&x.result.maySend).length,1);
   assert.equal((await h.present()).length,1);await Promise.all([a.exited,b.exited]);
  }));
  await t.test('2 conflicting owner processes serialize; only one epoch is committed',()=>fixture(async h=>{
   await h.tx('drain',1,'DRAINING');
   const a=await h.child('transition',{operationId:'to-vps',actor:'operator',expectedEpoch:2n,to:'VPS'});
   const b=await h.child('transition',{operationId:'to-netlify',actor:'operator',expectedEpoch:2n,to:'NETLIFY'});
   a.start();b.start();const r=await Promise.all([a.phase('result'),b.phase('result')]);assert.equal(r.filter(x=>x.ok).length,1);
   assert.equal((await h.pool.query('SELECT epoch FROM "PublishingOwnership"')).rows[0].epoch,'3');await Promise.all([a.exited,b.exited]);
  }));
  await t.test('3 kill before COMMIT rolls back attempt and job boundary',()=>fixture(async h=>{
   const p=await h.child('authorize',h.args,'beforeCommit');p.start();await p.phase('before-commit');await p.kill();
   await h.waitFor(async()=>!(await h.pool.query('SELECT 1 FROM pg_stat_activity WHERE pid=$1',[p.ready.pid])).rows.length);
   assert.equal((await h.present()).length,0);assert.equal((await h.pool.query('SELECT phase FROM "PublishingJob"')).rows[0].phase,'PREPARED');
  }));
  await t.test('4 kill after server COMMIT with client reads paused loses acknowledgement safely',()=>fixture(async h=>{
   const p=await h.child('authorize',h.args,'lostCommitAck');p.start();await p.phase('commit-sent');
   await h.waitFor(async()=>(await h.present()).length===1);assert.ok(!p.messages.some(m=>m.phase==='unexpected-commit-ack'));await p.kill();
   assert.equal((await h.api.recoverAttempt('attempt')).maySend,false);assert.equal((await h.api.authorize(h.args)).maySend,false);
  }));
  await t.test('5 real backend termination during authorization returns no grant',()=>fixture(async h=>{
   const p=await h.child('authorize',h.args,'beforeCommit');p.start();await p.phase('before-commit');
   await h.pool.query('SELECT pg_terminate_backend($1)',[p.ready.pid]);p.release();
   const r=await p.phase('result');assert.equal(r.ok,false);assert.equal(r.code,'OWNERSHIP_TRANSACTION_UNCONFIRMED');await p.exited;
   assert.equal((await h.present()).length,0);
  }));
  await t.test('6 stale Netlify process is fenced after VPS transfer',()=>fixture(async h=>{
   const p=await h.child();await h.tx('drain',1,'DRAINING');await h.tx('vps',2,'VPS');p.start();
   assert.equal((await p.phase('result')).code,'OWNERSHIP_FENCED');await p.exited;
  }));
  await t.test('7 stale VPS process is fenced after return to Netlify',()=>fixture(async h=>{
   await h.tx('drain',1,'DRAINING');await h.tx('vps',2,'VPS');
   const p=await h.child('authorize',{...h.args,owner:'VPS',epoch:3n});
   await h.tx('drain2',3,'DRAINING');await h.tx('netlify',4,'NETLIFY');p.start();
   assert.equal((await p.phase('result')).code,'OWNERSHIP_FENCED');await p.exited;
  }));
  await t.test('8 unresolved operation blocks transfer without partial update',()=>fixture(async h=>{
   await h.api.authorize(h.args);await h.tx('drain',1,'DRAINING');
   await assert.rejects(h.tx('vps',2,'VPS'),/UNRESOLVED/);
   assert.deepEqual((await h.pool.query('SELECT state,epoch FROM "PublishingOwnership"')).rows[0],{state:'DRAINING',epoch:'2'});
   assert.equal((await h.pool.query('SELECT 1 FROM "PublishingOwnershipEvent" WHERE "operationId"=$1',['vps'])).rows.length,0);
  }));
  await t.test('9 repeated independent requests after lost ACK never grant another send',()=>fixture(async h=>{
   const lost=await h.child('authorize',h.args,'lostCommitAck');lost.start();await lost.phase('commit-sent');await h.waitFor(async()=>(await h.present()).length===1);await lost.kill();
   for(let n=0;n<3;n++){const p=await h.child();p.start();assert.equal((await p.phase('result')).result.maySend,false);await p.exited;}
   assert.equal((await h.present()).length,1);
  }));
  await t.test('10 rolled-back authorization permits a fresh committed authorization',()=>fixture(async h=>{
   const p=await h.child('authorize',h.args,'beforeCommit');p.start();await p.phase('before-commit');await p.kill();
   assert.equal((await h.api.authorize({...h.args,attemptId:'fresh'})).maySend,true);
   assert.equal((await h.present())[0].id,'fresh');
  }));
  for(const outcome of ['CONFIRMED','REJECTED','UNKNOWN'])await t.test(`11 recover ${outcome} without authorizing resend`,()=>fixture(async h=>{
   await h.api.authorize(h.args);await h.api.recordOutcome({operationId:'outcome',attemptId:'attempt',actor:'reconciler',outcome,...(outcome==='CONFIRMED'?{remoteReference:'synthetic-proof'}:{})});
   const result=await h.api.recoverAttempt('attempt');assert.equal(result.record.outcome,outcome);assert.equal(result.maySend,false);
   assert.equal((await h.api.authorize(h.args)).maySend,false);
  }));
  await t.test('12 evidence survives cancellation, prohibited deletion and rollback',()=>fixture(async h=>{
   await h.api.authorize(h.args);await h.api.recordOutcome({operationId:'uncertain',attemptId:'attempt',actor:'reconciler',outcome:'UNKNOWN',remoteReference:'synthetic-reference'});
   await h.pool.query(`UPDATE "PublishingIntent" SET state='CANCELLED' WHERE id='intent'`);
   for(const table of ['PublishingExternalAttempt','PublishingIntent','PublishingIntentRevision','PublishingAttemptEvent','PublishingJob'])await assert.rejects(h.pool.query(`DELETE FROM "${table}"`));
   await assert.rejects(h.db.transaction(async c=>{await c.query(`UPDATE "PublishingIntent" SET state='ACTIVE' WHERE id='intent'`);throw Error('rollback');}));
   assert.equal((await h.pool.query('SELECT state FROM "PublishingIntent"')).rows[0].state,'CANCELLED');
   assert.equal((await h.present())[0].remoteReference,'synthetic-reference');
  }));
  await t.test('13 failed transition after UPDATE rolls back both epoch and event',()=>fixture(async h=>{
   const p=await h.child('transition',{operationId:'failed',actor:'operator',expectedEpoch:1n,to:'DRAINING'},'afterOwnerUpdate');p.start();await p.phase('owner-updated');p.release();
   assert.equal((await p.phase('result')).ok,false);await p.exited;
   assert.equal((await h.pool.query('SELECT epoch FROM "PublishingOwnership"')).rows[0].epoch,'1');
   assert.equal((await h.pool.query('SELECT 1 FROM "PublishingOwnershipEvent" WHERE "operationId"=$1',['failed'])).rows.length,0);
  }));
  await t.test('14 direct SQL cannot reuse epoch, omit ownership audit or bypass authorization validation',()=>fixture(async h=>{
   await assert.rejects(h.pool.query('UPDATE "PublishingOwnership" SET epoch=0 WHERE id=1'),/EPOCH_INVALID/);
   await assert.rejects(h.pool.query(`UPDATE "PublishingOwnership" SET state='DRAINING',epoch=2 WHERE id=1`),/AUDIT_REQUIRED/);
   for(const [owner,epoch,job,outcome] of [['VPS',1,'job','AUTHORIZED'],['NETLIFY',9,'job','AUTHORIZED'],['NETLIFY',1,'absent','AUTHORIZED'],['NETLIFY',1,'job','CONFIRMED']]){
    await assert.rejects(h.pool.query(`INSERT INTO "PublishingExternalAttempt"(id,"intentId",revision,"jobId",owner,epoch,actor,outcome) VALUES('raw','intent',1,$1,$2,$3,'raw',$4)`,[job,owner,epoch,outcome]));
   }
   assert.equal((await h.present()).length,0);
   await assert.rejects(h.pool.query(`INSERT INTO "PublishingExternalAttempt"(id,"intentId",revision,"jobId",owner,epoch,actor) VALUES('raw','intent',1,'job','NETLIFY',1,'raw')`),/JOB_BOUNDARY_REQUIRED/);
   await h.api.authorize(h.args);await h.tx('drain',1,'DRAINING');
   await assert.rejects(h.pool.query(`UPDATE "PublishingOwnership" SET state='VPS',epoch=3 WHERE id=1`),/UNRESOLVED/);
   await assert.rejects(h.pool.query(`UPDATE "PublishingExternalAttempt" SET outcome='REJECTED' WHERE id='attempt'`),/OUTCOME_AUDIT_REQUIRED/);
   assert.equal((await h.present())[0].outcome,'AUTHORIZED');
  }));
  await t.test('15 ownership transfer waits for in-flight authorization transaction',()=>fixture(async h=>{
   const a=await h.child('authorize',h.args,'beforeCommit');a.start();await a.phase('before-commit');
   const b=await h.child('transition',{operationId:'drain',actor:'operator',expectedEpoch:1n,to:'DRAINING'});b.start();
   await h.waitFor(async()=>(await h.pool.query(`SELECT 1 FROM pg_stat_activity WHERE pid=$1 AND wait_event_type='Lock'`,[b.ready.pid])).rows.length===1);
   a.release();assert.equal((await a.phase('result')).result.maySend,true);assert.equal((await b.phase('result')).ok,true);
   await Promise.all([a.exited,b.exited]);await assert.rejects(h.tx('vps',2,'VPS'),/UNRESOLVED/);
  }));
 }finally{for(const p of children)p.kill('SIGKILL');await cluster.close();}
});
