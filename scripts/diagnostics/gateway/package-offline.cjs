'use strict';
// Review artifacts only. No deployment, dependency installation, config copying,
// environment export, secret provisioning or role activation.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const target=process.argv[2]||'/tmp/showwork-fixed-query-gateway-artifacts';
if(fs.existsSync(target))throw new Error('Artifact destination must be new');
const groups={
  client:['client.cjs','protocol.cjs','contract.cjs'],
  ingress:['ingress.cjs','ledger.cjs','protocol.cjs','contract.cjs','client.cjs','unix-relay.cjs','serve-ingress-staging.cjs','expiry.cjs'],
  executor:['ingress.cjs','ledger.cjs','protocol.cjs','contract.cjs','supervisor.cjs','executor-worker.cjs','executor.cjs','profiles.cjs','serve-executor-staging.cjs','expiry.cjs'],
  revoker:['revoker.cjs','expiry.cjs'],
};
const hashes={};
for(const [name,files]of Object.entries(groups)){
  const directory=path.join(target,name);fs.mkdirSync(directory,{recursive:true,mode:0o700});hashes[name]={};
  for(const file of files){const body=fs.readFileSync(path.join(__dirname,file));fs.writeFileSync(path.join(directory,file),body);hashes[name][file]=createHash('sha256').update(body).digest('hex');}
}
const metadata={schemaVersion:2,productionExecutionEnabled:false,secretsIncluded:false,schedulesIncluded:false,publishingWorkersIncluded:false,queryHash:require('./profiles.cjs').queryHash,files:hashes,externalDependencies:{client:[],ingress:[],executor:{'@prisma/client':require('@prisma/client/package.json').version,generatedPrismaClientRequired:true},revoker:{'@prisma/client':require('@prisma/client/package.json').version,generatedPrismaClientRequired:true}},operatingSystemIsolationValidated:false};
fs.writeFileSync(path.join(target,'inventory.json'),JSON.stringify(metadata,null,2));
console.log(JSON.stringify({target,filesByComponent:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),productionExecutionEnabled:false,secretsIncluded:false}));
