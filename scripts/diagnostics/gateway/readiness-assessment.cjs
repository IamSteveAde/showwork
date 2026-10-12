'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict');
const {fork,spawn}=require('node:child_process');
const {generateKeyPairSync,randomBytes}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {PrismaClient}=require('@prisma/client');
const {startCluster}=require('../../../tests/helpers/isolated-postgres.cjs');
const {provisionGatewayRole}=require('../../../tests/helpers/gateway-role-fixture.cjs');
const {schema,fixtures,digest}=require('./staging-assessment.cjs');
const {auditRole}=require('./audit-role.cjs'),{Supervisor}=require('./supervisor.cjs');
const {signedRequest}=require('./protocol.cjs'),{queryHash}=require('./contract.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const result={productionConnected:false,hostedMeasurements:false,platform:process.platform,syntheticDataOnly:true,cold:[],reconnected:[],warm:[],revocation:{},isolation:{verifiedHosting:false},concurrency:{}};
let cluster,roles,supervisor,roleClient,trap,controller,split;
async function splitGateway(){
  const directory=fs.mkdtempSync('/tmp/sw-gateway-split-');const privateSocket=path.join(directory,'executor.sock'),manifestFile=path.join(directory,'manifest.json'),tlsKey=path.join(directory,'ingress.key'),tlsCert=path.join(directory,'ingress.crt');
  const keys=generateKeyPairSync('ed25519'),manifest={version:1,runId:randomBytes(16).toString('hex'),audience:'gateway.invalid',queryHash,publicKey:keys.publicKey.export({type:'spki',format:'pem'}),notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()};
  fs.writeFileSync(manifestFile,JSON.stringify(manifest));fs.copyFileSync(cluster.key,tlsKey);fs.chmodSync(tlsKey,0o600);fs.copyFileSync(cluster.cert,tlsCert);
  let backend,frontend;
  async function stop(child){if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;}}
  async function line(child){return new Promise((resolve,reject)=>{let data='';const timer=setTimeout(()=>reject(new Error('SPLIT_START_TIMEOUT')),4000);child.stdout.on('data',b=>{data+=b;if(data.includes('\n')){clearTimeout(timer);resolve(data.split('\n')[0]);}});child.once('exit',()=>{clearTimeout(timer);reject(new Error('SPLIT_START_FAILED'));});});}
  let keep=false;
  const cleanup=async()=>{await stop(frontend);await stop(backend);fs.rmSync(directory,{recursive:true,force:true});};
  try{
    backend=spawn(process.execPath,[path.join(__dirname,'serve-executor-staging.cjs'),manifestFile,path.join(directory,'ledger'),roles.executorFile,privateSocket],{env:{PATH:process.env.PATH},stdio:['ignore','pipe','ignore']});assert.equal(await line(backend),'PRIVATE_STAGING_EXECUTOR_READY');
    const appRoot=path.resolve(__dirname,'../../..');
    const deniedAppPaths=['.env','.env.local','.env.production','.env.production.local','.aws','.netlify'].map(p=>`(subpath ${JSON.stringify(path.join(appRoot,p))})`).join('');
    const policy=`(version 1)(allow default)(deny file-write*)(deny network-outbound)(allow network-outbound (literal ${JSON.stringify(fs.realpathSync(privateSocket))}))(deny file-read* (subpath ${JSON.stringify(fs.realpathSync(cluster.directory))})${deniedAppPaths})`;
    const deny=spawn('/usr/bin/sandbox-exec',['-p',policy,process.execPath,path.join(__dirname,'secret-denial-probe.cjs'),roles.executorFile],{env:{PATH:process.env.PATH},stdio:['ignore','pipe','ignore']});assert.equal(await line(deny),'SECRET_ACCESS_DENIED');await completed(deny);
    frontend=spawn('/usr/bin/sandbox-exec',['-p',policy,process.execPath,path.join(__dirname,'serve-ingress-staging.cjs'),manifestFile,privateSocket,tlsKey,tlsCert],{env:{PATH:process.env.PATH},stdio:['ignore','pipe','ignore']});const ready=JSON.parse(await line(frontend));assert.equal(ready.tls,true);
    const request=signedRequest(manifest,keys.privateKey,'warm-transaction'),https=require('node:https');
    const response=await new Promise((resolve,reject)=>{const r=https.request({host:'127.0.0.1',port:ready.port,path:'/v1/measure',method:'POST',headers:request.headers,ca:fs.readFileSync(cluster.ca),rejectUnauthorized:true},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));});r.on('error',reject);r.end(request.body);});
    if(response.status!==200)result.splitGatewayFailure={status:response.status,code:response.body.code};assert.equal(response.status,200);assert.equal(response.body.value.profile,'warm-transaction');assert.doesNotMatch(JSON.stringify(response),/postgresql|caption|accessToken|SYNTHETIC/);
    keep=true;
    return {info:{separateIngressAndExecutorProcesses:true,ingressSecretAccessDenied:true,ingressFilesystemWriteDenied:true,applicationSecretPathsDeniedByPolicy:true,ingressTCPOutboundDeniedByPolicy:true,privateSocketOnly:true,authenticatedTLSMeasurementPassed:true,targetHostingVerified:false},frontend,backend,cleanup};
  }finally{if(!keep)await cleanup();}
}
async function completed(child){if(child.exitCode!==null||child.signalCode!==null){if(child.exitCode===0)return;throw new Error('STAGING_CHILD_FAILED');}return new Promise((resolve,reject)=>{child.once('exit',code=>code===0?resolve():reject(new Error('STAGING_CHILD_FAILED')));child.once('error',reject);});}
async function main(){
  cluster=await startCluster();await schema(cluster.stage);await fixtures(cluster.stage,250,'readiness');const unchanged=await digest(cluster.stage);roles=await provisionGatewayRole(cluster);
  result.permissions=await auditRole(cluster.stage,roles.role);assert.equal(result.permissions.applicationScopePass,true);result.revokerPermissions=await roles.controllerAudit();assert.equal(result.revokerPermissions.scoped,true);
  const intruder='fixture_member_'+roles.suffix;await cluster.admin.$executeRawUnsafe(`CREATE ROLE "${intruder}" NOLOGIN`);await cluster.admin.$executeRawUnsafe(`GRANT "${roles.role}" TO "${intruder}" WITH SET TRUE`);assert.equal((await auditRole(cluster.stage,roles.role)).applicationScopePass,false);await cluster.admin.$executeRawUnsafe(`REVOKE "${roles.role}" FROM "${intruder}"`);await cluster.admin.$executeRawUnsafe(`DROP ROLE "${intruder}"`);result.inboundMembershipEscalationDetected=true;
  // Real operating-system process/Prisma initialization, no injected timing here.
  for(let i=0;i<10;i++){
    supervisor=new Supervisor(roles.executorFile);const start=performance.now();const cold=await supervisor.measure({profile:'fresh-connection',ordinal:i});result.cold.push({wallMs:performance.now()-start,...cold});
    const reconnectStart=performance.now();const reconnect=await supervisor.measure({profile:'warm-transaction',ordinal:i});result.reconnected.push({wallMs:performance.now()-reconnectStart,...reconnect});
    const warmStart=performance.now();const warm=await supervisor.measure({profile:'warm-transaction',ordinal:i});assert.equal(warm.connectMs,0);result.warm.push({wallMs:performance.now()-warmStart,...warm});await supervisor.stop();supervisor=null;
  }
  supervisor=new Supervisor(roles.executorFile);const accepted=supervisor.measure({profile:'warm-transaction',ordinal:0});await assert.rejects(supervisor.measure({profile:'warm-roundtrip',ordinal:0}),/BUSY/);await accepted;result.concurrency={accepted:1,rejectedConcurrent:1,noQueue:true};await supervisor.stop();supervisor=null;
  if(process.platform==='darwin'){
    let unexpectedConnections=0;trap=net.createServer(s=>{unexpectedConnections++;s.destroy();});await new Promise(r=>trap.listen(0,'127.0.0.1',r));
    const privateDir=path.join(cluster.directory,'private-sentinel');fs.mkdirSync(privateDir,{mode:0o700});const forbiddenFile=path.join(privateDir,'credentials');fs.writeFileSync(forbiddenFile,'synthetic isolation sentinel',{mode:0o600});
    const policy=`(version 1)(allow default)(deny network-outbound)(allow network-outbound (remote tcp "localhost:${cluster.port}"))(deny file-read* (subpath ${JSON.stringify(fs.realpathSync(privateDir))}))`;
    const probe=spawn('/usr/bin/sandbox-exec',['-p',policy,process.execPath,path.join(__dirname,'isolation-probe.cjs'),roles.executorFile,forbiddenFile,String(trap.address().port)],{env:{PATH:process.env.PATH},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';probe.stdout.on('data',b=>stdout+=b);probe.stderr.on('data',b=>stderr+=b);try{await completed(probe);}catch{result.isolation.probeFailure=stderr.slice(0,1000);throw new Error('LOCAL_ISOLATION_FAILED');}result.isolation={...result.isolation,...JSON.parse(stdout),unexpectedConnections,localMacOSSandboxVerified:true,linuxContainerIsolationVerified:false};assert.equal(unexpectedConnections,0);await new Promise(r=>trap.close(r));trap=null;
  }
  assert.equal(await digest(cluster.stage),unchanged);
  // Full, unscaled supervisor deadline against a deliberately hung no-DB worker.
  const hang=path.join(cluster.directory,'hang.cjs');fs.writeFileSync(hang,"process.send({ready:true});process.on('message',()=>{});setInterval(()=>{},1000);");supervisor=new Supervisor('unused',{worker:hang});const hangingStart=performance.now();await assert.rejects(supervisor.measure({profile:'warm-roundtrip',ordinal:0}),/TIMEOUT/);result.fullDeadline={wallMs:performance.now()-hangingStart,workerConfirmedExited:supervisor.child===null,simulatedHang:true,actualLocalKill:true};assert.equal(supervisor.child,null);assert.ok(result.fullDeadline.wallMs<12000);await supervisor.stop();supervisor=null;
  // Independent scoped revoker owns neither a customer-data grant nor the gateway
  // process. Leave a real gateway-role connection alive and run its expiry timer.
  if(process.platform==='darwin'){split=await splitGateway();result.splitGateway=split.info;}
  else{roleClient=new PrismaClient({datasources:{db:{url:roles.url}},log:[]});await roleClient.$connect();await roleClient.$queryRawUnsafe('SELECT 1');}
  const beforeSessions=await cluster.admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename=$1`,roles.role);assert.equal(beforeSessions[0].n,1);
  const config=roles.revokerFile(Date.now()+800),start=performance.now();controller=fork(path.join(__dirname,'revoker.cjs'),[config.file],{env:{PATH:process.env.PATH},stdio:['ignore','ignore','ignore','ipc'],execArgv:[]});
  if(split){const exited=new Promise(r=>split.frontend.once('exit',r));split.frontend.kill('SIGKILL');await exited;result.ingressCrash={tested:true,privateExecutorAlive:split.backend.exitCode===null&&split.backend.signalCode===null};assert.equal(result.ingressCrash.privateExecutorAlive,true);}
  await completed(controller);controller=null;
  const receipt=JSON.parse(fs.readFileSync(config.receiptFile));assert.equal(receipt.revoked,true);result.revocation={wallMs:performance.now()-start,independentProcess:true,scopedCredential:true,passwordCleared:true,loginDisabled:true,sessionsTerminated:true,receipt,ingressCrashTested:!!result.ingressCrash};
  if(split){await split.cleanup();split=null;}
  if(roleClient){await assert.rejects(roleClient.$queryRawUnsafe('SELECT 1'));await roleClient.$disconnect();roleClient=null;}
  const newClient=new PrismaClient({datasources:{db:{url:roles.url}},log:[]});try{await assert.rejects(newClient.$connect());result.revocation.newLoginRejected=true;}finally{await newClient.$disconnect();}
  const rows=await cluster.admin.$queryRawUnsafe(`SELECT NOT rolcanlogin AS disabled,rolpassword IS NULL AS password_cleared,(SELECT count(*)::int FROM pg_stat_activity WHERE usename=$1) AS sessions FROM pg_authid WHERE rolname=$1`,roles.role);assert.deepEqual(rows,[{disabled:true,password_cleared:true,sessions:0}]);
  result.inactiveRoleAudit=await auditRole(cluster.stage,roles.role,{expectedLogin:false});assert.equal(result.inactiveRoleAudit.applicationScopePass,true);
  result.success=true;
}
main().catch(error=>{result.success=false;result.error={code:error.code||error.name,message:'READINESS_ASSESSMENT_FAILED'};console.error(result.error);process.exitCode=1;}).finally(async()=>{
  if(controller){controller.kill('SIGKILL');}await split?.cleanup().catch(()=>{});await supervisor?.stop().catch(()=>{});await roleClient?.$disconnect().catch(()=>{});if(trap)await new Promise(r=>trap.close(r));
  await roles?.cleanup().then(()=>result.rolesRemoved=true).catch(()=>result.rolesRemoved=false);await cluster?.close();result.clusterRemoved=cluster?!fs.existsSync(cluster.directory):false;fs.writeFileSync('/tmp/showwork-readiness-security-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({file:'/tmp/showwork-readiness-security-results.json',success:result.success,rolesRemoved:result.rolesRemoved,clusterRemoved:result.clusterRemoved}));
});
