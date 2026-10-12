'use strict';
const fs=require('node:fs');
const { performance }=require('node:perf_hooks');
const dns=require('node:dns').promises, net=require('node:net'), tls=require('node:tls');
const { X509Certificate }=require('node:crypto');
const { QUOTAS,planQuery,queryHash }=require('./profiles.cjs');
const {createExpiry}=require('./expiry.cjs');
function loadConfig(file) {
  if(queryHash!==require('./contract.cjs').queryHash)throw new Error('QUERY_MAP_MISMATCH');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW); let config;
  try {const stat=fs.fstatSync(fd);if((stat.mode&0o077)||!stat.isFile())throw new Error('INSECURE_CONFIG');config=JSON.parse(fs.readFileSync(fd,'utf8'));}finally{fs.closeSync(fd);}
  if(!config||Object.keys(config).sort().join(',')!==['mode','url','role','caFile','caFingerprint','expiresAt'].sort().join(',')||config.mode!=='isolated-staging')throw new Error('PRODUCTION_DISABLED');
  const url=new URL(config.url), user=decodeURIComponent(url.username);
  if(url.protocol!=='postgresql:'||url.hostname!=='127.0.0.1'||!Number.isInteger(Number(url.port))||Number(url.port)<1||Number(url.port)>65535||!/^showwork_gateway_stage_[a-f0-9]{12}$/.test(url.pathname.slice(1))||!/^sw_gateway_stage_[a-f0-9]{12}$/.test(config.role)||user!==config.role||url.searchParams.get('connection_limit')!=='1'||url.searchParams.get('connect_timeout')!=='4'||url.searchParams.get('pool_timeout')!=='1'||!url.password)throw new Error('INVALID_DESTINATION');
  const allowed=['connection_limit','connect_timeout','pool_timeout','sslmode','sslaccept','sslcert'];
  if([...url.searchParams.keys()].some(k=>!allowed.includes(k))||new Set(url.searchParams.keys()).size!==[...url.searchParams.keys()].length)throw new Error('INVALID_DESTINATION');
  const expiry=Date.parse(config.expiresAt);if(!Number.isFinite(expiry)||expiry<=Date.now()||expiry-Date.now()>7200000)throw new Error('EXPIRED');
  const ca=new X509Certificate(fs.readFileSync(config.caFile));
  if(!ca.ca||ca.fingerprint256!==config.caFingerprint||Date.now()<Date.parse(ca.validFrom)||Date.now()>=Date.parse(ca.validTo)||url.searchParams.get('sslmode')!=='require'||url.searchParams.get('sslaccept')!=='strict'||url.searchParams.get('sslcert')!==config.caFile)throw new Error('INVALID_TLS');
  return Object.freeze({...config,expiry,host:url.hostname,port:Number(url.port)});
}
async function transport(config) {
  const begun=performance.now(),address=await dns.lookup(config.host),dnsMs=performance.now()-begun;
  return new Promise((resolve,reject)=>{
    const start=performance.now();const socket=net.connect({host:address.address,port:config.port,family:address.family});let tcpMs,secure;
    const timer=setTimeout(()=>{socket.destroy();secure?.destroy();reject(new Error('TIMEOUT'));},4000);
    const fail=()=>{clearTimeout(timer);socket.destroy();secure?.destroy();reject(new Error('TLS_FAILURE'));};socket.on('error',fail);
    socket.once('connect',()=>{tcpMs=performance.now()-start;const b=Buffer.alloc(8);b.writeInt32BE(8);b.writeInt32BE(80877103,4);socket.write(b);});
    socket.once('data',b=>{if(b.toString()!=='S')return fail();const tlsStart=performance.now();secure=tls.connect({socket,servername:config.host,rejectUnauthorized:true,minVersion:'TLSv1.2',ca:fs.readFileSync(config.caFile)},()=>{clearTimeout(timer);resolve({dnsMs,tcpMs,tlsMs:performance.now()-tlsStart,durationMs:performance.now()-begun});secure.destroy();});secure.on('error',fail);});
  });
}
function createExecutor(config,{Client}={}) {
  const expiry=createExpiry(config.expiry);
  let client,connected=false,active=false,invocations=0;
  const initialized=performance.now();
  const cleanup=async()=>{if(client){const old=client;client=undefined;connected=false;await old.$disconnect();}};
  async function transaction(callback,{setup=true}={}) {
    const start=performance.now(),timing={};
    const result=await client.$transaction(async tx=>{
      timing.acquireMs=performance.now()-start; // Prisma includes pool wait + BEGIN here.
      const begin=performance.now();await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      if(setup)await tx.$executeRawUnsafe("SET LOCAL statement_timeout='2000ms'");
      timing.setupMs=performance.now()-begin;
      const query=performance.now();const value=await callback(tx);timing.statementMs=performance.now()-query;timing.queryEnded=performance.now();return value;
    },{maxWait:1000,timeout:3000});
    timing.commitMs=performance.now()-timing.queryEnded;delete timing.queryEnded;timing.transactionMs=performance.now()-start;
    return {timing,result};
  }
  async function connect() {
    if(connected)return {connectMs:0};
    const start=performance.now();
    Client ??= require('@prisma/client').PrismaClient;
    client=new Client({datasources:{db:{url:config.url}},log:[]});await client.$connect();
    const connectMs=performance.now()-start;
    const check=await transaction(tx=>tx.$queryRawUnsafe(`SELECT current_user AS role,current_setting('default_transaction_read_only') AS readonly,r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls AS privileged,has_table_privilege(current_user,'public."CalendarPost"','INSERT,UPDATE,DELETE,TRUNCATE') AS writes,has_column_privilege(current_user,'public."CalendarPost"','caption','SELECT') AS content FROM pg_roles r WHERE r.rolname=current_user`));
    const [r]=check.result;if(check.result.length!==1||r.role!==config.role||r.readonly!=='on'||r.privileged||r.writes||r.content)throw new Error('PERMISSION_MISMATCH');
    connected=true;return {connectMs};
  }
  async function measure(task) {
    if(active)throw new Error('BUSY');
    if(!task||Object.keys(task).sort().join(',')!=='ordinal,profile'||!Object.hasOwn(QUOTAS,task.profile)||!Number.isInteger(task.ordinal)||task.ordinal<0||task.ordinal>=QUOTAS[task.profile])throw new Error('INVALID_PROFILE');
    if(expiry.expired())throw new Error('EXPIRED');
    active=true;const start=performance.now(),cold=invocations++===0;
    try{
      if(task.profile==='transport')return {...await transport(config),cold};
      if(task.profile==='fresh-connection')await cleanup();
      const {connectMs}=await connect();
      if(expiry.expired()||performance.now()-start>7000)throw new Error('EXPIRED');
      const plan=task.profile==='scheduler-select-plan'?planQuery(task.ordinal):null;
      const {timing,result}=await transaction(tx=>plan?tx.$queryRawUnsafe(plan.sql,...plan.values):tx.$queryRawUnsafe('SELECT 1 AS ok'),{setup:task.profile!=='warm-roundtrip'});
      let planningMs,executionMs;
      if(plan){const root=result[0]?.['QUERY PLAN']?.[0];planningMs=root?.['Planning Time'];executionMs=root?.['Execution Time'];if(!Number.isFinite(planningMs)||!Number.isFinite(executionMs))throw new Error('INVALID_RESULT');}
      const closeStart=performance.now();if(task.profile==='fresh-connection')await cleanup();
      return {cold,executorInitMs:cold?start-initialized:0,connectMs,...timing,...(plan?{planningMs,executionMs}:{}),cleanupMs:performance.now()-closeStart,durationMs:performance.now()-start};
    }catch(error){await cleanup().catch(()=>{});throw error;}finally{active=false;}
  }
  return {measure,close:cleanup};
}
module.exports={loadConfig,createExecutor,transport};
