'use strict';
// Child environment has no application credentials. Only a private socket fixture.
const fs=require('node:fs'),{Pool}=require('pg'),{load}=require('./load-typescript.cjs');
const {createPublishingTransactionDatabase}=load('lib/publishing/transactionDatabase.ts');
const {createPublishingValidationAdapters}=load('lib/publishing/validationAdapters.ts');
const {createExternalPublicationAuthorization}=load('lib/publishing/externalAuthorization.ts');
(async()=>{
 const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));if(!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(c.host)||!/^authorization_\d+$/.test(c.schema))throw Error('ISOLATED_FIXTURE_REQUIRED');
 const pool=new Pool({host:c.host,port:5432,user:'synthetic_owner',database:'postgres',ssl:false,max:1});
 const db=createPublishingTransactionDatabase({connect:async()=>{
  const client=await pool.connect();return {release:b=>client.release(b),query:async(sql,args)=>{
   if(sql==='COMMIT'&&c.mode==='before-commit'){process.send({phase:'before-commit'});await new Promise(()=>{});}
   return client.query(sql,args);
  }};
 }},{schema:c.schema});
 const validation=createPublishingValidationAdapters({database:db,verifyViewer:async()=>{throw Error('not used');},verifyRetryEvidence:async()=>{throw Error('not used');}});
 const a=createExternalPublicationAuthorization({database:db,validation});
 const r=await a.authorize({...c.input,epoch:BigInt(c.input.epoch)});process.send({phase:'after-authorization',maySend:r.maySend});await new Promise(()=>{});
})().catch(e=>{process.send?.({error:e.code||e.name});process.exitCode=1;});
