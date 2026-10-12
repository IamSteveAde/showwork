'use strict';
// Separate staging-only control-plane process. It receives its own narrowly
// scoped credential, never the gateway credential or an application admin secret.
const fs=require('node:fs');
const {X509Certificate}=require('node:crypto');
const {createExpiry}=require('./expiry.cjs');
function loadRevokerConfig(file){
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let c;
  try{if(fs.fstatSync(fd).mode&0o077)throw new Error('INSECURE_CONFIG');c=JSON.parse(fs.readFileSync(fd,'utf8'));}finally{fs.closeSync(fd);}
  if(!c||Object.keys(c).sort().join(',')!=='caFile,caFingerprint,expiresAt,mode,receiptFile,stopFile,suffix,url'||c.mode!=='isolated-staging'||!/^[a-f0-9]{12}$/.test(c.suffix))throw new Error('PRODUCTION_DISABLED');
  const url=new URL(c.url),expected=['connection_limit','connect_timeout','pool_timeout','sslmode','sslaccept','sslcert'];
  if(url.protocol!=='postgresql:'||url.hostname!=='127.0.0.1'||url.pathname!=='/showwork_gateway_stage_'+c.suffix||decodeURIComponent(url.username)!=='sw_revoke_stage_'+c.suffix||!url.password||url.searchParams.get('connection_limit')!=='1'||url.searchParams.get('connect_timeout')!=='4'||url.searchParams.get('pool_timeout')!=='1'||[...url.searchParams.keys()].some(k=>!expected.includes(k))||new Set(url.searchParams.keys()).size!==[...url.searchParams.keys()].length)throw new Error('INVALID_DESTINATION');
  const expiry=Date.parse(c.expiresAt),ca=new X509Certificate(fs.readFileSync(c.caFile));
  if(!Number.isFinite(expiry)||expiry>Date.now()+7200000||url.searchParams.get('sslmode')!=='require'||url.searchParams.get('sslaccept')!=='strict'||url.searchParams.get('sslcert')!==c.caFile||ca.fingerprint256!==c.caFingerprint||!ca.ca||Date.now()<Date.parse(ca.validFrom)||Date.now()>=Date.parse(ca.validTo))throw new Error('INVALID_CONFIG');
  return {...c,expiry};
}
async function revoke(config,Client){
  Client??=require('@prisma/client').PrismaClient;const db=new Client({datasources:{db:{url:config.url}},log:[]});
  try{
    // Separate autocommit statements: LOGIN/password revocation must commit before
    // session enumeration/termination so a new login cannot slip past that sweep.
    await db.$queryRawUnsafe(`SELECT public."disable_gateway_${config.suffix}"() AS disabled`);
    await db.$queryRawUnsafe(`SELECT public."terminate_gateway_${config.suffix}"() AS terminated`);
    const rows=await db.$queryRawUnsafe(`SELECT public."verify_gateway_${config.suffix}"() AS verified`);
    if(rows.length!==1||rows[0].verified!==true)throw new Error('REVOCATION_UNCONFIRMED');
    fs.writeFileSync(config.receiptFile,JSON.stringify({version:1,revoked:true,verifiedAt:new Date().toISOString()}),{mode:0o600,flag:'wx'});
  }finally{await db.$disconnect();}
}
async function watch(config){
  const expiry=createExpiry(config.expiry);
  // Independent expiry: no gateway IPC, PID or heartbeat is needed to revoke.
  for(;;){if(expiry.expired()||fs.existsSync(config.stopFile))break;await new Promise(r=>setTimeout(r,Math.min(100,expiry.remainingMs())));}
  await revoke(config);
}
if(require.main===module){let config;try{config=loadRevokerConfig(process.argv[2]);}catch{process.stderr.write('REVOKER_CONFIGURATION_REJECTED\n');process.exit(1);}watch(config).catch(()=>{process.stderr.write('REVOCATION_FAILED\n');process.exitCode=1;});}
module.exports={loadRevokerConfig,revoke,watch};
