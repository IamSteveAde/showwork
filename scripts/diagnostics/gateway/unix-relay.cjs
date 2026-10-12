'use strict';
// Public ingress has no executor config, database dependency or credential mount.
// Its sole outbound channel is an operator-configured private Unix socket.
const http=require('node:http');
const {createNetlifyClient}=require('./client.cjs');
function unixFetch(socketPath){
  return async(url,options)=>new Promise((resolve,reject)=>{
    const req=http.request({socketPath,path:'/v1/measure',method:'POST',headers:options.headers,signal:options.signal},res=>{
      let size=0,chunks=[];res.on('data',b=>{size+=b.length;if(size>4096){req.destroy();reject(new Error('INVALID_RESPONSE'));}else chunks.push(b);});res.on('error',reject);res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:{'content-type':'application/json'}})));
    });req.on('error',reject);req.end(options.body);
  });
}
function createUnixRelay({manifest,socketPath}){
  if(typeof socketPath!=='string'||!socketPath.startsWith('/')||socketPath.includes('\0'))throw new Error('INVALID_SOCKET');
  const relay=createNetlifyClient({manifest,gatewayUrl:`https://${manifest.audience}/v1/measure`,fetchImpl:unixFetch(socketPath)});
  return {async handle(request){if(request.path!=='/v1/measure')return {status:404,body:{code:'NOT_FOUND'}};const response=await relay({httpMethod:request.method,headers:request.headers,body:request.body});return {status:response.statusCode,body:JSON.parse(response.body)};},async shutdown(){},async close(){}};
}
module.exports={unixFetch,createUnixRelay};
