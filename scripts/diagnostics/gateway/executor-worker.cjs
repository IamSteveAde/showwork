'use strict';
const {loadConfig,createExecutor}=require('./executor.cjs');
const {filterResult}=require('./protocol.cjs');
let executor;
try{executor=createExecutor(loadConfig(process.env.SHOWWORK_EXECUTOR_CONFIG));}catch{process.send?.({ready:false});process.exit(1);}
const expire=setTimeout(()=>process.exit(0),Math.max(1,loadConfig(process.env.SHOWWORK_EXECUTOR_CONFIG).expiry-Date.now()));
process.on('message',async task=>{
  try{const value=filterResult(await executor.measure(task));process.send?.({ok:true,value});}
  catch(error){process.send?.({ok:false,code:['PERMISSION_MISMATCH','EXPIRED','TLS_REQUIRED','TLS_FAILURE'].includes(error.message)?error.message:'MEASUREMENT_FAILED'});}
});
process.on('disconnect',()=>process.exit(0));
process.on('SIGTERM',()=>{clearTimeout(expire);process.exit(0);});
process.send?.({ready:true});
