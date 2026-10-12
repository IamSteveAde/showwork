const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {generateKeyPairSync,randomBytes,sign}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {signedRequest,filterResult,validateManifest}=require('../scripts/diagnostics/gateway/protocol.cjs');
const {queryHash,QUOTAS}=require('../scripts/diagnostics/gateway/contract.cjs');
const {createGateway,createServer}=require('../scripts/diagnostics/gateway/ingress.cjs');
const {Ledger}=require('../scripts/diagnostics/gateway/ledger.cjs');
const {Supervisor}=require('../scripts/diagnostics/gateway/supervisor.cjs');
function harness(options={}){
  const keys=generateKeyPairSync('ed25519');let now=Date.now();
  const manifest={version:1,runId:randomBytes(16).toString('hex'),audience:'gateway.invalid',publicKey:keys.publicKey.export({format:'pem',type:'spki'}),queryHash,notBefore:new Date(now-1000).toISOString(),expiresAt:new Date(now+7190000).toISOString()};
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sw-gateway-test-'));let calls=[],stops=0;
  const executor={measure:async task=>{calls.push(task);return {durationMs:1,caption:'SECRET',token:'SECRET',sql:'SECRET',rows:[{id:'SECRET'}]};},stop:async()=>{stops++;},...options.executor};
  const gateway=createGateway({manifest,directory,executor,clock:()=>now,emergencyFile:path.join(directory,'STOP')});
  return {gateway,manifest,keys,directory,calls,get stops(){return stops;},request:p=>signedRequest(manifest,keys.privateKey,p,now),advance:ms=>{now+=ms;},async close(){await gateway.close();fs.rmSync(directory,{recursive:true,force:true});}};
}
test('gateway verifies signatures, path, audience and body before any executor work',async()=>{
  const h=harness();try{
    const valid=h.request('warm-roundtrip');
    for(const change of [{method:'GET'},{path:'/v1/measure?sql=SELECT'},{body:'{"profile":"fresh-connection"}'},{headers:{...valid.headers,'x-sw-signature':'A'.repeat(86)+'=='}},{headers:{...valid.headers,'x-sw-audience':'other.invalid'}}])assert.notEqual((await h.gateway.handle({...valid,...change})).status,200);
    assert.equal(h.calls.length,0);assert.equal((await h.gateway.handle(valid)).status,200);
  }finally{await h.close();}
});
test('replayed signed requests execute only once, including across clean restart',async()=>{
  const h=harness();try{const request=h.request('warm-roundtrip');assert.equal((await h.gateway.handle(request)).status,200);assert.equal((await h.gateway.handle(request)).body.code,'REPLAY');
    h.gateway.ledger.close();const restored=new Ledger(h.directory,validateManifest(h.manifest));assert.throws(()=>restored.reserve('warm-roundtrip',request.headers['x-sw-nonce'],Date.now()),/REPLAY/);assert.equal(restored.state.total,1);restored.close();
  }finally{await h.close();}
});
test('future, stale and expired request timestamps fail closed',async()=>{
  const h=harness();try{const request=h.request('warm-roundtrip');h.advance(30001);assert.equal((await h.gateway.handle(request)).body.code,'EXPIRED');h.advance(7200000);assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).body.code,'DISABLED');assert.equal(h.calls.length,0);assert.ok(h.stops>0);}finally{await h.close();}
});
test('six requests per minute, per-profile quota and global sixty-request quota persist',async()=>{
  const h=harness();try{
    for(let i=0;i<6;i++)assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).status,200);
    assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).body.code,'RATE_LIMIT');h.advance(60001);
    for(let i=0;i<4;i++)assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).status,200);
    assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).body.code,'BUDGET');
    for(const [profile,quota]of Object.entries(QUOTAS)){if(profile==='warm-roundtrip')continue;for(let i=0;i<quota;i++){h.advance(60001);assert.equal((await h.gateway.handle(h.request(profile))).status,200);}}
    assert.equal(h.gateway.ledger.state.total,60);assert.equal((await h.gateway.handle(h.request('transport'))).body.code,'BUDGET');
  }finally{await h.close();}
});
test('ingress attempt limiter caps each source and the whole service before authentication',()=>{
  let now=Date.now();const allow=require('../scripts/diagnostics/gateway/ingress.cjs').createAttemptLimiter(()=>now);
  for(let source=0;source<4;source++){for(let i=0;i<30;i++)assert.equal(allow('source-'+source),true);assert.equal(allow('source-'+source),false);}
  assert.equal(allow('new-source'),false);now+=60001;assert.equal(allow('new-source'),true);
});
test('simultaneous callers cannot queue a second database operation',async()=>{
  let release;const h=harness({executor:{measure:()=>new Promise(resolve=>{release=()=>resolve({durationMs:1});})}});
  try{const first=h.gateway.handle(h.request('fresh-connection'));await new Promise(r=>setImmediate(r));assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).body.code,'BUSY');release();assert.equal((await first).status,200);assert.equal(h.gateway.ledger.state.total,1);}finally{await h.close();}
});
test('arbitrary SQL, fields, duplicate JSON keys, destinations and publishing profiles are rejected',async()=>{
  const h=harness();try{for(const body of ['{"profile":"publish"}','{"profile":"warm-roundtrip","sql":"SELECT caption"}','{"profile":"warm-roundtrip","url":"postgresql://production"}','{"profile":"warm-roundtrip","profile":"fresh-connection"}','["warm-roundtrip"]','{"profile":"warm-roundtrip","workload":250}','{"profile":"warm-roundtrip","callback":"https://worker"}']){
    const req=h.request('warm-roundtrip');req.body=body;
    // Sign malformed bodies legitimately; this exercises input authorization, not
    // merely signature rejection.
    const lines=['showwork-measure-v1',h.manifest.runId,'POST','/v1/measure',h.manifest.audience,req.headers['x-sw-time'],req.headers['x-sw-nonce'],require('node:crypto').createHash('sha256').update(body).digest('hex')].join('\n');req.headers['x-sw-signature']=sign(null,Buffer.from(lines),h.keys.privateKey).toString('base64');
    assert.equal((await h.gateway.handle(req)).body.code,'INVALID_PROFILE');
  }assert.equal(h.calls.length,0);}finally{await h.close();}
});
test('responses discard customer rows, tokens, queries and plans; malformed timings fail',async()=>{
  const h=harness();try{const value=await h.gateway.handle(h.request('warm-roundtrip'));assert.equal(value.status,200);assert.doesNotMatch(JSON.stringify(value),/SECRET|caption|token|rows|sql/);
    for(const n of [NaN,Infinity,-1,'1',60001])assert.throws(()=>filterResult({durationMs:n}),/INVALID_RESULT/);
  }finally{await h.close();}
});
test('two executor failures shut down permanently; permission mismatch stops immediately',async()=>{
  for(const code of ['TIMEOUT','PERMISSION_MISMATCH']){const h=harness({executor:{measure:async()=>{throw new Error(code);}}});try{
    await h.gateway.handle(h.request('fresh-connection'));if(code==='TIMEOUT')await h.gateway.handle(h.request('fresh-connection'));
    assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).body.code,'DISABLED');assert.ok(h.stops>0);assert.equal(h.gateway.ledger.state.disabled,true);
  }finally{await h.close();}}
});
test('emergency file and explicit shutdown reject work and stop the executor',async()=>{
  const h=harness();try{fs.writeFileSync(path.join(h.directory,'STOP'),'stop',{mode:0o600});assert.equal((await h.gateway.handle(h.request('warm-roundtrip'))).body.code,'DISABLED');assert.equal(h.calls.length,0);assert.ok(h.stops>0);}finally{await h.close();}
});
test('ledger refuses simultaneous owners, corrupt files, and crash-left-active state',async()=>{
  const h=harness();try{assert.throws(()=>new Ledger(h.directory,validateManifest(h.manifest)),/EEXIST/);h.gateway.ledger.reserve('warm-roundtrip','a'.repeat(48),Date.now());h.gateway.ledger.close();const restored=new Ledger(h.directory,validateManifest(h.manifest));assert.equal(restored.state.disabled,true);restored.close();fs.writeFileSync(path.join(h.directory,'ledger.json'),'{}');assert.throws(()=>new Ledger(h.directory,validateManifest(h.manifest)),/CORRUPT_LEDGER/);}finally{await h.close();}
});
test('HTTP parser enforces body cap, duplicate keys, no CORS and no raw destination route',async()=>{
  const h=harness(),server=createServer(h.gateway);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const base=`http://127.0.0.1:${server.address().port}`,req=h.request('warm-roundtrip');const good=await fetch(base+req.path,{method:'POST',headers:req.headers,body:req.body});assert.equal(good.status,200);assert.equal(good.headers.get('access-control-allow-origin'),null);assert.equal(good.headers.get('cache-control'),'no-store');
    assert.notEqual((await fetch(base+'/sql',{method:'POST',headers:req.headers,body:req.body})).status,200);assert.equal((await fetch(base+'/v1/measure',{method:'POST',headers:req.headers,body:'x'.repeat(1025)})).status,400);assert.equal(h.calls.length,1);
  }finally{await new Promise(r=>server.close(r));await h.close();}
});
test('supervisor kills stalled executor before releasing the operation lease',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sw-gateway-kill-')),worker=path.join(dir,'hang.cjs');fs.writeFileSync(worker,"process.send({ready:true});process.on('message',()=>{});setInterval(()=>{},1000);");
  const supervisor=new Supervisor('unused',{workMs:100,killMs:400,worker});const start=performance.now();
  try{await assert.rejects(supervisor.measure({profile:'warm-roundtrip',ordinal:0}),/TIMEOUT/);assert.ok(performance.now()-start<1000);assert.equal(supervisor.child,null);assert.equal(supervisor.uncertain,false);}finally{await supervisor.stop();fs.rmSync(dir,{recursive:true,force:true});}
});
test('failed executor startup confirms process termination before releasing the gate',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sw-gateway-startup-')),worker=path.join(dir,'fail.cjs');fs.writeFileSync(worker,"process.send({ready:false});setInterval(()=>{},1000);");const supervisor=new Supervisor('unused',{worker});
  try{await assert.rejects(supervisor.measure({profile:'warm-roundtrip',ordinal:0}),/EXECUTOR_UNAVAILABLE/);assert.equal(supervisor.child,null);assert.equal(supervisor.active,false);assert.equal(supervisor.uncertain,false);}finally{await supervisor.stop();fs.rmSync(dir,{recursive:true,force:true});}
});
test('query map is pinned and contains only the reviewed SELECT plans',()=>{
  const p=require('../scripts/diagnostics/gateway/profiles.cjs');assert.equal(p.queryHash,queryHash);assert.equal(Object.keys(p.templates).length,10);
  for(const sql of Object.values(p.templates)){assert.match(sql,/^EXPLAIN .* SELECT /);assert.doesNotMatch(sql,/\b(UPDATE|INSERT|DELETE|COPY|CALL|DROP|TRUNCATE|JOIN|FOR UPDATE|caption|token|Credential|Account)\b/i);assert.match(sql,/LIMIT (20|100)$/);}
  const sample=Array.from({length:20},(_,i)=>p.selection(i));for(const platform of p.PLATFORMS)assert.equal(sample.filter(s=>s.platform===platform).length,4);
});
test('executor configuration rejects production, alternate databases and unverified TLS',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sw-gateway-config-')),file=path.join(dir,'config.json'),caFile=path.resolve(__dirname,'../scripts/diagnostics/prod-ca-2021.crt');const valid={mode:'isolated-staging',url:'postgresql://sw_gateway_stage_abcdef123456@127.0.0.1:5432/showwork_gateway_stage_abcdef123456?connection_limit=1&connect_timeout=4&pool_timeout=1&sslmode=require&sslaccept=strict&sslcert='+encodeURIComponent(caFile),role:'sw_gateway_stage_abcdef123456',caFile,caFingerprint:new (require('node:crypto').X509Certificate)(fs.readFileSync(caFile)).fingerprint256,expiresAt:new Date(Date.now()+3600000).toISOString()};
  const fixtureUrl=new URL(valid.url);fixtureUrl.password=randomBytes(24).toString('hex');valid.url=fixtureUrl.toString();
  const {loadConfig}=require('../scripts/diagnostics/gateway/executor.cjs');try{
    for(const change of [{mode:'production'},{url:valid.url.replace('127.0.0.1','production.supabase.com')},{url:valid.url.replace('showwork_gateway_stage_abcdef123456','postgres')},{url:valid.url+'&options=-cdefault_transaction_read_only=off'},{url:valid.url.replace('sslaccept=strict','sslaccept=accept_invalid_certs')},{caFingerprint:'untrusted'},{url:valid.url.replace('sslmode=require','sslmode=disable')},{url:valid.url.replace('connection_limit=1','connection_limit=5')}]){fs.writeFileSync(file,JSON.stringify({...valid,...change}),{mode:0o600});assert.throws(()=>loadConfig(file));}
    fs.writeFileSync(file,JSON.stringify(valid),{mode:0o600});assert.equal(loadConfig(file).host,'127.0.0.1');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('expiry and emergency shutdown cancel in-flight work and never return late results',async()=>{
  let rejectTask;
  const h=harness({executor:{measure:()=>new Promise((_r,reject)=>{rejectTask=reject;}),stop:async()=>rejectTask?.(new Error('DISABLED'))}});
  try{const pending=h.gateway.handle(h.request('warm-roundtrip'));await new Promise(r=>setImmediate(r));h.advance(7200001);await new Promise(r=>setTimeout(r,150));assert.equal((await pending).status,503);assert.equal(h.gateway.ledger.state.disabled,true);}finally{await h.close();}
});
test('Netlify relay authenticates before HTTP and carries only signed profiles and timings',async()=>{
  const h=harness();let calls=0;const {createNetlifyClient}=require('../scripts/diagnostics/gateway/client.cjs');
  const client=createNetlifyClient({manifest:h.manifest,gatewayUrl:'https://gateway.invalid/v1/measure',fetchImpl:async(_url,options)=>{calls++;assert.equal(options.redirect,'error');assert.equal(options.body,'{"profile":"warm-roundtrip"}');return new Response(JSON.stringify({version:1,profile:'warm-roundtrip',runId:h.manifest.runId,sample:1,gatewayMs:1,timings:{durationMs:1,rows:[{caption:'SECRET'}]}}),{status:200});}});
  try{assert.equal((await client({httpMethod:'POST',headers:{},body:'{}'})).statusCode,403);assert.equal(calls,0);const req=h.request('warm-roundtrip');const value=await client({httpMethod:'POST',headers:req.headers,body:req.body});assert.equal(value.statusCode,200);assert.doesNotMatch(value.body,/SECRET|rows|caption|postgresql/);assert.equal(calls,1);}finally{await h.close();}
});
test('Netlify client dependency graph contains no executor, SQL templates or Prisma',()=>{
  const root=path.resolve(__dirname,'../scripts/diagnostics/gateway'),visited=new Set();function visit(file){if(visited.has(file))return;visited.add(file);const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/@prisma|executor\.cjs|profiles\.cjs|\bEXPLAIN\b|\bSELECT\b|DATABASE_URL/);for(const match of source.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g))visit(path.resolve(path.dirname(file),match[1]));}
  visit(path.join(root,'client.cjs'));assert.equal(visited.size,3);
});
