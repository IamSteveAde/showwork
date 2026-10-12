'use strict';
// Executed only in an OS sandbox against disposable staging fixtures. Contains
// no production destinations, publishing code or untrusted executable input.
const fs=require('node:fs'),net=require('node:net');
const {loadConfig,createExecutor}=require('./executor.cjs');
async function connect(port){return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.setTimeout(1000);socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});}
let phase='initialization';
async function main(){
  const [configFile,forbiddenFile,providerPort]=process.argv.slice(2);
  phase='secret-access';let secretDenied=false;try{fs.readFileSync(forbiddenFile);}catch{secretDenied=true;}
  phase='network-trap';
  const unexpectedEgress=await connect(Number(providerPort));
  phase='load-config';const executor=createExecutor(loadConfig(configFile));
  phase='database-query';
  const result=await executor.measure({profile:'warm-roundtrip',ordinal:0});await executor.close();
  phase='assert-isolation';if(!secretDenied||unexpectedEgress)throw new Error('ISOLATION_FAILED');
  process.stdout.write(JSON.stringify({secretDenied,unexpectedEgress,approvedDatabaseQuerySucceeded:true,queryDurationMs:result.durationMs})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({code:error.code||error.name,phase})+'\n');process.exitCode=1;});
