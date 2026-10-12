'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {PrismaClient}=require('@prisma/client');
const {randomBytes,X509Certificate}=require('node:crypto');
async function startCluster(){
  const install=process.env.SHOWWORK_POSTGRES17_ROOT||'/tmp/showwork-postgres17-build/install';
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sw-gateway-stage-')),bin=n=>path.join(install,'bin',n);
  const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0)throw new Error('Staging provisioning failed: '+path.basename(cmd));};
  const version=spawnSync(bin('postgres'),['--version'],{encoding:'utf8'}).stdout?.trim();if(version!=='postgres (PostgreSQL) 17.6')throw new Error('PostgreSQL 17.6 required');
  let server,admin,stage;
  async function close(){await stage?.$disconnect().catch(()=>{});await admin?.$disconnect().catch(()=>{});if(server&&server.exitCode===null){const exited=new Promise(r=>server.once('exit',r));server.kill('SIGTERM');await exited;}fs.rmSync(directory,{recursive:true,force:true});}
  try{
    const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
    const data=path.join(directory,'data'),key=path.join(directory,'server.key'),cert=path.join(directory,'server.crt'),ca=path.join(directory,'ca.crt'),caKey=path.join(directory,'ca.key'),csr=path.join(directory,'server.csr'),ext=path.join(directory,'server.ext');
    run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=Showwork isolated staging CA','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign','-keyout',caKey,'-out',ca]);
    run('openssl',['req','-new','-newkey','rsa:2048','-nodes','-subj','/CN=localhost','-keyout',key,'-out',csr]);
    fs.writeFileSync(ext,'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=IP:127.0.0.1,DNS:localhost\n');
    run('openssl',['x509','-req','-in',csr,'-CA',ca,'-CAkey',caKey,'-CAcreateserial','-days','1','-extfile',ext,'-out',cert]);fs.chmodSync(key,0o600);fs.chmodSync(caKey,0o600);
    run(bin('initdb'),['-D',data,'-U','gateway_stage_admin','--auth=trust','--no-locale','-E','UTF8']);
    const suffix=randomBytes(6).toString('hex'),database='showwork_gateway_stage_'+suffix,role='sw_gateway_stage_'+suffix;
    const hba=path.join(data,'pg_hba.conf');fs.writeFileSync(hba,`hostssl all ${role} 127.0.0.1/32 scram-sha-256\nhostnossl all ${role} 127.0.0.1/32 reject\n`+fs.readFileSync(hba,'utf8'));
    const log=fs.openSync(path.join(directory,'postgres.log'),'a');server=spawn(bin('postgres'),['-D',data,'-h','127.0.0.1','-p',String(port),'-k',directory,'-c','max_connections=30','-c','shared_buffers=32MB','-c','fsync=on','-c','timezone=UTC','-c','ssl=on','-c',`ssl_cert_file=${cert}`,'-c',`ssl_key_file=${key}`],{stdio:['ignore',log,log]});fs.closeSync(log);
    const base=`postgresql://gateway_stage_admin@127.0.0.1:${port}/postgres?connection_limit=5&connect_timeout=4&pool_timeout=3&sslmode=require&sslaccept=strict&sslcert=${encodeURIComponent(ca)}`;
    process.env.DIRECT_URL=base;
    admin=new PrismaClient({datasources:{db:{url:base}},log:[]});
    for(let i=0;;i++){try{await admin.$connect();break;}catch(error){if(i>50){fs.writeFileSync('/tmp/showwork-staging-bootstrap-error.txt',String(error.message).replaceAll(base,'<local-staging-url>')+'\n'+fs.readFileSync(path.join(directory,'postgres.log'),'utf8'),{mode:0o600});throw new Error('Staging server unavailable: '+(error.code||error.name));}await new Promise(r=>setTimeout(r,100));}}
    await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    const stageUrl=base.replace('/postgres?','/'+database+'?');stage=new PrismaClient({datasources:{db:{url:stageUrl}},log:[]});await stage.$connect();
    return {directory,port,cert,ca,key,role,database,version,stage,admin,stageUrl,caFingerprint:new X509Certificate(fs.readFileSync(ca)).fingerprint256,close};
  }catch(error){await close();throw error;}
}
module.exports={startCluster};
