'use strict';
// Fixed synthetic private socket/config only; no application env or publisher imports.
const fs=require('node:fs'),{Pool}=require('pg'),{load}=require('./load-typescript.cjs'),{mock}=require('./provider-mocks.cjs');
const pause=async phase=>{process.send({phase});await new Promise(()=>{});};
(async()=>{
 const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 if(!/^worker_\d+$/.test(c.schema)||!/^\/(?:private\/)?(?:var\/folders|tmp)\//.test(c.socket))throw Error('SYNTHETIC_FIXTURE_REQUIRED');
 const pool=new Pool({host:c.socket,port:5432,user:'synthetic_owner',database:'postgres',ssl:false,max:2});
 const database=load('lib/publishing/transactionDatabase.ts').createPublishingTransactionDatabase({connect:async()=>{
  const client=await pool.connect();return {release:b=>client.release(b),query:async(sql,args)=>{
   let authorized=false,consumed=false;
   if(sql==='COMMIT'&&['after-authorization','after-consumption'].includes(c.mode)){
    if(c.mode==='after-authorization')authorized=(await client.query('SELECT 1 FROM "PublishingAuthorizationOperation" WHERE xmin=pg_current_xact_id()::xid')).rows.length>0;
    if(c.mode==='after-consumption')consumed=(await client.query(`SELECT 1 FROM "PublishingCapabilityEvent" WHERE xmin=pg_current_xact_id()::xid AND transition='CONSUMED'`)).rows.length>0;
   }
   const r=await client.query(sql,args);if(authorized||consumed)await pause(c.mode);return r;
  }};
 }},{schema:c.schema});
 const validation=load('lib/publishing/validationAdapters.ts').createPublishingValidationAdapters({database,verifyViewer:async()=>{throw Error('unused');},verifyRetryEvidence:async()=>{throw Error('unused');}});
 const io=mock();if(c.mode==='after-claim')io.refresh=()=>pause(c.mode);if(c.mode==='during-preparation')io.media=()=>pause(c.mode);
 const submit=io.submit;io.submit=async(...args)=>{const fd=fs.openSync(c.trace,'w',0o600);fs.writeSync(fd,'synthetic provider effect');fs.fsyncSync(fd);fs.closeSync(fd);if(c.mode==='after-submission')await pause(c.mode);return submit(...args);};
 if(c.mode==='after-journal')io.report=()=>pause(c.mode);
 const spool=await load('lib/publishing/providerSpool.ts').createSyntheticProviderSpool(c.spool);
 const worker=load('lib/publishing/canonicalWorker.ts').createInactiveCanonicalWorker({environment:'isolated-mock',database,validation,io,spool,actor:'worker',owner:'NETLIFY',epoch:1n,preparedLeaseMs:500,jobTimeoutMs:3000,shutdownGraceMs:0});
 await worker.run(c.target);await worker.close();await pool.end();
})().catch(e=>{console.error(e.code||e.message);process.exit(1);});
