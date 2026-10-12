'use strict';
const fs=require('node:fs');
const http=require('node:http'),https=require('node:https');
const {performance}=require('node:perf_hooks');
const {validateManifest,authenticate,filterResult}=require('./protocol.cjs');
const {Ledger}=require('./ledger.cjs');
const {createExpiry}=require('./expiry.cjs');
const STATUS={NOT_FOUND:404,INVALID_REQUEST:400,INVALID_PROFILE:400,UNAUTHORIZED:401,EXPIRED:403,REPLAY:409,BUSY:429,BUDGET:429,RATE_LIMIT:429,DISABLED:503};
function createGateway({manifest,directory,executor,clock=Date.now,emergencyFile}) {
  const approved=validateManifest(manifest,clock()),ledger=new Ledger(directory,approved),expiry=createExpiry(approved.end,{wall:clock});let stopped=false;
  async function shutdown(){stopped=true;ledger.disable();await executor.stop();}
  async function handle(request){
    const start=performance.now();let reserved=false;
    try{
      if(stopped||expiry.expired()||emergencyFile&&fs.existsSync(emergencyFile)){await shutdown();throw new Error('DISABLED');}
      const {profile,nonce}=authenticate(request,approved,clock());
      const ordinal=ledger.reserve(profile,nonce,clock());reserved=true;
      const value=filterResult(await executor.measure({profile,ordinal}));
      if(stopped||expiry.expired()||emergencyFile&&fs.existsSync(emergencyFile)){await shutdown();throw new Error('DISABLED');}
      ledger.complete(true);reserved=false;
      return {status:200,body:{version:1,profile,sample:ordinal+1,runId:approved.runId,timings:value,gatewayMs:Math.round((performance.now()-start)*1000)/1000}};
    }catch(error){
      if(reserved){try{ledger.complete(false);}catch{stopped=true;}}
      if(['PERMISSION_MISMATCH','UNCERTAIN_TERMINATION'].includes(error.message)||ledger.state.disabled){try{await shutdown();}catch{stopped=true;}}
      return {status:STATUS[error.message]||503,body:{code:Object.hasOwn(STATUS,error.message)?error.message:['TIMEOUT','PERMISSION_MISMATCH'].includes(error.message)?error.message:'MEASUREMENT_FAILED'}};
    }
  }
  // Independent timer: expiry/emergency also terminates idle or active clients.
  const timer=setInterval(()=>{if(!stopped&&(expiry.expired()||emergencyFile&&fs.existsSync(emergencyFile)))shutdown().catch(()=>{stopped=true;});},100);timer.unref();
  return {handle,ledger,shutdown,async close(){clearInterval(timer);await shutdown();ledger.close();}};
}
function createAttemptLimiter(clock=Date.now){
  let attempts=[];const sources=new Map();
  return ip=>{
    const now=clock();attempts=attempts.filter(t=>t>now-60000);
    for(const [k,v]of sources)if(v.every(t=>t<=now-60000))sources.delete(k);
    if(sources.size>=256&&!sources.has(ip))return false;
    const recent=(sources.get(ip)||[]).filter(t=>t>now-60000);sources.set(ip,recent);
    if(attempts.length>=120||recent.length>=30)return false;
    attempts.push(now);recent.push(now);return true;
  };
}
function createServer(gateway,{tlsOptions,clock=Date.now}={}) {
  const allowAttempt=createAttemptLimiter(clock);
  const listener=(req,res)=>{
    if(!allowAttempt(req.socket.remoteAddress||'unknown')){res.writeHead(429);res.end();return;}
    let size=0,chunks=[],ended=false;
    function reply(status,body){if(ended)return;ended=true;const text=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','content-length':Buffer.byteLength(text),'x-content-type-options':'nosniff'});res.end(text);}
    const keys=[];for(let i=0;i<req.rawHeaders.length;i+=2)keys.push(req.rawHeaders[i].toLowerCase());
    if(new Set(keys).size!==keys.length||req.headers['content-encoding']||Number(req.headers['content-length'])>1024){reply(400,{code:'INVALID_REQUEST'});req.resume();return;}
    req.on('data',b=>{size+=b.length;if(size>1024){reply(413,{code:'INVALID_REQUEST'});chunks=[];}else chunks.push(b);});
    req.on('end',async()=>{
      if(ended)return;
      const deadline=setTimeout(()=>{gateway.shutdown().catch(()=>{});reply(503,{code:'TIMEOUT'});},15000);
      const bytes=Buffer.concat(chunks);let body;
      try{body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{clearTimeout(deadline);reply(400,{code:'INVALID_REQUEST'});return;}
      const result=await gateway.handle({method:req.method,path:req.url,headers:req.headers,body});clearTimeout(deadline);
      if(Buffer.byteLength(JSON.stringify(result.body))>4096){await gateway.shutdown();reply(503,{code:'INVALID_RESULT'});}else reply(result.status,result.body);
    });
    req.on('error',()=>reply(400,{code:'INVALID_REQUEST'}));
  };
  const server=tlsOptions?https.createServer(tlsOptions,listener):http.createServer(listener);
  server.maxConnections=10;server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;server.timeout=20000;
  server.on('clientError',(_error,socket)=>{socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');});
  return server;
}
module.exports={createGateway,createServer,createAttemptLimiter};
