'use strict';
const fs=require('node:fs'),{Pool,types}=require('pg');
exports.createCoordinator=function(pooler,onQuery){
 const u=new URL(pooler.url);
 if(u.hostname!=='127.0.0.1'||!/^\/showwork_gateway_stage_[a-f0-9]{12}$/.test(u.pathname)||u.searchParams.get('sslaccept')!=='strict')throw Error('Isolated staging coordinator required');
 const pool=new Pool({host:u.hostname,port:Number(u.port),database:u.pathname.slice(1),user:u.username,max:2,connectionTimeoutMillis:5000,query_timeout:2500,idleTimeoutMillis:30000,ssl:{ca:fs.readFileSync(u.searchParams.get('sslcert'),'utf8'),rejectUnauthorized:true},types:{getTypeParser(oid,format){if(oid===20)return BigInt;if(oid===1114)return value=>new Date(value.replace(' ','T')+'Z');return types.getTypeParser(oid,format);}}});
 pool.on('error',()=>{});
 return {async query(config){const t=performance.now();let client,checkoutMs;try{client=await pool.connect();checkoutMs=performance.now()-t;return await client.query(config);}finally{client?.release();onQuery?.({query:config.text,duration:performance.now()-t,checkoutMs,clientIndex:1});}},close:()=>pool.end()};
};
