'use strict';
// No environment-selected destination. Creates a private NEW local cluster.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {Pool}=require('pg');
exports.startOwnershipCluster=async function(){
 const bin='/tmp/showwork-postgres17-build/install/bin';
 if(!fs.existsSync(path.join(bin,'postgres')))throw Error('DISPOSABLE_POSTGRES_UNAVAILABLE');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sw-owner-'));
 fs.chmodSync(directory,0o700);
 const data=path.join(directory,'data');let started=false,pool;
 const run=(tool,args)=>{const result=spawnSync(path.join(bin,tool),args,{encoding:'utf8',env:{PATH:'/usr/bin:/bin',LC_ALL:'C'}});if(result.status!==0)throw Error('LOCAL_POSTGRES_'+tool.toUpperCase()+'_FAILED');};
 async function close(){await pool?.end();if(started)run('pg_ctl',['-D',data,'-m','immediate','-w','stop']);fs.rmSync(directory,{recursive:true,force:true});}
 try{
  run('initdb',['-D',data,'-U','synthetic_owner','--auth=trust','--no-locale','-E','UTF8']);
  // No TCP listener. Socket is inside a private owner-only temporary directory.
  run('pg_ctl',['-D',data,'-l',path.join(directory,'server.log'),'-o',`-h '' -k ${directory} -p 5432 -c max_connections=10 -c shared_buffers=16MB`,'-w','start']);started=true;
  pool=new Pool({host:directory,port:5432,user:'synthetic_owner',password:'',database:'postgres',ssl:false,max:5,connectionTimeoutMillis:2000,statement_timeout:3000,application_name:'stage3a-synthetic'});
  return {pool,close,socketDirectory:directory};
 }catch(error){await close();throw error;}
};
