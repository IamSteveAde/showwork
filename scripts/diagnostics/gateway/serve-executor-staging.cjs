'use strict';
// Private service only; public ingress must be a different OS identity/container.
const fs=require('node:fs'),path=require('node:path');
const {createGateway,createServer}=require('./ingress.cjs'),{Supervisor}=require('./supervisor.cjs');
const [manifestFile,ledgerDirectory,configFile,socketFile]=process.argv.slice(2);
if(!manifestFile||!ledgerDirectory||!configFile||!socketFile||!path.isAbsolute(socketFile)||fs.existsSync(socketFile))throw new Error('Supply private staging manifest, ledger, config and new absolute socket paths');
const parent=fs.lstatSync(path.dirname(socketFile));if(!parent.isDirectory()||parent.isSymbolicLink()||parent.mode&0o007)throw new Error('INSECURE_SOCKET_DIRECTORY');
const gateway=createGateway({manifest:JSON.parse(fs.readFileSync(manifestFile)),directory:ledgerDirectory,executor:new Supervisor(configFile),emergencyFile:path.join(ledgerDirectory,'STOP')});
const server=createServer(gateway);server.listen(socketFile,()=>{fs.chmodSync(socketFile,0o660);process.stdout.write('PRIVATE_STAGING_EXECUTOR_READY\n');});
async function stop(){await gateway.close();await new Promise(r=>server.close(r));fs.rmSync(socketFile,{force:true});}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>stop().catch(()=>{process.exitCode=1;}));
