const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {X509Certificate,randomBytes}=require('node:crypto');
test('independent revoker rejects production destinations, unverified TLS and arbitrary targets',()=>{
  const {loadRevokerConfig}=require('../scripts/diagnostics/gateway/revoker.cjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sw-revoker-test-')),file=path.join(dir,'config.json'),caFile=path.resolve(__dirname,'../scripts/diagnostics/prod-ca-2021.crt'),suffix='abcdef123456';
  const valid={mode:'isolated-staging',url:`postgresql://sw_revoke_stage_${suffix}@127.0.0.1:5432/showwork_gateway_stage_${suffix}?connection_limit=1&connect_timeout=4&pool_timeout=1&sslmode=require&sslaccept=strict&sslcert=${encodeURIComponent(caFile)}`,suffix,expiresAt:new Date(Date.now()+3600000).toISOString(),caFile,caFingerprint:new X509Certificate(fs.readFileSync(caFile)).fingerprint256,receiptFile:path.join(dir,'receipt'),stopFile:path.join(dir,'STOP')};
  const fixtureUrl=new URL(valid.url);fixtureUrl.password=randomBytes(24).toString('hex');valid.url=fixtureUrl.toString();
  try{for(const changes of [{mode:'production'},{suffix:'postgres'},{url:valid.url.replace('127.0.0.1','db.production.invalid')},{url:valid.url.replace('sslaccept=strict','sslaccept=accept_invalid_certs')},{url:valid.url+'&options=-cdefault_transaction_read_only=off'},{caFingerprint:'untrusted'}]){fs.writeFileSync(file,JSON.stringify({...valid,...changes}),{mode:0o600});assert.throws(()=>loadRevokerConfig(file));}fs.writeFileSync(file,JSON.stringify(valid),{mode:0o600});assert.equal(loadRevokerConfig(file).suffix,suffix);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('revoker commits LOGIN/password disable before killing sessions and verifying',async()=>{
  const {revoke}=require('../scripts/diagnostics/gateway/revoker.cjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sw-revoke-order-')),steps=[],config={suffix:'abcdef123456',url:'synthetic-mock-only',receiptFile:path.join(dir,'receipt')};
  class Client{async $queryRawUnsafe(sql){steps.push(sql.match(/"([a-z_0-9]+)"/)[1]);return [{verified:true}];}async $disconnect(){steps.push('disconnect');}}
  try{await revoke(config,Client);assert.deepEqual(steps,['disable_gateway_abcdef123456','terminate_gateway_abcdef123456','verify_gateway_abcdef123456','disconnect']);assert.equal(JSON.parse(fs.readFileSync(config.receiptFile)).revoked,true);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('failed revocation verification cannot emit a successful receipt',async()=>{
  const {revoke}=require('../scripts/diagnostics/gateway/revoker.cjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sw-revoke-failure-')),file=path.join(dir,'receipt');class Client{async $queryRawUnsafe(){return [{verified:false}];}async $disconnect(){}}
  try{await assert.rejects(revoke({suffix:'abcdef123456',receiptFile:file},Client),/UNCONFIRMED/);assert.equal(fs.existsSync(file),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('public ingress dependency graph contains no SQL, Prisma, executor config or revoker',()=>{
  const root=path.resolve(__dirname,'../scripts/diagnostics/gateway'),visited=new Set();function visit(file){if(visited.has(file))return;visited.add(file);const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/@prisma|executor\.cjs|executor-worker|profiles\.cjs|SHOWWORK_EXECUTOR_CONFIG|\bEXPLAIN\b|\bSELECT\b|DATABASE_URL|revoker\.cjs/);for(const m of source.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g))visit(path.resolve(path.dirname(file),m[1]));}visit(path.join(root,'serve-ingress-staging.cjs'));assert.equal(visited.size,8);
});
test('monotonic expiry prevents backward wall-clock changes extending a run',()=>{
  let wall=100000,mono=0;const expiry=require('../scripts/diagnostics/gateway/expiry.cjs').createExpiry(101000,{wall:()=>wall,monotonic:()=>mono});wall-=3600000;mono=999;assert.equal(expiry.expired(),false);mono=1000;assert.equal(expiry.expired(),true);assert.equal(expiry.remainingMs(),0);
});
test('public relay rejects alternate routes before opening its private socket',async()=>{
  const {createUnixRelay}=require('../scripts/diagnostics/gateway/unix-relay.cjs');const {generateKeyPairSync,randomBytes}=require('node:crypto'),keys=generateKeyPairSync('ed25519');const manifest={version:1,runId:randomBytes(16).toString('hex'),audience:'gateway.invalid',queryHash:require('../scripts/diagnostics/gateway/contract.cjs').queryHash,publicKey:keys.publicKey.export({format:'pem',type:'spki'}),notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()};const relay=createUnixRelay({manifest,socketPath:'/nonexistent/private-executor.sock'});assert.equal((await relay.handle({path:'/sql'})).status,404);
});
