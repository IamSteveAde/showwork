'use strict';
// No database dependency or environment access. Runtime configuration is injected
// only by a separately authenticated operator-facing wrapper.
const {signedRequest,validateManifest,authenticate,filterResult}=require('./protocol.cjs');
function validateResponse(value,status,manifest,profile){
  if(status!==200){if(!value||Object.keys(value).join(',')!=='code'||!['NOT_FOUND','INVALID_REQUEST','INVALID_PROFILE','UNAUTHORIZED','EXPIRED','REPLAY','BUSY','BUDGET','RATE_LIMIT','DISABLED','TIMEOUT','PERMISSION_MISMATCH','MEASUREMENT_FAILED'].includes(value.code))throw new Error('INVALID_RESPONSE');return {code:value.code};}
  if(!value||Object.keys(value).sort().join(',')!=='gatewayMs,profile,runId,sample,timings,version'||value.version!==1||value.runId!==manifest.runId||value.profile!==profile||!Number.isInteger(value.sample)||value.sample<1||value.sample>20||typeof value.gatewayMs!=='number'||!Number.isFinite(value.gatewayMs)||value.gatewayMs<0||value.gatewayMs>60000)throw new Error('INVALID_RESPONSE');
  return {version:1,runId:value.runId,profile,sample:value.sample,timings:filterResult(value.timings),gatewayMs:value.gatewayMs};
}
async function boundedJson(response){
  if(Number(response.headers.get('content-length'))>4096)throw new Error('INVALID_RESPONSE');
  const reader=response.body.getReader();let size=0,chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096)throw new Error('INVALID_RESPONSE');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=Buffer.concat(chunks);return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
async function measure({manifest,privateKey,gatewayUrl,profile,fetchImpl=fetch}){
  const url=new URL(gatewayUrl);if(url.protocol!=='https:'||url.pathname!=='/v1/measure'||url.search||url.hash||url.username||url.password||url.hostname!==manifest.audience)throw new Error('INVALID_GATEWAY');
  const request=signedRequest(manifest,privateKey,profile);const start=performance.now();
  const response=await fetchImpl(url,{method:'POST',headers:request.headers,body:request.body,redirect:'error',signal:AbortSignal.timeout(18000)});
  const value=validateResponse(await boundedJson(response),response.status,manifest,profile);
  // The client records its HTTP duration separately; it is not database latency.
  return {status:response.status,value,httpMs:performance.now()-start};
}
function createNetlifyClient({manifest,gatewayUrl,fetchImpl=fetch,clock=Date.now}){
  const approved=validateManifest(manifest,clock()),url=new URL(gatewayUrl),initialized=performance.now();let invocations=0;
  if(url.protocol!=='https:'||url.hostname!==manifest.audience||url.pathname!=='/v1/measure'||url.search||url.hash||url.username||url.password)throw new Error('INVALID_GATEWAY');
  // The operator signs on their machine. This relay needs only a public key;
  // it never receives the signing private key or a database secret.
  return async event=>{
    const started=performance.now();
    try{
      if(event.isBase64Encoded)throw new Error('INVALID_REQUEST');
      const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
      const {profile}=authenticate({method:event.httpMethod,path:'/v1/measure',headers,body:event.body},approved,clock());
      const cold=invocations++===0;
      const response=await fetchImpl(url,{method:'POST',headers:Object.fromEntries(Object.entries(headers).filter(([k])=>k.startsWith('x-sw-')||k==='content-type')),body:event.body,redirect:'error',signal:AbortSignal.timeout(18000)});
      const value=validateResponse(await boundedJson(response),response.status,manifest,profile);
      return {statusCode:response.status,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({value,client:{cold,httpMs:performance.now()-started,moduleAgeMs:started-initialized,handlerMs:performance.now()-started}})};
    }catch{ return {statusCode:403,headers:{'cache-control':'no-store'},body:'{"code":"CLIENT_REJECTED"}'}; }
  };
}
module.exports={measure,createNetlifyClient,validateResponse};
