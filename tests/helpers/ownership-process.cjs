'use strict';
// Synthetic child only. No provider operation is implemented.
const {Client}=require('pg');
const {load}=require('./load-typescript.cjs');
const {createPublishingOwnership}=load('lib/publishing/ownership.ts');
const wait=()=>new Promise(resolve=>process.once('message',resolve));
const send=value=>process.send?.(value);
(async()=>{
 const input=await wait();
 if(!/^\/.*\/sw-owner-[A-Za-z0-9]+$/.test(input.socket)||!/^case_[0-9]+$/.test(input.schema))throw Error('UNSAFE_TEST_TARGET');
 const client=new Client({host:input.socket,port:5432,user:'synthetic_owner',password:'',database:'postgres',ssl:false,
   options:`-c search_path=${input.schema}`,connectionTimeoutMillis:2000,statement_timeout:8000});
 client.on('error',()=>{});
 await client.connect();send({phase:'ready',pid:(await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid});
 await wait();
 const transaction=async run=>{
  await client.query('BEGIN');
  try{
   const tx={query:async(sql,values)=>{
    const result=await client.query(sql,values);
    if(input.mode==='afterOwnerUpdate'&&sql.startsWith('UPDATE "PublishingOwnership"')){send({phase:'owner-updated'});await wait();throw Error('synthetic rollback');}
    return result;
   }};
   const result=await run(tx);
   if(input.mode==='beforeCommit'){send({phase:'before-commit'});await wait();}
   if(input.mode==='lostCommitAck'){
    // Stop receiving PostgreSQL messages BEFORE sending COMMIT. Parent verifies
    // committed state through another connection, then terminates this process.
    client.connection.stream.pause();
    const commit=client.query('COMMIT');send({phase:'commit-sent'});
    await commit;send({phase:'unexpected-commit-ack'});
   }else await client.query('COMMIT');
   return result;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 };
 const api=createPublishingOwnership({transaction});
 try{
  const args={...input.args};if(args.epoch!==undefined)args.epoch=BigInt(args.epoch);if(args.expectedEpoch!==undefined)args.expectedEpoch=BigInt(args.expectedEpoch);
  const result=await api[input.operation](args);
  send({phase:'result',ok:true,result:JSON.parse(JSON.stringify(result,(_k,v)=>typeof v==='bigint'?v.toString():v))});
 }catch(error){send({phase:'result',ok:false,code:error.code||'TEST_OPERATION_FAILED'});}
 finally{await client.end().catch(()=>{});process.disconnect();}
})().catch(()=>{send({phase:'fatal'});process.exitCode=1;process.disconnect?.();});
