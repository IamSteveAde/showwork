'use strict';
// The real built command, private PostgreSQL and mocked storage/provider network.
const {spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
exports.runNativeCli=async function(config,cluster,q){
 const preload=path.join(cluster.socketDirectory,'native-cli-mocks.cjs');
 await fs.writeFile(preload,`'use strict';
const Module=require('node:module'),original=Module._load,objects=new Map();
Module._load=function(name,...args){const value=original.call(this,name,...args);if(name!=='@aws-sdk/client-s3')return value;return {...value,S3Client:class{destroy(){}async send(command){const {Key,Body,Prefix}=command.input,name=command.constructor.name;
 if(name==='PutObjectCommand'){if(!objects.has(Key))objects.set(Key,Buffer.from(Body));return {};}
 if(name==='GetObjectCommand'){const bytes=objects.get(Key);if(!bytes)throw Error('MOCK_STORAGE_KEY_MISSING');return {Body:[bytes],ContentLength:bytes.length,ContentType:'application/json',VersionId:'synthetic-v1'};}
 if(name==='ListObjectsV2Command')return {Contents:[...objects.keys()].filter(k=>k.startsWith(Prefix)).map(Key=>({Key})),IsTruncated:false};throw Error('MOCK_STORAGE_COMMAND_DENIED');}}};};
const net=require('node:net'),connect=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const first=args[0],options=Array.isArray(first)?first[0]:first,path=typeof options==='string'?options:options?.path;if(typeof path!=='string'||!path.startsWith(${JSON.stringify(cluster.socketDirectory+'/')}))throw Error('SYNTHETIC_TCP_DENIED');return connect.apply(this,args);};
globalThis.fetch=async(url,init)=>{if(url!=='https://api.x.com/2/tweets'||init.method!=='POST')throw Error('MOCK_HTTP_ENDPOINT_DENIED');console.log('MOCK_EXTERNAL_SUBMISSION');return Response.json({data:{id:'remote-one'}});};
`);
 const env={PATH:process.env.PATH,NODE_OPTIONS:'--require '+preload,SHOWWORK_PUBLISHING_PROTOCOL:'canonical',SHOWWORK_PUBLISHING_ENABLED:'true',SHOWWORK_CANONICAL_APPLICATION_ENABLED:'false',PUBLISHING_EXPECTED_EPOCH:String(config.epoch),PUBLISHING_DATABASE_URL:config.databaseUrl,PUBLISHING_DATABASE_SCHEMA:config.schema,PUBLISHING_DATABASE_POOL_MAX:'2',PUBLISHING_WORKER_CONCURRENCY:'1',PUBLISHING_WORKER_POLL_MS:'1000',PUBLISHING_STORAGE_ENDPOINT:config.endpoint,PUBLISHING_STORAGE_BUCKET:config.bucket,PUBLISHING_STORAGE_JOURNAL_PREFIX:config.prefix,PUBLISHING_STORAGE_ACCESS_KEY_ID:'synthetic',PUBLISHING_STORAGE_SECRET_ACCESS_KEY:'synthetic',PUBLISHING_MEDIA_PUBLIC_ORIGIN:config.origin,META_API_VERSION:config.versions.meta,LINKEDIN_API_VERSION:config.versions.linkedin};
 const child=spawn(process.execPath,['dist-worker-native/run.cjs','--run'],{env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',x=>{stdout+=x;});child.stderr.on('data',x=>{stderr+=x;});const exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
 try{let confirmed=false;for(let i=0;i<100;i++){const row=(await q(`SELECT phase FROM "PublishingJob" WHERE "postId"='post'`)).rows[0];if(row.phase==='CONFIRMED'&&stdout.includes('publishing-cycle')){confirmed=true;break;}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(confirmed,true,stdout+' '+stderr);assert.equal(stdout.split('MOCK_EXTERNAL_SUBMISSION').length-1,1);child.kill('SIGTERM');const result=await Promise.race([exit,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),5000))]);assert.deepEqual(result,{code:0,signal:null},stderr);return {stdout};
 }finally{if(child.exitCode===null&&!child.signalCode){child.kill('SIGKILL');await exit;}await fs.rm(preload,{force:true});}
};
